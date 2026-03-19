using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class InMemoryExperimentReplayExportStoreAdapter : IExperimentReplayExportStoreAdapter
{
    private readonly object _gate = new();
    private readonly IExperimentReplayExportSerializer _serializer;
    private ExperimentReplayExport? _latest;
    private readonly Dictionary<string, (SavedExperimentReplayExportSummary Summary, string SerializedContent)> _saved = [];

    public InMemoryExperimentReplayExportStoreAdapter(IExperimentReplayExportSerializer serializer)
    {
        _serializer = serializer;
    }

    public ValueTask SaveLatestAsync(ExperimentReplayExport exportDocument, CancellationToken ct = default)
    {
        lock (_gate)
        {
            _latest = exportDocument.Copy();
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask<ExperimentReplayExport?> LoadLatestAsync(CancellationToken ct = default)
    {
        lock (_gate)
        {
            return ValueTask.FromResult(_latest?.Copy());
        }
    }

    public ValueTask<SavedExperimentReplayExportSummary> SaveNamedAsync(
        string name,
        string format,
        ExperimentReplayExport exportDocument,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var id = Guid.NewGuid().ToString("N");
            var normalizedFormat = ExperimentReplayExportFormats.Normalize(format);
            var summary = new SavedExperimentReplayExportSummary(
                id,
                name.Trim(),
                $"experiment-replay-export-{id[..8]}{ExperimentReplayExportFormats.GetFileExtension(normalizedFormat)}",
                normalizedFormat,
                exportDocument.Metadata.SessionId,
                now,
                now,
                exportDocument.Metadata.ExportedAtUnixMs);

            _saved[id] = (summary, _serializer.Serialize(exportDocument, normalizedFormat));
            return ValueTask.FromResult(summary.Copy());
        }
    }

    public ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedAsync(CancellationToken ct = default)
    {
        lock (_gate)
        {
            return ValueTask.FromResult<IReadOnlyCollection<SavedExperimentReplayExportSummary>>(
                [.. _saved.Values
                    .Select(item => item.Summary.Copy())
                    .OrderByDescending(item => item.UpdatedAtUnixMs)]);
        }
    }

    public ValueTask<ExperimentReplayExport?> LoadSavedByIdAsync(string id, CancellationToken ct = default)
    {
        lock (_gate)
        {
            return ValueTask.FromResult(
                _saved.TryGetValue(id, out var entry)
                    ? _serializer.Deserialize(entry.SerializedContent, entry.Summary.Format)
                    : null);
        }
    }
}
