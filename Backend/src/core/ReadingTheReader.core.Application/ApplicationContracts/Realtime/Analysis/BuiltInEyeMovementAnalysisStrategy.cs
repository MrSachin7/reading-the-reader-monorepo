using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed class BuiltInEyeMovementAnalysisStrategy : IEyeMovementAnalysisStrategy
{
    private const int MaxRecentFixations = 50;
    private const int MaxRecentSaccades = 50;

    public const long InitialFixationThresholdMs = 90;
    public const long SameLineFixationThresholdMs = 70;
    public const long NewLineFixationThresholdMs = 135;
    public const long SkimThresholdMs = 45;
    public const long FixationThresholdMs = 130;
    public const long ClearHighlightThresholdMs = 1500;

    public string ProviderId => EyeMovementAnalysisProviderIds.BuiltIn;

    public ValueTask<EyeMovementAnalysisProcessingResult?> AnalyzeAsync(
        EyeMovementAnalysisContextSnapshot context,
        CancellationToken ct = default)
    {
        var runtimeState = context.RuntimeState.Copy() with
        {
            LatestObservation = context.Observation.Copy()
        };

        if (!context.Session.IsActive)
        {
            return ValueTask.FromResult<EyeMovementAnalysisProcessingResult?>(
                new EyeMovementAnalysisProcessingResult(runtimeState with
                {
                    CurrentFixation = null,
                    CandidateFixation = null
                }));
        }

        var observation = context.Observation;
        if (observation.IsStale ||
            !observation.IsInsideReadingArea ||
            string.IsNullOrWhiteSpace(observation.TokenId) ||
            !observation.TokenIndex.HasValue ||
            !observation.LineIndex.HasValue ||
            !observation.BlockIndex.HasValue)
        {
            return ValueTask.FromResult<EyeMovementAnalysisProcessingResult?>(
                new EyeMovementAnalysisProcessingResult(HandleNonTokenObservation(runtimeState, observation)));
        }

        if (runtimeState.CurrentFixation is not null &&
            string.Equals(runtimeState.CurrentFixation.TokenId, observation.TokenId, StringComparison.Ordinal))
        {
            return ValueTask.FromResult<EyeMovementAnalysisProcessingResult?>(
                new EyeMovementAnalysisProcessingResult(runtimeState with
                {
                    CurrentFixation = runtimeState.CurrentFixation with
                    {
                        LastObservedAtUnixMs = observation.ObservedAtUnixMs,
                        DurationMs = Math.Max(observation.ObservedAtUnixMs - runtimeState.CurrentFixation.StartedAtUnixMs, 0)
                    },
                    CandidateFixation = null
                }));
        }

        if (runtimeState.CandidateFixation is not null &&
            string.Equals(runtimeState.CandidateFixation.TokenId, observation.TokenId, StringComparison.Ordinal))
        {
            var threshold = GetFixationThreshold(runtimeState.CandidateFixation, runtimeState.CurrentFixation);
            var durationMs = Math.Max(observation.ObservedAtUnixMs - runtimeState.CandidateFixation.StartedAtUnixMs, 0);
            if (durationMs >= threshold)
            {
                var completedFixation = FinalizeFixation(
                    runtimeState.CurrentFixation,
                    runtimeState.TokenStats,
                    runtimeState.RecentFixations,
                    runtimeState.CandidateFixation.StartedAtUnixMs);
                var nextFixation = new FixationSnapshot(
                    runtimeState.CandidateFixation.TokenId,
                    runtimeState.CandidateFixation.BlockId,
                    runtimeState.CandidateFixation.TokenIndex,
                    runtimeState.CandidateFixation.LineIndex,
                    runtimeState.CandidateFixation.BlockIndex,
                    runtimeState.CandidateFixation.StartedAtUnixMs,
                    observation.ObservedAtUnixMs,
                    durationMs,
                    null);

                return ValueTask.FromResult<EyeMovementAnalysisProcessingResult?>(
                    new EyeMovementAnalysisProcessingResult(runtimeState with
                    {
                        TokenStats = completedFixation.TokenStats,
                        RecentFixations = completedFixation.RecentFixations,
                        RecentSaccades = BuildRecentSaccades(runtimeState.RecentSaccades, BuildSaccade(runtimeState.CurrentFixation, nextFixation)),
                        CurrentFixation = nextFixation,
                        CandidateFixation = null
                    }));
            }

            return ValueTask.FromResult<EyeMovementAnalysisProcessingResult?>(
                new EyeMovementAnalysisProcessingResult(runtimeState));
        }

        var finalized = FinalizeFixation(
            runtimeState.CurrentFixation,
            runtimeState.TokenStats,
            runtimeState.RecentFixations,
            observation.ObservedAtUnixMs);

        return ValueTask.FromResult<EyeMovementAnalysisProcessingResult?>(
            new EyeMovementAnalysisProcessingResult(runtimeState with
            {
                TokenStats = finalized.TokenStats,
                RecentFixations = finalized.RecentFixations,
                CurrentFixation = null,
                CandidateFixation = new FixationCandidateState(
                    observation.TokenId!.Trim(),
                    NormalizeNullableText(observation.BlockId),
                    observation.TokenIndex.Value,
                    observation.LineIndex.Value,
                    observation.BlockIndex.Value,
                    observation.ObservedAtUnixMs)
            }));
    }

    private static EyeMovementAnalysisRuntimeState HandleNonTokenObservation(
        EyeMovementAnalysisRuntimeState runtimeState,
        ReadingGazeObservationSnapshot observation)
    {
        if (runtimeState.CurrentFixation is null)
        {
            return runtimeState with
            {
                CandidateFixation = null
            };
        }

        var shouldFinalize = observation.StaleReason switch
        {
            ReadingGazeObservationStaleReasons.PointStale =>
                observation.ObservedAtUnixMs - runtimeState.CurrentFixation.LastObservedAtUnixMs >= ClearHighlightThresholdMs,
            ReadingGazeObservationStaleReasons.NoPoint =>
                observation.ObservedAtUnixMs - runtimeState.CurrentFixation.LastObservedAtUnixMs >= ClearHighlightThresholdMs,
            _ => true
        };

        if (!shouldFinalize)
        {
            return runtimeState with
            {
                CandidateFixation = null,
                CurrentFixation = runtimeState.CurrentFixation with
                {
                    LastObservedAtUnixMs = Math.Max(runtimeState.CurrentFixation.LastObservedAtUnixMs, observation.ObservedAtUnixMs),
                    DurationMs = Math.Max(observation.ObservedAtUnixMs - runtimeState.CurrentFixation.StartedAtUnixMs, 0)
                }
            };
        }

        var finalized = FinalizeFixation(
            runtimeState.CurrentFixation,
            runtimeState.TokenStats,
            runtimeState.RecentFixations,
            observation.ObservedAtUnixMs);
        return runtimeState with
        {
            CandidateFixation = null,
            CurrentFixation = null,
            TokenStats = finalized.TokenStats,
            RecentFixations = finalized.RecentFixations
        };
    }

    private static (IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot> TokenStats, IReadOnlyList<FixationSnapshot> RecentFixations)
        FinalizeFixation(
            FixationSnapshot? currentFixation,
            IReadOnlyDictionary<string, ReadingAttentionTokenSnapshot> tokenStats,
            IReadOnlyList<FixationSnapshot>? recentFixations,
            long endedAtUnixMs)
    {
        var nextTokenStats = tokenStats is null
            ? new Dictionary<string, ReadingAttentionTokenSnapshot>(StringComparer.Ordinal)
            : tokenStats.ToDictionary(entry => entry.Key, entry => entry.Value.Copy(), StringComparer.Ordinal);
        var nextRecentFixations = recentFixations is null
            ? new List<FixationSnapshot>()
            : recentFixations.Select(item => item.Copy()).ToList();

        if (currentFixation is null)
        {
            return (nextTokenStats, nextRecentFixations);
        }

        var durationMs = Math.Max(endedAtUnixMs - currentFixation.StartedAtUnixMs, 0);
        if (durationMs < SkimThresholdMs)
        {
            return (nextTokenStats, nextRecentFixations);
        }

        var previousStats = nextTokenStats.TryGetValue(currentFixation.TokenId, out var currentStats)
            ? currentStats
            : new ReadingAttentionTokenSnapshot(0, 0, 0, 0, 0);
        var isFixation = durationMs >= FixationThresholdMs;

        nextTokenStats[currentFixation.TokenId] = new ReadingAttentionTokenSnapshot(
            previousStats.FixationMs + (isFixation ? durationMs : 0),
            previousStats.FixationCount + (isFixation ? 1 : 0),
            previousStats.SkimCount + (isFixation ? 0 : 1),
            isFixation ? Math.Max(previousStats.MaxFixationMs, durationMs) : previousStats.MaxFixationMs,
            isFixation ? durationMs : previousStats.LastFixationMs);

        if (isFixation)
        {
            nextRecentFixations.Insert(0, currentFixation with
            {
                LastObservedAtUnixMs = Math.Max(currentFixation.LastObservedAtUnixMs, endedAtUnixMs),
                DurationMs = durationMs,
                EndedAtUnixMs = endedAtUnixMs
            });

            if (nextRecentFixations.Count > MaxRecentFixations)
            {
                nextRecentFixations.RemoveRange(MaxRecentFixations, nextRecentFixations.Count - MaxRecentFixations);
            }
        }

        return (nextTokenStats, nextRecentFixations);
    }

    private static IReadOnlyList<SaccadeSnapshot> BuildRecentSaccades(
        IReadOnlyList<SaccadeSnapshot>? existing,
        SaccadeSnapshot? next)
    {
        var items = existing is null
            ? new List<SaccadeSnapshot>()
            : existing.Select(item => item.Copy()).ToList();

        if (next is not null)
        {
            items.Insert(0, next.Copy());
        }

        if (items.Count > MaxRecentSaccades)
        {
            items.RemoveRange(MaxRecentSaccades, items.Count - MaxRecentSaccades);
        }

        return items;
    }

    private static SaccadeSnapshot? BuildSaccade(FixationSnapshot? from, FixationSnapshot to)
    {
        if (from is null)
        {
            return null;
        }

        var lineDelta = to.LineIndex - from.LineIndex;
        var blockDelta = to.BlockIndex - from.BlockIndex;
        var direction = lineDelta == 0
            ? to.TokenIndex > from.TokenIndex
                ? SaccadeDirections.Forward
                : to.TokenIndex < from.TokenIndex
                    ? SaccadeDirections.Backward
                    : SaccadeDirections.Unknown
            : lineDelta > 0
                ? SaccadeDirections.LineChangeForward
                : SaccadeDirections.LineChangeBackward;

        return new SaccadeSnapshot(
            from.TokenId,
            to.TokenId,
            from.BlockId,
            to.BlockId,
            from.TokenIndex,
            to.TokenIndex,
            lineDelta,
            blockDelta,
            Math.Max(from.LastObservedAtUnixMs, from.StartedAtUnixMs),
            to.StartedAtUnixMs,
            Math.Max(to.StartedAtUnixMs - from.LastObservedAtUnixMs, 0),
            direction);
    }

    private static long GetFixationThreshold(FixationCandidateState candidate, FixationSnapshot? currentFixation)
    {
        if (currentFixation is null)
        {
            return InitialFixationThresholdMs;
        }

        return candidate.LineIndex == currentFixation.LineIndex
            ? SameLineFixationThresholdMs
            : NewLineFixationThresholdMs;
    }

    private static string? NormalizeNullableText(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? null : value.Trim();
    }
}
