using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileSnapshotExperimentStateStoreAdapter : IExperimentStateStoreAdapter
{
    private const string ActiveReplayFileName = "experiment-session-live.json";

    private readonly string _activeReplayDirectoryPath;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private string? _latestActiveReplayFilePath;

    public FileSnapshotExperimentStateStoreAdapter(string activeReplayDirectoryPath)
    {
        _activeReplayDirectoryPath = activeReplayDirectoryPath;
    }

    public async ValueTask SaveActiveReplayAsync(ExperimentReplayExport exportDocument, CancellationToken ct = default)
    {
        var filePath = BuildActiveReplayFilePath(exportDocument);

        await _gate.WaitAsync(ct);
        try
        {
            await WriteJsonFileAsync(filePath, exportDocument, ct);
            _latestActiveReplayFilePath = filePath;
        }
        finally
        {
            _gate.Release();
        }
    }

    public async ValueTask<ExperimentReplayExport?> LoadActiveReplayAsync(CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var filePath = _latestActiveReplayFilePath ?? FindLatestActiveReplayFilePath();
            if (string.IsNullOrWhiteSpace(filePath) || !File.Exists(filePath))
            {
                return null;
            }

            _latestActiveReplayFilePath = filePath;

            await using var stream = new FileStream(
                filePath,
                FileMode.Open,
                FileAccess.Read,
                FileShare.ReadWrite | FileShare.Delete);

            return await JsonSerializer.DeserializeAsync<ExperimentReplayExport>(stream, _jsonOptions, ct);
        }
        finally
        {
            _gate.Release();
        }
    }

    public async ValueTask ClearActiveReplayAsync(CancellationToken ct = default)
    {
        await _gate.WaitAsync(ct);
        try
        {
            var filePath = _latestActiveReplayFilePath ?? FindLatestActiveReplayFilePath();
            if (string.IsNullOrWhiteSpace(filePath))
            {
                return;
            }

            DeleteIfExists(filePath);

            var sessionDirectory = Path.GetDirectoryName(filePath);
            if (!string.IsNullOrWhiteSpace(sessionDirectory) &&
                Directory.Exists(sessionDirectory) &&
                !Directory.EnumerateFileSystemEntries(sessionDirectory).Any())
            {
                Directory.Delete(sessionDirectory);
            }

            _latestActiveReplayFilePath = null;
        }
        finally
        {
            _gate.Release();
        }
    }

    private string BuildActiveReplayFilePath(ExperimentReplayExport exportDocument)
    {
        var sessionIdSegment = exportDocument.Experiment.SessionId?.ToString("N") ?? "unknown-session";
        return Path.Combine(_activeReplayDirectoryPath, sessionIdSegment, ActiveReplayFileName);
    }

    private string? FindLatestActiveReplayFilePath()
    {
        if (!Directory.Exists(_activeReplayDirectoryPath))
        {
            return null;
        }

        return Directory
            .EnumerateFiles(_activeReplayDirectoryPath, ActiveReplayFileName, SearchOption.AllDirectories)
            .Select(path => new FileInfo(path))
            .OrderByDescending(file => file.LastWriteTimeUtc)
            .Select(file => file.FullName)
            .FirstOrDefault();
    }

    private async ValueTask WriteJsonFileAsync<T>(string path, T value, CancellationToken ct)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var tempPath = Path.Combine(
            directory ?? _activeReplayDirectoryPath,
            $"{Path.GetFileName(path)}.{Guid.NewGuid():N}.tmp");

        try
        {
            await using (var stream = new FileStream(tempPath, FileMode.CreateNew, FileAccess.Write, FileShare.None))
            {
                await JsonSerializer.SerializeAsync(stream, value, _jsonOptions, ct);
            }

            await ReplaceFileWithRetryAsync(tempPath, path, ct);
        }
        finally
        {
            DeleteIfExists(tempPath);
        }
    }

    private static async ValueTask ReplaceFileWithRetryAsync(string tempPath, string destinationPath, CancellationToken ct)
    {
        const int maxAttempts = 5;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                File.Move(tempPath, destinationPath, overwrite: true);
                return;
            }
            catch (Exception ex) when ((ex is IOException or UnauthorizedAccessException) && attempt < maxAttempts)
            {
                await Task.Delay(20, ct);
            }
        }

        File.Move(tempPath, destinationPath, overwrite: true);
    }

    private static void DeleteIfExists(string path)
    {
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }
}
