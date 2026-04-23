using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    public ValueTask<ExperimentReplayExport?> GetLatestReplayExportAsync(CancellationToken ct = default)
    {
        return _experimentReplayExportStoreAdapter.LoadLatestAsync(ct);
    }

    public async ValueTask<SavedExperimentReplayExportSummary> SaveLatestReplayExportAsync(
        SaveExperimentReplayExportCommand command,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.Name))
        {
            throw new InvalidOperationException("A name is required.");
        }

        var latest = await _experimentReplayExportStoreAdapter.LoadLatestAsync(ct);
        if (latest is null)
        {
            throw new InvalidOperationException("No experiment export is available yet.");
        }

        var format = ExperimentReplayExportFormats.Normalize(command.Format);

        var savedExport = latest with
        {
            Manifest = latest.Manifest with
            {
                SavedName = command.Name.Trim()
            }
        };

        return await _experimentReplayExportStoreAdapter.SaveNamedAsync(command.Name.Trim(), format, savedExport, ct);
    }

    public ValueTask<IReadOnlyCollection<SavedExperimentReplayExportSummary>> ListSavedReplayExportsAsync(CancellationToken ct = default)
    {
        return _experimentReplayExportStoreAdapter.ListSavedAsync(ct);
    }

    public ValueTask<ExperimentReplayExport?> GetSavedReplayExportByIdAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            return ValueTask.FromResult<ExperimentReplayExport?>(null);
        }

        return _experimentReplayExportStoreAdapter.LoadSavedByIdAsync(id.Trim(), ct);
    }

    public ExperimentReplayExport? GetCurrentActiveReplayExport()
    {
        var snapshot = GetCurrentSnapshot();
        if (!snapshot.IsActive || snapshot.ReadingSession?.Content is null || !snapshot.SessionId.HasValue)
        {
            return null;
        }

        FlushPendingReplayChunksCoreAsync(snapshot, forceFlush: true, CancellationToken.None)
            .AsTask()
            .GetAwaiter()
            .GetResult();

        return _experimentReplayRecoveryStoreAdapter
            .BuildExportAsync(
                snapshot.SessionId.Value,
                "live",
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                CancellationToken.None)
            .AsTask()
            .GetAwaiter()
            .GetResult();
    }

    private async Task SaveCurrentActiveReplayAsync(CancellationToken ct)
    {
        var exportDocument = GetCurrentActiveReplayExport();
        if (exportDocument is null)
        {
            return;
        }

        await _experimentStateStoreAdapter.SaveActiveReplayAsync(exportDocument, ct);
    }

    private Task SaveCurrentCheckpointAsync(CancellationToken ct)
    {
        return Task.CompletedTask;
    }

    private void ResetReplayHistory()
    {
        lock (_historyGate)
        {
            _activeReplayRecoverySessionId = null;
            _hasPendingReplayPersistence = false;
            _pendingLifecycleEvents = [];
            _pendingGazeSamples = [];
            _pendingParticipantViewportEvents = [];
            _pendingReadingFocusEvents = [];
            _pendingAttentionEvents = [];
            _pendingContextPreservationEvents = [];
            _pendingDecisionProposalEvents = [];
            _pendingScheduledInterventionEvents = [];
            _pendingInterventionEvents = [];
            _latestAttentionTokenStats = null;
        }
    }

    public ValueTask FlushPendingReplayChunksAsync(CancellationToken ct = default)
    {
        return FlushPendingReplayChunksCoreAsync(null, forceFlush: false, ct);
    }

    private void RecordLifecycleEvent(string eventType, string source, long occurredAtUnixMs)
    {
        lock (_historyGate)
        {
            _pendingLifecycleEvents.Add(new ExperimentLifecycleEventRecord(
                NextSequenceNumber(),
                eventType,
                source,
                occurredAtUnixMs));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordGazeSample(long capturedAtUnixMs, GazeData gazeData)
    {
        lock (_historyGate)
        {
            _pendingGazeSamples.Add(new RawGazeSampleRecord(
                NextSequenceNumber(),
                capturedAtUnixMs,
                gazeData.DeviceTimeStamp,
                gazeData.SystemTimeStamp,
                ToReplayEyeSample(
                    gazeData.LeftEyeX,
                    gazeData.LeftEyeY,
                    gazeData.LeftEyeValidity,
                    gazeData.LeftEyePositionInUserX,
                    gazeData.LeftEyePositionInUserY,
                    gazeData.LeftEyePositionInUserZ,
                    gazeData.LeftPupilDiameterMm,
                    gazeData.LeftPupilValidity,
                    gazeData.LeftGazeOriginInUserX,
                    gazeData.LeftGazeOriginInUserY,
                    gazeData.LeftGazeOriginInUserZ,
                    gazeData.LeftGazeOriginValidity,
                    gazeData.LeftGazeOriginInTrackBoxX,
                    gazeData.LeftGazeOriginInTrackBoxY,
                    gazeData.LeftGazeOriginInTrackBoxZ),
                ToReplayEyeSample(
                    gazeData.RightEyeX,
                    gazeData.RightEyeY,
                    gazeData.RightEyeValidity,
                    gazeData.RightEyePositionInUserX,
                    gazeData.RightEyePositionInUserY,
                    gazeData.RightEyePositionInUserZ,
                    gazeData.RightPupilDiameterMm,
                    gazeData.RightPupilValidity,
                    gazeData.RightGazeOriginInUserX,
                    gazeData.RightGazeOriginInUserY,
                    gazeData.RightGazeOriginInUserZ,
                    gazeData.RightGazeOriginValidity,
                    gazeData.RightGazeOriginInTrackBoxX,
                    gazeData.RightGazeOriginInTrackBoxY,
                    gazeData.RightGazeOriginInTrackBoxZ)));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordReadingSessionState(string reason, long occurredAtUnixMs, LiveReadingSessionSnapshot session)
    {
        lock (_historyGate)
        {
            if (_activeReplayRecoverySessionId.HasValue)
            {
                _hasPendingReplayPersistence = true;
            }
        }
    }

    private void RecordParticipantViewportEvent(long occurredAtUnixMs, ParticipantViewportSnapshot viewport)
    {
        lock (_historyGate)
        {
            _pendingParticipantViewportEvents.Add(new ParticipantViewportEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                viewport.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordReadingFocusEvent(long occurredAtUnixMs, ReadingFocusSnapshot focus)
    {
        lock (_historyGate)
        {
            _pendingReadingFocusEvents.Add(new ReadingFocusEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                focus.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordReadingAttentionEvent(long occurredAtUnixMs, ReadingAttentionSummarySnapshot summary)
    {
        lock (_historyGate)
        {
            _latestAttentionTokenStats = summary.TokenStats is null
                ? null
                : summary.TokenStats.ToDictionary(e => e.Key, e => e.Value.Copy());
            _pendingAttentionEvents.Add(new ReadingAttentionEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                new ReadingAttentionEventSummary(
                    summary.UpdatedAtUnixMs,
                    summary.CurrentTokenId,
                    summary.CurrentTokenDurationMs,
                    summary.FixatedTokenCount,
                    summary.SkimmedTokenCount)));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordReadingContextPreservationEvent(
        long occurredAtUnixMs,
        ReadingContextPreservationEventSnapshot contextPreservation)
    {
        lock (_historyGate)
        {
            _pendingContextPreservationEvents.Add(new ReadingContextPreservationEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                contextPreservation.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordDecisionProposalEvent(long occurredAtUnixMs, DecisionProposalSnapshot proposal)
    {
        lock (_historyGate)
        {
            _pendingDecisionProposalEvents.Add(new DecisionProposalEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                proposal.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordScheduledInterventionEvent(long occurredAtUnixMs, PendingInterventionSnapshot pendingIntervention)
    {
        lock (_historyGate)
        {
            _pendingScheduledInterventionEvents.Add(new ScheduledInterventionEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                pendingIntervention.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordInterventionEvent(long occurredAtUnixMs, InterventionEventSnapshot intervention)
    {
        lock (_historyGate)
        {
            _pendingInterventionEvents.Add(new InterventionEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                intervention.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private async ValueTask FlushPendingReplayChunksCoreAsync(
        ExperimentSessionSnapshot? snapshotOverride,
        bool forceFlush,
        CancellationToken ct)
    {
        Guid? sessionId;
        bool hasPendingReplayPersistence;
        ExperimentLifecycleEventRecord[] lifecycleEvents;
        RawGazeSampleRecord[] gazeSamples;
        ParticipantViewportEventRecord[] participantViewportEvents;
        ReadingFocusEventRecord[] readingFocusEvents;
        ReadingAttentionEventRecord[] attentionEvents;
        ReadingContextPreservationEventRecord[] contextPreservationEvents;
        DecisionProposalEventRecord[] decisionProposalEvents;
        ScheduledInterventionEventRecord[] scheduledInterventionEvents;
        InterventionEventRecord[] interventionEvents;
        IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot>? latestTokenStats;

        lock (_historyGate)
        {
            sessionId = _activeReplayRecoverySessionId;
            hasPendingReplayPersistence = _hasPendingReplayPersistence;

            if (!sessionId.HasValue || (!forceFlush && !hasPendingReplayPersistence))
            {
                return;
            }

            lifecycleEvents = _pendingLifecycleEvents.Select(item => item.Copy()).ToArray();
            gazeSamples = _pendingGazeSamples.Select(item => item.Copy()).ToArray();
            participantViewportEvents = _pendingParticipantViewportEvents.Select(item => item.Copy()).ToArray();
            readingFocusEvents = _pendingReadingFocusEvents.Select(item => item.Copy()).ToArray();
            attentionEvents = _pendingAttentionEvents.Select(item => item.Copy()).ToArray();
            contextPreservationEvents = _pendingContextPreservationEvents.Select(item => item.Copy()).ToArray();
            decisionProposalEvents = _pendingDecisionProposalEvents.Select(item => item.Copy()).ToArray();
            scheduledInterventionEvents = _pendingScheduledInterventionEvents.Select(item => item.Copy()).ToArray();
            interventionEvents = _pendingInterventionEvents.Select(item => item.Copy()).ToArray();
            latestTokenStats = _latestAttentionTokenStats is null
                ? null
                : _latestAttentionTokenStats.ToDictionary(e => e.Key, e => e.Value.Copy());

            _pendingLifecycleEvents = [];
            _pendingGazeSamples = [];
            _pendingParticipantViewportEvents = [];
            _pendingReadingFocusEvents = [];
            _pendingAttentionEvents = [];
            _pendingContextPreservationEvents = [];
            _pendingDecisionProposalEvents = [];
            _pendingScheduledInterventionEvents = [];
            _pendingInterventionEvents = [];
            _hasPendingReplayPersistence = false;
        }

        var snapshot = snapshotOverride ?? GetCurrentSnapshot();

        try
        {
            await _experimentReplayRecoveryStoreAdapter.AppendChunkAsync(
                new ExperimentReplayRecoveryChunkBatch(
                    sessionId.Value,
                    snapshot,
                    DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                    lifecycleEvents,
                    gazeSamples,
                    participantViewportEvents,
                    readingFocusEvents,
                    attentionEvents,
                    contextPreservationEvents,
                    decisionProposalEvents,
                    scheduledInterventionEvents,
                    interventionEvents,
                    latestTokenStats),
                ct);
        }
        catch
        {
            lock (_historyGate)
            {
                _pendingLifecycleEvents = [.. lifecycleEvents.Select(item => item.Copy()), .. _pendingLifecycleEvents];
                _pendingGazeSamples = [.. gazeSamples.Select(item => item.Copy()), .. _pendingGazeSamples];
                _pendingParticipantViewportEvents = [.. participantViewportEvents.Select(item => item.Copy()), .. _pendingParticipantViewportEvents];
                _pendingReadingFocusEvents = [.. readingFocusEvents.Select(item => item.Copy()), .. _pendingReadingFocusEvents];
                _pendingAttentionEvents = [.. attentionEvents.Select(item => item.Copy()), .. _pendingAttentionEvents];
                _pendingContextPreservationEvents = [.. contextPreservationEvents.Select(item => item.Copy()), .. _pendingContextPreservationEvents];
                _pendingDecisionProposalEvents = [.. decisionProposalEvents.Select(item => item.Copy()), .. _pendingDecisionProposalEvents];
                _pendingScheduledInterventionEvents = [.. scheduledInterventionEvents.Select(item => item.Copy()), .. _pendingScheduledInterventionEvents];
                _pendingInterventionEvents = [.. interventionEvents.Select(item => item.Copy()), .. _pendingInterventionEvents];
                _hasPendingReplayPersistence = true;
            }

            throw;
        }
    }

    private static ReplayEyeSample ToReplayEyeSample(
        float x,
        float y,
        string validity,
        float? positionInUserX,
        float? positionInUserY,
        float? positionInUserZ,
        float? pupilDiameterMm,
        string pupilValidity,
        float? gazeOriginInUserX,
        float? gazeOriginInUserY,
        float? gazeOriginInUserZ,
        string gazeOriginValidity,
        float? gazeOriginInTrackBoxX,
        float? gazeOriginInTrackBoxY,
        float? gazeOriginInTrackBoxZ)
    {
        return new ReplayEyeSample(
            new ReplayEyePoint2D(x, y, string.IsNullOrWhiteSpace(validity) ? "Invalid" : validity),
            new ReplayEyePoint3D(positionInUserX, positionInUserY, positionInUserZ),
            new ReplayEyePupil(pupilDiameterMm, string.IsNullOrWhiteSpace(pupilValidity) ? "Invalid" : pupilValidity),
            new ReplayEyeOrigin3D(
                gazeOriginInUserX,
                gazeOriginInUserY,
                gazeOriginInUserZ,
                string.IsNullOrWhiteSpace(gazeOriginValidity) ? "Invalid" : gazeOriginValidity),
            new ReplayEyeTrackBoxPoint(
                gazeOriginInTrackBoxX,
                gazeOriginInTrackBoxY,
                gazeOriginInTrackBoxZ));
    }

    private long NextSequenceNumber()
    {
        return Interlocked.Increment(ref _eventSequenceNumber);
    }


}
