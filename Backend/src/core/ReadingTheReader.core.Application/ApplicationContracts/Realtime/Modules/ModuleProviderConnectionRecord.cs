namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed record ModuleProviderConnectionRecord(
    string ConnectionId,
    string ProviderId,
    string DisplayName,
    IReadOnlyList<string> ModuleIds,
    long RegisteredAtUnixMs,
    long LastHeartbeatAtUnixMs,
    IReadOnlyDictionary<string, ModuleCapabilities>? CapabilitiesByModule = null,
    ModuleProviderConnectionErrorRecord? LastError = null)
{
    public ModuleCapabilities GetModuleCapabilities(string moduleId)
    {
        if (CapabilitiesByModule is null)
        {
            return ModuleCapabilities.None;
        }

        return CapabilitiesByModule.TryGetValue(moduleId, out var caps) ? caps : ModuleCapabilities.None;
    }

    public ModuleProviderConnectionRecord WithHeartbeat(long heartbeatAtUnixMs)
    {
        return this with { LastHeartbeatAtUnixMs = Math.Max(heartbeatAtUnixMs, LastHeartbeatAtUnixMs) };
    }

    public ModuleProviderConnectionRecord WithError(ModuleProviderConnectionErrorRecord error)
    {
        return this with { LastError = error };
    }
}

public sealed record ModuleProviderConnectionErrorRecord(
    string Code,
    string Message,
    string? Detail,
    long ReportedAtUnixMs);
