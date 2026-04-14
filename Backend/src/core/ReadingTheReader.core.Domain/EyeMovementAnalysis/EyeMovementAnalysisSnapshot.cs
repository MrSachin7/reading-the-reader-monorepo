using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Domain.EyeMovementAnalysis;

public sealed record EyeMovementAnalysisSnapshot(
    ReadingGazeObservationSnapshot? LatestObservation,
    FixationSnapshot? CurrentFixation,
    IReadOnlyList<FixationSnapshot> RecentFixations,
    IReadOnlyList<SaccadeSnapshot> RecentSaccades,
    IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot> TokenStats,
    string? CurrentTokenId,
    long? CurrentTokenDurationMs,
    int FixatedTokenCount,
    int SkimmedTokenCount)
{
    public static EyeMovementAnalysisSnapshot Empty { get; } = new(
        null,
        null,
        [],
        [],
        new Dictionary<string, ReadingAttentionTokenSnapshot>(StringComparer.Ordinal),
        null,
        null,
        0,
        0);

    public EyeMovementAnalysisSnapshot Copy()
    {
        return new EyeMovementAnalysisSnapshot(
            LatestObservation?.Copy(),
            CurrentFixation?.Copy(),
            RecentFixations is null ? [] : [.. RecentFixations.Select(item => item.Copy())],
            RecentSaccades is null ? [] : [.. RecentSaccades.Select(item => item.Copy())],
            TokenStats is null
                ? new Dictionary<string, ReadingAttentionTokenSnapshot>(StringComparer.Ordinal)
                : TokenStats.ToDictionary(entry => entry.Key, entry => entry.Value.Copy(), StringComparer.Ordinal),
            CurrentTokenId,
            CurrentTokenDurationMs,
            FixatedTokenCount,
            SkimmedTokenCount);
    }
}
