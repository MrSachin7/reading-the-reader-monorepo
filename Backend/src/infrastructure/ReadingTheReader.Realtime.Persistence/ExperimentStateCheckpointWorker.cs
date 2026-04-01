using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Options;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class ExperimentStateCheckpointWorker : BackgroundService
{
    private readonly IExperimentSessionQueryService _sessionQueryService;
    private readonly IExperimentStateStoreAdapter _stateStoreAdapter;
    private readonly TimeSpan _checkpointInterval;

    public ExperimentStateCheckpointWorker(
        IExperimentSessionQueryService sessionQueryService,
        IExperimentStateStoreAdapter stateStoreAdapter,
        IOptions<ExperimentPersistenceOptions> options)
    {
        _sessionQueryService = sessionQueryService;
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

                var snapshot = _sessionQueryService.GetCurrentSnapshot();
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
