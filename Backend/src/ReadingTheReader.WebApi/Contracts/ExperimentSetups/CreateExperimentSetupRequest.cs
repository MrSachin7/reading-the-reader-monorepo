namespace ReadingTheReader.WebApi.Contracts.ExperimentSetups;

public sealed class CreateExperimentSetupRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public List<CreateExperimentSetupItemRequest> Items { get; set; } = [];
}

public sealed class CreateExperimentSetupItemRequest
{
    public string? SourceReadingMaterialSetupId { get; set; }
    public string SourceReadingMaterialTitle { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Markdown { get; set; } = string.Empty;
    public string ResearcherQuestions { get; set; } = string.Empty;
    public string FontFamily { get; set; } = string.Empty;
    public int FontSizePx { get; set; }
    public int LineWidthPx { get; set; }
    public double LineHeight { get; set; }
    public double LetterSpacingEm { get; set; }
    public bool EditableByExperimenter { get; set; }
}
