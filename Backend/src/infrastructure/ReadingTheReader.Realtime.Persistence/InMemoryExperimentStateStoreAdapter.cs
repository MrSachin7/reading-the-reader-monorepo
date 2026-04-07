using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class InMemoryExperimentStateStoreAdapter : IExperimentStateStoreAdapter
{
    private readonly object _gate = new();
    private ExperimentReplayExport? _latest;

    public ValueTask SaveActiveReplayAsync(ExperimentReplayExport exportDocument, CancellationToken ct = default)
    {
        lock (_gate)
        {
            _latest = exportDocument.Copy();
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask<ExperimentReplayExport?> LoadActiveReplayAsync(CancellationToken ct = default)
    {
        lock (_gate)
        {
            return ValueTask.FromResult(_latest?.Copy());
        }
    }

    public ValueTask ClearActiveReplayAsync(CancellationToken ct = default)
    {
        lock (_gate)
        {
            _latest = null;
        }

        return ValueTask.CompletedTask;
    }
}
