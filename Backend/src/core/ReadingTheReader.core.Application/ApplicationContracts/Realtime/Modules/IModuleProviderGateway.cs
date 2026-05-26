namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed record ModuleProviderPublishContext(
    string? SessionId = null,
    string? CorrelationId = null);

public interface IModuleProviderGateway
{
    bool HasActiveProvider(string moduleId);

    ValueTask<bool> PublishAsync<TPayload>(
        string moduleId,
        string messageType,
        TPayload payload,
        ModuleProviderPublishContext? context = null,
        CancellationToken ct = default);
}
