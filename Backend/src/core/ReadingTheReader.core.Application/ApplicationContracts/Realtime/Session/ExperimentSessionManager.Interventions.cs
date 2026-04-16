using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    public async ValueTask<InterventionEventSnapshot?> ApplyInterventionAsync(
        ApplyInterventionCommand command,
        CancellationToken ct = default)
    {
        InterventionEventSnapshot? interventionEvent;
        LiveReadingSessionSnapshot? nextState = null;
        DecisionRealtimeUpdateSnapshot? decisionUpdate = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var supersededProposal = SupersedeActiveProposal(updatedAtUnixMs, "researcher");
            var outcome = ScheduleOrApplyIntervention(command, updatedAtUnixMs);

            if (!outcome.DidUpdateReadingSession)
            {
                if (supersededProposal is not null)
                {
                    await SaveCurrentCheckpointAsync(ct);
                }
                return null;
            }

            interventionEvent = outcome.Execution?.Event.Copy();
            nextState = _liveReadingSession.Copy();
            decisionUpdate = supersededProposal is null ? null : BuildDecisionRealtimeUpdate();
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        if (decisionUpdate is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, decisionUpdate, ct);
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), decisionUpdate, ct);
            }
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

        return interventionEvent;
    }

    public async ValueTask<ReadingInterventionPolicySnapshot> UpdateInterventionPolicyAsync(
        ReadingInterventionPolicySnapshot policy,
        CancellationToken ct = default)
    {
        ReadingInterventionPolicySnapshot nextPolicy;
        LiveReadingSessionSnapshot nextState;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            nextPolicy = NormalizeInterventionPolicy(policy);
            _liveReadingSession = _liveReadingSession with
            {
                InterventionPolicy = nextPolicy.Copy()
            };

            nextState = _liveReadingSession.Copy();
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

        return nextPolicy;
    }

    public async ValueTask<InterventionEventSnapshot?> ApplyPendingInterventionNowAsync(CancellationToken ct = default)
    {
        InterventionEventSnapshot? interventionEvent = null;
        LiveReadingSessionSnapshot? nextState = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            interventionEvent = ApplyPendingInterventionInternal(
                updatedAtUnixMs,
                ReadingInterventionCommitBoundaries.Immediate,
                "force-applied")?.Copy();
            nextState = _liveReadingSession.PendingIntervention is null ? null : _liveReadingSession.Copy();

            if (nextState is not null)
            {
                await SaveCurrentCheckpointAsync(ct);
            }
        }
        finally
        {
            _lifecycleGate.Release();
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

        return interventionEvent;
    }

    private static IReadOnlyList<InterventionEventSnapshot> BuildRecentInterventionHistory(
        IReadOnlyList<InterventionEventSnapshot>? existing,
        InterventionEventSnapshot next)
    {
        var items = existing is null
            ? new List<InterventionEventSnapshot>()
            : existing.Select(item => item.Copy()).ToList();

        items.Insert(0, next.Copy());

        if (items.Count > MaxRecentInterventions)
        {
            items.RemoveRange(MaxRecentInterventions, items.Count - MaxRecentInterventions);
        }

        return items;
    }

    private static LayoutInterventionGuardrailSnapshot BuildLayoutGuardrailSnapshot(
        string status,
        string? reason,
        IReadOnlyList<string> affectedProperties,
        long evaluatedAtUnixMs,
        long? cooldownUntilUnixMs)
    {
        return new LayoutInterventionGuardrailSnapshot(
            LayoutInterventionGuardrailSnapshot.NormalizeStatus(status),
            NormalizeNullableText(reason),
            affectedProperties is null
                ? []
                : affectedProperties
                    .Select(LayoutInterventionGuardrailSnapshot.NormalizeAffectedProperty)
                    .Distinct(StringComparer.Ordinal)
                    .ToArray(),
            Math.Max(evaluatedAtUnixMs, 0),
            cooldownUntilUnixMs.HasValue ? Math.Max(cooldownUntilUnixMs.Value, 0) : null);
    }

    private InterventionApplicationOutcome ScheduleOrApplyIntervention(ApplyInterventionCommand command, long occurredAtUnixMs)
    {
        if (ShouldQueueIntervention(command))
        {
            QueuePendingIntervention(command, occurredAtUnixMs);
            return new InterventionApplicationOutcome(null, true);
        }

        return ApplyInterventionCore(
            command,
            occurredAtUnixMs,
            ReadingInterventionCommitBoundaries.Immediate,
            null);
    }

    private InterventionEventSnapshot? TryApplyPendingInterventionForBoundary(
        ReadingFocusSnapshot previousFocus,
        ReadingFocusSnapshot currentFocus,
        ParticipantViewportSnapshot previousViewport,
        ParticipantViewportSnapshot currentViewport,
        long occurredAtUnixMs)
    {
        var pendingIntervention = _liveReadingSession.PendingIntervention;
        if (!CanApplyPendingIntervention(pendingIntervention))
        {
            return null;
        }

        if (DidBoundaryChange(
                pendingIntervention!.RequestedBoundary,
                previousFocus,
                currentFocus,
                previousViewport,
                currentViewport,
                occurredAtUnixMs,
                pendingIntervention.QueuedAtUnixMs))
        {
            return ApplyPendingInterventionInternal(
                occurredAtUnixMs,
                pendingIntervention.RequestedBoundary,
                "boundary-met");
        }

        return null;
    }

    private InterventionEventSnapshot? ApplyPendingInterventionInternal(
        long appliedAtUnixMs,
        string appliedBoundary,
        string resolutionReason)
    {
        var pendingIntervention = _liveReadingSession.PendingIntervention;
        if (!CanApplyPendingIntervention(pendingIntervention))
        {
            return null;
        }

        var waitDurationMs = Math.Max(appliedAtUnixMs - pendingIntervention!.QueuedAtUnixMs, 0);
        var outcome = ApplyInterventionCore(
            pendingIntervention.Intervention,
            appliedAtUnixMs,
            appliedBoundary,
            waitDurationMs);
        var appliedPending = pendingIntervention with
        {
            Status = PendingInterventionStatuses.Applied,
            AppliedAtUnixMs = appliedAtUnixMs,
            WaitDurationMs = waitDurationMs,
            ResolutionReason = NormalizeNullableText(resolutionReason)
        };

        _liveReadingSession = _liveReadingSession with
        {
            PendingIntervention = appliedPending.Copy()
        };

        RecordScheduledInterventionEvent(appliedAtUnixMs, appliedPending);
        RecordReadingSessionState("scheduled-intervention-applied", appliedAtUnixMs, _liveReadingSession.Copy());
        return outcome.Execution?.Event;
    }

    private void QueuePendingIntervention(ApplyInterventionCommand command, long queuedAtUnixMs)
    {
        var queuedIntervention = BuildQueuedPendingIntervention(command, queuedAtUnixMs);
        SupersedePendingInterventionIfQueued(queuedAtUnixMs, "superseded-by-new-queue");

        _liveReadingSession = _liveReadingSession with
        {
            PendingIntervention = queuedIntervention.Copy()
        };

        RecordScheduledInterventionEvent(queuedAtUnixMs, queuedIntervention);
        RecordReadingSessionState("intervention-queued", queuedAtUnixMs, _liveReadingSession.Copy());
    }

    private void SupersedePendingInterventionIfQueued(long supersededAtUnixMs, string reason)
    {
        var pendingIntervention = _liveReadingSession.PendingIntervention;
        if (!CanApplyPendingIntervention(pendingIntervention))
        {
            return;
        }

        var superseded = pendingIntervention! with
        {
            Status = PendingInterventionStatuses.Superseded,
            SupersededAtUnixMs = supersededAtUnixMs,
            WaitDurationMs = Math.Max(supersededAtUnixMs - pendingIntervention.QueuedAtUnixMs, 0),
            ResolutionReason = NormalizeNullableText(reason)
        };

        _liveReadingSession = _liveReadingSession with
        {
            PendingIntervention = superseded.Copy()
        };

        RecordScheduledInterventionEvent(supersededAtUnixMs, superseded);
    }

    private PendingInterventionSnapshot BuildQueuedPendingIntervention(
        ApplyInterventionCommand command,
        long queuedAtUnixMs)
    {
        var policy = NormalizeInterventionPolicy(_liveReadingSession.InterventionPolicy);
        return new PendingInterventionSnapshot(
            Guid.NewGuid(),
            PendingInterventionStatuses.Queued,
            policy.LayoutCommitBoundary,
            null,
            0,
            queuedAtUnixMs,
            null,
            null,
            null,
            false,
            null,
            command.Copy());
    }

    private static bool CanApplyPendingIntervention(PendingInterventionSnapshot? pendingIntervention)
    {
        return pendingIntervention is not null &&
               string.Equals(
                   pendingIntervention.Status,
                   PendingInterventionStatuses.Queued,
                   StringComparison.Ordinal);
    }

    private bool ShouldQueueIntervention(ApplyInterventionCommand command)
    {
        if (ReadingInterventionRuntime.GetRequestedLayoutProperties(command).Count == 0)
        {
            return false;
        }

        var policy = NormalizeInterventionPolicy(_liveReadingSession.InterventionPolicy);
        return !string.Equals(
            policy.LayoutCommitBoundary,
            ReadingInterventionCommitBoundaries.Immediate,
            StringComparison.Ordinal);
    }

    private static bool IsManualIntervention(ApplyInterventionCommand command)
    {
        return string.Equals(command.Source?.Trim(), "manual", StringComparison.OrdinalIgnoreCase);
    }

    private static bool DidBoundaryChange(
        string boundary,
        ReadingFocusSnapshot previousFocus,
        ReadingFocusSnapshot currentFocus,
        ParticipantViewportSnapshot previousViewport,
        ParticipantViewportSnapshot currentViewport,
        long occurredAtUnixMs,
        long queuedAtUnixMs)
    {
        if (occurredAtUnixMs <= queuedAtUnixMs)
        {
            return false;
        }

        return boundary switch
        {
            ReadingInterventionCommitBoundaries.SentenceEnd =>
                !string.IsNullOrWhiteSpace(previousFocus.ActiveSentenceId) &&
                !string.IsNullOrWhiteSpace(currentFocus.ActiveSentenceId) &&
                !string.Equals(previousFocus.ActiveSentenceId, currentFocus.ActiveSentenceId, StringComparison.Ordinal),
            ReadingInterventionCommitBoundaries.ParagraphEnd =>
                !string.IsNullOrWhiteSpace(previousFocus.ActiveBlockId) &&
                !string.IsNullOrWhiteSpace(currentFocus.ActiveBlockId) &&
                !string.Equals(previousFocus.ActiveBlockId, currentFocus.ActiveBlockId, StringComparison.Ordinal),
            ReadingInterventionCommitBoundaries.PageTurn =>
                previousViewport.ActivePageIndex != currentViewport.ActivePageIndex &&
                currentViewport.ActivePageIndex >= 0 &&
                currentViewport.PageCount > 0 &&
                currentViewport.LastPageTurnAtUnixMs.HasValue &&
                currentViewport.LastPageTurnAtUnixMs.Value >= queuedAtUnixMs,
            ReadingInterventionCommitBoundaries.Immediate => true,
            _ => false
        };
    }

    private static ReadingInterventionPolicySnapshot NormalizeInterventionPolicy(ReadingInterventionPolicySnapshot? policy)
    {
        var candidate = policy?.Copy() ?? ReadingInterventionPolicySnapshot.Default.Copy();
        var commitBoundary = ReadingInterventionPolicySnapshot.NormalizeBoundary(
            candidate.LayoutCommitBoundary,
            ReadingInterventionPolicySnapshot.Default.LayoutCommitBoundary);
        var fallbackBoundary = ReadingInterventionPolicySnapshot.NormalizeBoundary(
            candidate.LayoutFallbackBoundary,
            ReadingInterventionPolicySnapshot.Default.LayoutFallbackBoundary);

        return new ReadingInterventionPolicySnapshot(
            commitBoundary,
            fallbackBoundary,
            ReadingInterventionPolicySnapshot.NormalizeFallbackAfterMs(candidate.LayoutFallbackAfterMs));
    }

    private InterventionApplicationOutcome ApplyInterventionCore(
        ApplyInterventionCommand command,
        long appliedAtUnixMs,
        string appliedBoundary,
        long? waitDurationMs)
    {
        var requestedLayoutProperties = ReadingInterventionRuntime.GetRequestedLayoutProperties(command);
        var execution = _readingInterventionRuntime.Apply(
            _liveReadingSession.Presentation,
            _liveReadingSession.Appearance,
            command,
            appliedAtUnixMs);

        if (execution is null)
        {
            if (requestedLayoutProperties.Count > 0)
            {
                _liveReadingSession = _liveReadingSession with
                {
                    LatestLayoutGuardrail = BuildLayoutGuardrailSnapshot(
                        "suppressed",
                        "no-op-layout-change",
                        requestedLayoutProperties,
                        appliedAtUnixMs,
                        null)
                };
                return new InterventionApplicationOutcome(null, true);
            }

            return new InterventionApplicationOutcome(null, false);
        }

        var layoutChange = ReadingInterventionRuntime.SummarizeLayoutChange(
            _liveReadingSession.Presentation,
            execution.Presentation);
        var committedFocus = _liveReadingSession.Focus;
        execution = execution with
        {
            Event = execution.Event with
            {
                AppliedBoundary = ReadingInterventionPolicySnapshot.NormalizeBoundary(
                    appliedBoundary,
                    ReadingInterventionCommitBoundaries.Immediate),
                WaitDurationMs = waitDurationMs.HasValue ? Math.Max(waitDurationMs.Value, 0) : null,
                CommittedActiveTokenId = committedFocus?.ActiveTokenId,
                CommittedActiveSentenceId = committedFocus?.ActiveSentenceId,
                CommittedActiveBlockId = committedFocus?.ActiveBlockId
            }
        };
        var latestLayoutGuardrail = _liveReadingSession.LatestLayoutGuardrail;
        var enforceLayoutTimingGuardrails = !IsManualIntervention(command);

        if (layoutChange.IsLayoutAffecting)
        {
            if (enforceLayoutTimingGuardrails && layoutChange.ExceedsMaximumStep)
            {
                _liveReadingSession = _liveReadingSession with
                {
                    LatestLayoutGuardrail = BuildLayoutGuardrailSnapshot(
                        "suppressed",
                        "change-too-large",
                        layoutChange.ChangedProperties,
                        appliedAtUnixMs,
                        null)
                };
                return new InterventionApplicationOutcome(null, true);
            }

            var cooldownUntilUnixMs = _lastLayoutInterventionAppliedAtUnixMs > 0
                ? _lastLayoutInterventionAppliedAtUnixMs + ReadingInterventionRuntime.LayoutChangeCooldownMs
                : (long?)null;
            if (enforceLayoutTimingGuardrails && cooldownUntilUnixMs.HasValue && appliedAtUnixMs < cooldownUntilUnixMs.Value)
            {
                _liveReadingSession = _liveReadingSession with
                {
                    LatestLayoutGuardrail = BuildLayoutGuardrailSnapshot(
                        "suppressed",
                        "cooldown-active",
                        layoutChange.ChangedProperties,
                        appliedAtUnixMs,
                        cooldownUntilUnixMs)
                };
                return new InterventionApplicationOutcome(null, true);
            }

            latestLayoutGuardrail = BuildLayoutGuardrailSnapshot(
                "applied",
                null,
                layoutChange.ChangedProperties,
                appliedAtUnixMs,
                appliedAtUnixMs + ReadingInterventionRuntime.LayoutChangeCooldownMs);
            _lastLayoutInterventionAppliedAtUnixMs = appliedAtUnixMs;
        }

        _liveReadingSession = _liveReadingSession with
        {
            Presentation = execution.Presentation.Copy(),
            Appearance = execution.Appearance.Copy(),
            LatestLayoutGuardrail = latestLayoutGuardrail?.Copy(),
            LatestIntervention = execution.Event.Copy(),
            RecentInterventions = BuildRecentInterventionHistory(
                _liveReadingSession.RecentInterventions,
                execution.Event)
        };

        RecordInterventionEvent(appliedAtUnixMs, execution.Event);
        RecordReadingSessionState("intervention-applied", appliedAtUnixMs, _liveReadingSession.Copy());
        return new InterventionApplicationOutcome(execution, true);
    }
}
