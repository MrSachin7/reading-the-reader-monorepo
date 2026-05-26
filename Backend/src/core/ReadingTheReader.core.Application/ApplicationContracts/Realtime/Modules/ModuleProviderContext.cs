namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed record ModuleProviderContext(
    string ConnectionId,
    string ProviderId,
    string ModuleId,
    string? SessionId,
    string? CorrelationId,
    long ReceivedAtUnixMs);
