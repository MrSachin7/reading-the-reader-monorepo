using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

internal static class EyeMovementAnalysisProjector
{
    public static ReadingAttentionSummarySnapshot ToAttentionSummary(EyeMovementAnalysisRuntimeState state, long observedAtUnixMs)
    {
        var tokenStats = state.TokenStats is null
            ? new Dictionary<string, ReadingAttentionTokenSnapshot>(StringComparer.Ordinal)
            : state.TokenStats.ToDictionary(entry => entry.Key, entry => entry.Value.Copy(), StringComparer.Ordinal);

        string? currentTokenId = null;
        long? currentTokenDurationMs = null;

        if (state.CurrentFixation is not null)
        {
            currentTokenId = state.CurrentFixation.TokenId;
            currentTokenDurationMs = Math.Max(state.CurrentFixation.DurationMs, 0);

            var previous = tokenStats.TryGetValue(currentTokenId, out var fixationStats)
                ? fixationStats
                : new ReadingAttentionTokenSnapshot(0, 0, 0, 0, 0);

            tokenStats[currentTokenId] = new ReadingAttentionTokenSnapshot(
                previous.FixationMs + currentTokenDurationMs.Value,
                previous.FixationCount,
                previous.SkimCount,
                Math.Max(previous.MaxFixationMs, currentTokenDurationMs.Value),
                Math.Max(previous.LastFixationMs, currentTokenDurationMs.Value),
                previous.Text);
        }
        else if (state.CandidateFixation is not null)
        {
            currentTokenId = state.CandidateFixation.TokenId;
            currentTokenDurationMs = Math.Max(observedAtUnixMs - state.CandidateFixation.StartedAtUnixMs, 0);

            if (currentTokenDurationMs.Value >= BuiltInEyeMovementAnalysisStrategy.SkimThresholdMs)
            {
                var previous = tokenStats.TryGetValue(currentTokenId, out var candidateStats)
                    ? candidateStats
                    : new ReadingAttentionTokenSnapshot(0, 0, 0, 0, 0);
                var isFixation = currentTokenDurationMs.Value >= BuiltInEyeMovementAnalysisStrategy.FixationThresholdMs;

                tokenStats[currentTokenId] = new ReadingAttentionTokenSnapshot(
                    previous.FixationMs + (isFixation ? currentTokenDurationMs.Value : 0),
                    previous.FixationCount,
                    previous.SkimCount + (isFixation ? 0 : 1),
                    isFixation ? Math.Max(previous.MaxFixationMs, currentTokenDurationMs.Value) : previous.MaxFixationMs,
                    isFixation ? Math.Max(previous.LastFixationMs, currentTokenDurationMs.Value) : previous.LastFixationMs,
                    state.CandidateFixation.TokenText ?? previous.Text);
            }
        }

        var stats = tokenStats.Values.ToArray();
        return new ReadingAttentionSummarySnapshot(
            Math.Max(observedAtUnixMs, 0),
            tokenStats,
            currentTokenId,
            currentTokenDurationMs,
            stats.Count(item => item.FixationMs >= BuiltInEyeMovementAnalysisStrategy.FixationThresholdMs),
            stats.Count(item => item.SkimCount > 0 && item.FixationMs < BuiltInEyeMovementAnalysisStrategy.FixationThresholdMs));
    }

    public static EyeMovementAnalysisSnapshot ToSnapshot(EyeMovementAnalysisRuntimeState state, long observedAtUnixMs)
    {
        var summary = ToAttentionSummary(state, observedAtUnixMs);
        return new EyeMovementAnalysisSnapshot(
            state.LatestObservation?.Copy(),
            state.CurrentFixation?.Copy(),
            state.RecentFixations is null ? [] : [.. state.RecentFixations.Select(item => item.Copy())],
            state.RecentSaccades is null ? [] : [.. state.RecentSaccades.Select(item => item.Copy())],
            summary.TokenStats.ToDictionary(entry => entry.Key, entry => entry.Value.Copy(), StringComparer.Ordinal),
            summary.CurrentTokenId,
            summary.CurrentTokenDurationMs,
            summary.FixatedTokenCount,
            summary.SkimmedTokenCount);
    }

    public static EyeMovementAnalysisRuntimeState FromSnapshot(EyeMovementAnalysisSnapshot snapshot)
    {
        return new EyeMovementAnalysisRuntimeState(
            snapshot.LatestObservation?.Copy(),
            snapshot.CurrentFixation?.Copy(),
            null,
            snapshot.RecentFixations is null ? [] : [.. snapshot.RecentFixations.Select(item => item.Copy())],
            snapshot.RecentSaccades is null ? [] : [.. snapshot.RecentSaccades.Select(item => item.Copy())],
            snapshot.TokenStats is null
                ? new Dictionary<string, ReadingAttentionTokenSnapshot>(StringComparer.Ordinal)
                : snapshot.TokenStats.ToDictionary(entry => entry.Key, entry => entry.Value.Copy(), StringComparer.Ordinal));
    }
}
