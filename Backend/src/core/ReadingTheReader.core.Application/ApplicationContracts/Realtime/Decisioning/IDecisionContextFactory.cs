using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;

public interface IDecisionContextFactory
{
    DecisionContextSnapshot Create(
        ExperimentSessionSnapshot snapshot,
        DecisionConfigurationSnapshot configuration,
        DecisionRuntimeStateSnapshot runtimeState);
}
