using System.Globalization;
using System.Net.Http.Headers;
using System.Text.Json;

// ─────────────────────────────────────────────
// App Bootstrap — reads config, loads CSV, starts API
// ─────────────────────────────────────────────
var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddHttpClient("VisualSearch", client =>
{
    client.BaseAddress = new Uri(builder.Configuration["VisualSearch:BaseUrl"] ?? "http://localhost:5100");
    client.Timeout = TimeSpan.FromMinutes(5);
});
builder.Services.AddCors(options =>
{
    options.AddPolicy("AngularAppPolicy", policy =>
        policy.SetIsOriginAllowed(origin =>
                  Uri.TryCreate(origin, UriKind.Absolute, out var uri) &&
                  uri.Scheme == Uri.UriSchemeHttp &&
                  (uri.Host.Equals("localhost", StringComparison.OrdinalIgnoreCase) || uri.Host == "127.0.0.1"))
              .AllowAnyHeader()
              .AllowAnyMethod());
});

// Read config — resolve paths relative to the project folder (ContentRootPath),
// NOT bin/Debug/net10.0/ (AppContext.BaseDirectory).
var cfg = builder.Configuration.GetSection("DatasetSettings");
string contentRoot = builder.Environment.ContentRootPath;
string csvPath = Path.GetFullPath(Path.Combine(contentRoot, cfg["CsvPath"] ?? ""));
string imageFolder = Path.GetFullPath(Path.Combine(contentRoot, cfg["ImageFolder"] ?? ""));
string datasetName = cfg["DatasetName"] ?? "NIH ChestX-ray14";

// Load CSV and build data store at startup
var rows = CsvLoader.Load(csvPath);
DataStore.Initialise(rows, imageFolder, datasetName);

var app = builder.Build();

if (app.Environment.IsDevelopment())
    app.MapOpenApi();

app.UseCors("AngularAppPolicy");
app.UseStaticFiles();

// ─────────────────────────────────────────────
// ENDPOINTS
// ─────────────────────────────────────────────

// ── Health ──────────────────────────────────────────────────────────────
app.MapGet("/api/health", () => Results.Ok(new
{
    status = "Healthy",
    service = "ChestXRayPlatform API",
    version = "2.0.0",
    datasetName = DataStore.DatasetName,
    totalCases = DataStore.Cases.Count,
    totalImageRecords = DataStore.TotalCsvRows,
    availableImages = DataStore.AvailableImages,
    timestampUtc = DateTime.UtcNow
}));

// ── Visual model status ───────────────────────────────────────────────────
app.MapGet("/api/visual-search/status", async (IHttpClientFactory clients, CancellationToken cancellationToken) =>
{
    try
    {
        using var response = await clients.CreateClient("VisualSearch")
            .GetAsync("/api/visual-search/status", cancellationToken);
        using var document = await JsonDocument.ParseAsync(
            await response.Content.ReadAsStreamAsync(cancellationToken), cancellationToken: cancellationToken);
        return Results.Ok(document.RootElement.Clone());
    }
    catch (HttpRequestException)
    {
        return Results.Ok(new { status = "offline", message = "Start the ResNet-50/FAISS visual-search service on port 5100." });
    }
    catch (TaskCanceledException)
    {
        return Results.Ok(new { status = "loading", message = "Visual-search model is loading or building its image index." });
    }
});

// ── Research Cases — paginated list ─────────────────────────────────────
app.MapGet("/api/research-cases", (int page = 1, int pageSize = 20, string? condition = null, int? minFollowups = null) =>
{
    page = Math.Max(1, page);
    pageSize = Math.Clamp(pageSize, 1, 200);
    var query = DataStore.Cases.Values.AsEnumerable();

    if (!string.IsNullOrWhiteSpace(condition))
        query = query.Where(c => c.ConditionTags.Any(t =>
            t.Contains(condition, StringComparison.OrdinalIgnoreCase)));

    if (minFollowups.HasValue)
        query = query.Where(c => c.TotalExaminations >= minFollowups.Value + 1);

    int total = query.Count();
    var items = query
        .OrderBy(c => c.CaseIdentifier)
        .Skip((page - 1) * pageSize)
        .Take(pageSize)
        .Select(c => new
        {
            c.Id,
            c.CaseIdentifier,
            c.DatasetSource,
            c.TotalExaminations,
            c.ConditionTags,
            c.DemographicsAvailable,
            c.PatientAge,
            c.PatientGender,
            c.SimilarityScore,
            c.SimilarityLabel,
            c.IsDemoSimilarity,
            c.Examinations
        })
        .ToArray();

    return Results.Ok(new { page, pageSize, total, totalPages = (int)Math.Ceiling((double)total / pageSize), items });
});

