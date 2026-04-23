using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class InMemoryExperimentReplayRecoveryStoreAdapter : IExperimentReplayRecoveryStoreAdapter
{
    private readonly object _gate = new();
    private readonly Dictionary<Guid, InMemoryRecoveryState> _sessions = [];

    public ValueTask InitializeSessionAsync(ExperimentReplayRecoverySessionSeed seed, CancellationToken ct = default)
    {
        lock (_gate)
        {
            _sessions[seed.SessionId] = new InMemoryRecoveryState(
                seed.SessionId,
                BuildName(seed.InitialSnapshot, seed.SessionId),
                ExperimentReplayRecoveryStatuses.Recording,
                seed.CreatedAtUnixMs,
                seed.CreatedAtUnixMs,
                seed.InitialSnapshot.Copy(),
                seed.InitialSnapshot.Copy(),
                [],
                [],
                [],
                [],
                [],
                [],
                [],
                [],
                [],
                null);
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask AppendChunkAsync(ExperimentReplayRecoveryChunkBatch batch, CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (!_sessions.TryGetValue(batch.SessionId, out var session))
            {
                return ValueTask.CompletedTask;
            }

            session = session with
            {
                UpdatedAtUnixMs = batch.FlushedAtUnixMs,
                LatestSnapshot = batch.LatestSnapshot.Copy(),
                LifecycleEvents = [.. session.LifecycleEvents, .. batch.LifecycleEvents.Select(item => item.Copy())],
                GazeSamples = [.. session.GazeSamples, .. batch.GazeSamples.Select(item => item.Copy())],
                ViewportEvents = [.. session.ViewportEvents, .. batch.ViewportEvents.Select(item => item.Copy())],
                FocusEvents = [.. session.FocusEvents, .. batch.FocusEvents.Select(item => item.Copy())],
                AttentionEvents = [.. session.AttentionEvents, .. batch.AttentionEvents.Select(item => item.Copy())],
                ContextPreservationEvents = [.. session.ContextPreservationEvents, .. (batch.ContextPreservationEvents ?? []).Select(item => item.Copy())],
                DecisionProposalEvents = [.. session.DecisionProposalEvents, .. (batch.DecisionProposalEvents ?? []).Select(item => item.Copy())],
                ScheduledInterventionEvents = [.. session.ScheduledInterventionEvents, .. (batch.ScheduledInterventionEvents ?? []).Select(item => item.Copy())],
                InterventionEvents = [.. session.InterventionEvents, .. (batch.InterventionEvents ?? []).Select(item => item.Copy())],
                LatestTokenStats = batch.LatestTokenStats is null
                    ? session.LatestTokenStats
                    : batch.LatestTokenStats.ToDictionary(e => e.Key, e => e.Value.Copy())
            };

            _sessions[batch.SessionId] = session;
        }

        return ValueTask.CompletedTask;
    }

    public ValueTask<ExperimentReplayExport?> BuildExportAsync(
        Guid sessionId,
        string completionSource,
        long exportedAtUnixMs,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (!_sessions.TryGetValue(sessionId, out var session))
            {
                return ValueTask.FromResult<ExperimentReplayExport?>(null);
            }

            return ValueTask.FromResult<ExperimentReplayExport?>(ExperimentReplayExportFactory.Create(
                session.InitialSnapshot,
                session.LatestSnapshot,
                completionSource,
                exportedAtUnixMs,
                session.LifecycleEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.GazeSamples.OrderBy(item => item.SequenceNumber).ToArray(),
                session.ViewportEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.FocusEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.AttentionEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.ContextPreservationEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.DecisionProposalEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.ScheduledInterventionEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.InterventionEvents.OrderBy(item => item.SequenceNumber).ToArray(),
                session.LatestTokenStats));
        }
    }

    public ValueTask MarkCompletedAsync(
        Guid sessionId,
        ExperimentReplayExport completedExport,
        long completedAtUnixMs,
        CancellationToken ct = default)
    {
        lock (_gate)
        {
            if (_sessions.TryGetValue(sessionId, out var session))
            {
                _sessions[sessionId] = session with
                {
                    Status = ExperimentReplayRecoveryStatuses.Completed,
                    UpdatedAtUnixMs = completedAtUnixMs,
                    LatestSnapshot = session.LatestSnapshot with
                    {
                        IsActive = false,
                        StoppedAtUnixMs = session.LatestSnapshot.StoppedAtUnixMs ?? completedAtUnixMs
                    }
                };
            }
        }

        return ValueTask.CompletedTask;
    }

    private static string BuildName(ExperimentSessionSnapshot snapshot, Guid sessionId)
    {
        return snapshot.ReadingSession?.Content?.Title?.Trim() switch
        {
            { Length: > 0 } title => title,
            _ => snapshot.Participant?.Name?.Trim() switch
            {
                { Length: > 0 } participantName => participantName,
                _ => $"Recovered session {sessionId:N}"
            }
        };
    }

    private sealed record InMemoryRecoveryState(
        Guid Id,
        string Name,
        string Status,
        long CreatedAtUnixMs,
        long UpdatedAtUnixMs,
        ExperimentSessionSnapshot InitialSnapshot,
        ExperimentSessionSnapshot LatestSnapshot,
        IReadOnlyList<ExperimentLifecycleEventRecord> LifecycleEvents,
        IReadOnlyList<RawGazeSampleRecord> GazeSamples,
        IReadOnlyList<ParticipantViewportEventRecord> ViewportEvents,
        IReadOnlyList<ReadingFocusEventRecord> FocusEvents,
        IReadOnlyList<ReadingAttentionEventRecord> AttentionEvents,
        IReadOnlyList<ReadingContextPreservationEventRecord> ContextPreservationEvents,
        IReadOnlyList<DecisionProposalEventRecord> DecisionProposalEvents,
        IReadOnlyList<ScheduledInterventionEventRecord> ScheduledInterventionEvents,
        IReadOnlyList<InterventionEventRecord> InterventionEvents,
        IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot>? LatestTokenStats);
}
