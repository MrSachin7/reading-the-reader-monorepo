namespace ReadingTheReader.core.Domain.Decisioning;

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
