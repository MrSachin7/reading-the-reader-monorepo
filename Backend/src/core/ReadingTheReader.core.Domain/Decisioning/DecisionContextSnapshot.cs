using ReadingTheReader.core.Domain.EyeMovementAnalysis;
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
    IReadOnlyList<InterventionEventSnapshot> RecentInterventions,
    EyeMovementAnalysisSnapshot? EyeMovementAnalysis = null)
{
    public DecisionContextSnapshot Copy()
    {
        return this with
        {
            Presentation = Presentation.Copy(),
            Appearance = Appearance.Copy(),
            Focus = Focus.Copy(),
            AttentionSummary = AttentionSummary?.Copy(),
            ParticipantViewport = ParticipantViewport.Copy(),
            RecentInterventions = RecentInterventions is null ? [] : [.. RecentInterventions.Select(item => item.Copy())],
            EyeMovementAnalysis = EyeMovementAnalysis?.Copy()
        };
    }
}
