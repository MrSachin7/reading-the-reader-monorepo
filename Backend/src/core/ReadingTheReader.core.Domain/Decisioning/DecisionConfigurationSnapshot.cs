namespace ReadingTheReader.core.Domain.Decisioning;

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
