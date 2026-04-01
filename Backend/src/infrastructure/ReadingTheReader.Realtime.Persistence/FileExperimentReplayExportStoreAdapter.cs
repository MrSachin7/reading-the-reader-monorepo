using System.Text.RegularExpressions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileExperimentReplayExportStoreAdapter : IExperimentReplayExportStoreAdapter
{
    private static readonly Regex InvalidFileNameCharactersRegex = new($"[{Regex.Escape(new string(Path.GetInvalidFileNameChars()))}]", RegexOptions.Compiled);

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
        DeleteLegacyMetadataFiles();

        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var normalizedFormat = ExperimentReplayExportFormats.Normalize(format);
        var exportFileName = BuildUniqueFileName(name, normalizedFormat);
        var exportPath = Path.Combine(_savedDirectoryPath, exportFileName);
        await WriteContentAsync(exportPath, _serializer.Serialize(exportDocument, normalizedFormat), ct);
        return ToSummary(exportFileName, normalizedFormat, exportDocument, now);
    }

    public async ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedAsync(CancellationToken ct = default)
    {
        if (!Directory.Exists(_savedDirectoryPath))
        {
            return Array.Empty<SavedExperimentReplayExportSummary>();
        }

        DeleteLegacyMetadataFiles();

        var exportFiles = Directory
            .EnumerateFiles(_savedDirectoryPath, "*.*", SearchOption.TopDirectoryOnly)
            .Where(path => string.Equals(Path.GetExtension(path), ".json", StringComparison.OrdinalIgnoreCase))
            .ToArray();
        var items = new List<SavedExperimentReplayExportSummary>(exportFiles.Length);

        foreach (var exportFile in exportFiles)
        {
            var exportDocument = await ReadExportAsync(exportFile, ct);
            if (exportDocument is null)
            {
                continue;
            }

            var format = GetFormatFromPath(exportFile);
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

        DeleteLegacyMetadataFiles();

        var fileName = id.Trim();
        if (!fileName.EndsWith(".json", StringComparison.OrdinalIgnoreCase))
        {
            fileName = $"{fileName}.json";
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

    private string BuildUniqueFileName(string name, string format)
    {
        var slug = SanitizeFileNameSegment(name);
        return $"{slug}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}{ExperimentReplayExportFormats.GetFileExtension(format)}";
    }

    private static string SanitizeFileNameSegment(string value)
    {
        var normalized = value.Trim().ToLowerInvariant();
        normalized = InvalidFileNameCharactersRegex.Replace(normalized, "-");
        normalized = Regex.Replace(normalized, @"\s+", "-");
        normalized = Regex.Replace(normalized, "-{2,}", "-");
        normalized = normalized.Trim('-', '.');
        return string.IsNullOrWhiteSpace(normalized) ? "experiment-replay-export" : normalized;
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
        return ExperimentReplayExportFormats.Json;
    }

    private void DeleteLegacyMetadataFiles()
    {
        if (!Directory.Exists(_savedDirectoryPath))
        {
            return;
        }

        foreach (var metadataFile in Directory.GetFiles(_savedDirectoryPath, "*.meta.json", SearchOption.TopDirectoryOnly))
        {
            File.Delete(metadataFile);
        }
    }

    private static long GetUpdatedAtUnixMs(string path)
    {
        return new DateTimeOffset(File.GetLastWriteTimeUtc(path)).ToUnixTimeMilliseconds();
    }
}
