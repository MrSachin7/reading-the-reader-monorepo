using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed record FixationCandidateState(
    string TokenId,
    string? BlockId,
    int TokenIndex,
    int LineIndex,
    int BlockIndex,
    long StartedAtUnixMs)
{
    public FixationCandidateState Copy()
    {
        return this with { };
    }
}

public sealed record EyeMovementAnalysisRuntimeState(
    ReadingGazeObservationSnapshot? LatestObservation,
    FixationSnapshot? CurrentFixation,
    FixationCandidateState? CandidateFixation,
    IReadOnlyList<FixationSnapshot> RecentFixations,
    IReadOnlyList<SaccadeSnapshot> RecentSaccades,
    IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot> TokenStats)
{
    public static EyeMovementAnalysisRuntimeState Empty { get; } = new(
        null,
        null,
        null,
        [],
        [],
        new Dictionary<string, ReadingAttentionTokenSnapshot>(StringComparer.Ordinal));

    public EyeMovementAnalysisRuntimeState Copy()
    {
        return new EyeMovementAnalysisRuntimeState(
            LatestObservation?.Copy(),
            CurrentFixation?.Copy(),
            CandidateFixation?.Copy(),
            RecentFixations is null ? [] : [.. RecentFixations.Select(item => item.Copy())],
            RecentSaccades is null ? [] : [.. RecentSaccades.Select(item => item.Copy())],
            TokenStats is null
                ? new Dictionary<string, ReadingAttentionTokenSnapshot>(StringComparer.Ordinal)
                : TokenStats.ToDictionary(entry => entry.Key, entry => entry.Value.Copy(), StringComparer.Ordinal));
    }
}
