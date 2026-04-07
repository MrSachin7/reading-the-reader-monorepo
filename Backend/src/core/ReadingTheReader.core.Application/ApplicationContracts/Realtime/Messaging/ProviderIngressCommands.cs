using System.Text.Json;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

public interface IProviderIngressCommand
{
    string ConnectionId { get; }
}

public sealed record ProviderHelloRealtimeCommand(
    string ConnectionId,
    ProviderHelloRealtimePayload Payload) : IProviderIngressCommand;

public sealed record ProviderHeartbeatRealtimeCommand(
    string ConnectionId,
    ProviderHeartbeatRealtimePayload Payload) : IProviderIngressCommand;

public sealed record ProviderSubmitProposalRealtimeCommand(
    string ConnectionId,
    ProviderSubmitProposalRealtimePayload Payload) : IProviderIngressCommand;

public sealed record ProviderRequestAutonomousApplyRealtimeCommand(
    string ConnectionId,
    ProviderRequestAutonomousApplyRealtimePayload Payload) : IProviderIngressCommand;

public sealed record ProviderErrorReportedRealtimeCommand(
    string ConnectionId,
    ProviderErrorRealtimePayload Payload) : IProviderIngressCommand;

public sealed record ProviderDisconnectRealtimeCommand(string ConnectionId) : IProviderIngressCommand;

public sealed record InvalidProviderRealtimeCommand(
    string ConnectionId,
    string ErrorMessage) : IProviderIngressCommand;

public sealed record UnsupportedProviderRealtimeCommand(
    string ConnectionId,
    string MessageType) : IProviderIngressCommand;

public static class ProviderIngressCommandFactory
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    public static IProviderIngressCommand Create(string connectionId, string messageType, JsonElement payload)
    {
        return messageType switch
        {
            ProviderMessageTypes.ProviderHello => Deserialize<ProviderHelloRealtimePayload>(
                payload,
                connectionId,
                "Provider hello payload is invalid.",
                IsValid,
                parsed => new ProviderHelloRealtimeCommand(connectionId, parsed)),
            ProviderMessageTypes.ProviderHeartbeat => Deserialize<ProviderHeartbeatRealtimePayload>(
                payload,
                connectionId,
                "Provider heartbeat payload is invalid.",
                IsValid,
                parsed => new ProviderHeartbeatRealtimeCommand(connectionId, parsed)),
            ProviderMessageTypes.ProviderSubmitProposal => Deserialize<ProviderSubmitProposalRealtimePayload>(
                payload,
                connectionId,
                "Provider proposal payload is invalid.",
                IsValid,
                parsed => new ProviderSubmitProposalRealtimeCommand(connectionId, parsed)),
            ProviderMessageTypes.ProviderRequestAutonomousApply => Deserialize<ProviderRequestAutonomousApplyRealtimePayload>(
                payload,
                connectionId,
                "Provider autonomous apply payload is invalid.",
                IsValid,
                parsed => new ProviderRequestAutonomousApplyRealtimeCommand(connectionId, parsed)),
            ProviderMessageTypes.ProviderError => Deserialize<ProviderErrorRealtimePayload>(
                payload,
                connectionId,
                "Provider error payload is invalid.",
                IsValid,
                parsed => new ProviderErrorReportedRealtimeCommand(connectionId, parsed)),
            _ => new UnsupportedProviderRealtimeCommand(connectionId, messageType)
        };
    }

    private static IProviderIngressCommand Deserialize<TPayload>(
        JsonElement payload,
        string connectionId,
        string errorMessage,
        Func<TPayload, bool> validator,
        Func<TPayload, IProviderIngressCommand> factory)
    {
        try
        {
            var parsed = payload.Deserialize<TPayload>(JsonOptions);
            if (parsed is null || !validator(parsed))
            {
                return new InvalidProviderRealtimeCommand(connectionId, errorMessage);
            }

            return factory(parsed);
        }
        catch
        {
            return new InvalidProviderRealtimeCommand(connectionId, errorMessage);
        }
    }

    private static bool IsValid(ProviderHelloRealtimePayload payload)
    {
        return HasText(payload.ProviderId) &&
               HasText(payload.DisplayName) &&
               HasText(payload.ProtocolVersion) &&
               HasText(payload.AuthToken);
    }

    private static bool IsValid(ProviderHeartbeatRealtimePayload payload)
    {
        return HasText(payload.ProviderId) &&
               HasText(payload.ProtocolVersion) &&
               payload.SentAtUnixMs > 0;
    }

    private static bool IsValid(ProviderSubmitProposalRealtimePayload payload)
    {
        return HasText(payload.ProviderId) &&
               HasText(payload.SessionId) &&
               HasText(payload.CorrelationId) &&
               HasText(payload.ProposalId) &&
               HasText(payload.ExecutionMode) &&
               HasText(payload.Rationale) &&
               HasText(payload.SignalSummary) &&
               payload.ProviderObservedAtUnixMs > 0 &&
               IsValid(payload.ProposedIntervention);
    }

    private static bool IsValid(ProviderRequestAutonomousApplyRealtimePayload payload)
    {
        return HasText(payload.ProviderId) &&
               HasText(payload.SessionId) &&
               HasText(payload.CorrelationId) &&
               HasText(payload.ExecutionMode) &&
               HasText(payload.Rationale) &&
               HasText(payload.SignalSummary) &&
               payload.ProviderObservedAtUnixMs > 0 &&
               IsValid(payload.RequestedIntervention);
    }

    private static bool IsValid(ProviderErrorRealtimePayload payload)
    {
        return HasText(payload.ProviderId) &&
               HasText(payload.Code) &&
               HasText(payload.Message);
    }

    private static bool IsValid(ProviderProposedInterventionRealtimePayload payload)
    {
        return HasText(payload.Trigger) &&
               HasText(payload.Reason) &&
               payload.Presentation is not null &&
               payload.Appearance is not null;
    }

    private static bool HasText(string? value)
    {
        return !string.IsNullOrWhiteSpace(value);
    }
}
