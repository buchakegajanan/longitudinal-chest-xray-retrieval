"""
Visual Search Service — ResNet-50 image embeddings + FAISS nearest-neighbour search.
Runs on http://localhost:5100

Endpoints:
  GET  /api/visual-search/status          — health + index stats
  POST /api/visual-search/similar         — upload image, returns top-N similar cases
  POST /api/visual-search/rebuild-index   — force re-index of dataset images
"""

import os, csv, io, json, time, logging, threading
from pathlib import Path

import numpy as np
import faiss
import torch
import torchvision.transforms as T
from torchvision.models import resnet50, ResNet50_Weights
from PIL import Image
from flask import Flask, request, jsonify
from flask_cors import CORS

# ── Config ────────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
ROOT_DIR   = BASE_DIR.parent
CSV_PATH   = ROOT_DIR / "NIH Chest X-ray14" / "sample_labels.csv"
IMG_DIR    = ROOT_DIR / "NIH Chest X-ray14" / "sample" / "images"
INDEX_FILE = BASE_DIR / "faiss_index.bin"
META_FILE  = BASE_DIR / "index_meta.json"
TOP_N_MAX  = 50
EMB_DIM    = 2048          # ResNet-50 avgpool output

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ── Model ─────────────────────────────────────────────────────────────────────
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
log.info(f"Using device: {device}")

_model = resnet50(weights=ResNet50_Weights.IMAGENET1K_V2)
_model.fc = torch.nn.Identity()   # strip classifier → 2048-d embedding
_model.eval().to(device)

_transform = T.Compose([
    T.Resize(256),
    T.CenterCrop(224),
    T.Grayscale(num_output_channels=3),   # X-rays are greyscale
    T.ToTensor(),
    T.Normalize(mean=[0.485, 0.456, 0.406], std=[0.229, 0.224, 0.225]),
])

def embed_image(img: Image.Image) -> np.ndarray:
    """Return L2-normalised 2048-d embedding for a PIL image."""
    tensor = _transform(img.convert("RGB")).unsqueeze(0).to(device)
    with torch.no_grad():
        vec = _model(tensor).cpu().numpy().astype("float32")
    faiss.normalize_L2(vec)
    return vec   # shape (1, 2048)

# ── Index state ───────────────────────────────────────────────────────────────
_index: faiss.IndexFlatIP | None = None   # inner-product on L2-normed vecs = cosine
_meta: list[dict] = []                    # parallel list: one entry per indexed image
_index_ready = threading.Event()
_index_error: str | None = None
_indexed_images = 0
_index_total = 0
_INDEX_BATCH_SIZE = 16

def embed_images(images: list[Image.Image]) -> np.ndarray:
    """Return L2-normalised embeddings for a batch of PIL images."""
    tensors = [_transform(img.convert("RGB")) for img in images]
    batch = torch.stack(tensors).to(device)
    with torch.no_grad():
        vectors = _model(batch).cpu().numpy().astype("float32")
    faiss.normalize_L2(vectors)
    return vectors

