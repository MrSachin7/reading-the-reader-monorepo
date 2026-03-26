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

        await Assert.ThrowsAsync<InvalidOperationException>(() => harness.SessionManager.StartSessionAsync());

        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);

        var started = await harness.SessionManager.StartSessionAsync();

        Assert.True(started);

        var snapshot = harness.SessionManager.GetCurrentSnapshot();
        Assert.True(snapshot.IsActive);
        Assert.NotNull(snapshot.SessionId);
        Assert.True(snapshot.Setup.EyeTrackerSetupCompleted);
        Assert.True(snapshot.Setup.ParticipantSetupCompleted);
        Assert.True(snapshot.Setup.CalibrationCompleted);
        Assert.True(snapshot.Setup.ReadingMaterialSetupCompleted);
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
        Assert.True(harness.StateStore.SavedSnapshots.Count >= 3);
        Assert.Equal(finalSnapshot.SessionId, harness.StateStore.SavedSnapshots.Last().SessionId);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.ExperimentStopped
                       && message.Payload is ExperimentSessionSnapshot stoppedSnapshot
                       && !stoppedSnapshot.IsActive
                       && stoppedSnapshot.SessionId == finalSnapshot.SessionId);
    }
}
