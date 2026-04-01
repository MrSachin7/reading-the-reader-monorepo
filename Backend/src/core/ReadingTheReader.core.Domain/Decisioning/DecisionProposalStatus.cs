namespace ReadingTheReader.core.Domain.Decisioning;

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
