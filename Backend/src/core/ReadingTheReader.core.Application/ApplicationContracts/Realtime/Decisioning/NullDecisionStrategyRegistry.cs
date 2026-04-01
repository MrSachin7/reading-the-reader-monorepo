using ReadingTheReader.core.Domain.Decisioning;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;

internal sealed class NullDecisionStrategyRegistry : IDecisionStrategyRegistry
{
    public IReadOnlyList<DecisionProviderDescriptor> ListProviders()
    {
        return [];
    }

    public bool TryGetStrategy(string providerId, out IDecisionStrategy? strategy)
    {
        strategy = null;
        return false;
    }
}
