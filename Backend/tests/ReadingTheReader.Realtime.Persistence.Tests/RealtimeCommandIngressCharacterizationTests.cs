using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;
using ReadingTheReader.core.Domain;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class RealtimeCommandIngressCharacterizationTests
{
    [Fact]
    public async Task WebSocketIngress_ResearcherCommand_StartExperimentRoutesToStartCommand()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);

        await harness.Ingress.HandleAsync(
            RealtimeIngressCommandFactory.Create(
                "researcher-1",
                MessageTypes.ResearcherCommand,
                CreatePayload(new { command = MessageTypes.StartExperiment })));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.True(snapshot.IsActive);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.ExperimentStarted);
    }

    [Fact]
    public async Task WebSocketIngress_RegisterParticipantViewCommand_BroadcastsParticipantViewState()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        await harness.Ingress.HandleAsync(
            RealtimeIngressCommandFactory.Create(
                "participant-1",
                MessageTypes.RegisterParticipantView,
                CreatePayload(new { })));

        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.ParticipantViewportChanged
                       && message.Payload is ParticipantViewportSnapshot viewport
                       && viewport.IsConnected);
    }

    [Fact]
    public async Task Disconnect_ClearsParticipantViewAndFocusWhenLastParticipantViewDisconnects()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        await harness.Ingress.HandleAsync(
            RealtimeIngressCommandFactory.Create(
                "participant-1",
                MessageTypes.RegisterParticipantView,
                CreatePayload(new { })));
        await harness.Ingress.HandleAsync(
            RealtimeIngressCommandFactory.Create(
                "participant-1",
                MessageTypes.ParticipantViewportUpdated,
                CreatePayload(new UpdateParticipantViewportCommand(0.6, 500, 1280, 720, 2400, 900))));
        await harness.Ingress.HandleAsync(
            RealtimeIngressCommandFactory.Create(
                "participant-1",
                MessageTypes.ReadingFocusUpdated,
                CreatePayload(new UpdateReadingFocusCommand(true, 0.3, 0.4, "token-9", "block-4"))));

        await harness.Ingress.HandleAsync(new DisconnectClientRealtimeCommand("participant-1"));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();
        Assert.False(snapshot.ReadingSession!.ParticipantViewport.IsConnected);
        Assert.False(snapshot.ReadingSession.Focus.IsInsideReadingArea);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.ParticipantViewportChanged
                       && message.Payload is ParticipantViewportSnapshot viewport
                       && !viewport.IsConnected);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.ReadingFocusChanged
                       && message.Payload is ReadingFocusSnapshot focus
                       && !focus.IsInsideReadingArea);
    }

    [Fact]
    public async Task WebSocketIngress_MouseGazeSample_IngestsOnlyWhenMouseModeSessionIsActive()
    {
        var eyeTrackerHarness = RealtimeTestDoubles.CreateHarness();

        await eyeTrackerHarness.Ingress.HandleAsync(
            RealtimeIngressCommandFactory.Create(
                "participant-1",
                MessageTypes.MouseGazeSample,
                CreatePayload(CreateMouseSample(0.2f, 0.3f))));

        Assert.Equal(0, eyeTrackerHarness.SessionManager.GetCurrentSnapshot().ReceivedGazeSamples);
        Assert.Contains(
            eyeTrackerHarness.Broadcaster.DirectMessages,
            message => message.ConnectionId == "participant-1" && message.MessageType == MessageTypes.Error);

        var sensingMode = new RealtimeTestDoubles.InMemorySensingModeSettingsService();
        await sensingMode.UpdateModeAsync(SensingModes.Mouse);
        var mouseHarness = RealtimeTestDoubles.CreateHarness(sensingModeSettingsService: sensingMode);
        await mouseHarness.SessionManager.SetCurrentParticipantAsync(new Participant
        {
            Name = "Participant 1",
            Age = 29,
            Sex = "female",
            ExistingEyeCondition = "none",
            ReadingProficiency = "advanced"
        });
        await mouseHarness.SessionManager.SetReadingSessionAsync(new UpsertReadingSessionCommand(
            "doc-1",
            "Sample document",
            "# Hello reader",
            null,
            ReadingPresentationSnapshot.Default,
            ReaderAppearanceSnapshot.Default));
        await mouseHarness.SessionManager.StartSessionAsync();
        await mouseHarness.SessionManager.SubscribeGazeDataAsync("researcher-1");

        await mouseHarness.Ingress.HandleAsync(
            RealtimeIngressCommandFactory.Create(
                "participant-1",
                MessageTypes.MouseGazeSample,
                CreatePayload(CreateMouseSample(0.4f, 0.5f))));

        var snapshot = mouseHarness.SessionManager.GetCurrentSnapshot();
        Assert.Equal(1, snapshot.ReceivedGazeSamples);
        Assert.NotNull(snapshot.LatestGazeSample);
        Assert.Equal(0.4f, snapshot.LatestGazeSample!.LeftEyeX);
        Assert.Equal(0.5f, snapshot.LatestGazeSample.LeftEyeY);
        Assert.Contains(
            mouseHarness.Broadcaster.DirectMessages,
            message => message.ConnectionId == "researcher-1" &&
                       message.MessageType == MessageTypes.GazeSample);
        Assert.Equal(0, mouseHarness.EyeTrackerAdapter.StartCalls);
    }

    private static JsonElement CreatePayload<T>(T payload)
    {
        return JsonSerializer.SerializeToElement(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }

    private static GazeData CreateMouseSample(float x, float y)
    {
        return new GazeData
        {
            DeviceTimeStamp = 123,
            SystemTimeStamp = 123,
            LeftEyeX = x,
            LeftEyeY = y,
            LeftEyeValidity = "Valid",
            RightEyeX = x,
            RightEyeY = y,
            RightEyeValidity = "Valid"
        };
    }
}
