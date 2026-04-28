using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentReplayRecoveryStatuses
{
    public const string Recording = "recording";
    public const string RecoveredIncomplete = "recovered-incomplete";
    public const string Completed = "completed";
}

public sealed record ExperimentReplayRecoverySessionSeed(
    Guid SessionId,
    ExperimentSessionSnapshot InitialSnapshot,
    long CreatedAtUnixMs);

public sealed record ExperimentReplayRecoveryChunkBatch(
    Guid SessionId,
    ExperimentSessionSnapshot LatestSnapshot,
    long FlushedAtUnixMs,
    IReadOnlyList<ExperimentLifecycleEventRecord> LifecycleEvents,
    IReadOnlyList<RawGazeSampleRecord> GazeSamples,
    IReadOnlyList<EnrichedGazeSampleRecord>? EnrichedGazeSamples,
    IReadOnlyList<ParticipantViewportEventRecord> ViewportEvents,
    IReadOnlyList<ReadingFocusEventRecord> FocusEvents,
    IReadOnlyList<ReadingAttentionEventRecord> AttentionEvents,
    IReadOnlyList<ReadingContextPreservationEventRecord>? ContextPreservationEvents = null,
    IReadOnlyList<DecisionProposalEventRecord>? DecisionProposalEvents = null,
    IReadOnlyList<ScheduledInterventionEventRecord>? ScheduledInterventionEvents = null,
    IReadOnlyList<InterventionEventRecord>? InterventionEvents = null,
    IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot>? LatestTokenStats = null);
