using ReadingTheReader.core.Domain;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed record ExperimentReplayMetadata(
    string Format,
    int Version,
    long ExportedAtUnixMs,
    Guid? SessionId,
    string CompletionSource,
    long StartedAtUnixMs,
    long? EndedAtUnixMs,
    long? DurationMs,
    string? SavedName = null)
{
    public ExperimentReplayMetadata Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentReplayStatistics(
    int LifecycleEventCount,
    int GazeSampleCount,
    int ReadingSessionStateCount,
    int ParticipantViewportEventCount,
    int ReadingFocusEventCount,
    int InterventionEventCount)
{
    public ExperimentReplayStatistics Copy()
    {
        return this with { };
    }
}

public sealed record ExperimentLifecycleEventRecord(
    long SequenceNumber,
    string EventType,
    string Source,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs)
{
    public ExperimentLifecycleEventRecord Copy()
    {
        return this with { };
    }
}

public sealed record GazeSampleRecord(
    long SequenceNumber,
    long CapturedAtUnixMs,
    long? ElapsedSinceStartMs,
    GazeData Sample)
{
    public GazeSampleRecord Copy()
    {
        return new GazeSampleRecord(
            SequenceNumber,
            CapturedAtUnixMs,
            ElapsedSinceStartMs,
            Sample.Copy());
    }
}

public sealed record ReadingSessionStateRecord(
    long SequenceNumber,
    string Reason,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    LiveReadingSessionSnapshot Session)
{
    public ReadingSessionStateRecord Copy()
    {
        return new ReadingSessionStateRecord(
            SequenceNumber,
            Reason,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Session.Copy());
    }
}

public sealed record ParticipantViewportEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    ParticipantViewportSnapshot Viewport)
{
    public ParticipantViewportEventRecord Copy()
    {
        return new ParticipantViewportEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Viewport.Copy());
    }
}

public sealed record ReadingFocusEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    ReadingFocusSnapshot Focus)
{
    public ReadingFocusEventRecord Copy()
    {
        return new ReadingFocusEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Focus.Copy());
    }
}

public sealed record InterventionEventRecord(
    long SequenceNumber,
    long OccurredAtUnixMs,
    long? ElapsedSinceStartMs,
    InterventionEventSnapshot Intervention)
{
    public InterventionEventRecord Copy()
    {
        return new InterventionEventRecord(
            SequenceNumber,
            OccurredAtUnixMs,
            ElapsedSinceStartMs,
            Intervention.Copy());
    }
}

public sealed record ExperimentReplayExport(
    ExperimentReplayMetadata Metadata,
    ExperimentReplayStatistics Statistics,
    ExperimentSessionSnapshot InitialSnapshot,
    ExperimentSessionSnapshot FinalSnapshot,
    IReadOnlyList<ExperimentLifecycleEventRecord> LifecycleEvents,
    IReadOnlyList<GazeSampleRecord> GazeSamples,
    IReadOnlyList<ReadingSessionStateRecord> ReadingSessionStates,
    IReadOnlyList<ParticipantViewportEventRecord> ParticipantViewportEvents,
    IReadOnlyList<ReadingFocusEventRecord> ReadingFocusEvents,
    IReadOnlyList<InterventionEventRecord> InterventionEvents)
{
    public ExperimentReplayExport Copy()
    {
        return new ExperimentReplayExport(
            Metadata.Copy(),
            Statistics.Copy(),
            InitialSnapshot.Copy(),
            FinalSnapshot.Copy(),
            LifecycleEvents is null ? [] : [.. LifecycleEvents.Select(item => item.Copy())],
            GazeSamples is null ? [] : [.. GazeSamples.Select(item => item.Copy())],
            ReadingSessionStates is null ? [] : [.. ReadingSessionStates.Select(item => item.Copy())],
            ParticipantViewportEvents is null ? [] : [.. ParticipantViewportEvents.Select(item => item.Copy())],
            ReadingFocusEvents is null ? [] : [.. ReadingFocusEvents.Select(item => item.Copy())],
            InterventionEvents is null ? [] : [.. InterventionEvents.Select(item => item.Copy())]);
    }
}