// ── Single Research Case ─────────────────────────────────────────────────
app.MapGet("/api/research-cases/{caseId}", (string caseId) =>
{
    if (!DataStore.Cases.TryGetValue(caseId, out var c))
        return Results.NotFound(new { message = $"Case '{caseId}' was not found." });
    return Results.Ok(c);
});

// ── Examinations for a case ──────────────────────────────────────────────
app.MapGet("/api/research-cases/{caseId}/examinations", (string caseId) =>
{
    if (!DataStore.Cases.TryGetValue(caseId, out var c))
        return Results.NotFound(new { message = $"Case '{caseId}' was not found." });
    return Results.Ok(c.Examinations);
});

// ── Similar cases for a given case ──────────────────────────────────────
app.MapGet("/api/research-cases/{caseId}/similar", (string caseId, int topN = 10) =>
{
    if (!DataStore.Cases.TryGetValue(caseId, out var query))
        return Results.NotFound(new { message = $"Case '{caseId}' not found." });

    var similar = SimilarityEngine.FindSimilar(caseId, Math.Clamp(topN, 1, 50));
    return Results.Ok(new
    {
        queryCaseId = caseId,
        queryConditions = query.ConditionTags,
        similarityMethod = "label-jaccard (Phase 2)",
        totalResults = similar.Count,
        results = similar
    });
});

// ── Serve real PNG images ────────────────────────────────────────────────
app.MapGet("/api/images/file/{fileName}", (string fileName) =>
{
    string safe = Path.GetFileName(Uri.UnescapeDataString(fileName));
    string filePath = Path.Combine(DataStore.ImageFolder, safe);

    if (!File.Exists(filePath))
        return Results.NotFound(new { message = $"Image '{safe}' is not available on disk." });

    return Results.File(File.OpenRead(filePath), "image/png", safe);
});

// ── Image metadata ───────────────────────────────────────────────────────
app.MapGet("/api/images/{imageIndex}", (string imageIndex) =>
{
    string safe = Path.GetFileName(Uri.UnescapeDataString(imageIndex));
    bool exists = File.Exists(Path.Combine(DataStore.ImageFolder, safe));

    var exam = DataStore.Cases.Values
        .SelectMany(c => c.Examinations)
        .FirstOrDefault(e => e.ImageIndex.Equals(safe, StringComparison.OrdinalIgnoreCase));

    if (exam is null)
        return Results.NotFound(new { message = $"Image metadata for '{safe}' was not found in the dataset." });

    return Results.Ok(new
    {
        imageIndex = safe,
        imageUrl = $"/api/images/file/{Uri.EscapeDataString(safe)}",
        availabilityStatus = exists ? "Available" : "NotAvailable",
        findingLabels = exam.FindingLabels,
        viewType = exam.ViewType,
        width = exam.Width,
        height = exam.Height,
        pixelSpacing = exam.PixelSpacing,
        caseId = exam.CaseId,
        examinationId = exam.Id
    });
});

// ── Dataset metadata ─────────────────────────────────────────────────────
app.MapGet("/api/dataset/metadata", () =>
{
    var topConditions = DataStore.Cases.Values
        .SelectMany(c => c.ConditionTags)
        .GroupBy(t => t)
        .OrderByDescending(g => g.Count())
        .Take(20)
        .Select(g => new { condition = g.Key, count = g.Count() });

    int casesWithFollowups = DataStore.Cases.Values.Count(c => c.TotalExaminations > 1);

    return Results.Ok(new
    {
        datasetName = DataStore.DatasetName,
        totalCases = DataStore.Cases.Count,
        casesWithFollowups,
        totalImageRecords = DataStore.TotalCsvRows,
        availableImageFiles = DataStore.AvailableImages,
        topConditions,
        importStatus = "Loaded from CSV at startup (Phase 2 — in-memory)",
        note = "SQL Server persistence is planned for Phase 3."
    });
});

