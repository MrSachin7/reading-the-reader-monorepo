namespace ReadingTheReader.WebApi.Contracts.ExperimentSession;

public sealed class SaveExperimentReplayExportRequest
{
    public string Name { get; set; } = string.Empty;

    public string Format { get; set; } = "json";
}
