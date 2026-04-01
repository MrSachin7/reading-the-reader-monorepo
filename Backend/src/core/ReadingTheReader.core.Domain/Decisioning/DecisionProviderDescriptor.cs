namespace ReadingTheReader.core.Domain.Decisioning;

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
