namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentReplayExportFormats
{
    public const string Json = "json";
    public const string Csv = "csv";

    public static string Normalize(string? value)
    {
        return string.Equals(value, Csv, StringComparison.OrdinalIgnoreCase)
            ? Csv
            : Json;
    }

    public static bool IsSupported(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ||
               string.Equals(value, Json, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(value, Csv, StringComparison.OrdinalIgnoreCase);
    }

    public static string GetFileExtension(string format)
    {
        return Normalize(format) == Csv ? ".csv" : ".json";
    }

    public static string GetContentType(string format)
    {
        return Normalize(format) == Csv
            ? "text/csv; charset=utf-8"
            : "application/json; charset=utf-8";
    }
}
