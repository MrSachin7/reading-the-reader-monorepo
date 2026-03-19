using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentStateCheckpointWorker : BackgroundService
{
    private readonly IExperimentSessionManager _sessionManager;
    private readonly IExperimentStateStoreAdapter _stateStoreAdapter;
    private readonly TimeSpan _checkpointInterval;

    public ExperimentStateCheckpointWorker(
        IExperimentSessionManager sessionManager,
        IExperimentStateStoreAdapter stateStoreAdapter,
        IOptions<ExperimentPersistenceOptions> options)
    {
        _sessionManager = sessionManager;
        _stateStoreAdapter = stateStoreAdapter;

        var intervalMs = options.Value.CheckpointIntervalMilliseconds;
        if (intervalMs < 250)
        {
            intervalMs = 250;
        }

        _checkpointInterval = TimeSpan.FromMilliseconds(intervalMs);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_checkpointInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var hasNextTick = await timer.WaitForNextTickAsync(stoppingToken);
                if (!hasNextTick)
                {
                    break;
                }

                var snapshot = _sessionManager.GetCurrentSnapshot();
                await _stateStoreAdapter.SaveSnapshotAsync(snapshot, stoppingToken);
            }
            catch (OperationCanceledException)
            {
                break;
            }
            catch
            {
                // Best-effort checkpointing should never crash the process.
            }
        }
    }
}
