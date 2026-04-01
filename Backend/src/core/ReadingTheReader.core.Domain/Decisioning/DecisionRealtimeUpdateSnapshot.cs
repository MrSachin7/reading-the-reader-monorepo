namespace ReadingTheReader.core.Domain.Decisioning;

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
