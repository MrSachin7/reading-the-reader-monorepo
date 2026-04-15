namespace ReadingTheReader.core.Domain.Reading;

public static class ReadingInterventionCommitBoundaries
{
    public const string Immediate = "immediate";
    public const string SentenceEnd = "sentence-end";
    public const string ParagraphEnd = "paragraph-end";
    public const string PageTurn = "page-turn";

    public static IReadOnlyList<string> All { get; } = [Immediate, SentenceEnd, ParagraphEnd, PageTurn];
}

public sealed record ReadingInterventionPolicySnapshot(
    string LayoutCommitBoundary,
    string LayoutFallbackBoundary,
    long LayoutFallbackAfterMs)
{
    public static ReadingInterventionPolicySnapshot Default { get; } = new(
        ReadingInterventionCommitBoundaries.PageTurn,
        ReadingInterventionCommitBoundaries.SentenceEnd,
        6_000);

    public ReadingInterventionPolicySnapshot Copy()
    {
        return new ReadingInterventionPolicySnapshot(
            NormalizeBoundary(LayoutCommitBoundary, Default.LayoutCommitBoundary),
            NormalizeBoundary(LayoutFallbackBoundary, Default.LayoutFallbackBoundary),
            NormalizeFallbackAfterMs(LayoutFallbackAfterMs));
    }

    public static string NormalizeBoundary(string? boundary, string fallback)
    {
        return boundary?.Trim() switch
        {
            ReadingInterventionCommitBoundaries.Immediate => ReadingInterventionCommitBoundaries.Immediate,
            ReadingInterventionCommitBoundaries.SentenceEnd => ReadingInterventionCommitBoundaries.SentenceEnd,
            ReadingInterventionCommitBoundaries.ParagraphEnd => ReadingInterventionCommitBoundaries.ParagraphEnd,
            ReadingInterventionCommitBoundaries.PageTurn => ReadingInterventionCommitBoundaries.PageTurn,
            _ => fallback
        };
    }

    public static long NormalizeFallbackAfterMs(long fallbackAfterMs)
    {
        return Math.Max(fallbackAfterMs, 0);
    }
}
