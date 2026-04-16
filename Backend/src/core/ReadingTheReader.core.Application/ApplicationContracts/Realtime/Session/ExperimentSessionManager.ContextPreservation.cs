using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    public async ValueTask<ReadingContextPreservationEventSnapshot> UpdateReadingContextPreservationAsync(
        UpdateReadingContextPreservationCommand command,
        CancellationToken ct = default)
    {
        ReadingContextPreservationEventSnapshot contextPreservation;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            contextPreservation = NormalizeReadingContextPreservation(command);
            _liveReadingSession = _liveReadingSession with
            {
                LatestContextPreservation = contextPreservation,
                RecentContextPreservationEvents = BuildRecentContextPreservationHistory(
                    _liveReadingSession.RecentContextPreservationEvents,
                    contextPreservation)
            };
            RecordReadingContextPreservationEvent(contextPreservation.MeasuredAtUnixMs, contextPreservation);
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(
            MessageTypes.ReadingContextPreservationChanged,
            contextPreservation,
            ct);
        return contextPreservation;
    }

    private static IReadOnlyList<ReadingContextPreservationEventSnapshot> BuildRecentContextPreservationHistory(
        IReadOnlyList<ReadingContextPreservationEventSnapshot>? existing,
        ReadingContextPreservationEventSnapshot next)
    {
        var items = existing is null
            ? new List<ReadingContextPreservationEventSnapshot>()
            : existing.Select(item => item.Copy()).ToList();

        items.Insert(0, next.Copy());
        items = items
            .OrderByDescending(item => item.MeasuredAtUnixMs)
            .ToList();

        if (items.Count > MaxRecentContextPreservationEvents)
        {
            items.RemoveRange(MaxRecentContextPreservationEvents, items.Count - MaxRecentContextPreservationEvents);
        }

        return items;
    }

    private static ReadingContextPreservationEventSnapshot NormalizeReadingContextPreservation(
        UpdateReadingContextPreservationCommand command)
    {
        return new ReadingContextPreservationEventSnapshot(
            ReadingContextPreservationEventSnapshot.NormalizeStatus(command.Status),
            ReadingContextPreservationEventSnapshot.NormalizeAnchorSource(command.AnchorSource),
            NormalizeNullableText(command.AnchorSentenceId),
            NormalizeNullableText(command.AnchorTokenId),
            NormalizeNullableText(command.AnchorBlockId),
            command.AnchorErrorPx.HasValue ? Math.Max(command.AnchorErrorPx.Value, 0) : null,
            command.ViewportDeltaPx,
            ReadingInterventionPolicySnapshot.NormalizeBoundary(
                command.CommitBoundary,
                ReadingInterventionCommitBoundaries.Immediate),
            command.WaitDurationMs.HasValue ? Math.Max(command.WaitDurationMs.Value, 0) : null,
            Math.Max(command.InterventionAppliedAtUnixMs, 0),
            Math.Max(command.MeasuredAtUnixMs, 0),
            NormalizeNullableText(command.Reason));
    }
}
