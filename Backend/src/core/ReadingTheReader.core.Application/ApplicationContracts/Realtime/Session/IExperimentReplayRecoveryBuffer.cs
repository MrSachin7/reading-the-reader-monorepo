namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public interface IExperimentReplayRecoveryBuffer
{
    ValueTask FlushPendingReplayChunksAsync(CancellationToken ct = default);
}
