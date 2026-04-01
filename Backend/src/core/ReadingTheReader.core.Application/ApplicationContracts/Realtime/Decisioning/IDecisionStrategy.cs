namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IDecisionStrategy
{
    string ProviderId { get; }

    ValueTask<DecisionProposalSnapshot?> EvaluateAsync(DecisionContextSnapshot context, CancellationToken ct = default);
}
