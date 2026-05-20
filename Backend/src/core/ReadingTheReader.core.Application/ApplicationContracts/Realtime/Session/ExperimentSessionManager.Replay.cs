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

    public ValueTask<ExperimentProcessedExport?> GetLatestProcessedExportAsync(CancellationToken ct = default)
    {
        return _experimentReplayExportStoreAdapter.LoadLatestProcessedAsync(ct);
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
            _pendingWebcamGazeSamples = [];
            _pendingEnrichedGazeSamples = [];
            _pendingWebcamStatusEvents = [];
            _pendingFacialObservationEvents = [];
            _pendingFacialDifficultyEvents = [];
            _pendingReadingSessionStates = [];
            _pendingParticipantViewportEvents = [];
            _pendingReadingFocusEvents = [];
            _pendingAttentionEvents = [];
            _pendingContextPreservationEvents = [];
            _pendingDecisionProposalEvents = [];
            _pendingScheduledInterventionEvents = [];
            _pendingInterventionEvents = [];
            _pendingQuizAnswerEvents = [];
            _pendingQuizLifecycleEvents = [];
            _pendingQuizFocusEvents = [];
            _pendingQuizSelectionEvents = [];
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

    private void RecordEnrichedGazeSample(long capturedAtUnixMs, GazeData gazeData, ReadingFocusSnapshot focus)
    {
        lock (_historyGate)
        {
            var material = GetCurrentMaterialPointer();
            _pendingEnrichedGazeSamples.Add(new EnrichedGazeSampleRecord(
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
                    gazeData.RightGazeOriginInTrackBoxZ),
                focus.Copy(),
                material.MaterialRunId,
                material.MaterialIndex));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordWebcamGazeSample(long capturedAtUnixMs, GazeData gazeData)
    {
        lock (_historyGate)
        {
            _pendingWebcamGazeSamples.Add(new WebcamGazeSampleRecord(
                NextSequenceNumber(),
                capturedAtUnixMs,
                gazeData.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordWebcamStatusEvent(long occurredAtUnixMs, WebcamSensingStatusSnapshot status)
    {
        lock (_historyGate)
        {
            _pendingWebcamStatusEvents.Add(new WebcamSensingStatusRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                status.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordFacialObservationEvent(long capturedAtUnixMs, FacialObservationSnapshot observation)
    {
        lock (_historyGate)
        {
            _pendingFacialObservationEvents.Add(new FacialObservationRecord(
                NextSequenceNumber(),
                capturedAtUnixMs,
                observation.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordFacialDifficultyEvent(long occurredAtUnixMs, FacialDifficultySignalSnapshot signal)
    {
        lock (_historyGate)
        {
            _pendingFacialDifficultyEvents.Add(new FacialDifficultyEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                signal.Copy()));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordReadingSessionState(string reason, long occurredAtUnixMs, LiveReadingSessionSnapshot session)
    {
        lock (_historyGate)
        {
            _pendingReadingSessionStates.Add(new ReadingSessionStateRecord(
                NextSequenceNumber(),
                reason,
                occurredAtUnixMs,
                session.Copy()));
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
            var material = GetCurrentMaterialPointer();
            _pendingParticipantViewportEvents.Add(new ParticipantViewportEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                viewport.Copy(),
                material.MaterialRunId,
                material.MaterialIndex));
            _hasPendingReplayPersistence = true;
        }
    }

    private void RecordReadingFocusEvent(long occurredAtUnixMs, ReadingFocusSnapshot focus)
    {
        lock (_historyGate)
        {
            var material = GetCurrentMaterialPointer();
            _pendingReadingFocusEvents.Add(new ReadingFocusEventRecord(
                NextSequenceNumber(),
                occurredAtUnixMs,
                focus.Copy(),
                material.MaterialRunId,
                material.MaterialIndex));
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
                proposal.Copy(),
                GetCurrentMaterialPointer().MaterialRunId,
                GetCurrentMaterialPointer().MaterialIndex));
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
                intervention.Copy(),
                GetCurrentMaterialPointer().MaterialRunId,
                GetCurrentMaterialPointer().MaterialIndex));
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
        WebcamGazeSampleRecord[] webcamGazeSamples;
        EnrichedGazeSampleRecord[] enrichedGazeSamples;
        WebcamSensingStatusRecord[] webcamStatusEvents;
        FacialObservationRecord[] facialObservationEvents;
        ReadingSessionStateRecord[] readingSessionStates;
        ParticipantViewportEventRecord[] participantViewportEvents;
        ReadingFocusEventRecord[] readingFocusEvents;
        ReadingAttentionEventRecord[] attentionEvents;
        ReadingContextPreservationEventRecord[] contextPreservationEvents;
        FacialDifficultyEventRecord[] facialDifficultyEvents;
        DecisionProposalEventRecord[] decisionProposalEvents;
        ScheduledInterventionEventRecord[] scheduledInterventionEvents;
        InterventionEventRecord[] interventionEvents;
        QuizAnswerRecord[] quizAnswerEvents;
        QuizLifecycleRecord[] quizLifecycleEvents;
        QuizFocusRecord[] quizFocusEvents;
        QuizSelectionRecord[] quizSelectionEvents;
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
            webcamGazeSamples = _pendingWebcamGazeSamples.Select(item => item.Copy()).ToArray();
            enrichedGazeSamples = _pendingEnrichedGazeSamples.Select(item => item.Copy()).ToArray();
            webcamStatusEvents = _pendingWebcamStatusEvents.Select(item => item.Copy()).ToArray();
            facialObservationEvents = _pendingFacialObservationEvents.Select(item => item.Copy()).ToArray();
            readingSessionStates = _pendingReadingSessionStates.Select(item => item.Copy()).ToArray();
            participantViewportEvents = _pendingParticipantViewportEvents.Select(item => item.Copy()).ToArray();
            readingFocusEvents = _pendingReadingFocusEvents.Select(item => item.Copy()).ToArray();
            attentionEvents = _pendingAttentionEvents.Select(item => item.Copy()).ToArray();
            contextPreservationEvents = _pendingContextPreservationEvents.Select(item => item.Copy()).ToArray();
            facialDifficultyEvents = _pendingFacialDifficultyEvents.Select(item => item.Copy()).ToArray();
            decisionProposalEvents = _pendingDecisionProposalEvents.Select(item => item.Copy()).ToArray();
            scheduledInterventionEvents = _pendingScheduledInterventionEvents.Select(item => item.Copy()).ToArray();
            interventionEvents = _pendingInterventionEvents.Select(item => item.Copy()).ToArray();
            quizAnswerEvents = _pendingQuizAnswerEvents.Select(item => item.Copy()).ToArray();
            quizLifecycleEvents = _pendingQuizLifecycleEvents.Select(item => item.Copy()).ToArray();
            quizFocusEvents = _pendingQuizFocusEvents.Select(item => item.Copy()).ToArray();
            quizSelectionEvents = _pendingQuizSelectionEvents.Select(item => item.Copy()).ToArray();
            latestTokenStats = _latestAttentionTokenStats is null
                ? null
                : _latestAttentionTokenStats.ToDictionary(e => e.Key, e => e.Value.Copy());

            _pendingLifecycleEvents = [];
            _pendingGazeSamples = [];
            _pendingWebcamGazeSamples = [];
            _pendingEnrichedGazeSamples = [];
            _pendingWebcamStatusEvents = [];
            _pendingFacialObservationEvents = [];
            _pendingReadingSessionStates = [];
            _pendingParticipantViewportEvents = [];
            _pendingReadingFocusEvents = [];
            _pendingAttentionEvents = [];
            _pendingContextPreservationEvents = [];
            _pendingFacialDifficultyEvents = [];
            _pendingDecisionProposalEvents = [];
            _pendingScheduledInterventionEvents = [];
            _pendingInterventionEvents = [];
            _pendingQuizAnswerEvents = [];
            _pendingQuizLifecycleEvents = [];
            _pendingQuizFocusEvents = [];
            _pendingQuizSelectionEvents = [];
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
                    enrichedGazeSamples,
                    readingSessionStates,
                    participantViewportEvents,
                    readingFocusEvents,
                    attentionEvents,
                    contextPreservationEvents,
                    decisionProposalEvents,
                    scheduledInterventionEvents,
                    interventionEvents,
                    latestTokenStats,
                    webcamGazeSamples,
                    webcamStatusEvents,
                    facialObservationEvents,
                    facialDifficultyEvents,
                    quizAnswerEvents,
                    quizLifecycleEvents,
                    quizFocusEvents,
                    quizSelectionEvents),
                ct);
        }
        catch
        {
            lock (_historyGate)
            {
                _pendingLifecycleEvents = [.. lifecycleEvents.Select(item => item.Copy()), .. _pendingLifecycleEvents];
                _pendingGazeSamples = [.. gazeSamples.Select(item => item.Copy()), .. _pendingGazeSamples];
                _pendingWebcamGazeSamples = [.. webcamGazeSamples.Select(item => item.Copy()), .. _pendingWebcamGazeSamples];
                _pendingEnrichedGazeSamples = [.. enrichedGazeSamples.Select(item => item.Copy()), .. _pendingEnrichedGazeSamples];
                _pendingWebcamStatusEvents = [.. webcamStatusEvents.Select(item => item.Copy()), .. _pendingWebcamStatusEvents];
                _pendingFacialObservationEvents = [.. facialObservationEvents.Select(item => item.Copy()), .. _pendingFacialObservationEvents];
                _pendingReadingSessionStates = [.. readingSessionStates.Select(item => item.Copy()), .. _pendingReadingSessionStates];
                _pendingParticipantViewportEvents = [.. participantViewportEvents.Select(item => item.Copy()), .. _pendingParticipantViewportEvents];
                _pendingReadingFocusEvents = [.. readingFocusEvents.Select(item => item.Copy()), .. _pendingReadingFocusEvents];
                _pendingAttentionEvents = [.. attentionEvents.Select(item => item.Copy()), .. _pendingAttentionEvents];
                _pendingContextPreservationEvents = [.. contextPreservationEvents.Select(item => item.Copy()), .. _pendingContextPreservationEvents];
                _pendingFacialDifficultyEvents = [.. facialDifficultyEvents.Select(item => item.Copy()), .. _pendingFacialDifficultyEvents];
                _pendingDecisionProposalEvents = [.. decisionProposalEvents.Select(item => item.Copy()), .. _pendingDecisionProposalEvents];
                _pendingScheduledInterventionEvents = [.. scheduledInterventionEvents.Select(item => item.Copy()), .. _pendingScheduledInterventionEvents];
                _pendingInterventionEvents = [.. interventionEvents.Select(item => item.Copy()), .. _pendingInterventionEvents];
                _pendingQuizAnswerEvents = [.. quizAnswerEvents.Select(item => item.Copy()), .. _pendingQuizAnswerEvents];
                _pendingQuizLifecycleEvents = [.. quizLifecycleEvents.Select(item => item.Copy()), .. _pendingQuizLifecycleEvents];
                _pendingQuizFocusEvents = [.. quizFocusEvents.Select(item => item.Copy()), .. _pendingQuizFocusEvents];
                _pendingQuizSelectionEvents = [.. quizSelectionEvents.Select(item => item.Copy()), .. _pendingQuizSelectionEvents];
                _hasPendingReplayPersistence = true;
            }

            throw;
        }
    }

    private (string? MaterialRunId, int? MaterialIndex) GetCurrentMaterialPointer()
    {
        var index = _liveReadingSession.CurrentExperimentItemIndex;
        var items = _liveReadingSession.ExperimentItems;
        if (!index.HasValue || items is null || index.Value < 0 || index.Value >= items.Count)
        {
            return (null, null);
        }

        var item = items[index.Value];
        return (string.IsNullOrWhiteSpace(item.MaterialRunId) ? item.Id : item.MaterialRunId, index.Value);
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
