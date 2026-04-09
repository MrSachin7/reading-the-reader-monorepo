using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentReplayRecoveryFlushWorker : BackgroundService
{
    private readonly IExperimentReplayRecoveryBuffer _replayRecoveryBuffer;
    private readonly TimeSpan _flushInterval;

    public ExperimentReplayRecoveryFlushWorker(
        IExperimentReplayRecoveryBuffer replayRecoveryBuffer,
        IOptions<ExperimentPersistenceOptions> options)
    {
        _replayRecoveryBuffer = replayRecoveryBuffer;

        var intervalMs = options.Value.ReplayRecoveryFlushIntervalMilliseconds;
        if (intervalMs < 1000)
        {
            intervalMs = 1000;
        }

        _flushInterval = TimeSpan.FromMilliseconds(intervalMs);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_flushInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var hasNextTick = await timer.WaitForNextTickAsync(stoppingToken);
                if (!hasNextTick)
                {
                    break;
                }

                await _replayRecoveryBuffer.FlushPendingReplayChunksAsync(stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch
            {
                // Best-effort flushes should not crash the process.
            }
        }
    }
}
