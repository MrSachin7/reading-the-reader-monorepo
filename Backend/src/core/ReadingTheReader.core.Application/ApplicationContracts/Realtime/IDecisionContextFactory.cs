namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IDecisionContextFactory
{
    DecisionContextSnapshot Create(
        ExperimentSessionSnapshot snapshot,
        DecisionConfigurationSnapshot configuration,
        DecisionRuntimeStateSnapshot runtimeState);
}
