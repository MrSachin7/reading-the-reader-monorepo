namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

public static class ModuleProviderProtocolVersions
{
    public const string V1 = "module-provider.v1";
}

public static class ModuleProviderMessageTypes
{
    public const string Hello = "moduleProviderHello";
    public const string Welcome = "moduleProviderWelcome";
    public const string Heartbeat = "moduleProviderHeartbeat";
    public const string Error = "moduleProviderError";
    public const string Inbound = "moduleProviderInbound";
    public const string Outbound = "moduleProviderOutbound";
}

public static class ModuleProviderErrorCodes
{
    public const string ProtocolMismatch = "protocol-mismatch";
    public const string AuthFailed = "auth-failed";
    public const string UnknownModule = "unknown-module";
    public const string ModuleProtocolMismatch = "module-protocol-mismatch";
    public const string ProviderAlreadyActive = "provider-already-active";
    public const string ModuleAlreadyClaimed = "module-already-claimed";
    public const string NotRegistered = "not-registered";
    public const string InvalidPayload = "invalid-payload";
    public const string InternalError = "internal-error";
}

public static class ModuleProviderConnectionStatuses
{
    public const string Active = "active";
    public const string Rejected = "rejected";
}

public sealed record ModuleProviderEnvelope<TPayload>(
    string Type,
    string ProtocolVersion,
    string? ProviderId,
    string? SessionId,
    string? CorrelationId,
    long? SentAtUnixMs,
    TPayload Payload);

public sealed record ModuleProviderHelloModuleEntry(
    string ModuleId,
    string ProtocolVersion,
    IReadOnlyDictionary<string, string?>? Capabilities);

public sealed record ModuleProviderHelloPayload(
    string ProviderId,
    string DisplayName,
    string ProtocolVersion,
    string AuthToken,
    IReadOnlyList<ModuleProviderHelloModuleEntry> Modules);

public sealed record ModuleProviderWelcomePayload(
    string ProviderId,
    string DisplayName,
    string AcceptedProtocolVersion,
    string Status,
    long RegisteredAtUnixMs,
    int HeartbeatTimeoutMilliseconds,
    IReadOnlyList<string> AcceptedModules);

public sealed record ModuleProviderHeartbeatPayload(
    string ProviderId,
    string ProtocolVersion,
    long SentAtUnixMs);

public sealed record ModuleProviderErrorPayload(
    string? ProviderId,
    string Code,
    string Message,
    string? Detail = null);

public sealed record ModuleProviderInboundPayload(
    string ModuleId,
    string MessageType,
    string PayloadJson);

public sealed record ModuleProviderOutboundPayload(
    string ModuleId,
    string MessageType,
    string PayloadJson);
