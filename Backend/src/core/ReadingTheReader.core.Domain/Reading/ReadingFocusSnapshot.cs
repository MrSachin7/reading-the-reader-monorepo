namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReadingFocusSnapshot(
    bool IsInsideReadingArea,
    double? NormalizedContentX,
    double? NormalizedContentY,
    string? ActiveTokenId,
    string? ActiveBlockId,
    string? ActiveSentenceId,
    long UpdatedAtUnixMs)
{
    public static ReadingFocusSnapshot Empty { get; } = new(false, null, null, null, null, null, 0);

    public ReadingFocusSnapshot Copy()
    {
        return this with { };
    }
}
