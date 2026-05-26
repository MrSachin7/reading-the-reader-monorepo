namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed class ModuleProviderOptions
{
    public const string SectionName = "ModuleProvider";

    public string SharedSecret { get; set; } = "change-me-local-module-provider-secret";

    public int DefaultHeartbeatTimeoutMilliseconds { get; set; } = 15_000;

    public Dictionary<string, int> ModuleHeartbeatTimeoutOverrides { get; set; } = new(StringComparer.OrdinalIgnoreCase);

    public int GetHeartbeatTimeoutMilliseconds(string moduleId)
    {
        if (!string.IsNullOrWhiteSpace(moduleId)
            && ModuleHeartbeatTimeoutOverrides.TryGetValue(moduleId, out var overrideMs)
            && overrideMs > 0)
        {
            return overrideMs;
        }

        return DefaultHeartbeatTimeoutMilliseconds > 0
            ? DefaultHeartbeatTimeoutMilliseconds
            : 15_000;
    }
}
