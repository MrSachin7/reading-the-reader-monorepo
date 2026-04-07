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
    private readonly TimeSpan _activeReplayInterval;

    public ExperimentStateCheckpointWorker(
        IExperimentSessionQueryService sessionQueryService,
        IExperimentStateStoreAdapter stateStoreAdapter,
        IOptions<ExperimentPersistenceOptions> options)
    {
        _sessionQueryService = sessionQueryService;
        _stateStoreAdapter = stateStoreAdapter;

        var intervalMs = options.Value.ActiveReplaySaveIntervalMilliseconds;
        if (intervalMs < 100)
        {
            intervalMs = 100;
        }

        _activeReplayInterval = TimeSpan.FromMilliseconds(intervalMs);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(_activeReplayInterval);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var hasNextTick = await timer.WaitForNextTickAsync(stoppingToken);
                if (!hasNextTick)
                {
                    break;
                }

                var exportDocument = _sessionQueryService.GetCurrentActiveReplayExport();
                if (exportDocument is not null)
                {
                    await _stateStoreAdapter.SaveActiveReplayAsync(exportDocument, stoppingToken);
                }
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

    public override async Task StopAsync(CancellationToken cancellationToken)
    {
        try
        {
            var exportDocument = _sessionQueryService.GetCurrentActiveReplayExport();
            if (exportDocument is not null)
            {
                await _stateStoreAdapter.SaveActiveReplayAsync(exportDocument, cancellationToken);
            }
        }
        catch (OperationCanceledException)
        {
        }

        await base.StopAsync(cancellationToken);
    }
}
