namespace ReadingTheReader.WebApi.Contracts.ExperimentSetups;

public sealed class UpdateExperimentSetupRequest
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string Status { get; set; } = "draft";
    public string OrderMode { get; set; } = "fixed";
    public string DefaultFontFamily { get; set; } = "merriweather";
    public int DefaultFontSizePx { get; set; } = 18;
    public int DefaultLineWidthPx { get; set; } = 680;
    public double DefaultLineHeight { get; set; } = 1.7;
    public double DefaultLetterSpacingEm { get; set; } = 0.02;
    public bool DefaultEditableByExperimenter { get; set; } = true;
    public string DecisionProviderId { get; set; } = "manual";
    public string DecisionExecutionMode { get; set; } = "advisory";
    public bool CalibrationRequired { get; set; } = true;
    public List<UpdateExperimentSetupItemRequest> Items { get; set; } = [];
}

public sealed class UpdateExperimentSetupItemRequest
{
    public string? Id { get; set; }
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
