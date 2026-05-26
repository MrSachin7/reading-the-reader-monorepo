using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed class ModuleProviderGateway : IModuleProviderGateway
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase
    };

    private readonly IModuleProviderCoordinator _coordinator;
    private readonly IModuleProviderTransportAdapter _transport;

    public ModuleProviderGateway(IModuleProviderCoordinator coordinator, IModuleProviderTransportAdapter transport)
    {
        _coordinator = coordinator;
        _transport = transport;
    }

    public bool HasActiveProvider(string moduleId)
    {
        return _coordinator.IsExternalActive(moduleId);
    }

    public async ValueTask<bool> PublishAsync<TPayload>(
        string moduleId,
        string messageType,
        TPayload payload,
        ModuleProviderPublishContext? context = null,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(moduleId))
        {
            return false;
        }

        var provider = _coordinator.GetActiveProvider(moduleId);
        if (provider is null)
        {
            return false;
        }

        var outbound = new ModuleProviderOutboundPayload(
            moduleId,
            messageType ?? string.Empty,
            JsonSerializer.Serialize(payload, JsonOptions));

        await _transport.SendEnvelopeAsync(
            provider.ConnectionId,
            ModuleProviderMessageTypes.Outbound,
            outbound,
            provider.ProviderId,
            context?.SessionId,
            context?.CorrelationId,
            ct);

        return true;
    }
}
