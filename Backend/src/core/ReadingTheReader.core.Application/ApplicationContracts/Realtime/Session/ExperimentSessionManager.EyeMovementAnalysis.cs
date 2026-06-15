using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    // The live eye-movement analysis + attention summary carry the session-growing
    // TokenStats dictionary and are produced on every reading-gaze observation
    // (~10-30 Hz). Broadcasting both in full on every observation is what scales
    // poorly as more of the text is read. Coalesce them to ~8 Hz for the live
    // visualization; replay/export still records every observation via its own
    // path, and decision strategies are still evaluated on every observation.
    private const long MinEyeMovementBroadcastIntervalMs = 120;
    private long _lastEyeMovementBroadcastAtUnixMs;

    public async ValueTask<EyeMovementAnalysisSnapshot> UpdateReadingGazeObservationAsync(
        ReadingGazeObservationCommand command,
        CancellationToken ct = default)
    {
        EyeMovementAnalysisSnapshot analysisSnapshot;
        ReadingAttentionSummarySnapshot summary;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var observation = NormalizeReadingGazeObservation(command);
            var previousRuntimeState = _eyeMovementAnalysisRuntimeState;
            // The runtime state is an immutable record whose collections are only
            // ever replaced (never mutated in place), so a `with` shallow copy is
            // enough — the previous deep `.Copy()` cloned the session-growing
            // TokenStats on every observation for no benefit.
            var runtimeState = _eyeMovementAnalysisRuntimeState with
            {
                LatestObservation = observation.Copy()
            };

            var result = await _eyeMovementAnalysisStrategyCoordinator.AnalyzeAsync(
                GetCurrentSnapshot(),
                _eyeMovementAnalysisConfiguration,
                runtimeState,
                observation,
                ct);

            _eyeMovementAnalysisRuntimeState = result?.RuntimeState ?? runtimeState;
            RecordNewEyeMovementEvents(previousRuntimeState, _eyeMovementAnalysisRuntimeState);
            (analysisSnapshot, summary) = EyeMovementAnalysisProjector.ToSnapshotWithSummary(
                _eyeMovementAnalysisRuntimeState,
                observation.ObservedAtUnixMs);
            _liveReadingSession = _liveReadingSession with
            {
                AttentionSummary = summary
            };
            RecordReadingAttentionEvent(observation.ObservedAtUnixMs, summary);
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await BroadcastEyeMovementAnalysisThrottledAsync(analysisSnapshot, summary, ct);
        await EvaluateDecisionStrategiesAsync(ct);
        return analysisSnapshot;
    }

    public async ValueTask<ReadingAttentionSummarySnapshot> UpdateReadingAttentionSummaryAsync(
        UpdateReadingAttentionSummaryCommand command,
        CancellationToken ct = default)
    {
        ReadingAttentionSummarySnapshot summary;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            summary = HasAuthoritativeEyeMovementAnalysisState()
                ? EyeMovementAnalysisProjector.ToAttentionSummary(_eyeMovementAnalysisRuntimeState, updatedAtUnixMs)
                : NormalizeReadingAttentionSummary(command);
            _liveReadingSession = _liveReadingSession with
            {
                AttentionSummary = summary
            };
            RecordReadingAttentionEvent(updatedAtUnixMs, summary);
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingAttentionSummaryChanged, summary, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishAttentionSummaryChangedAsync(GetCurrentSessionId(), summary, ct);
        }
        await EvaluateDecisionStrategiesAsync(ct);
        return summary;
    }

    public async ValueTask<EyeMovementAnalysisConfigurationSnapshot> UpdateEyeMovementAnalysisConfigurationAsync(
        EyeMovementAnalysisConfigurationSnapshot configuration,
        CancellationToken ct = default)
    {
        EyeMovementAnalysisConfigurationSnapshot normalizedConfiguration;
        EyeMovementAnalysisSnapshot analysisSnapshot;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            normalizedConfiguration = NormalizeEyeMovementAnalysisConfiguration(configuration);
            var providerChanged = !string.Equals(
                _eyeMovementAnalysisConfiguration.ProviderId,
                normalizedConfiguration.ProviderId,
                StringComparison.Ordinal);

            _eyeMovementAnalysisConfiguration = normalizedConfiguration;
            if (providerChanged)
            {
                _eyeMovementAnalysisRuntimeState = EyeMovementAnalysisRuntimeState.Empty;
                _liveReadingSession = _liveReadingSession with
                {
                    AttentionSummary = null
                };
            }

            analysisSnapshot = EyeMovementAnalysisProjector.ToSnapshot(
                _eyeMovementAnalysisRuntimeState,
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ExperimentState, GetCurrentSnapshot(), ct);
        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.EyeMovementAnalysisChanged, analysisSnapshot, ct);
        if (ShouldPublishToExternalAnalysisProvider())
        {
            await _analysisProviderGateway.PublishSessionSnapshotAsync(GetCurrentSnapshot(), ct);
        }

        return normalizedConfiguration;
    }

    public async ValueTask<EyeMovementAnalysisSnapshot> ApplyExternalEyeMovementAnalysisAsync(
        ExternalEyeMovementAnalysisCommand command,
        CancellationToken ct = default)
    {
        EyeMovementAnalysisSnapshot analysisSnapshot;
        ReadingAttentionSummarySnapshot summary;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            ValidateExternalEyeMovementAnalysisCommand(command);

            analysisSnapshot = command.AnalysisState.Copy() with
            {
                CurrentFixation = command.CurrentFixation?.Copy() ?? command.AnalysisState.CurrentFixation?.Copy()
            };

            var previousRuntimeState = _eyeMovementAnalysisRuntimeState;
            _eyeMovementAnalysisRuntimeState = EyeMovementAnalysisProjector.FromSnapshot(analysisSnapshot);
            RecordNewEyeMovementEvents(previousRuntimeState, _eyeMovementAnalysisRuntimeState);

            var struggleSignals = _eyeMovementAnalysisRuntimeState.StruggleSignals;
            if (struggleSignals is not null && struggleSignals != previousRuntimeState.StruggleSignals)
            {
                RecordStruggleSignalEvent(Math.Max(command.ObservedAtUnixMs, 0), struggleSignals);
            }

            summary = EyeMovementAnalysisProjector.ToAttentionSummary(
                _eyeMovementAnalysisRuntimeState,
                Math.Max(command.ObservedAtUnixMs, 0));
            _liveReadingSession = _liveReadingSession with
            {
                AttentionSummary = summary
            };

            RecordReadingAttentionEvent(Math.Max(command.ObservedAtUnixMs, 0), summary);
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await BroadcastEyeMovementAnalysisThrottledAsync(analysisSnapshot, summary, ct);
        await EvaluateDecisionStrategiesAsync(ct);
        return analysisSnapshot;
    }

    private async ValueTask BroadcastEyeMovementAnalysisThrottledAsync(
        EyeMovementAnalysisSnapshot analysisSnapshot,
        ReadingAttentionSummarySnapshot summary,
        CancellationToken ct)
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        var last = Interlocked.Read(ref _lastEyeMovementBroadcastAtUnixMs);
        if (now - last < MinEyeMovementBroadcastIntervalMs)
        {
            return;
        }

        Interlocked.Exchange(ref _lastEyeMovementBroadcastAtUnixMs, now);
        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.EyeMovementAnalysisChanged, analysisSnapshot, ct);
        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingAttentionSummaryChanged, summary, ct);
    }

    private void RecordNewEyeMovementEvents(
        EyeMovementAnalysisRuntimeState previousState,
        EyeMovementAnalysisRuntimeState nextState)
    {
        foreach (var fixation in ExtractNewRecentItems(previousState.RecentFixations, nextState.RecentFixations))
        {
            RecordFixationEvent(fixation.EndedAtUnixMs ?? fixation.LastObservedAtUnixMs, fixation);
        }

        foreach (var saccade in ExtractNewRecentItems(previousState.RecentSaccades, nextState.RecentSaccades))
        {
            RecordSaccadeEvent(saccade.EndedAtUnixMs, saccade);
        }
    }

    private static IReadOnlyList<T> ExtractNewRecentItems<T>(IReadOnlyList<T>? previous, IReadOnlyList<T>? current)
        where T : class
    {
        if (current is null || current.Count == 0)
        {
            return [];
        }

        var previousHead = previous is { Count: > 0 } ? previous[0] : null;
        var newItems = new List<T>();
        foreach (var item in current)
        {
            if (previousHead is not null && EqualityComparer<T>.Default.Equals(item, previousHead))
            {
                break;
            }

            newItems.Add(item);
        }

        // Recent lists are newest-first; reverse so recorded sequence numbers stay chronological.
        newItems.Reverse();
        return newItems;
    }

    private bool ShouldPublishToExternalAnalysisProvider()
    {
        return string.Equals(_eyeMovementAnalysisConfiguration.ProviderId, EyeMovementAnalysisProviderIds.External, StringComparison.Ordinal) &&
               _moduleProviderCoordinator.IsExternalActive(FixationAnalysisModuleIds.ModuleId);
    }

    private bool HasAuthoritativeEyeMovementAnalysisState()
    {
        return _eyeMovementAnalysisRuntimeState.LatestObservation is not null ||
               _eyeMovementAnalysisRuntimeState.CurrentFixation is not null ||
               _eyeMovementAnalysisRuntimeState.CandidateFixation is not null ||
               (_eyeMovementAnalysisRuntimeState.TokenStats?.Count ?? 0) > 0;
    }

    private void ValidateExternalEyeMovementAnalysisCommand(ExternalEyeMovementAnalysisCommand command)
    {
        if (!string.Equals(_eyeMovementAnalysisConfiguration.ProviderId, EyeMovementAnalysisProviderIds.External, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("External eye movement analysis provider is not active for the current session.");
        }

        var currentSession = Volatile.Read(ref _session);
        if (!currentSession.IsActive || currentSession.Id is null)
        {
            throw new InvalidOperationException("No active experiment session is available.");
        }

        if (!Guid.TryParse(command.SessionId, out var sessionId) || sessionId != currentSession.Id.Value)
        {
            throw new InvalidOperationException("Analysis provider session id does not match the active experiment session.");
        }

        var provider = _moduleProviderCoordinator.GetActiveProvider(FixationAnalysisModuleIds.ModuleId);
        if (provider is null)
        {
            throw new InvalidOperationException("No active analysis provider is registered.");
        }

        if (!string.Equals(provider.ProviderId, command.ProviderId, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Analysis provider identity does not match the active connection.");
        }
    }

    private static EyeMovementAnalysisConfigurationSnapshot NormalizeEyeMovementAnalysisConfiguration(
        EyeMovementAnalysisConfigurationSnapshot configuration)
    {
        return new EyeMovementAnalysisConfigurationSnapshot(
            NormalizeEyeMovementAnalysisProviderId(configuration.ProviderId));
    }

    private static string NormalizeEyeMovementAnalysisProviderId(string? providerId)
    {
        return string.Equals(providerId?.Trim(), EyeMovementAnalysisProviderIds.External, StringComparison.OrdinalIgnoreCase)
            ? EyeMovementAnalysisProviderIds.External
            : EyeMovementAnalysisProviderIds.BuiltIn;
    }

    private static ReadingGazeObservationSnapshot NormalizeReadingGazeObservation(ReadingGazeObservationCommand command)
    {
        var isInsideReadingArea = command.IsInsideReadingArea;
        return new ReadingGazeObservationSnapshot(
            Math.Max(command.ObservedAtUnixMs, 0),
            isInsideReadingArea,
            isInsideReadingArea ? ClampNullable(command.NormalizedContentX, 0, 1) : null,
            isInsideReadingArea ? ClampNullable(command.NormalizedContentY, 0, 1) : null,
            isInsideReadingArea ? NormalizeNullableText(command.TokenId) : null,
            isInsideReadingArea ? NormalizeNullableTokenText(command.TokenText) : null,
            isInsideReadingArea ? NormalizeNullableText(command.TokenKind) : null,
            isInsideReadingArea ? NormalizeNullableText(command.BlockId) : null,
            command.TokenIndex,
            command.LineIndex,
            command.BlockIndex,
            command.IsStale,
            NormalizeReadingObservationStaleReason(command.StaleReason));
    }

    private static string NormalizeReadingObservationStaleReason(string? staleReason)
    {
        if (string.Equals(staleReason?.Trim(), ReadingGazeObservationStaleReasons.NoPoint, StringComparison.OrdinalIgnoreCase))
        {
            return ReadingGazeObservationStaleReasons.NoPoint;
        }

        if (string.Equals(staleReason?.Trim(), ReadingGazeObservationStaleReasons.PointStale, StringComparison.OrdinalIgnoreCase))
        {
            return ReadingGazeObservationStaleReasons.PointStale;
        }

        if (string.Equals(staleReason?.Trim(), ReadingGazeObservationStaleReasons.OutsideReadingArea, StringComparison.OrdinalIgnoreCase))
        {
            return ReadingGazeObservationStaleReasons.OutsideReadingArea;
        }

        if (string.Equals(staleReason?.Trim(), ReadingGazeObservationStaleReasons.NoTokenHit, StringComparison.OrdinalIgnoreCase))
        {
            return ReadingGazeObservationStaleReasons.NoTokenHit;
        }

        return ReadingGazeObservationStaleReasons.None;
    }

    private static ReadingAttentionSummarySnapshot NormalizeReadingAttentionSummary(
        UpdateReadingAttentionSummaryCommand command)
    {
        var tokenStats = new Dictionary<string, ReadingAttentionTokenSnapshot>(StringComparer.Ordinal);

        if (command.TokenStats is not null)
        {
            foreach (var entry in command.TokenStats)
            {
                var tokenId = NormalizeNullableText(entry.Key);
                if (tokenId is null)
                {
                    continue;
                }

                var stats = entry.Value ?? new ReadingAttentionTokenSnapshot(0, 0, 0, 0, 0);
                tokenStats[tokenId] = new ReadingAttentionTokenSnapshot(
                    Math.Max(stats.FixationMs, 0),
                    Math.Max(stats.FixationCount, 0),
                    Math.Max(stats.SkimCount, 0),
                    Math.Max(stats.MaxFixationMs, 0),
                    Math.Max(stats.LastFixationMs, 0));
            }
        }

        return new ReadingAttentionSummarySnapshot(
            Math.Max(command.UpdatedAtUnixMs, 0),
            tokenStats,
            NormalizeNullableText(command.CurrentTokenId),
            command.CurrentTokenDurationMs.HasValue ? Math.Max(command.CurrentTokenDurationMs.Value, 0) : null,
            Math.Max(command.FixatedTokenCount, 0),
            Math.Max(command.SkimmedTokenCount, 0));
    }
}
