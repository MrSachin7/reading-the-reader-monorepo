namespace ReadingTheReader.core.Domain.Reading;

internal static class DomainText
{
    public static IReadOnlyDictionary<string, string?>? CloneParameters(IReadOnlyDictionary<string, string?>? parameters)
    {
        return parameters is null
            ? null
            : new Dictionary<string, string?>(parameters, StringComparer.Ordinal);
    }

    public static string? NormalizeOptional(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
