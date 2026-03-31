using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
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
            harness.StateStore.SavedSnapshots,
            saved => saved.IsActive && saved.SessionId == snapshot.SessionId);
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
        Assert.Equal(finalSnapshot.SessionId, harness.ReplayExportStore.LatestExport!.Metadata.SessionId);
        Assert.Equal("researcher-ui", harness.ReplayExportStore.LatestExport.Metadata.CompletionSource);
        Assert.True(harness.ReplayExportStore.LatestExport.Statistics.GazeSampleCount >= 1);
        Assert.True(harness.ReplayExportStore.LatestExport.Statistics.ParticipantViewportEventCount >= 1);
        Assert.True(harness.ReplayExportStore.LatestExport.Statistics.ReadingFocusEventCount >= 1);
        Assert.False(harness.ReplayExportStore.LatestExport.FinalSnapshot.IsActive);
        Assert.False(finalSnapshot.LiveMonitoring.CanFinishSession);
        Assert.True(finalSnapshot.LiveMonitoring.HasParticipantViewConnection);
        Assert.True(finalSnapshot.LiveMonitoring.HasParticipantViewportData);
        Assert.True(finalSnapshot.LiveMonitoring.HasReadingFocusSignal);
        Assert.True(harness.StateStore.SavedSnapshots.Count >= 3);
        Assert.Equal(finalSnapshot.SessionId, harness.StateStore.SavedSnapshots.Last().SessionId);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.ExperimentStopped
                       && message.Payload is ExperimentSessionSnapshot stoppedSnapshot
                       && !stoppedSnapshot.IsActive
                       && stoppedSnapshot.SessionId == finalSnapshot.SessionId);
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
}
