namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public static class ExperimentReplayExportFormats
{
    public const string Json = "json";
    public const string Csv = "csv";

    public static string Normalize(string? value)
    {
        if (string.Equals(value, Csv, StringComparison.OrdinalIgnoreCase))
        {
            return Csv;
        }

        return Json;
    }

    public static bool IsSupported(string? value)
    {
        return string.Equals(value, Json, StringComparison.OrdinalIgnoreCase) ||
               string.Equals(value, Csv, StringComparison.OrdinalIgnoreCase);
    }

    public static string GetFileExtension(string format)
    {
        return Normalize(format) switch
        {
            Csv => ".csv",
            _ => ".json"
        };
    }

    public static string GetContentType(string format)
    {
        return Normalize(format) switch
        {
            Csv => "text/csv; charset=utf-8",
            _ => "application/json; charset=utf-8"
        };
    }
}
