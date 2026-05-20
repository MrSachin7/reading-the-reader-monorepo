namespace ReadingTheReader.core.Domain.Reading;

public sealed record ExperimentSequenceItemSnapshot(
    string Id,
    int Order,
    string Title,
    string Markdown,
    string? SourceSetupId,
    string FontFamily,
    int FontSizePx,
    int LineWidthPx,
    double LineHeight,
    double LetterSpacingEm,
    bool EditableByResearcher,
    string? MaterialRunId = null,
    IReadOnlyList<ComprehensionQuestion>? ComprehensionQuiz = null,
    string QuizStatus = "not-started")
{
    public ExperimentSequenceItemSnapshot Copy()
    {
        return this with { };
    }
}
