namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public static class DecisionProviderIds
{
    public const string Manual = "manual";
    public const string RuleBased = "rule-based";
    public const string External = "external";

    public static IReadOnlyList<string> All { get; } = [Manual, RuleBased, External];
}

public static class DecisionExecutionModes
{
    public const string Advisory = "advisory";
    public const string Autonomous = "autonomous";

    public static IReadOnlyList<string> All { get; } = [Advisory, Autonomous];
}

public static class DecisionProposalStatus
{
    public const string Pending = "pending";
    public const string Approved = "approved";
    public const string Rejected = "rejected";
    public const string AutoApplied = "auto-applied";
    public const string Superseded = "superseded";
    public const string Expired = "expired";

    public static IReadOnlyList<string> All { get; } =
    [
        Pending,
        Approved,
        Rejected,
        AutoApplied,
        Superseded,
        Expired
    ];
}

public static class DecisionProposalLifecycleRules
{
    public static bool CanTransition(string fromStatus, string toStatus)
    {
        if (string.Equals(fromStatus, toStatus, StringComparison.Ordinal))
        {
            return true;
        }

        return string.Equals(fromStatus, DecisionProposalStatus.Pending, StringComparison.Ordinal) &&
               DecisionProposalStatus.All.Contains(toStatus, StringComparer.Ordinal);
    }

    public static bool IsResolved(string status)
    {
        return !string.Equals(status, DecisionProposalStatus.Pending, StringComparison.Ordinal);
    }
}

public sealed record DecisionProviderDescriptor(
    string ProviderId,
    string DisplayName,
    bool SupportsAdvisoryExecution,
    bool SupportsAutonomousExecution)
{
    public DecisionProviderDescriptor Copy()
    {
        return this with { };
    }
}

public sealed record DecisionConfigurationSnapshot(
    string ConditionLabel,
    string ProviderId,
    string ExecutionMode)
{
    public static DecisionConfigurationSnapshot Default { get; } = new(
        "Manual only",
        DecisionProviderIds.Manual,
        DecisionExecutionModes.Advisory);

    public DecisionConfigurationSnapshot Copy()
    {
        return this with { };
    }
}

public sealed record DecisionSignalSnapshot(
    string SignalType,
    string Summary,
    long ObservedAtUnixMs,
    double? Confidence = null)
{
    public DecisionSignalSnapshot Copy()
    {
        return this with { };
    }
}

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
            ProposedIntervention with { });
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

public sealed record DecisionRuntimeStateSnapshot(
    bool AutomationPaused,
    DecisionProposalSnapshot? ActiveProposal,
    IReadOnlyList<DecisionProposalSnapshot> RecentProposalHistory)
{
    public static DecisionRuntimeStateSnapshot Empty { get; } = new(false, null, []);

    public DecisionRuntimeStateSnapshot Copy()
    {
        return new DecisionRuntimeStateSnapshot(
            AutomationPaused,
            ActiveProposal?.Copy(),
            RecentProposalHistory is null ? [] : [.. RecentProposalHistory.Select(item => item.Copy())]);
    }
}

public sealed record DecisionContextSnapshot(
    string ConditionLabel,
    string ProviderId,
    string ExecutionMode,
    bool AutomationPaused,
    bool IsSessionActive,
    long StartedAtUnixMs,
    long? StoppedAtUnixMs,
    ReadingPresentationSnapshot Presentation,
    ReaderAppearanceSnapshot Appearance,
    ReadingFocusSnapshot Focus,
    ReadingAttentionSummarySnapshot? AttentionSummary,
    ParticipantViewportSnapshot ParticipantViewport,
    IReadOnlyList<InterventionEventSnapshot> RecentInterventions)
{
    public DecisionContextSnapshot Copy()
    {
        return new DecisionContextSnapshot(
            ConditionLabel,
            ProviderId,
            ExecutionMode,
            AutomationPaused,
            IsSessionActive,
            StartedAtUnixMs,
            StoppedAtUnixMs,
            Presentation.Copy(),
            Appearance.Copy(),
            Focus.Copy(),
            AttentionSummary?.Copy(),
            ParticipantViewport.Copy(),
            RecentInterventions is null ? [] : [.. RecentInterventions.Select(item => item.Copy())]);
    }
}

public sealed record DecisionRealtimeUpdateSnapshot(
    DecisionConfigurationSnapshot DecisionConfiguration,
    DecisionRuntimeStateSnapshot DecisionState)
{
    public DecisionRealtimeUpdateSnapshot Copy()
    {
        return new DecisionRealtimeUpdateSnapshot(
            DecisionConfiguration.Copy(),
            DecisionState.Copy());
    }
}

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
