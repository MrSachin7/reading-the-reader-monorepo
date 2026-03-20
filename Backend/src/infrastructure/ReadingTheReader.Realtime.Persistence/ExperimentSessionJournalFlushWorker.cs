using Microsoft.Extensions.Hosting;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentSessionJournalFlushWorker : BackgroundService
{
    private readonly FileExperimentSessionJournalStoreAdapter _journalStoreAdapter;
    private readonly TimeSpan _flushInterval;

    public ExperimentSessionJournalFlushWorker(
        FileExperimentSessionJournalStoreAdapter journalStoreAdapter,
        int flushIntervalMilliseconds)
    {
        _journalStoreAdapter = journalStoreAdapter;
        _flushInterval = TimeSpan.FromMilliseconds(Math.Max(50, flushIntervalMilliseconds));
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

                _journalStoreAdapter.FlushPending();
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch
            {
                // Best-effort flushing should never crash the process.
            }
        }

        _journalStoreAdapter.FlushPending();
    }
}
