namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed class EyeMovementAnalysisStrategyRegistry : IEyeMovementAnalysisStrategyRegistry
{
    private readonly IReadOnlyDictionary<string, IEyeMovementAnalysisStrategy> _strategiesById;

    public EyeMovementAnalysisStrategyRegistry(IEnumerable<IEyeMovementAnalysisStrategy> strategies)
    {
        _strategiesById = strategies
            .Where(strategy => strategy is not null)
            .ToDictionary(strategy => strategy.ProviderId, strategy => strategy, StringComparer.Ordinal);
    }

    public bool TryGetStrategy(string providerId, out IEyeMovementAnalysisStrategy? strategy)
    {
        if (string.IsNullOrWhiteSpace(providerId))
        {
            strategy = null;
            return false;
        }

        return _strategiesById.TryGetValue(providerId.Trim(), out strategy);
    }
}
