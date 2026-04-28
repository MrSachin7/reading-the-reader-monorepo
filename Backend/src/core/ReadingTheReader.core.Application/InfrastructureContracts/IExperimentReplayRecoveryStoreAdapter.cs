using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

namespace ReadingTheReader.core.Application.InfrastructureContracts;

public interface IExperimentReplayRecoveryStoreAdapter
{
    ValueTask InitializeSessionAsync(ExperimentReplayRecoverySessionSeed seed, CancellationToken ct = default);

    ValueTask AppendChunkAsync(ExperimentReplayRecoveryChunkBatch batch, CancellationToken ct = default);

    ValueTask<ExperimentReplayExport?> BuildExportAsync(
        Guid sessionId,
        string completionSource,
        long exportedAtUnixMs,
        CancellationToken ct = default);

    ValueTask<ExperimentProcessedExport?> BuildProcessedExportAsync(
        Guid sessionId,
        string completionSource,
        long exportedAtUnixMs,
        CancellationToken ct = default);

    ValueTask MarkCompletedAsync(
        Guid sessionId,
        ExperimentReplayExport completedExport,
        long completedAtUnixMs,
        CancellationToken ct = default);
}
