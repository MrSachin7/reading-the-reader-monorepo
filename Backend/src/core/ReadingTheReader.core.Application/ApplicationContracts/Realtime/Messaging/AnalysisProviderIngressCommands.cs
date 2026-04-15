using System.Text.Json;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

public interface IAnalysisProviderIngressCommand
{
    string ConnectionId { get; }
}

public sealed record AnalysisProviderHelloRealtimeCommand(
    string ConnectionId,
    AnalysisProviderHelloRealtimePayload Payload) : IAnalysisProviderIngressCommand;

public sealed record AnalysisProviderHeartbeatRealtimeCommand(
    string ConnectionId,
    AnalysisProviderHeartbeatRealtimePayload Payload) : IAnalysisProviderIngressCommand;

public sealed record AnalysisProviderSubmitAnalysisRealtimeCommand(
    string ConnectionId,
    AnalysisProviderSubmitAnalysisRealtimePayload Payload) : IAnalysisProviderIngressCommand;

public sealed record AnalysisProviderErrorReportedRealtimeCommand(
    string ConnectionId,
    AnalysisProviderErrorRealtimePayload Payload) : IAnalysisProviderIngressCommand;

public sealed record AnalysisProviderDisconnectRealtimeCommand(string ConnectionId) : IAnalysisProviderIngressCommand;

public sealed record InvalidAnalysisProviderRealtimeCommand(
    string ConnectionId,
    string ErrorMessage) : IAnalysisProviderIngressCommand;

public sealed record UnsupportedAnalysisProviderRealtimeCommand(
    string ConnectionId,
    string MessageType) : IAnalysisProviderIngressCommand;

public static class AnalysisProviderIngressCommandFactory
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static IAnalysisProviderIngressCommand Create(string connectionId, string messageType, JsonElement payload)
    {
        return messageType switch
        {
            AnalysisProviderMessageTypes.AnalysisProviderHello => Deserialize<AnalysisProviderHelloRealtimePayload>(
                payload,
                connectionId,
                "Analysis provider hello payload is invalid.",
                parsed => new AnalysisProviderHelloRealtimeCommand(connectionId, parsed)),
            AnalysisProviderMessageTypes.AnalysisProviderHeartbeat => Deserialize<AnalysisProviderHeartbeatRealtimePayload>(
                payload,
                connectionId,
                "Analysis provider heartbeat payload is invalid.",
                parsed => new AnalysisProviderHeartbeatRealtimeCommand(connectionId, parsed)),
            AnalysisProviderMessageTypes.AnalysisProviderSubmitAnalysis => Deserialize<AnalysisProviderSubmitAnalysisRealtimePayload>(
                payload,
                connectionId,
                "Analysis provider submit-analysis payload is invalid.",
                parsed => new AnalysisProviderSubmitAnalysisRealtimeCommand(connectionId, parsed)),
            AnalysisProviderMessageTypes.AnalysisProviderError => Deserialize<AnalysisProviderErrorRealtimePayload>(
                payload,
                connectionId,
                "Analysis provider error payload is invalid.",
                parsed => new AnalysisProviderErrorReportedRealtimeCommand(connectionId, parsed)),
            _ => new UnsupportedAnalysisProviderRealtimeCommand(connectionId, messageType)
        };
    }

    private static IAnalysisProviderIngressCommand Deserialize<TPayload>(
        JsonElement payload,
        string connectionId,
        string errorMessage,
        Func<TPayload, IAnalysisProviderIngressCommand> factory)
    {
        try
        {
            var parsed = payload.Deserialize<TPayload>(JsonOptions);
            return parsed is null
                ? new InvalidAnalysisProviderRealtimeCommand(connectionId, errorMessage)
                : factory(parsed);
        }
        catch
        {
            return new InvalidAnalysisProviderRealtimeCommand(connectionId, errorMessage);
        }
    }
}
