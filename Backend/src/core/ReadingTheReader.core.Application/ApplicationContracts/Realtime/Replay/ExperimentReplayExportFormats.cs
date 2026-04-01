namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public static class ExperimentReplayExportFormats
{
    public const string Json = "json";

    public static string Normalize(string? value)
    {
        return Json;
    }

    public static bool IsSupported(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ||
               string.Equals(value, Json, StringComparison.OrdinalIgnoreCase);
    }

    public static string GetFileExtension(string format)
    {
        return ".json";
    }

    public static string GetContentType(string format)
    {
        return "application/json; charset=utf-8";
    }
}
