namespace ReadingTheReader.core.Domain.Decisioning;

public static class DecisionProviderIds
{
    public const string Manual = "manual";
    public const string RuleBased = "rule-based";
    public const string External = "external";

    public static IReadOnlyList<string> All { get; } = [Manual, RuleBased, External];
}