// ── Similarity Search — POST ─────────────────────────────────────────────
// Body: { "findingLabels": ["Cardiomegaly","Effusion"], "topN": 10 }
app.MapPost("/api/search/similar-cases", (JsonElement body) =>
{
    if (body.ValueKind != JsonValueKind.Object)
        return Results.BadRequest(new { message = "Request body must be a JSON object." });

    string[] labels = [];
    int topN = 10;
    string? queryCaseId = null;

    if (body.TryGetProperty("findingLabels", out var labelsEl) && labelsEl.ValueKind == JsonValueKind.Array)
        labels = labelsEl.EnumerateArray()
            .Where(e => e.ValueKind == JsonValueKind.String)
            .Select(e => e.GetString() ?? "")
            .Where(s => s != "")
            .ToArray();

    if (body.TryGetProperty("topN", out var topNEl) && topNEl.TryGetInt32(out var requestedTopN))
        topN = Math.Clamp(requestedTopN, 1, 50);

    if (body.TryGetProperty("queryCaseId", out var qcEl) && qcEl.ValueKind == JsonValueKind.String)
        queryCaseId = qcEl.GetString();

    var results = queryCaseId != null
        ? SimilarityEngine.FindSimilar(queryCaseId, topN)
        : SimilarityEngine.FindSimilarByLabels(labels, topN);

    return Results.Ok(new
    {
        queryLabels = labels,
        queryCaseId,
        totalResults = results.Count,
        similarityMethod = "label-jaccard (Phase 2 — not visual AI)",
        note = "Phase 3 will replace this with deep-learning visual embeddings.",
        results
    });
});

