using System.Text.Json;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public interface IRealtimeIngressCommand
{
    string ConnectionId { get; }
}

public sealed record PingRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record StartExperimentRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record StopExperimentRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record SubscribeGazeDataRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record UnsubscribeGazeDataRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record GetExperimentStateRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record RegisterParticipantViewRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record UnregisterParticipantViewRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record ParticipantViewportUpdatedRealtimeCommand(
    string ConnectionId,
    UpdateParticipantViewportCommand Payload) : IRealtimeIngressCommand;

public sealed record ReadingFocusUpdatedRealtimeCommand(
    string ConnectionId,
    UpdateReadingFocusCommand Payload) : IRealtimeIngressCommand;

public sealed record ReadingAttentionSummaryUpdatedRealtimeCommand(
    string ConnectionId,
    UpdateReadingAttentionSummaryCommand Payload) : IRealtimeIngressCommand;

public sealed record ApplyInterventionRealtimeCommand(
    string ConnectionId,
    ApplyInterventionCommand Payload) : IRealtimeIngressCommand;

public sealed record DisconnectClientRealtimeCommand(string ConnectionId) : IRealtimeIngressCommand;

public sealed record InvalidRealtimeCommand(
    string ConnectionId,
    string ErrorMessage) : IRealtimeIngressCommand;

public sealed record UnsupportedRealtimeCommand(
    string ConnectionId,
    string MessageType) : IRealtimeIngressCommand;

public static class RealtimeIngressCommandFactory
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static IRealtimeIngressCommand Create(string connectionId, string messageType, JsonElement payload)
    {
        return messageType switch
        {
            MessageTypes.Ping => new PingRealtimeCommand(connectionId),
            MessageTypes.StartExperiment => new StartExperimentRealtimeCommand(connectionId),
            MessageTypes.StopExperiment => new StopExperimentRealtimeCommand(connectionId),
            MessageTypes.SubscribeGazeData => new SubscribeGazeDataRealtimeCommand(connectionId),
            MessageTypes.UnsubscribeGazeData => new UnsubscribeGazeDataRealtimeCommand(connectionId),
            MessageTypes.GetExperimentState => new GetExperimentStateRealtimeCommand(connectionId),
            MessageTypes.RegisterParticipantView => new RegisterParticipantViewRealtimeCommand(connectionId),
            MessageTypes.UnregisterParticipantView => new UnregisterParticipantViewRealtimeCommand(connectionId),
            MessageTypes.ParticipantViewportUpdated => Deserialize<UpdateParticipantViewportCommand>(
                payload,
                connectionId,
                "Participant viewport payload is invalid.",
                parsed => new ParticipantViewportUpdatedRealtimeCommand(connectionId, parsed)),
            MessageTypes.ReadingFocusUpdated => Deserialize<UpdateReadingFocusCommand>(
                payload,
                connectionId,
                "Reading focus payload is invalid.",
                parsed => new ReadingFocusUpdatedRealtimeCommand(connectionId, parsed)),
            MessageTypes.ReadingAttentionSummaryUpdated => Deserialize<UpdateReadingAttentionSummaryCommand>(
                payload,
                connectionId,
                "Reading attention summary payload is invalid.",
                parsed => new ReadingAttentionSummaryUpdatedRealtimeCommand(connectionId, parsed)),
            MessageTypes.ApplyIntervention => Deserialize<ApplyInterventionCommand>(
                payload,
                connectionId,
                "Intervention payload is invalid.",
                parsed => new ApplyInterventionRealtimeCommand(connectionId, parsed)),
            MessageTypes.ResearcherCommand => ParseResearcherCommand(connectionId, payload),
            _ => new UnsupportedRealtimeCommand(connectionId, messageType)
        };
    }

    private static IRealtimeIngressCommand ParseResearcherCommand(string connectionId, JsonElement payload)
    {
        if (payload.ValueKind == JsonValueKind.Object &&
            payload.TryGetProperty("command", out var command) &&
            command.ValueKind == JsonValueKind.String)
        {
            var commandValue = command.GetString();
            if (string.Equals(commandValue, MessageTypes.StartExperiment, StringComparison.OrdinalIgnoreCase))
            {
                return new StartExperimentRealtimeCommand(connectionId);
            }

            if (string.Equals(commandValue, MessageTypes.StopExperiment, StringComparison.OrdinalIgnoreCase))
            {
                return new StopExperimentRealtimeCommand(connectionId);
            }
        }

        return new InvalidRealtimeCommand(connectionId, "Unsupported researcher command");
    }

    private static IRealtimeIngressCommand Deserialize<TPayload>(
        JsonElement payload,
        string connectionId,
        string errorMessage,
        Func<TPayload, IRealtimeIngressCommand> factory)
    {
        try
        {
            var parsed = payload.Deserialize<TPayload>(JsonOptions);
            return parsed is null
                ? new InvalidRealtimeCommand(connectionId, errorMessage)
                : factory(parsed);
        }
        catch
        {
            return new InvalidRealtimeCommand(connectionId, errorMessage);
        }
    }
}