def _load_csv() -> dict[str, dict]:
    """Return {image_index: {patient_id, finding_labels, follow_up, ...}}"""
    records: dict[str, dict] = {}
    if not CSV_PATH.exists():
        log.warning(f"CSV not found: {CSV_PATH}")
        return records
    with open(CSV_PATH, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            img_idx = row.get("Image Index", "").strip()
            if img_idx:
                records[img_idx] = {
                    "imageIndex":    img_idx,
                    "patientId":     row.get("Patient ID", "").strip(),
                    "findingLabels": row.get("Finding Labels", "No Finding").strip(),
                    "followUp":      row.get("Follow-up #", "0").strip(),
                    "viewPosition":  row.get("View Position", "").strip(),
                }
    return records

def _build_index() -> tuple[faiss.IndexFlatIP, list[dict]]:
    """Embed every available image and build a FAISS index."""
    global _indexed_images, _index_total
    csv_records = _load_csv()
    index = faiss.IndexFlatIP(EMB_DIM)
    meta: list[dict] = []

    image_files = sorted(IMG_DIR.glob("*.png")) + sorted(IMG_DIR.glob("*.jpg"))
    _indexed_images = 0
    _index_total = len(image_files)
    log.info(f"Indexing {_index_total} images in batches of {_INDEX_BATCH_SIZE} from {IMG_DIR}")

    for start in range(0, len(image_files), _INDEX_BATCH_SIZE):
        batch_paths: list[Path] = []
        batch_images: list[Image.Image] = []
        for img_path in image_files[start:start + _INDEX_BATCH_SIZE]:
            try:
                with Image.open(img_path) as source:
                    batch_images.append(source.convert("RGB"))
                batch_paths.append(img_path)
            except Exception as e:
                log.warning(f"Skipping {img_path.name}: {e}")

        if batch_images:
            try:
                vectors = embed_images(batch_images)
                index.add(vectors)
                for img_path in batch_paths:
                    rec = csv_records.get(img_path.name, {})
                    patient_id = rec.get("patientId", img_path.stem.split("_")[0])
                    meta.append({
                        "imageIndex":    img_path.name,
                        "imagePath":     str(img_path),
                        "patientId":     patient_id,
                        "caseId":        f"PAT-{patient_id}",
                        "caseIdentifier": f"CXR-{patient_id}",
                        "findingLabels": rec.get("findingLabels", "No Finding"),
                        "followUp":      rec.get("followUp", "0"),
                        "viewPosition":  rec.get("viewPosition", ""),
                    })
            except Exception as e:
                log.warning(f"Skipping image batch starting at {image_files[start].name}: {e}")

        _indexed_images = min(start + _INDEX_BATCH_SIZE, _index_total)
        if _indexed_images % 256 < _INDEX_BATCH_SIZE or _indexed_images == _index_total:
            log.info(f"Index progress: {_indexed_images}/{_index_total} images")

    log.info(f"Index built: {index.ntotal} vectors")
    return index, meta

def _save_index(index: faiss.IndexFlatIP, meta: list[dict]) -> None:
    faiss.write_index(index, str(INDEX_FILE))
    with open(META_FILE, "w") as f:
        json.dump(meta, f)
    log.info(f"Index saved to {INDEX_FILE}")

def _load_index() -> tuple[faiss.IndexFlatIP | None, list[dict]]:
    if INDEX_FILE.exists() and META_FILE.exists():
        try:
            index = faiss.read_index(str(INDEX_FILE))
            with open(META_FILE) as f:
                meta = json.load(f)
            log.info(f"Loaded existing index: {index.ntotal} vectors")
            return index, meta
        except Exception as e:
            log.warning(f"Could not load saved index: {e}")
    return None, []

def get_index() -> tuple[faiss.IndexFlatIP, list[dict]]:
    global _index, _meta, _index_error
    if _index is None or _index.ntotal == 0:
        _index, _meta = _load_index()
    if _index is None or _index.ntotal == 0:
        try:
            _index, _meta = _build_index()
            _save_index(_index, _meta)
        except Exception as exc:
            _index_error = str(exc)
            raise
    _index_error = None
    _index_ready.set()
    return _index, _meta

def _initialize_index() -> None:
    try:
        get_index()
    except Exception:
        log.exception("Visual search index initialization failed")

# ── Group meta entries by patient/case ────────────────────────────────────────
def _group_by_case(hits: list[dict]) -> list[dict]:
    """
    Merge per-image hits into per-case results.
    Each case gets the best (max) similarity score among its images.
    """
    seen: dict[str, dict] = {}
    for h in hits:
        cid = h["caseId"]
        if cid not in seen or h["score"] > seen[cid]["score"]:
            seen[cid] = h
        else:
            # accumulate all image hits for the case
            seen[cid].setdefault("allImages", []).append(h["imageIndex"])
    return list(seen.values())

# ── Endpoints ─────────────────────────────────────────────────────────────────

@app.get("/api/visual-search/status")
def status():
    if not _index_ready.is_set():
        return jsonify({
            "status": "error" if _index_error else "loading",
            "indexedImages": _indexed_images,
            "indexedCases": 0,
            "device": str(device),
            "embeddingDim": EMB_DIM,
            "imageFolder": str(IMG_DIR),
            "csvPath": str(CSV_PATH),
            "message": _index_error or f"The visual-search image index is being built ({_indexed_images}/{_index_total} images)."
        }), 503 if _index_error else 202

    index, meta = _index, _meta
    return jsonify({
        "status": "ready",
        "indexedImages": index.ntotal,
        "indexedCases": len({m["caseId"] for m in meta}),
        "device": str(device),
        "embeddingDim": EMB_DIM,
        "imageFolder": str(IMG_DIR),
        "csvPath": str(CSV_PATH),
    })

@app.post("/api/visual-search/similar")
def find_similar():
    if "file" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["file"]
    top_n = min(int(request.form.get("topN", 10)), TOP_N_MAX)

    try:
        img = Image.open(io.BytesIO(file.read()))
    except Exception:
        return jsonify({"error": "Cannot read image"}), 400

    if not _index_ready.is_set():
        return jsonify({"error": "Visual-search index is still loading"}), 503

    query_vec = embed_image(img)
    index, meta = get_index()

    if index.ntotal == 0:
        return jsonify({"error": "Index is empty — no images found in dataset folder"}), 503

    # Search for more candidates than needed so grouping still gives top_n cases
    k = min(index.ntotal, top_n * 10)
    scores, indices = index.search(query_vec, k)

    hits = []
    for score, idx in zip(scores[0], indices[0]):
        if idx < 0 or idx >= len(meta):
            continue
        m = meta[idx]
        hits.append({
            "score":          float(score),
            "imageIndex":     m["imageIndex"],
            "caseId":         m["caseId"],
            "caseIdentifier": m["caseIdentifier"],
            "patientId":      m["patientId"],
            "findingLabels":  m["findingLabels"],
            "followUp":       m["followUp"],
            "viewPosition":   m["viewPosition"],
            "imageUrl":       f"http://localhost:5028/api/images/file/{m['imageIndex']}",
            "thumbnailUrl":   f"http://localhost:5028/api/images/file/{m['imageIndex']}",
        })

    # Group by case, keep best score per case, return top_n cases
    cases_seen: dict[str, dict] = {}
    for h in hits:
        cid = h["caseId"]
        if cid not in cases_seen or h["score"] > cases_seen[cid]["score"]:
            cases_seen[cid] = h

    top_cases = sorted(cases_seen.values(), key=lambda x: x["score"], reverse=True)[:top_n]

    # Attach similarity label
    for c in top_cases:
        s = c["score"]
        c["similarityLabel"] = "High" if s >= 0.85 else "Moderate" if s >= 0.70 else "Low"

    return jsonify({
        "method": "ResNet-50 visual embedding + FAISS cosine similarity",
        "totalResults": len(top_cases),
        "results": top_cases,
    })

@app.post("/api/visual-search/rebuild-index")
def rebuild_index():
    global _index, _meta
    _index, _meta = _build_index()
    _save_index(_index, _meta)
    return jsonify({"status": "rebuilt", "indexedImages": _index.ntotal})

# ── Boot ──────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    log.info("Starting index build in background...")
    threading.Thread(target=_initialize_index, name="faiss-index-builder", daemon=True).start()
    app.run(host="0.0.0.0", port=5100, debug=False)