// ── Image Upload ─────────────────────────────────────────────────────────
app.MapPost("/api/upload", async (HttpRequest request, IHttpClientFactory clients, CancellationToken cancellationToken) =>
{
    if (!request.HasFormContentType)
        return Results.BadRequest(new { message = "Request must be multipart/form-data." });

    var form = await request.ReadFormAsync();
    var file = form.Files.FirstOrDefault();
    if (file is null)
        return Results.BadRequest(new { message = "No file was included in the request." });

    var allowed = new[] { "image/jpeg", "image/png", "image/jpg" };
    if (!allowed.Contains(file.ContentType?.ToLower() ?? ""))
        return Results.BadRequest(new { message = $"Unsupported file type '{file.ContentType}'. Use JPEG or PNG." });

    var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
    if (extension is not (".jpg" or ".jpeg" or ".png"))
        return Results.BadRequest(new { message = "The file name must use a .jpg, .jpeg, or .png extension." });

    if (file.Length == 0)
        return Results.BadRequest(new { message = "The uploaded file is empty." });

    if (file.Length > 20 * 1024 * 1024)
        return Results.BadRequest(new { message = "File exceeds the 20 MB limit." });

    // Read once so the same uploaded bytes are stored and sent to the visual model.
    byte[] fileBytes;
    using (var ms = new MemoryStream())
    {
        await file.CopyToAsync(ms, cancellationToken);
        fileBytes = ms.ToArray();
    }

    var uploads = Path.Combine(AppContext.BaseDirectory, "uploads");
    Directory.CreateDirectory(uploads);
    var storageKey = $"{Guid.NewGuid()}{extension}";
    var savePath = Path.Combine(uploads, storageKey);
    await File.WriteAllBytesAsync(savePath, fileBytes, cancellationToken);

    VisualSearchResponse visualResults;
    try
    {
        visualResults = await VisualSearchClient.SearchAsync(
            clients.CreateClient("VisualSearch"), fileBytes, file.ContentType!, file.FileName, 20, cancellationToken);
    }
    catch (HttpRequestException)
    {
        return Results.Problem(
            title: "Visual search service is unavailable",
            detail: "Start the ResNet-50/FAISS service on localhost:5100. Synthetic image-hash results are disabled because they are not visual matches.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (TaskCanceledException)
    {
        return Results.Problem(
            title: "Visual search service is still loading",
            detail: "The model or dataset index did not become ready before the request timed out. Wait for indexing to finish and retry.",
            statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (JsonException)
    {
        return Results.Problem(
            title: "Invalid response from visual search service",
            statusCode: StatusCodes.Status502BadGateway);
    }

    return Results.Ok(new
    {
        storageKey,
        fileName = file.FileName,
        sizeBytes = file.Length,
        contentType = file.ContentType,
        uploadedAt = DateTime.UtcNow,
        status = "analyzed",
        similarityMethod = visualResults.Method,
        totalResults = visualResults.Results.Count,
        results = visualResults.Results
    });
});

// ── Re-fetch similar cases for an already-uploaded image ─────────────────
    app.MapGet("/api/upload/{storageKey}/similar", async (string storageKey, int topN, IHttpClientFactory clients, CancellationToken cancellationToken) =>
{
    var uploads = Path.Combine(AppContext.BaseDirectory, "uploads");
    var path = Path.Combine(uploads, Path.GetFileName(storageKey));
    if (!File.Exists(path))
        return Results.NotFound(new { message = $"Stored image '{storageKey}' not found." });

    var extension = Path.GetExtension(path).ToLowerInvariant();
    var contentType = extension == ".png" ? "image/png" : "image/jpeg";
    try
    {
        var visualResults = await VisualSearchClient.SearchAsync(
            clients.CreateClient("VisualSearch"), await File.ReadAllBytesAsync(path, cancellationToken),
            contentType, Path.GetFileName(path), Math.Clamp(topN, 1, 50), cancellationToken);
        return Results.Ok(new
        {
            storageKey,
            similarityMethod = visualResults.Method,
            totalResults = visualResults.Results.Count,
            results = visualResults.Results
        });
    }
    catch (HttpRequestException)
    {
        return Results.Problem(title: "Visual search service is unavailable", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (TaskCanceledException)
    {
        return Results.Problem(title: "Visual search service is still loading", statusCode: StatusCodes.Status503ServiceUnavailable);
    }
    catch (JsonException)
    {
        return Results.Problem(title: "Invalid response from visual search service", statusCode: StatusCodes.Status502BadGateway);
    }
});

app.Run();

record VisualSearchResponse(string Method, List<ResearchCaseDto> Results);

static class VisualSearchClient
{
    public static async Task<VisualSearchResponse> SearchAsync(
        HttpClient client,
        byte[] imageBytes,
        string contentType,
        string fileName,
        int topN,
        CancellationToken cancellationToken)
    {
        using var form = new MultipartFormDataContent();
        var imagePart = new ByteArrayContent(imageBytes);
        imagePart.Headers.ContentType = new MediaTypeHeaderValue(contentType);
        form.Add(imagePart, "file", Path.GetFileName(fileName));
        form.Add(new StringContent(Math.Clamp(topN, 1, 50).ToString(CultureInfo.InvariantCulture)), "topN");

        using var response = await client.PostAsync("/api/visual-search/similar", form, cancellationToken);
        if (!response.IsSuccessStatusCode)
            throw new HttpRequestException("Visual search service returned an unsuccessful response.", null, response.StatusCode);

        await using var responseStream = await response.Content.ReadAsStreamAsync(cancellationToken);
        using var document = await JsonDocument.ParseAsync(responseStream, cancellationToken: cancellationToken);
        var root = document.RootElement;
        var method = root.TryGetProperty("method", out var methodElement)
            ? methodElement.GetString() ?? "ResNet-50 visual embeddings + FAISS cosine similarity"
            : "ResNet-50 visual embeddings + FAISS cosine similarity";
        var results = new List<ResearchCaseDto>();

        if (root.TryGetProperty("results", out var resultArray) && resultArray.ValueKind == JsonValueKind.Array)
        {
            foreach (var hit in resultArray.EnumerateArray())
            {
                if (!hit.TryGetProperty("caseId", out var caseIdElement) ||
                    caseIdElement.ValueKind != JsonValueKind.String)
                    continue;

                var caseId = caseIdElement.GetString();
                if (caseId is null || !DataStore.Cases.TryGetValue(caseId, out var researchCase))
                    continue;

                var score = hit.TryGetProperty("score", out var scoreElement) && scoreElement.TryGetDouble(out var parsedScore)
                    ? Math.Clamp(parsedScore, 0, 1)
                    : 0;
                results.Add(researchCase with
                {
                    SimilarityScore = Math.Round(score, 4),
                    SimilarityLabel = SimilarityEngine.Label(score),
                    IsDemoSimilarity = false
                });
            }
        }

        return new VisualSearchResponse(method, results);
    }
}



// ─────────────────────────────────────────────
// Supporting classes (after top-level statements)
// ─────────────────────────────────────────────

// ─── MODELS ──────────────────────────────────────────────────────────────

record CsvRow(
    string ImageIndex,
    string FindingLabels,
    int FollowUpNumber,
    string PatientId,
    int? PatientAge,
    string? PatientGender,
    string? ViewPosition,
    int? ImageWidth,
    int? ImageHeight,
    double? PixelSpacingX,
    double? PixelSpacingY);

record ExaminationDto(
    string Id,
    string CaseId,
    int SequenceIndex,
    string ImageIndex,
    string ImageUrl,
    string ThumbnailUrl,
    string ViewType,
    int? Width,
    int? Height,
    string? PixelSpacing,
    string FindingLabels,
    string FollowUpLabel,
    bool ImageAvailable);

record ResearchCaseDto(
    string Id,
    string CaseIdentifier,
    string DatasetSource,
    int TotalExaminations,
    string[] FindingLabels,
    string[] ConditionTags,
    bool DemographicsAvailable,
    int? PatientAge,
    string? PatientGender,
    bool IsDemoSimilarity,
    double? SimilarityScore,
    string? SimilarityLabel,
    ExaminationDto[] Examinations);

// ─── CSV LOADER ───────────────────────────────────────────────────────────
static class CsvLoader
{
    public static List<CsvRow> Load(string csvPath)
    {
        var rows = new List<CsvRow>();
        if (!File.Exists(csvPath))
        {
            Console.WriteLine($"[WARNING] CSV not found at: {csvPath}");
            return rows;
        }

        var lines = File.ReadAllLines(csvPath);
        // Header: Image Index,Finding Labels,Follow-up #,Patient ID,Patient Age,Patient Gender,
        //         View Position,OriginalImageWidth,OriginalImageHeight,
        //         OriginalImagePixelSpacing_x,OriginalImagePixelSpacing_y
        for (int i = 1; i < lines.Length; i++)
        {
            var p = lines[i].Split(',');
            if (p.Length < 11) continue;

            rows.Add(new CsvRow(
                ImageIndex:    p[0].Trim(),
                FindingLabels: p[1].Trim(),
                FollowUpNumber: int.TryParse(p[2].Trim(), out var fu) ? fu : 0,
                PatientId:     p[3].Trim(),
                PatientAge:    ParseAge(p[4].Trim()),
                PatientGender: p[5].Trim() is { Length: > 0 } g ? g : null,
                ViewPosition:  p[6].Trim() is { Length: > 0 } v ? v : null,
                ImageWidth:    int.TryParse(p[7].Trim(), out var w) ? w : null,
                ImageHeight:   int.TryParse(p[8].Trim(), out var h) ? h : null,
                PixelSpacingX: double.TryParse(p[9].Trim(), NumberStyles.Any, CultureInfo.InvariantCulture, out var px) ? px : null,
                PixelSpacingY: double.TryParse(p[10].Trim(), NumberStyles.Any, CultureInfo.InvariantCulture, out var py) ? py : null));
        }
        Console.WriteLine($"[INFO] CSV loaded: {rows.Count} rows.");
        return rows;
    }

    static int? ParseAge(string raw)
    {
        // format "060Y" — strip non-digits
        var digits = new string(raw.Where(char.IsDigit).ToArray());
        return int.TryParse(digits, out var a) ? a : null;
    }
}

// ─── IN-MEMORY DATA STORE ─────────────────────────────────────────────────
static class DataStore
{
    public static Dictionary<string, ResearchCaseDto> Cases { get; private set; } = new();
    public static string ImageFolder { get; private set; } = string.Empty;
    public static string DatasetName { get; private set; } = "NIH ChestX-ray14";
    public static int TotalCsvRows { get; private set; }
    public static int AvailableImages { get; private set; }

    public static void Initialise(List<CsvRow> rows, string imageFolder, string datasetName)
    {
        ImageFolder = imageFolder;
        DatasetName = datasetName;
        TotalCsvRows = rows.Count;

        // Group rows by Patient ID, sort each group by Follow-up #
        var groups = rows
            .GroupBy(r => r.PatientId)
            .ToDictionary(g => g.Key, g => g.OrderBy(r => r.FollowUpNumber).ToList());

        int imgAvailable = 0;
        foreach (var (patientId, examRows) in groups)
        {
            string caseId = $"PAT-{patientId}";
            int total = examRows.Count;

            var allFindings = examRows
                .SelectMany(r => r.FindingLabels.Split('|', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .OrderBy(f => f)
                .ToArray();

            var exams = new List<ExaminationDto>();
            int seq = 1;
            foreach (var row in examRows)
            {
                bool imgFound = File.Exists(Path.Combine(imageFolder, row.ImageIndex));
                if (imgFound) imgAvailable++;

                string followUpLabel = seq == 1
                    ? $"Baseline (1 of {total})"
                    : $"Follow-up {seq - 1} ({seq} of {total})";

                string? pixelSpacing = row.PixelSpacingX.HasValue
                    ? $"{row.PixelSpacingX:F3} x {row.PixelSpacingY:F3} mm"
                    : null;

                exams.Add(new ExaminationDto(
                    Id:           $"{caseId}-{seq}",
                    CaseId:       caseId,
                    SequenceIndex: seq,
                    ImageIndex:   row.ImageIndex,
                    ImageUrl:     $"/api/images/file/{Uri.EscapeDataString(row.ImageIndex)}",
                    ThumbnailUrl: $"/api/images/file/{Uri.EscapeDataString(row.ImageIndex)}",
                    ViewType:     row.ViewPosition ?? "Unknown",
                    Width:        row.ImageWidth,
                    Height:       row.ImageHeight,
                    PixelSpacing: pixelSpacing,
                    FindingLabels: row.FindingLabels,
                    FollowUpLabel: followUpLabel,
                    ImageAvailable: imgFound));
                seq++;
            }

            var first = examRows.First();
            Cases[caseId] = new ResearchCaseDto(
                Id:                  caseId,
                CaseIdentifier:      $"CXR-{patientId}",
                DatasetSource:       datasetName,
                TotalExaminations:   total,
                FindingLabels:       allFindings,
                ConditionTags:       allFindings,
                DemographicsAvailable: first.PatientAge.HasValue || !string.IsNullOrEmpty(first.PatientGender),
                PatientAge:          first.PatientAge,
                PatientGender:       first.PatientGender,
                IsDemoSimilarity:    false,
                SimilarityScore:     null,
                SimilarityLabel:     null,
                Examinations:        exams.ToArray());
        }

        AvailableImages = imgAvailable;
        Console.WriteLine($"[INFO] DataStore ready: {Cases.Count} cases, {imgAvailable} images on disk.");
    }
}

// ─── SIMILARITY ENGINE — Jaccard on finding labels ────────────────────────
// Phase 3 will replace this with deep-learning visual embeddings (e.g. ResNet/DenseNet).
static class SimilarityEngine
{
    public static double JaccardScore(string[] a, string[] b)
    {
        if (a.Length == 0 && b.Length == 0) return 1.0;
        var sa = new HashSet<string>(a, StringComparer.OrdinalIgnoreCase);
        var sb = new HashSet<string>(b, StringComparer.OrdinalIgnoreCase);
        int intersection = sa.Intersect(sb, StringComparer.OrdinalIgnoreCase).Count();
        int union = sa.Union(sb, StringComparer.OrdinalIgnoreCase).Count();
        return union == 0 ? 0 : (double)intersection / union;
    }

    public static string Label(double score) =>
        score >= 0.7 ? "High" : score >= 0.4 ? "Moderate" : "Low";

    public static List<ResearchCaseDto> FindSimilar(string queryCaseId, int topN = 10)
    {
        if (!DataStore.Cases.TryGetValue(queryCaseId, out var q)) return [];

        return DataStore.Cases
            .Where(kv => kv.Key != queryCaseId)
            .Select(kv =>
            {
                double s = JaccardScore(q.ConditionTags, kv.Value.ConditionTags);
                return kv.Value with
                {
                    SimilarityScore = Math.Round(s, 2),
                    SimilarityLabel = Label(s),
                    IsDemoSimilarity = false,
                    Examinations = kv.Value.Examinations  // keep exams
                };
            })
            .OrderByDescending(c => c.SimilarityScore)
            .ThenByDescending(c => c.TotalExaminations)
            .Take(topN)
            .ToList();
    }

    public static List<ResearchCaseDto> FindSimilarByLabels(string[] labels, int topN = 10)
    {
        labels = labels.Where(label => !string.IsNullOrWhiteSpace(label)).Distinct(StringComparer.OrdinalIgnoreCase).ToArray();
        if (labels.Length == 0) return [];

        return DataStore.Cases.Values
            .Select(c =>
            {
                double s = JaccardScore(labels, c.ConditionTags);
                return c with
                {
                    SimilarityScore = Math.Round(s, 2),
                    SimilarityLabel = Label(s),
                    IsDemoSimilarity = false
                };
            })
            .Where(c => c.SimilarityScore > 0)
            .OrderByDescending(c => c.SimilarityScore)
            .ThenByDescending(c => c.TotalExaminations)
            .Take(topN)
            .ToList();
    }
}
