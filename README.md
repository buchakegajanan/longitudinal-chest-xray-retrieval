# Longitudinal Chest X-ray Retrieval

A research prototype for finding visually similar historical chest X-rays and reviewing a patient’s available examinations over time. The platform combines an Angular web application, an ASP.NET Core API, and a Python visual-search service using ResNet-50 image embeddings and FAISS nearest-neighbour search.

> **Research use only.** Similarity rankings are experimental and are not a diagnosis or a substitute for professional clinical judgment. Do not use this prototype to make patient-care decisions.

## Features

- Upload a PNG or JPEG chest X-ray and preview it before search.
- Search a sample NIH ChestX-ray14 image index using ResNet-50 embeddings and FAISS cosine similarity.
- Browse ranked cases with available finding labels, examination counts, and image previews.
- Inspect a case’s available examination timeline.
- Compare the current uploaded image with a selected historical image, or compare two historical examinations.
- Search and filter the research case library.

## Architecture

- **Frontend:** Angular 22, TypeScript, SCSS
- **API:** ASP.NET Core (.NET 10) minimal API
- **Visual search:** Python, PyTorch/torchvision ResNet-50, FAISS, Flask
- **Dataset:** NIH ChestX-ray14 sample subset, loaded locally from CSV and image files

SQL Server persistence and clinical deployment are not included. The API currently loads metadata into memory at startup. The visual model is an ImageNet-pretrained ResNet-50 baseline and has not been clinically validated or specifically trained for diagnosis/progression analysis.

## Requirements

- Windows with PowerShell
- .NET 10 SDK
- Node.js and npm (npm 11 recommended)
- Python 3.12 and the Python launcher (`py`)
- The NIH ChestX-ray14 sample labels CSV and sample images (see Dataset setup)

## Dataset setup

Dataset files are intentionally **not tracked in Git**. The sample images and labels occupy several gigabytes and should be obtained from the appropriate NIH ChestX-ray14 source under its terms.

Place the sample files at:

- `NIH Chest X-ray14/sample_labels.csv`
- `NIH Chest X-ray14/sample/images/`

The API reads those configured paths from `ChestXRayPlatform/API/appsettings.json`. Do not commit patient images, labels containing sensitive data, or other restricted dataset content.

## Run locally

Open three PowerShell terminals from the repository root.

### 1. Start the visual-search service

```powershell
.\visual_search_service\start.bat
```

The script creates `visual_search_service/.venv` if needed, installs its requirements, downloads the pretrained ResNet-50 weights on first run, and builds a FAISS index for available images. Initial indexing can take several minutes on CPU; the upload page reports index status. The service listens on `http://localhost:5100`.

### 2. Start the ASP.NET API

```powershell
dotnet run --project .\ChestXRayPlatform\API\ChestXRayPlatform.API.csproj --no-launch-profile --urls http://localhost:5028
```

Health endpoint: `http://localhost:5028/api/health`.

### 3. Start the Angular frontend

```powershell
cd .\xray-platform
npm install
npm start -- --host 127.0.0.1 --port 4200
```

Open `http://localhost:4200`.

## Build

From the repository root:

```powershell
dotnet build .\ChestXRayPlatform.sln
cd .\xray-platform
npm run build
```

## API endpoints

- `GET /api/health` — API and dataset health
- `GET /api/visual-search/status` — model/index readiness
- `POST /api/upload` — upload an image and retrieve ranked cases
- `GET /api/research-cases` — paginated research case list
- `GET /api/research-cases/{caseId}` — one research case with exams
- `GET /api/research-cases/{caseId}/examinations` — case examinations
- `GET /api/images/file/{fileName}` — serve an indexed dataset image

## Limitations

- The sample dataset is incomplete; many patients have only one available image and therefore no longitudinal follow-up to compare.
- Similarity is an experimental visual-feature ranking, not a disease classifier, diagnostic system, or validated clinical model.
- Examination dates, image registration, difference maps, and automated progression measurements are not provided.
- Uploads are stored locally by the API. Use only appropriately de-identified research images and secure or remove stored uploads as required.
- Authentication, authorization, production hardening, and SQL Server persistence are not implemented.
