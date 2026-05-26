using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public interface IModuleProviderConnectionRegistry
{
    ModuleProviderRegistrationResult Register(string connectionId, ModuleProviderHelloPayload payload);

    ModuleProviderHeartbeatResult AcceptHeartbeat(string connectionId, ModuleProviderHeartbeatPayload payload);

    void ReportError(string connectionId, ModuleProviderErrorPayload payload);

    void Disconnect(string connectionId);

    bool TryGetByConnectionId(string connectionId, out ModuleProviderConnectionRecord? connection);

    IReadOnlyCollection<ModuleProviderConnectionRecord> List();
}
