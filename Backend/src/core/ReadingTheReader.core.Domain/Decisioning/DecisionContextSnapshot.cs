using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Domain.Decisioning;

public sealed record DecisionContextSnapshot(
    Guid? SessionId,
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
            SessionId,
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
