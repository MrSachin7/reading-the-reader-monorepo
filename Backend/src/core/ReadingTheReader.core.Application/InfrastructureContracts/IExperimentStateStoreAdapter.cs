using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IExperimentStateStoreAdapter
{
    ValueTask SaveActiveReplayAsync(ExperimentReplayExport exportDocument, CancellationToken ct = default);

    ValueTask<ExperimentReplayExport?> LoadActiveReplayAsync(CancellationToken ct = default);

    ValueTask ClearActiveReplayAsync(CancellationToken ct = default);
}
