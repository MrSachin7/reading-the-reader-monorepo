using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileSnapshotExperimentStateStoreAdapter : IExperimentStateStoreAdapter
{
    private readonly string _snapshotFilePath;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    public FileSnapshotExperimentStateStoreAdapter(string snapshotFilePath)
    {
        _snapshotFilePath = snapshotFilePath;
    }

    public async ValueTask SaveSnapshotAsync(ExperimentSessionSnapshot snapshot, CancellationToken ct = default)
    {
        var directory = Path.GetDirectoryName(_snapshotFilePath);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var tempPath = $"{_snapshotFilePath}.tmp";
        await using (var stream = File.Create(tempPath))
        {
            await JsonSerializer.SerializeAsync(stream, snapshot, _jsonOptions, ct);
        }

        File.Move(tempPath, _snapshotFilePath, overwrite: true);
    }

    public async ValueTask<ExperimentSessionSnapshot?> LoadLatestSnapshotAsync(CancellationToken ct = default)
    {
        if (!File.Exists(_snapshotFilePath))
        {
            return null;
        }

        await using var stream = File.OpenRead(_snapshotFilePath);
        return await JsonSerializer.DeserializeAsync<ExperimentSessionSnapshot>(stream, _jsonOptions, ct);
    }
}
