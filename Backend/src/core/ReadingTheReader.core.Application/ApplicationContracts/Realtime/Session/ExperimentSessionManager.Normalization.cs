namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    private static string? NormalizeNullableTokenText(string? text)
    {
        return string.IsNullOrEmpty(text) ? null : text;
    }

    private static double Clamp(double value, double min, double max)
    {
        return Math.Min(max, Math.Max(min, value));
    }

    private static double? ClampNullable(double? value, double min, double max)
    {
        return value.HasValue ? Clamp(value.Value, min, max) : null;
    }

    private static string? NormalizeNullableText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
