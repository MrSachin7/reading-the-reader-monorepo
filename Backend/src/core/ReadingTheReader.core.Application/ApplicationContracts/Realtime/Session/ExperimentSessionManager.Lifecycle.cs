using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    public async ValueTask SetCurrentParticipantAsync(Participant participant, CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            var participantCopy = participant.Copy();
            Volatile.Write(ref _session, current with { Participant = participantCopy });

            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async ValueTask SetCurrentEyeTrackerAsync(EyeTrackerDevice eyeTrackerDevice, CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            var eyeTrackerCopy = eyeTrackerDevice.Copy();
            Volatile.Write(ref _session, current with { EyeTrackerDevice = eyeTrackerCopy });

            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async ValueTask SetCalibrationStateAsync(CalibrationSessionSnapshot calibrationSnapshot, CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _calibrationSnapshot = calibrationSnapshot;
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async Task<bool> StartSessionAsync(CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            if (current.IsActive)
            {
                return false;
            }

            EnsureSetupIsReadyForStart(current, _calibrationSnapshot, _liveReadingSession);

            Interlocked.Exchange(ref _receivedGazeSamples, 0);
            Interlocked.Exchange(ref _eventSequenceNumber, 0);
            Volatile.Write(ref _latestGazeSample, null);

            var startedAt = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            Volatile.Write(ref _session, ExperimentSession.StartNew(startedAt, current.Participant, current.EyeTrackerDevice));
            _eyeMovementAnalysisRuntimeState = EyeMovementAnalysisRuntimeState.Empty;
            _decisionState = new DecisionRuntimeStateSnapshot(_decisionState.AutomationPaused, null, []);
            ResetReplayHistory();
            RecordLifecycleEvent("session-started", "system", startedAt);
            RecordReadingSessionState("session-started", startedAt, _liveReadingSession.Copy());
            await EnsureGazeStreamingStateAsync(ct);

            var snapshot = GetCurrentSnapshot();
            if (snapshot.SessionId.HasValue)
            {
                _activeReplayRecoverySessionId = snapshot.SessionId.Value;
                _hasPendingReplayPersistence = false;
                await _experimentReplayRecoveryStoreAdapter.InitializeSessionAsync(
                    new ExperimentReplayRecoverySessionSeed(
                        snapshot.SessionId.Value,
                        snapshot,
                        startedAt),
                    ct);
            }

            await SaveCurrentActiveReplayAsync(ct);
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ExperimentStarted, snapshot, ct);
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishSessionSnapshotAsync(snapshot, ct);
                await _externalProviderGateway.PublishDecisionUpdateAsync(snapshot.SessionId, BuildDecisionRealtimeUpdate(), ct);
            }
            if (ShouldPublishToExternalAnalysisProvider())
            {
                await _analysisProviderGateway.PublishSessionSnapshotAsync(snapshot, ct);
            }
            return true;
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    public async Task<bool> StopSessionAsync(CancellationToken ct = default)
    {
        var snapshot = await StopSessionCoreAsync("system", ct);
        return snapshot is not null;
    }

    public async Task<ExperimentSessionSnapshot> FinishSessionAsync(FinishExperimentCommand command, CancellationToken ct = default)
    {
        var source = string.IsNullOrWhiteSpace(command.Source) ? "unknown" : command.Source.Trim();
        return await StopSessionCoreAsync(source, ct) ?? GetCurrentSnapshot();
    }

    public async Task<ExperimentSessionSnapshot> ResetSessionAsync(CancellationToken ct = default)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            if (current.IsActive)
            {
                throw new InvalidOperationException("Finish the current session before starting a new one.");
            }

            StopHardwareStreaming();
            Interlocked.Exchange(ref _isGazeStreamingSuppressed, 0);
            Interlocked.Exchange(ref _receivedGazeSamples, 0);
            Interlocked.Exchange(ref _eventSequenceNumber, 0);
            Volatile.Write(ref _latestGazeSample, null);
            Volatile.Write(ref _session, ExperimentSession.Inactive);
            _calibrationSnapshot = CalibrationSessionSnapshots.CreateIdle();
            _liveReadingSession = LiveReadingSessionSnapshot.Empty;
            _eyeMovementAnalysisConfiguration = EyeMovementAnalysisConfigurationSnapshot.Default.Copy();
            _eyeMovementAnalysisRuntimeState = EyeMovementAnalysisRuntimeState.Empty;
            _decisionConfiguration = DecisionConfigurationSnapshot.Default.Copy();
            _decisionState = DecisionRuntimeStateSnapshot.Empty.Copy();
            _lastLayoutInterventionAppliedAtUnixMs = 0;
            ResetReplayHistory();

            var snapshot = GetCurrentSnapshot();
            await _experimentStateStoreAdapter.ClearActiveReplayAsync(ct);
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ExperimentState, snapshot, ct);
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishSessionSnapshotAsync(snapshot, ct);
            }
            if (ShouldPublishToExternalAnalysisProvider())
            {
                await _analysisProviderGateway.PublishSessionSnapshotAsync(snapshot, ct);
            }
            return snapshot;
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    private async Task<ExperimentSessionSnapshot?> StopSessionCoreAsync(string source, CancellationToken ct)
    {
        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var current = Volatile.Read(ref _session);
            if (!current.IsActive)
            {
                return null;
            }

            var stoppedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            Volatile.Write(ref _session, current.Stop(stoppedAtUnixMs));
            RecordLifecycleEvent("session-stopped", source, stoppedAtUnixMs);
            await EnsureGazeStreamingStateAsync(ct);

            var snapshot = GetCurrentSnapshot();
            await FlushPendingReplayChunksCoreAsync(snapshot, forceFlush: true, ct);
            if (!snapshot.SessionId.HasValue)
            {
                throw new InvalidOperationException("Cannot export a replay without a session id.");
            }

            var exportDocument = await _experimentReplayRecoveryStoreAdapter.BuildExportAsync(
                snapshot.SessionId.Value,
                source,
                stoppedAtUnixMs,
                ct) ?? throw new InvalidOperationException("No replay recovery data is available for this session.");
            var processedExportDocument = await _experimentReplayRecoveryStoreAdapter.BuildProcessedExportAsync(
                snapshot.SessionId.Value,
                source,
                stoppedAtUnixMs,
                ct) ?? throw new InvalidOperationException("No processed export data is available for this session.");
            await _experimentReplayExportStoreAdapter.SaveLatestAsync(exportDocument, ct);
            await _experimentReplayExportStoreAdapter.SaveLatestProcessedAsync(processedExportDocument, ct);
            await _experimentReplayRecoveryStoreAdapter.MarkCompletedAsync(snapshot.SessionId.Value, exportDocument, stoppedAtUnixMs, ct);
            await _experimentStateStoreAdapter.ClearActiveReplayAsync(ct);
            ResetReplayHistory();
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ExperimentStopped, snapshot, ct);
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishSessionSnapshotAsync(snapshot, ct);
                await _externalProviderGateway.PublishDecisionUpdateAsync(snapshot.SessionId, BuildDecisionRealtimeUpdate(), ct);
            }
            if (ShouldPublishToExternalAnalysisProvider())
            {
                await _analysisProviderGateway.PublishSessionSnapshotAsync(snapshot, ct);
            }
            return snapshot;
        }
        finally
        {
            _lifecycleGate.Release();
        }
    }

    private void EnsureSetupIsReadyForStart(
        ExperimentSession session,
        CalibrationSessionSnapshot calibrationSnapshot,
        LiveReadingSessionSnapshot liveReadingSession)
    {
        var setup = BuildSetupSnapshot(session, calibrationSnapshot, liveReadingSession);
        if (setup.IsReadyForSessionStart)
        {
            return;
        }

        throw new InvalidOperationException(
            setup.CurrentBlocker?.Reason ?? "Complete setup before starting the session.");
    }
}
