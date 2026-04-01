using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Domain.Decisioning;

public sealed record DecisionProposalSnapshot(
    Guid ProposalId,
    string ConditionLabel,
    string ProviderId,
    string ExecutionMode,
    string Status,
    DecisionSignalSnapshot Signal,
    string Rationale,
    long ProposedAtUnixMs,
    long? ResolvedAtUnixMs,
    string? ResolutionSource,
    Guid? AppliedInterventionId,
    ApplyInterventionCommand ProposedIntervention)
{
    public DecisionProposalSnapshot Copy()
    {
        return new DecisionProposalSnapshot(
            ProposalId,
            ConditionLabel,
            ProviderId,
            ExecutionMode,
            Status,
            Signal.Copy(),
            Rationale,
            ProposedAtUnixMs,
            ResolvedAtUnixMs,
            ResolutionSource,
            AppliedInterventionId,
            ProposedIntervention.Copy());
    }

    public DecisionProposalSnapshot WithResolution(
        string status,
        long resolvedAtUnixMs,
        string resolutionSource,
        Guid? appliedInterventionId = null)
    {
        return this with
        {
            Status = status,
            ResolvedAtUnixMs = resolvedAtUnixMs,
            ResolutionSource = string.IsNullOrWhiteSpace(resolutionSource) ? null : resolutionSource.Trim(),
            AppliedInterventionId = appliedInterventionId
        };
    }
}
