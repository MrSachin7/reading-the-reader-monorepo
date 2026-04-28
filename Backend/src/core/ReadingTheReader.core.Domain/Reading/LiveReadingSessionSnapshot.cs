namespace ReadingTheReader.core.Domain.Reading;

public sealed record LiveReadingSessionSnapshot(
    ReadingContentSnapshot? Content,
    ReadingPresentationSnapshot Presentation,
    ReaderAppearanceSnapshot Appearance,
    ReadingInterventionPolicySnapshot InterventionPolicy,
    ParticipantViewportSnapshot ParticipantViewport,
    ReadingFocusSnapshot Focus,
    PendingInterventionSnapshot? PendingIntervention,
    ReadingContextPreservationEventSnapshot? LatestContextPreservation,
    IReadOnlyList<ReadingContextPreservationEventSnapshot> RecentContextPreservationEvents,
    LayoutInterventionGuardrailSnapshot? LatestLayoutGuardrail,
    InterventionEventSnapshot? LatestIntervention,
    IReadOnlyList<InterventionEventSnapshot> RecentInterventions,
    ReadingAttentionSummarySnapshot? AttentionSummary = null,
    ReadingPresentationSnapshot? InitialPresentation = null,
    IReadOnlyList<ExperimentSequenceItemSnapshot>? ExperimentItems = null,
    int? CurrentExperimentItemIndex = null)
{
    public static LiveReadingSessionSnapshot Empty { get; } = new(
        null,
        ReadingPresentationSnapshot.Default,
        ReaderAppearanceSnapshot.Default,
        ReadingInterventionPolicySnapshot.Default,
        ParticipantViewportSnapshot.Disconnected,
        ReadingFocusSnapshot.Empty,
        null,
        null,
        [],
        null,
        null,
        [],
        null,
        null,
        [],
        null);

    public LiveReadingSessionSnapshot Copy()
    {
        return new LiveReadingSessionSnapshot(
            Content?.Copy(),
            (Presentation ?? ReadingPresentationSnapshot.Default).Copy(),
            (Appearance ?? ReaderAppearanceSnapshot.Default).Copy(),
            (InterventionPolicy ?? ReadingInterventionPolicySnapshot.Default).Copy(),
            (ParticipantViewport ?? ParticipantViewportSnapshot.Disconnected).Copy(),
            (Focus ?? ReadingFocusSnapshot.Empty).Copy(),
            PendingIntervention?.Copy(),
            LatestContextPreservation?.Copy(),
            RecentContextPreservationEvents is null ? [] : [.. RecentContextPreservationEvents.Select(item => item.Copy())],
            LatestLayoutGuardrail?.Copy(),
            LatestIntervention?.Copy(),
            RecentInterventions is null ? [] : [.. RecentInterventions.Select(item => item.Copy())],
            AttentionSummary?.Copy(),
            InitialPresentation?.Copy(),
            ExperimentItems is null ? [] : [.. ExperimentItems.Select(item => item.Copy())],
            CurrentExperimentItemIndex);
    }
}
