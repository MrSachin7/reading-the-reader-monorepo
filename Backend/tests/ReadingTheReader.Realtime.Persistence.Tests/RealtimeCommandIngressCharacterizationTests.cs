using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
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

    private static JsonElement CreatePayload<T>(T payload)
    {
        return JsonSerializer.SerializeToElement(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }
}
