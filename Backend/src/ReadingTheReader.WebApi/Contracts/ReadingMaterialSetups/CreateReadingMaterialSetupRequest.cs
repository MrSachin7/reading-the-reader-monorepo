namespace ReadingTheReader.WebApi.Contracts.ReadingMaterialSetups;

public sealed class CreateReadingMaterialSetupRequest
{
    public string Title { get; set; } = string.Empty;
    public string Markdown { get; set; } = string.Empty;
    public string FontFamily { get; set; } = string.Empty;
    public int FontSizePx { get; set; }
    public int LineWidthPx { get; set; }
    public double LineHeight { get; set; }
    public double LetterSpacingEm { get; set; }
    public bool EditableByExperimenter { get; set; }
}
