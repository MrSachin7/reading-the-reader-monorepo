namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReadingAttentionTokenSnapshot(
    long FixationMs,
    int FixationCount,
    int SkimCount,
    long MaxFixationMs,
    long LastFixationMs,
    string? Text = null)
{
    public ReadingAttentionTokenSnapshot Copy()
    {
        return this with { };
    }
}
