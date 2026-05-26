namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public interface IModuleInboundHandler
{
    string ModuleId { get; }

    ValueTask HandleAsync(
        string messageType,
        string payloadJson,
        ModuleProviderContext context,
        CancellationToken ct = default);
}
