namespace ReadingTheReader.WebApi.Contracts.ExperimentSession;

public sealed class UpsertReadingSessionRequest
{
    public string DocumentId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Markdown { get; set; } = string.Empty;
    public string? SourceSetupId { get; set; }
    public string FontFamily { get; set; } = string.Empty;
    public int FontSizePx { get; set; }
    public int LineWidthPx { get; set; }
    public double LineHeight { get; set; }
    public double LetterSpacingEm { get; set; }
    public bool EditableByResearcher { get; set; } = true;
    public string ThemeMode { get; set; } = string.Empty;
    public string Palette { get; set; } = string.Empty;
    public string AppFont { get; set; } = string.Empty;
}
