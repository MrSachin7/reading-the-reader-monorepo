namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;

public sealed class ExternalDecisionStrategyStub : IDecisionStrategy
{
    public string ProviderId => DecisionProviderIds.External;

    public ValueTask<DecisionProposalSnapshot?> EvaluateAsync(DecisionContextSnapshot context, CancellationToken ct = default)
    {
        return ValueTask.FromResult<DecisionProposalSnapshot?>(null);
    }
}
