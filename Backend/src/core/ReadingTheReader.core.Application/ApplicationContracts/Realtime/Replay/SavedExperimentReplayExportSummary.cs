namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

public sealed record SavedExperimentReplayExportSummary(
    string Id,
    string Name,
    string FileName,
    string Format,
    Guid? SessionId,
    long CreatedAtUnixMs,
    long UpdatedAtUnixMs,
    long ExportedAtUnixMs)
{
    public SavedExperimentReplayExportSummary Copy()
    {
        return this with { };
    }
}
