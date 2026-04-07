using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ExperimentSessionAuthorityTests
{
    [Fact]
    public async Task StartSessionAsync_RequiresSetupBeforeActivating()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        var noTrackerError = await Assert.ThrowsAsync<InvalidOperationException>(() => harness.SessionManager.StartSessionAsync());
        Assert.Equal("Select and license an eye tracker before starting the session.", noTrackerError.Message);
        Assert.Equal(noTrackerError.Message, harness.SessionManager.GetCurrentSnapshot().Setup.CurrentBlocker!.Reason);

        await harness.SessionManager.SetCurrentEyeTrackerAsync(new EyeTrackerDevice
        {
            Name = "Tobii Pro Nano",
            Model = "Nano",
            SerialNumber = "nano-001",
            HasSavedLicence = true
        });

        var participantError = await Assert.ThrowsAsync<InvalidOperationException>(() => harness.SessionManager.StartSessionAsync());
        Assert.Equal("Save the participant information before starting the session.", participantError.Message);
        Assert.Equal(participantError.Message, harness.SessionManager.GetCurrentSnapshot().Setup.CurrentBlocker!.Reason);

        await harness.SessionManager.SetCurrentParticipantAsync(new Participant
        {
            Name = "Participant 1",
            Age = 29,
            Sex = "female",
            ExistingEyeCondition = "none",
            ReadingProficiency = "advanced"
        });

        var calibrationError = await Assert.ThrowsAsync<InvalidOperationException>(() => harness.SessionManager.StartSessionAsync());
        Assert.Equal("Calibration validation must pass before the session can start.", calibrationError.Message);
        Assert.Equal(calibrationError.Message, harness.SessionManager.GetCurrentSnapshot().Setup.CurrentBlocker!.Reason);

        await harness.SessionManager.SetCalibrationStateAsync(new CalibrationSessionSnapshot(
            Guid.NewGuid(),
            "completed",
            CalibrationPatterns.ScreenBasedNinePoint,
            1_710_000_000_000,
            1_710_000_001_000,
            1_710_000_002_000,
            [],
            new CalibrationRunResult(
                "applied",
                true,
                9,
                [],
                new CalibrationValidationResult(
                    true,
                    "good",
                    0.5,
                    0.2,
                    9,
                    [],
                    []),
                []),
            new CalibrationValidationSnapshot(
                "completed",
                1_710_000_001_000,
                1_710_000_001_500,
                1_710_000_002_000,
                [],
                new CalibrationValidationResult(
                    true,
                    "good",
                    0.5,
                    0.2,
                    9,
                    [],
                    []),
                []),
            []));

        var readingMaterialError = await Assert.ThrowsAsync<InvalidOperationException>(() => harness.SessionManager.StartSessionAsync());
        Assert.Equal("Choose the reading material before starting the session.", readingMaterialError.Message);
        Assert.Equal(readingMaterialError.Message, harness.SessionManager.GetCurrentSnapshot().Setup.CurrentBlocker!.Reason);

        await harness.SessionManager.SetReadingSessionAsync(new UpsertReadingSessionCommand(
            "doc-1",
            "Sample document",
            "# Hello reader",
            null,
            ReadingPresentationSnapshot.Default,
            ReaderAppearanceSnapshot.Default));

        var started = await harness.SessionManager.StartSessionAsync();

        Assert.True(started);

        var snapshot = harness.SessionManager.GetCurrentSnapshot();
        Assert.True(snapshot.IsActive);
        Assert.NotNull(snapshot.SessionId);
        Assert.True(snapshot.Setup.IsReadyForSessionStart);
        Assert.False(snapshot.LiveMonitoring.CanStartSession);
        Assert.True(snapshot.LiveMonitoring.CanFinishSession);
        Assert.False(snapshot.LiveMonitoring.HasParticipantViewConnection);
        Assert.False(snapshot.LiveMonitoring.HasParticipantViewportData);
        Assert.False(snapshot.LiveMonitoring.HasReadingFocusSignal);
        Assert.True(snapshot.Setup.EyeTracker.IsReady);
        Assert.True(snapshot.Setup.Participant.IsReady);
        Assert.True(snapshot.Setup.Calibration.IsReady);
        Assert.True(snapshot.Setup.ReadingMaterial.IsReady);
        Assert.Contains(
            harness.StateStore.SavedActiveReplays,
            saved => saved.Experiment.EndedAtUnixMs is null && saved.Experiment.SessionId == snapshot.SessionId);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.ExperimentStarted
                       && message.Payload is ExperimentSessionSnapshot startedSnapshot
                       && startedSnapshot.IsActive
                       && startedSnapshot.SessionId == snapshot.SessionId);
    }

    [Fact]
    public async Task FinishSessionAsync_PersistsReplayExportAndFinalSnapshot()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);

        await harness.SessionManager.StartSessionAsync();
        await harness.SessionManager.RegisterParticipantViewAsync("participant-1");
        await harness.SessionManager.UpdateParticipantViewportAsync(
            "participant-1",
            new UpdateParticipantViewportCommand(0.42, 320, 1440, 900, 2800, 920));
        await harness.SessionManager.UpdateReadingFocusAsync(
            new UpdateReadingFocusCommand(true, 0.5, 0.35, "token-1", "block-1"));
        harness.SessionManager.UpdateGazeSample(new GazeData
        {
            DeviceTimeStamp = 123,
            LeftEyeX = 10,
            LeftEyeY = 20,
            LeftEyeValidity = "Valid",
            RightEyeX = 30,
            RightEyeY = 40,
            RightEyeValidity = "Valid"
        });

        var finalSnapshot = await harness.SessionManager.FinishSessionAsync(new FinishExperimentCommand("researcher-ui"));

        Assert.False(finalSnapshot.IsActive);
        Assert.NotNull(finalSnapshot.StoppedAtUnixMs);
        Assert.NotNull(harness.ReplayExportStore.LatestExport);
        Assert.Equal(finalSnapshot.SessionId, harness.ReplayExportStore.LatestExport!.Experiment.SessionId);
        Assert.Equal("researcher-ui", harness.ReplayExportStore.LatestExport.Manifest.CompletionSource);
        Assert.True(harness.ReplayExportStore.LatestExport.Sensing.GazeSamples.Count >= 1);
        Assert.True(harness.ReplayExportStore.LatestExport.Derived.ViewportEvents.Count >= 1);
        Assert.True(harness.ReplayExportStore.LatestExport.Derived.FocusEvents.Count >= 1);
        Assert.Equal("doc-1", harness.ReplayExportStore.LatestExport.Content.DocumentId);
        Assert.False(finalSnapshot.LiveMonitoring.CanFinishSession);
        Assert.True(finalSnapshot.LiveMonitoring.HasParticipantViewConnection);
        Assert.True(finalSnapshot.LiveMonitoring.HasParticipantViewportData);
        Assert.True(finalSnapshot.LiveMonitoring.HasReadingFocusSignal);
        Assert.Null(harness.StateStore.LatestActiveReplay);
        Assert.True(harness.StateStore.SavedActiveReplays.Count >= 1);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.ExperimentStopped
                       && message.Payload is ExperimentSessionSnapshot stoppedSnapshot
                       && !stoppedSnapshot.IsActive
                       && stoppedSnapshot.SessionId == finalSnapshot.SessionId);
    }

    [Fact]
    public async Task StartSessionAndLiveSignals_CreateReplayReadyLiveFileBeforeFinish()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);

        await harness.SessionManager.StartSessionAsync();
        await harness.SessionManager.RegisterParticipantViewAsync("participant-1");
        await harness.SessionManager.UpdateParticipantViewportAsync(
            "participant-1",
            new UpdateParticipantViewportCommand(0.42, 320, 1440, 900, 2800, 920));
        await harness.SessionManager.UpdateReadingFocusAsync(
            new UpdateReadingFocusCommand(true, 0.5, 0.35, "token-1", "block-1"));
        harness.SessionManager.UpdateGazeSample(new GazeData
        {
            DeviceTimeStamp = 123,
            LeftEyeX = 10,
            LeftEyeY = 20,
            LeftEyeValidity = "Valid",
            RightEyeX = 30,
            RightEyeY = 40,
            RightEyeValidity = "Valid"
        });

        var activeReplay = Assert.IsType<ExperimentReplayExport>(harness.SessionManager.GetCurrentActiveReplayExport());
        Assert.Equal(ExperimentReplayExportSchema.Name, activeReplay.Manifest.Schema);
        Assert.Null(activeReplay.Experiment.EndedAtUnixMs);
        Assert.Null(activeReplay.Experiment.DurationMs);
        Assert.Contains(
            activeReplay.Experiment.LifecycleEvents,
            item => item.EventType == "session-started");
        Assert.True(activeReplay.Sensing.GazeSamples.Count >= 1);
        Assert.True(activeReplay.Derived.ViewportEvents.Count >= 1);
        Assert.True(activeReplay.Derived.FocusEvents.Count >= 1);
    }

    [Fact]
    public async Task Constructor_WithUnfinishedLiveReplay_DoesNotRestoreCurrentSession()
    {
        var originalHarness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(originalHarness);
        await originalHarness.SessionManager.StartSessionAsync();
        await originalHarness.SessionManager.RegisterParticipantViewAsync("participant-1");
        originalHarness.SessionManager.UpdateGazeSample(new GazeData
        {
            DeviceTimeStamp = 123,
            LeftEyeX = 10,
            LeftEyeY = 20,
            LeftEyeValidity = "Valid",
            RightEyeX = 30,
            RightEyeY = 40,
            RightEyeValidity = "Valid"
        });
        await originalHarness.StateStore.SaveActiveReplayAsync(
            Assert.IsType<ExperimentReplayExport>(originalHarness.SessionManager.GetCurrentActiveReplayExport()));

        var recoveredHarness = RealtimeTestDoubles.CreateHarness(
            originalHarness.EyeTrackerAdapter,
            originalHarness.Broadcaster,
            originalHarness.StateStore,
            originalHarness.ReplayExportStore);

        var snapshot = recoveredHarness.SessionManager.GetCurrentSnapshot();

        Assert.False(snapshot.IsActive);
        Assert.Null(snapshot.SessionId);
        Assert.NotNull(recoveredHarness.StateStore.LatestActiveReplay);
        Assert.Null(recoveredHarness.ReplayExportStore.LatestExport);
    }

    [Fact]
    public async Task SubscribeGazeDataAsync_WhenBackendRestartsWithSavedLiveReplay_DoesNotRestartHardwareTracking()
    {
        var originalHarness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(originalHarness);
        await originalHarness.SessionManager.StartSessionAsync();
        await originalHarness.StateStore.SaveActiveReplayAsync(
            Assert.IsType<ExperimentReplayExport>(originalHarness.SessionManager.GetCurrentActiveReplayExport()));

        var recoveredHarness = RealtimeTestDoubles.CreateHarness(
            originalHarness.EyeTrackerAdapter,
            originalHarness.Broadcaster,
            originalHarness.StateStore,
            originalHarness.ReplayExportStore);

        var startCallsBeforeSubscribe = recoveredHarness.EyeTrackerAdapter.StartCalls;

        await recoveredHarness.SessionManager.SubscribeGazeDataAsync("researcher-1");

        Assert.False(recoveredHarness.SessionManager.GetCurrentSnapshot().IsActive);
        Assert.Equal(startCallsBeforeSubscribe, recoveredHarness.EyeTrackerAdapter.StartCalls);
        Assert.DoesNotContain(
            recoveredHarness.Broadcaster.DirectMessages,
            message => message.ConnectionId == "researcher-1" && message.MessageType == MessageTypes.Error);
    }

    [Fact]
    public async Task ResetSessionAsync_ClearsActiveLiveReplay()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();
        await harness.SessionManager.FinishSessionAsync(new FinishExperimentCommand("researcher-ui"));

        var snapshot = await harness.SessionManager.ResetSessionAsync();

        Assert.False(snapshot.IsActive);
        Assert.Null(snapshot.SessionId);
        Assert.Null(harness.StateStore.LatestActiveReplay);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenParticipantViewConnects_ProjectsLiveMonitoringSemantics()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);

        var readySnapshot = harness.SessionManager.GetCurrentSnapshot();
        Assert.True(readySnapshot.LiveMonitoring.CanStartSession);
        Assert.False(readySnapshot.LiveMonitoring.CanFinishSession);
        Assert.False(readySnapshot.LiveMonitoring.HasParticipantViewConnection);
        Assert.False(readySnapshot.LiveMonitoring.HasParticipantViewportData);
        Assert.False(readySnapshot.LiveMonitoring.HasReadingFocusSignal);

        await harness.SessionManager.StartSessionAsync();
        await harness.SessionManager.RegisterParticipantViewAsync("participant-1");
        await harness.SessionManager.UpdateParticipantViewportAsync(
            "participant-1",
            new UpdateParticipantViewportCommand(0.42, 320, 1440, 900, 2800, 920));
        await harness.SessionManager.UpdateReadingFocusAsync(
            new UpdateReadingFocusCommand(true, 0.5, 0.35, "token-1", "block-1"));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.False(snapshot.LiveMonitoring.CanStartSession);
        Assert.True(snapshot.LiveMonitoring.CanFinishSession);
        Assert.True(snapshot.LiveMonitoring.HasParticipantViewConnection);
        Assert.True(snapshot.LiveMonitoring.HasParticipantViewportData);
        Assert.NotNull(snapshot.LiveMonitoring.ParticipantViewportUpdatedAtUnixMs);
        Assert.True(snapshot.LiveMonitoring.HasReadingFocusSignal);
        Assert.NotNull(snapshot.LiveMonitoring.FocusUpdatedAtUnixMs);
    }

    [Fact]
    public async Task DisconnectParticipantViewAsync_WhenLastViewDisconnects_ClearsMonitorabilitySignals()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();
        await harness.SessionManager.RegisterParticipantViewAsync("participant-1");
        await harness.SessionManager.UpdateParticipantViewportAsync(
            "participant-1",
            new UpdateParticipantViewportCommand(0.42, 320, 1440, 900, 2800, 920));
        await harness.SessionManager.UpdateReadingFocusAsync(
            new UpdateReadingFocusCommand(true, 0.5, 0.35, "token-1", "block-1"));

        await harness.SessionManager.DisconnectParticipantViewAsync("participant-1");

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.True(snapshot.LiveMonitoring.CanFinishSession);
        Assert.False(snapshot.LiveMonitoring.HasParticipantViewConnection);
        Assert.False(snapshot.LiveMonitoring.HasParticipantViewportData);
        Assert.True(snapshot.LiveMonitoring.HasReadingFocusSignal);
        Assert.False(snapshot.ReadingSession!.ParticipantViewport.IsConnected);
        Assert.False(snapshot.ReadingSession.Focus.IsInsideReadingArea);
    }

    [Fact]
    public async Task UpdateReadingContextPreservationAsync_ProjectsLatestResultAndKeepsRecentHistoryOrderedByMeasuredTime()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();

        var degraded = await harness.SessionManager.UpdateReadingContextPreservationAsync(
            new UpdateReadingContextPreservationCommand(
                "degraded",
                "fallback-token",
                "token-2",
                "block-2",
                42,
                18,
                1_710_000_003_000,
                1_710_000_003_500,
                "Anchor drift exceeded threshold"));

        var preserved = await harness.SessionManager.UpdateReadingContextPreservationAsync(
            new UpdateReadingContextPreservationCommand(
                "preserved",
                "active-token",
                "token-3",
                "block-3",
                12,
                4,
                1_710_000_004_000,
                1_710_000_005_000,
                null));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();
        var readingSession = Assert.IsType<LiveReadingSessionSnapshot>(snapshot.ReadingSession);
        var latest = Assert.IsType<ReadingContextPreservationEventSnapshot>(readingSession.LatestContextPreservation);

        Assert.Equal("preserved", preserved.Status);
        Assert.Equal("degraded", degraded.Status);
        Assert.Equal("preserved", latest.Status);
        Assert.Equal("active-token", latest.AnchorSource);
        Assert.Equal(2, readingSession.RecentContextPreservationEvents.Count);
        Assert.Collection(
            readingSession.RecentContextPreservationEvents,
            first =>
            {
                Assert.Equal("preserved", first.Status);
                Assert.Equal(1_710_000_005_000, first.MeasuredAtUnixMs);
            },
            second =>
            {
                Assert.Equal("degraded", second.Status);
                Assert.Equal(1_710_000_003_500, second.MeasuredAtUnixMs);
            });

        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.ReadingContextPreservationChanged
                       && message.Payload is ReadingContextPreservationEventSnapshot payload
                       && payload.Status == "preserved"
                       && payload.MeasuredAtUnixMs == 1_710_000_005_000);
    }

    [Fact]
    public async Task ApplyInterventionAsync_WhenRepeatedLayoutChangeArrivesDuringCooldown_ProjectsCooldownActiveGuardrail()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();

        var firstIntervention = await harness.SessionManager.ApplyInterventionAsync(new ApplyInterventionCommand(
            "manual",
            "researcher-ui",
            "Increase font size once",
            new ReadingPresentationPatch(null, 20, null, null, null, null),
            new ReaderAppearancePatch(null, null, null)));
        var secondIntervention = await harness.SessionManager.ApplyInterventionAsync(new ApplyInterventionCommand(
            "manual",
            "researcher-ui",
            "Increase font size again immediately",
            new ReadingPresentationPatch(null, 22, null, null, null, null),
            new ReaderAppearancePatch(null, null, null)));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();
        var readingSession = Assert.IsType<LiveReadingSessionSnapshot>(snapshot.ReadingSession);
        var guardrail = Assert.IsType<LayoutInterventionGuardrailSnapshot>(readingSession.LatestLayoutGuardrail);

        Assert.NotNull(firstIntervention);
        Assert.Null(secondIntervention);
        Assert.Equal("suppressed", guardrail.Status);
        Assert.Equal("cooldown-active", guardrail.Reason);
        Assert.Contains("font-size", guardrail.AffectedProperties);
        Assert.NotNull(guardrail.CooldownUntilUnixMs);
        Assert.Single(readingSession.RecentInterventions);
        Assert.Equal(20, readingSession.Presentation.FontSizePx);
    }

    [Fact]
    public async Task ApplyInterventionAsync_WhenLayoutChangeStepIsTooLarge_ProjectsChangeTooLargeGuardrail()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();

        var intervention = await harness.SessionManager.ApplyInterventionAsync(new ApplyInterventionCommand(
            "manual",
            "researcher-ui",
            "Jump font size too far",
            new ReadingPresentationPatch(null, 26, null, null, null, null),
            new ReaderAppearancePatch(null, null, null)));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();
        var readingSession = Assert.IsType<LiveReadingSessionSnapshot>(snapshot.ReadingSession);
        var guardrail = Assert.IsType<LayoutInterventionGuardrailSnapshot>(readingSession.LatestLayoutGuardrail);

        Assert.Null(intervention);
        Assert.Equal("suppressed", guardrail.Status);
        Assert.Equal("change-too-large", guardrail.Reason);
        Assert.Contains("font-size", guardrail.AffectedProperties);
        Assert.Equal(18, readingSession.Presentation.FontSizePx);
        Assert.Null(readingSession.LatestIntervention);
        Assert.Empty(readingSession.RecentInterventions);
    }
}
