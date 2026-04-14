using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public interface IEyeMovementAnalysisStrategyCoordinator
{
    ValueTask<EyeMovementAnalysisProcessingResult?> AnalyzeAsync(
        ExperimentSessionSnapshot session,
        EyeMovementAnalysisConfigurationSnapshot configuration,
        EyeMovementAnalysisRuntimeState runtimeState,
        ReadingGazeObservationSnapshot observation,
        CancellationToken ct = default);
}

public sealed class EyeMovementAnalysisStrategyCoordinator : IEyeMovementAnalysisStrategyCoordinator
{
    private readonly IEyeMovementAnalysisStrategyRegistry _strategyRegistry;

    public EyeMovementAnalysisStrategyCoordinator(IEyeMovementAnalysisStrategyRegistry strategyRegistry)
    {
        _strategyRegistry = strategyRegistry;
    }

    public ValueTask<EyeMovementAnalysisProcessingResult?> AnalyzeAsync(
        ExperimentSessionSnapshot session,
        EyeMovementAnalysisConfigurationSnapshot configuration,
        EyeMovementAnalysisRuntimeState runtimeState,
        ReadingGazeObservationSnapshot observation,
        CancellationToken ct = default)
    {
        if (!_strategyRegistry.TryGetStrategy(configuration.ProviderId, out var strategy) || strategy is null)
        {
            return ValueTask.FromResult<EyeMovementAnalysisProcessingResult?>(null);
        }

        return strategy.AnalyzeAsync(
            new EyeMovementAnalysisContextSnapshot(
                session.Copy(),
                configuration.Copy(),
                runtimeState.Copy(),
                observation.Copy()),
            ct);
    }
}
