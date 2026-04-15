using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;

public sealed class DecisionContextFactory : IDecisionContextFactory
{
    public DecisionContextSnapshot Create(
        ExperimentSessionSnapshot snapshot,
        DecisionConfigurationSnapshot configuration,
        DecisionRuntimeStateSnapshot runtimeState)
    {
        var readingSession = snapshot.ReadingSession?.Copy() ?? LiveReadingSessionSnapshot.Empty;

        return new DecisionContextSnapshot(
            snapshot.SessionId,
            configuration.ConditionLabel,
            configuration.ProviderId,
            configuration.ExecutionMode,
            runtimeState.AutomationPaused,
            snapshot.IsActive,
            snapshot.StartedAtUnixMs,
            snapshot.StoppedAtUnixMs,
            readingSession.Presentation.Copy(),
            readingSession.Appearance.Copy(),
            readingSession.Focus.Copy(),
            readingSession.AttentionSummary?.Copy(),
            readingSession.ParticipantViewport.Copy(),
            readingSession.RecentInterventions is null
                ? []
                : [.. readingSession.RecentInterventions.Select(item => item.Copy())],
            snapshot.EyeMovementAnalysis?.Copy() ?? EyeMovementAnalysisSnapshot.Empty.Copy());
    }
}
