using System.Text.RegularExpressions;
using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileExperimentReplayExportStoreAdapter : IExperimentReplayExportStoreAdapter
{
    private static readonly Regex InvalidFileNameCharactersRegex = new($"[{Regex.Escape(new string(Path.GetInvalidFileNameChars()))}]", RegexOptions.Compiled);
    private static readonly JsonSerializerOptions SummaryJsonOptions = new(JsonSerializerDefaults.Web);

    private readonly string _latestFilePath;
    private readonly string _savedDirectoryPath;
    private readonly IExperimentReplayExportSerializer _serializer;

    public FileExperimentReplayExportStoreAdapter(
        string latestFilePath,
        string savedDirectoryPath,
        IExperimentReplayExportSerializer serializer)
    {
        _latestFilePath = latestFilePath;
        _savedDirectoryPath = savedDirectoryPath;
        _serializer = serializer;
    }

    public async ValueTask SaveLatestAsync(ExperimentReplayExport exportDocument, CancellationToken ct = default)
    {
        var directory = Path.GetDirectoryName(_latestFilePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        await WriteContentAsync(
            _latestFilePath,
            _serializer.Serialize(exportDocument, ExperimentReplayExportFormats.Json),
            ct);
    }

    public async ValueTask<ExperimentReplayExport?> LoadLatestAsync(CancellationToken ct = default)
    {
        if (!File.Exists(_latestFilePath))
        {
            return null;
        }

        var content = await File.ReadAllTextAsync(_latestFilePath, ct);
        return _serializer.Deserialize(content, ExperimentReplayExportFormats.Json);
    }

    public async ValueTask<SavedExperimentReplayExportSummary> SaveNamedAsync(
        string name,
        string format,
        ExperimentReplayExport exportDocument,
        CancellationToken ct = default)
    {
        Directory.CreateDirectory(_savedDirectoryPath);

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var normalizedFormat = ExperimentReplayExportFormats.Normalize(format);
        var exportFileName = BuildUniqueFileName(name, normalizedFormat, exportDocument);
        var exportPath = Path.Combine(_savedDirectoryPath, exportFileName);
        await WriteContentAsync(exportPath, _serializer.Serialize(exportDocument, normalizedFormat), ct);
        var summary = ToSummary(exportFileName, normalizedFormat, exportDocument, now);

        if (normalizedFormat == ExperimentReplayExportFormats.Csv)
        {
            await WriteSummaryMetadataAsync(exportPath, summary, ct);
        }

        return summary;
    }

    public async ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedAsync(CancellationToken ct = default)
    {
        if (!Directory.Exists(_savedDirectoryPath))
        {
            return Array.Empty<SavedExperimentReplayExportSummary>();
        }

        var exportFiles = Directory
            .EnumerateFiles(_savedDirectoryPath, "*.*", SearchOption.TopDirectoryOnly)
            .Where(path =>
            {
                var extension = Path.GetExtension(path);
                return !path.EndsWith(".meta.json", StringComparison.OrdinalIgnoreCase) &&
                       (string.Equals(extension, ".json", StringComparison.OrdinalIgnoreCase) ||
                        string.Equals(extension, ".csv", StringComparison.OrdinalIgnoreCase));
            })
            .ToArray();
        var items = new List<SavedExperimentReplayExportSummary>(exportFiles.Length);

        foreach (var exportFile in exportFiles)
        {
            var format = GetFormatFromPath(exportFile);
            if (format == ExperimentReplayExportFormats.Csv)
            {
                var csvSummary = await ReadSummaryMetadataAsync(exportFile, ct);
                if (csvSummary is not null)
                {
                    items.Add(csvSummary);
                }

                continue;
            }

            var exportDocument = await ReadExportAsync(exportFile, ct);
            if (exportDocument is null)
            {
                continue;
            }

            items.Add(ToSummary(Path.GetFileName(exportFile), format, exportDocument, GetUpdatedAtUnixMs(exportFile)));
        }

        return items.OrderByDescending(item => item.UpdatedAtUnixMs).ToArray();
    }

    public async ValueTask<ExperimentReplayExport?> LoadSavedByIdAsync(string id, CancellationToken ct = default)
    {
        if (!Directory.Exists(_savedDirectoryPath))
        {
            return null;
        }

        var fileName = id.Trim();
        if (!fileName.Contains('.'))
        {
            var jsonPath = Path.Combine(_savedDirectoryPath, Path.GetFileName($"{fileName}.json"));
            if (File.Exists(jsonPath))
            {
                return await ReadExportAsync(jsonPath, ct);
            }

            var csvPath = Path.Combine(_savedDirectoryPath, Path.GetFileName($"{fileName}.csv"));
            if (File.Exists(csvPath))
            {
                return await ReadExportAsync(csvPath, ct);
            }
        }

        var exportPath = Path.Combine(_savedDirectoryPath, Path.GetFileName(fileName));
        return await ReadExportAsync(exportPath, ct);
    }

    private static SavedExperimentReplayExportSummary ToSummary(
        string fileName,
        string format,
        ExperimentReplayExport exportDocument,
        long updatedAtUnixMs)
    {
        return new SavedExperimentReplayExportSummary(
            fileName,
            string.IsNullOrWhiteSpace(exportDocument.Manifest.SavedName)
                ? Path.GetFileNameWithoutExtension(fileName)
                : exportDocument.Manifest.SavedName!,
            fileName,
            format,
            exportDocument.Experiment.SessionId,
            updatedAtUnixMs,
            updatedAtUnixMs,
            exportDocument.Manifest.ExportedAtUnixMs);
    }

    private string BuildUniqueFileName(string name, string format, ExperimentReplayExport exportDocument)
    {
        var participantName = exportDocument.Experiment.Participant?.Name ?? string.Empty;
        var slug = SanitizeFileNameSegment(participantName);
        if (string.Equals(slug, "experiment-file", StringComparison.Ordinal))
        {
            slug = SanitizeFileNameSegment(name);
        }

        return $"{slug}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ExperimentReplayExportFormats.GetFileExtension(format)}";
    }

    private static string SanitizeFileNameSegment(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        normalized = InvalidFileNameCharactersRegex.Replace(normalized, "-");
        normalized = Regex.Replace(normalized, @"\s+", "-");
        normalized = Regex.Replace(normalized, "-{2,}", "-");
        normalized = normalized.Trim('-', '.');
        return string.IsNullOrWhiteSpace(normalized) ? "experiment-file" : normalized;
    }

    private async ValueTask<ExperimentReplayExport?> ReadExportAsync(string path, CancellationToken ct)
    {
        if (!File.Exists(path))
        {
            return null;
        }

        var content = await File.ReadAllTextAsync(path, ct);
        return _serializer.Deserialize(content, GetFormatFromPath(path));
    }

    private static async ValueTask WriteContentAsync(string path, string content, CancellationToken ct)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var tempPath = $"{path}.tmp";
        await File.WriteAllTextAsync(tempPath, content, ct);

        File.Move(tempPath, path, overwrite: true);
    }

    private static string GetFormatFromPath(string path)
    {
        return string.Equals(Path.GetExtension(path), ".csv", StringComparison.OrdinalIgnoreCase)
            ? ExperimentReplayExportFormats.Csv
            : ExperimentReplayExportFormats.Json;
    }

    private static string GetMetadataPath(string exportPath)
    {
        return $"{exportPath}.meta.json";
    }

    private static async ValueTask WriteSummaryMetadataAsync(
        string exportPath,
        SavedExperimentReplayExportSummary summary,
        CancellationToken ct)
    {
        await WriteContentAsync(
            GetMetadataPath(exportPath),
            JsonSerializer.Serialize(summary, SummaryJsonOptions),
            ct);
    }

    private static async ValueTask<SavedExperimentReplayExportSummary?> ReadSummaryMetadataAsync(
        string exportPath,
        CancellationToken ct)
    {
        var metadataPath = GetMetadataPath(exportPath);
        if (!File.Exists(metadataPath))
        {
            return null;
        }

        var content = await File.ReadAllTextAsync(metadataPath, ct);
        return JsonSerializer.Deserialize<SavedExperimentReplayExportSummary>(content, SummaryJsonOptions);
    }

    private static long GetUpdatedAtUnixMs(string path)
    {
        return new DateTimeOffset(File.GetLastWriteTimeUtc(path)).ToUnixTimeMilliseconds();
    }
}
