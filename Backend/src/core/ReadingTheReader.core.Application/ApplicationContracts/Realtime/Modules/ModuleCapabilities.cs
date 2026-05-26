namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed record ModuleCapabilities(IReadOnlyDictionary<string, string?> Values)
{
    public static ModuleCapabilities None { get; } = new(new Dictionary<string, string?>());

    public bool HasFlag(string key)
    {
        return Values.TryGetValue(key, out var raw)
            && bool.TryParse(raw, out var flag)
            && flag;
    }

    public string? GetString(string key)
    {
        return Values.TryGetValue(key, out var value) ? value : null;
    }

    public IReadOnlyList<string> GetList(string key)
    {
        if (!Values.TryGetValue(key, out var raw) || string.IsNullOrWhiteSpace(raw))
        {
            return [];
        }

        return raw
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToArray();
    }
}
