using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;

public sealed record ExternalDecisionProposalCommand(
    string ProviderId,
    string SessionId,
    string CorrelationId,
    string ProposalId,
    string ExecutionMode,
    string Rationale,
    string SignalSummary,
    long ProviderObservedAtUnixMs,
    ApplyInterventionCommand ProposedIntervention);

public sealed record ExternalDecisionAutonomousApplyCommand(
    string ProviderId,
    string SessionId,
    string CorrelationId,
    string ExecutionMode,
    string Rationale,
    string SignalSummary,
    long ProviderObservedAtUnixMs,
    ApplyInterventionCommand RequestedIntervention);
