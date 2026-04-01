namespace ReadingTheReader.core.Domain.Reading;

public sealed record ReadingAttentionSummarySnapshot(
    long UpdatedAtUnixMs,
    IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot> TokenStats,
    string? CurrentTokenId,
    long? CurrentTokenDurationMs,
    int FixatedTokenCount,
    int SkimmedTokenCount)
{
    public static ReadingAttentionSummarySnapshot Empty { get; } = new(0, new Dictionary<string, ReadingAttentionTokenSnapshot>(), null, null, 0, 0);

    public ReadingAttentionSummarySnapshot Copy()
    {
        return new ReadingAttentionSummarySnapshot(
            UpdatedAtUnixMs,
            TokenStats is null
                ? new Dictionary<string, ReadingAttentionTokenSnapshot>()
                : TokenStats.ToDictionary(entry => entry.Key, entry => entry.Value.Copy()),
            DomainText.NormalizeOptional(CurrentTokenId),
            CurrentTokenDurationMs,
            FixatedTokenCount,
            SkimmedTokenCount);
    }
}
