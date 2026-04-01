namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IDecisionStrategyRegistry
{
    IReadOnlyList<DecisionProviderDescriptor> ListProviders();

    bool TryGetStrategy(string providerId, out IDecisionStrategy? strategy);
}
