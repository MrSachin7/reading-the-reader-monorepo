using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    public async ValueTask SetReadingSessionAsync(UpsertReadingSessionCommand command, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.DocumentId))
        {
            throw new InvalidOperationException("documentId is required.");
        }

        if (string.IsNullOrWhiteSpace(command.Title))
        {
            throw new InvalidOperationException("title is required.");
        }

        if (string.IsNullOrWhiteSpace(command.Markdown))
        {
            throw new InvalidOperationException("markdown is required.");
        }

        LiveReadingSessionSnapshot nextState;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var content = new ReadingContentSnapshot(
                command.DocumentId.Trim(),
                command.Title.Trim(),
                command.Markdown,
                string.IsNullOrWhiteSpace(command.SourceSetupId) ? null : command.SourceSetupId.Trim(),
                updatedAtUnixMs);

            var viewportIsConnected = _liveReadingSession.ParticipantViewport.IsConnected;
            var normalizedInitialPresentation = ReadingPresentationRules.Normalize(command.Presentation);
            _liveReadingSession = _liveReadingSession with
            {
                Content = content,
                Presentation = normalizedInitialPresentation,
                InitialPresentation = normalizedInitialPresentation.Copy(),
                Appearance = ReaderAppearanceRules.Normalize(command.Appearance),
                ParticipantViewport = ParticipantViewportSnapshot.Disconnected with
                {
                    IsConnected = viewportIsConnected,
                    UpdatedAtUnixMs = updatedAtUnixMs
                },
                Focus = ReadingFocusSnapshot.Empty,
                PendingIntervention = null,
                LatestContextPreservation = null,
                RecentContextPreservationEvents = [],
                LatestLayoutGuardrail = null,
                AttentionSummary = null,
            };
            _lastMeaningfulReadingFocus = ReadingFocusSnapshot.Empty;
            _eyeMovementAnalysisRuntimeState = EyeMovementAnalysisRuntimeState.Empty;
            _lastLayoutInterventionAppliedAtUnixMs = 0;

            nextState = _liveReadingSession.Copy();
            RecordReadingSessionState("reading-session-configured", updatedAtUnixMs, nextState);
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishSessionSnapshotAsync(GetCurrentSnapshot(), ct);
        }
        if (ShouldPublishToExternalAnalysisProvider())
        {
            await _analysisProviderGateway.PublishSessionSnapshotAsync(GetCurrentSnapshot(), ct);
        }
    }

    public async ValueTask<LiveReadingSessionSnapshot> RegisterParticipantViewAsync(string connectionId, CancellationToken ct = default)
    {
        LiveReadingSessionSnapshot nextState;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _participantViewConnections[connectionId] = 0;
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            _liveReadingSession = _liveReadingSession with
            {
                ParticipantViewport = _liveReadingSession.ParticipantViewport with
                {
                    IsConnected = true,
                    UpdatedAtUnixMs = updatedAtUnixMs
                }
            };

            nextState = _liveReadingSession.Copy();
            RecordParticipantViewportEvent(updatedAtUnixMs, nextState.ParticipantViewport);
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ParticipantViewportChanged, nextState.ParticipantViewport, ct);
        return nextState;
    }

    public async ValueTask<ParticipantViewportSnapshot> UpdateParticipantViewportAsync(
        string connectionId,
        UpdateParticipantViewportCommand command,
        CancellationToken ct = default)
    {
        ParticipantViewportSnapshot viewport;
        LiveReadingSessionSnapshot? nextState = null;
        InterventionEventSnapshot? interventionEvent = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _participantViewConnections[connectionId] = 0;
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var previousViewport = _liveReadingSession.ParticipantViewport;
            var normalizedPageCount = Math.Max(command.PageCount, 1);
            var normalizedActivePageIndex = Math.Min(normalizedPageCount - 1, Math.Max(command.ActivePageIndex, 0));
            var pageDidChange = normalizedActivePageIndex != previousViewport.ActivePageIndex;
            _liveReadingSession = _liveReadingSession with
            {
                ParticipantViewport = new ParticipantViewportSnapshot(
                    true,
                    Clamp(command.ScrollProgress, 0, 1),
                    Math.Max(command.ScrollTopPx, 0),
                    Math.Max(command.ViewportWidthPx, 0),
                    Math.Max(command.ViewportHeightPx, 0),
                    Math.Max(command.ContentHeightPx, 0),
                    Math.Max(command.ContentWidthPx, 0),
                    updatedAtUnixMs,
                    normalizedActivePageIndex,
                    normalizedPageCount,
                    pageDidChange
                        ? updatedAtUnixMs
                        : previousViewport.LastPageTurnAtUnixMs,
                    command.Screen?.Copy())
            };

            viewport = _liveReadingSession.ParticipantViewport.Copy();
            var appliedPending = TryApplyPendingInterventionForBoundary(
                _liveReadingSession.Focus,
                _liveReadingSession.Focus,
                _lastMeaningfulReadingFocus,
                _lastMeaningfulReadingFocus,
                previousViewport,
                viewport,
                updatedAtUnixMs);
            interventionEvent = appliedPending?.Copy();
            nextState = appliedPending is null ? null : _liveReadingSession.Copy();
            RecordParticipantViewportEvent(updatedAtUnixMs, viewport);
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ParticipantViewportChanged, viewport, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishViewportChangedAsync(GetCurrentSessionId(), viewport, ct);
        }
        if (nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            if (interventionEvent is not null)
            {
                await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
                if (ShouldPublishToExternalProvider())
                {
                    await _externalProviderGateway.PublishInterventionEventAsync(GetCurrentSessionId(), interventionEvent, ct);
                }
            }
        }
        if (ShouldPublishToExternalAnalysisProvider())
        {
            await _analysisProviderGateway.PublishViewportChangedAsync(GetCurrentSessionId(), viewport, ct);
        }
        await EvaluateDecisionStrategiesAsync(ct);
        return viewport;
    }

    public async ValueTask<ReadingFocusSnapshot> UpdateReadingFocusAsync(
        UpdateReadingFocusCommand command,
        CancellationToken ct = default)
    {
        ReadingFocusSnapshot focus;
        LiveReadingSessionSnapshot? nextState = null;
        InterventionEventSnapshot? interventionEvent = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var previousFocus = _liveReadingSession.Focus;
            var previousMeaningfulFocus = _lastMeaningfulReadingFocus;
            _liveReadingSession = _liveReadingSession with
            {
                Focus = new ReadingFocusSnapshot(
                    command.IsInsideReadingArea,
                    command.IsInsideReadingArea ? ClampNullable(command.NormalizedContentX, 0, 1) : null,
                    command.IsInsideReadingArea ? ClampNullable(command.NormalizedContentY, 0, 1) : null,
                    command.IsInsideReadingArea ? NormalizeNullableText(command.ActiveTokenId) : null,
                    command.IsInsideReadingArea ? NormalizeNullableText(command.ActiveBlockId) : null,
                    command.IsInsideReadingArea ? NormalizeNullableText(command.ActiveSentenceId) : null,
                    updatedAtUnixMs,
                    command.IsInsideReadingArea ? NormalizeNullableText(command.ActiveTokenText) : null)
            };

            focus = _liveReadingSession.Focus.Copy();
            var currentMeaningfulFocus = SelectMeaningfulReadingFocus(previousMeaningfulFocus, focus);
            _lastMeaningfulReadingFocus = currentMeaningfulFocus.Copy();
            var appliedPending = TryApplyPendingInterventionForBoundary(
                previousFocus,
                focus,
                previousMeaningfulFocus,
                currentMeaningfulFocus,
                _liveReadingSession.ParticipantViewport,
                _liveReadingSession.ParticipantViewport,
                updatedAtUnixMs);
            interventionEvent = appliedPending?.Copy();
            nextState = appliedPending is null ? null : _liveReadingSession.Copy();
            RecordReadingFocusEvent(updatedAtUnixMs, focus);
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingFocusChanged, focus, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishReadingFocusChangedAsync(GetCurrentSessionId(), focus, ct);
        }
        if (nextState is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingSessionChanged, nextState, ct);
            if (interventionEvent is not null)
            {
                await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.InterventionEvent, interventionEvent, ct);
                if (ShouldPublishToExternalProvider())
                {
                    await _externalProviderGateway.PublishInterventionEventAsync(GetCurrentSessionId(), interventionEvent, ct);
                }
            }
        }
        await EvaluateDecisionStrategiesAsync(ct);
        return focus;
    }

    private static ReadingFocusSnapshot SelectMeaningfulReadingFocus(
        ReadingFocusSnapshot previousMeaningfulFocus,
        ReadingFocusSnapshot currentFocus)
    {
        if (!currentFocus.IsInsideReadingArea)
        {
            return previousMeaningfulFocus.Copy();
        }

        if (!string.IsNullOrWhiteSpace(currentFocus.ActiveTokenId) ||
            !string.IsNullOrWhiteSpace(currentFocus.ActiveBlockId) ||
            !string.IsNullOrWhiteSpace(currentFocus.ActiveSentenceId))
        {
            return currentFocus.Copy();
        }

        return previousMeaningfulFocus.Copy();
    }

    public async ValueTask DisconnectParticipantViewAsync(string connectionId, CancellationToken ct = default)
    {
        ParticipantViewportSnapshot? viewport = null;
        ReadingFocusSnapshot? focus = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            if (!_participantViewConnections.TryRemove(connectionId, out _))
            {
                return;
            }

            if (_participantViewConnections.IsEmpty)
            {
                var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
                _liveReadingSession = _liveReadingSession with
                {
                    ParticipantViewport = ParticipantViewportSnapshot.Disconnected with
                    {
                        UpdatedAtUnixMs = updatedAtUnixMs
                    },
                    Focus = ReadingFocusSnapshot.Empty with
                    {
                        UpdatedAtUnixMs = updatedAtUnixMs
                    }
                };
                _lastMeaningfulReadingFocus = ReadingFocusSnapshot.Empty;

                viewport = _liveReadingSession.ParticipantViewport.Copy();
                focus = _liveReadingSession.Focus.Copy();
                RecordParticipantViewportEvent(updatedAtUnixMs, viewport);
                RecordReadingFocusEvent(updatedAtUnixMs, focus);
                await SaveCurrentCheckpointAsync(ct);
            }
        }
        finally
        {
            _lifecycleGate.Release();
        }

        if (viewport is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ParticipantViewportChanged, viewport, ct);
        }

        if (focus is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.ReadingFocusChanged, focus, ct);
        }

        if (ShouldPublishToExternalProvider())
        {
            var sessionId = GetCurrentSessionId();
            if (viewport is not null)
            {
                await _externalProviderGateway.PublishViewportChangedAsync(sessionId, viewport, ct);
            }

            if (focus is not null)
            {
                await _externalProviderGateway.PublishReadingFocusChangedAsync(sessionId, focus, ct);
            }
        }
        if (ShouldPublishToExternalAnalysisProvider() && viewport is not null)
        {
            await _analysisProviderGateway.PublishViewportChangedAsync(GetCurrentSessionId(), viewport, ct);
        }
    }
}
