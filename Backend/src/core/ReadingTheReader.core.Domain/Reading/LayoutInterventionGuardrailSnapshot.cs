namespace ReadingTheReader.core.Domain.Reading;

public sealed record LayoutInterventionGuardrailSnapshot(
    string Status,
    string? Reason,
    IReadOnlyList<string> AffectedProperties,
    long EvaluatedAtUnixMs,
    long? CooldownUntilUnixMs)
{
    public LayoutInterventionGuardrailSnapshot Copy()
    {
        return new LayoutInterventionGuardrailSnapshot(
            NormalizeStatus(Status),
            DomainText.NormalizeOptional(Reason),
            AffectedProperties is null ? [] : [.. AffectedProperties.Select(NormalizeAffectedProperty)],
            Math.Max(EvaluatedAtUnixMs, 0),
            CooldownUntilUnixMs.HasValue ? Math.Max(CooldownUntilUnixMs.Value, 0) : null);
    }

    public static string NormalizeStatus(string? status)
    {
        return string.Equals(status?.Trim(), "suppressed", StringComparison.OrdinalIgnoreCase)
            ? "suppressed"
            : "applied";
    }

    public static string NormalizeAffectedProperty(string? affectedProperty)
    {
        return affectedProperty switch
        {
            "font-family" => "font-family",
            "font-size" => "font-size",
            "line-width" => "line-width",
            "line-height" => "line-height",
            "letter-spacing" => "letter-spacing",
            _ => "font-size"
        };
    }
}
