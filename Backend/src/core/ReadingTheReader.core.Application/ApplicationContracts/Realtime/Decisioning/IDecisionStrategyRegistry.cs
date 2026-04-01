namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;

public interface IDecisionStrategyRegistry
{
    IReadOnlyList<DecisionProviderDescriptor> ListProviders();

    bool TryGetStrategy(string providerId, out IDecisionStrategy? strategy);
}
