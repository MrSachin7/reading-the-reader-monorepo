namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReadingPresentationSnapshot(
    string FontFamily,
    int FontSizePx,
    int LineWidthPx,
    double LineHeight,
    double LetterSpacingEm,
    bool EditableByResearcher)
{
    public static ReadingPresentationSnapshot Default { get; } = new(
        "merriweather",
        18,
        680,
        1.8,
        0,
        true);

    public bool IsPresentationLocked => !EditableByResearcher;

    public ReadingPresentationSnapshot Copy()
    {
        return this with { };
    }
}
