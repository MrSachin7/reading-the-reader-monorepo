using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups.Commands;

public sealed class SaveReadingMaterialSetupCommand
{
    public string Name { get; init; } = string.Empty;
    public string Title { get; init; } = string.Empty;
    public string Markdown { get; init; } = string.Empty;
    public IReadOnlyList<ComprehensionQuestion> ComprehensionQuiz { get; init; } = Array.Empty<ComprehensionQuestion>();
    public string FontFamily { get; init; } = string.Empty;
    public int FontSizePx { get; init; }
    public int LineWidthPx { get; init; }
    public double LineHeight { get; init; }
    public double LetterSpacingEm { get; init; }
    public bool EditableByExperimenter { get; init; }
}
