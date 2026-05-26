using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed record ModuleProviderIngressResponse(
    string MessageType,
    object Payload,
    string? ProviderId = null,
    string? SessionId = null,
    string? CorrelationId = null);

public sealed record ModuleProviderIngressResult(
    IReadOnlyList<ModuleProviderIngressResponse> Responses,
    bool ShouldCloseConnection);

public interface IModuleProviderIngressService
{
    ValueTask<ModuleProviderIngressResult> HandleHelloAsync(
        string connectionId,
        ModuleProviderHelloPayload payload,
        CancellationToken ct = default);

    ValueTask<ModuleProviderIngressResult> HandleHeartbeatAsync(
        string connectionId,
        ModuleProviderHeartbeatPayload payload,
        CancellationToken ct = default);

    ValueTask<ModuleProviderIngressResult> HandleInboundAsync(
        string connectionId,
        ModuleProviderInboundPayload payload,
        string? sessionId,
        string? correlationId,
        CancellationToken ct = default);

    ValueTask<ModuleProviderIngressResult> HandleErrorAsync(
        string connectionId,
        ModuleProviderErrorPayload payload,
        CancellationToken ct = default);

    ValueTask HandleDisconnectAsync(string connectionId, CancellationToken ct = default);
}
