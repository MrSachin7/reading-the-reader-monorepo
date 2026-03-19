namespace ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;

public sealed class UpdateReadingMaterialSetupCommand
{
    public string Id { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Markdown { get; init; } = string.Empty;
    public string FontFamily { get; init; } = string.Empty;
    public int FontSizePx { get; init; }
    public int LineWidthPx { get; init; }
    public double LineHeight { get; init; }
    public double LetterSpacingEm { get; init; }
    public bool EditableByExperimenter { get; init; }
}
