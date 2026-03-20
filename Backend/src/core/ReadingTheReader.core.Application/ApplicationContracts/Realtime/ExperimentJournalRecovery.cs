namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed record ExperimentJournalRecovery(
    Guid SessionId,
    ExperimentSessionSnapshot InitialSnapshot,
    IReadOnlyList<ExperimentLifecycleEventRecord> LifecycleEvents,
    IReadOnlyList<GazeSampleRecord> GazeSamples,
    IReadOnlyList<ReadingSessionStateRecord> ReadingSessionStates,
    IReadOnlyList<ParticipantViewportEventRecord> ParticipantViewportEvents,
    IReadOnlyList<ReadingFocusEventRecord> ReadingFocusEvents,
    IReadOnlyList<InterventionEventRecord> InterventionEvents,
    long LastSequenceNumber,
    bool IsCompleted,
    string? CompletionSource,
    long? CompletedAtUnixMs)
{
    public ExperimentJournalRecovery Copy()
    {
        return new ExperimentJournalRecovery(
            SessionId,
            InitialSnapshot.Copy(),
            LifecycleEvents is null ? [] : [.. LifecycleEvents.Select(item => item.Copy())],
            GazeSamples is null ? [] : [.. GazeSamples.Select(item => item.Copy())],
            ReadingSessionStates is null ? [] : [.. ReadingSessionStates.Select(item => item.Copy())],
            ParticipantViewportEvents is null ? [] : [.. ParticipantViewportEvents.Select(item => item.Copy())],
            ReadingFocusEvents is null ? [] : [.. ReadingFocusEvents.Select(item => item.Copy())],
            InterventionEvents is null ? [] : [.. InterventionEvents.Select(item => item.Copy())],
            LastSequenceNumber,
            IsCompleted,
            CompletionSource,
            CompletedAtUnixMs);
    }
}
