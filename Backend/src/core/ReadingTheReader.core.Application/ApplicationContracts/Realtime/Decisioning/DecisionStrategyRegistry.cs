namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class DecisionStrategyRegistry : IDecisionStrategyRegistry
{
    private readonly IReadOnlyDictionary<string, IDecisionStrategy> _strategiesById;
    private readonly IReadOnlyList<DecisionProviderDescriptor> _providers;

    public DecisionStrategyRegistry(IEnumerable<IDecisionStrategy> strategies)
    {
        var strategyList = strategies
            .Where(strategy => strategy is not null)
            .ToList();

        _strategiesById = strategyList.ToDictionary(
            strategy => strategy.ProviderId,
            strategy => strategy,
            StringComparer.Ordinal);

        _providers = strategyList
            .Select(strategy => CreateDescriptor(strategy.ProviderId))
            .ToArray();
    }

    public IReadOnlyList<DecisionProviderDescriptor> ListProviders()
    {
        return [.. _providers.Select(provider => provider.Copy())];
    }

    public bool TryGetStrategy(string providerId, out IDecisionStrategy? strategy)
    {
        if (string.IsNullOrWhiteSpace(providerId))
        {
            strategy = null;
            return false;
        }

        return _strategiesById.TryGetValue(providerId.Trim(), out strategy);
    }

    private static DecisionProviderDescriptor CreateDescriptor(string providerId)
    {
        return providerId switch
        {
            DecisionProviderIds.RuleBased => new DecisionProviderDescriptor(
                DecisionProviderIds.RuleBased,
                "Rule-based",
                true,
                true),
            DecisionProviderIds.External => new DecisionProviderDescriptor(
                DecisionProviderIds.External,
                "External",
                true,
                true),
            _ => new DecisionProviderDescriptor(providerId, providerId, true, false)
        };
    }
}
