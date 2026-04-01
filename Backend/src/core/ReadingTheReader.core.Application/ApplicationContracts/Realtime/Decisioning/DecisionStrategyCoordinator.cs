using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;

public interface IDecisionStrategyCoordinator
{
    ValueTask<DecisionProposalSnapshot?> EvaluateAsync(
        ExperimentSessionSnapshot snapshot,
        DecisionConfigurationSnapshot configuration,
        DecisionRuntimeStateSnapshot runtimeState,
        CancellationToken ct = default);
}

public sealed class DecisionStrategyCoordinator : IDecisionStrategyCoordinator
{
    private readonly IDecisionStrategyRegistry _strategyRegistry;
    private readonly IDecisionContextFactory _contextFactory;

    public DecisionStrategyCoordinator(
        IDecisionStrategyRegistry strategyRegistry,
        IDecisionContextFactory contextFactory)
    {
        _strategyRegistry = strategyRegistry;
        _contextFactory = contextFactory;
    }

    public async ValueTask<DecisionProposalSnapshot?> EvaluateAsync(
        ExperimentSessionSnapshot snapshot,
        DecisionConfigurationSnapshot configuration,
        DecisionRuntimeStateSnapshot runtimeState,
        CancellationToken ct = default)
    {
        if (string.Equals(configuration.ProviderId, DecisionProviderIds.Manual, StringComparison.Ordinal) ||
            !_strategyRegistry.TryGetStrategy(configuration.ProviderId, out var strategy) ||
            strategy is null)
        {
            return null;
        }

        var context = _contextFactory.Create(snapshot, configuration, runtimeState);
        var proposal = await strategy.EvaluateAsync(context, ct);
        if (proposal is null)
        {
            return null;
        }

        var proposedAtUnixMs = proposal.ProposedAtUnixMs > 0
            ? proposal.ProposedAtUnixMs
            : DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        return proposal with
        {
            ProposalId = proposal.ProposalId == Guid.Empty ? Guid.NewGuid() : proposal.ProposalId,
            ConditionLabel = configuration.ConditionLabel,
            ProviderId = configuration.ProviderId,
            ExecutionMode = configuration.ExecutionMode,
            Status = DecisionProposalStatus.Pending,
            ProposedAtUnixMs = proposedAtUnixMs,
            ResolvedAtUnixMs = null,
            ResolutionSource = null,
            AppliedInterventionId = null,
            ProposedIntervention = proposal.ProposedIntervention with
            {
                Source = configuration.ProviderId,
                Trigger = string.IsNullOrWhiteSpace(proposal.ProposedIntervention.Trigger)
                    ? proposal.Signal.SignalType
                    : proposal.ProposedIntervention.Trigger.Trim()
            }
        };
    }
}
