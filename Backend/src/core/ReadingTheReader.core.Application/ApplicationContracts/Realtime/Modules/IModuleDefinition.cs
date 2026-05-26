namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public interface IModuleDefinition
{
    string ModuleId { get; }

    string DisplayName { get; }

    string ProtocolVersion { get; }

    IReadOnlyList<string> InboundMessageTypes { get; }

    IReadOnlyList<string> OutboundMessageTypes { get; }

    ModuleCapabilities Capabilities { get; }
}
