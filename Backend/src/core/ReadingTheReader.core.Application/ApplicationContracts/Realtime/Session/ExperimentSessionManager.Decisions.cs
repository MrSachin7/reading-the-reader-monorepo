using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

public sealed partial class ExperimentSessionManager
{
    public async ValueTask<DecisionRealtimeUpdateSnapshot> UpdateDecisionConfigurationAsync(
        DecisionConfigurationSnapshot configuration,
        bool automationPaused,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var normalizedConfiguration = NormalizeDecisionConfiguration(configuration);
            var providerChanged = !string.Equals(
                _decisionConfiguration.ProviderId,
                normalizedConfiguration.ProviderId,
                StringComparison.Ordinal);
            var executionModeChanged = !string.Equals(
                _decisionConfiguration.ExecutionMode,
                normalizedConfiguration.ExecutionMode,
                StringComparison.Ordinal);

            _decisionConfiguration = normalizedConfiguration;
            _decisionState = _decisionState with
            {
                AutomationPaused = automationPaused
            };

            if (providerChanged || executionModeChanged)
            {
                SupersedeActiveProposal(updatedAtUnixMs, "system");
            }

            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
            await _externalProviderGateway.PublishSessionSnapshotAsync(GetCurrentSnapshot(), ct);
        }
        await EvaluateDecisionStrategiesAsync(ct);
        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> ApproveDecisionProposalAsync(
        Guid proposalId,
        string source,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;
        InterventionEventSnapshot? interventionEvent;
        LiveReadingSessionSnapshot? nextState;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            if (_decisionState.ActiveProposal is null ||
                _decisionState.ActiveProposal.ProposalId != proposalId)
            {
                throw new InvalidOperationException("No active decision proposal matches the supplied id.");
            }

            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var outcome = ScheduleOrApplyIntervention(_decisionState.ActiveProposal.ProposedIntervention, updatedAtUnixMs);
            var resolvedProposal = _decisionState.ActiveProposal.WithResolution(
                DecisionProposalStatus.Approved,
                updatedAtUnixMs,
                NormalizeDecisionResolutionSource(source),
                outcome.Execution?.Event.Id);

            _decisionState = new DecisionRuntimeStateSnapshot(
                _decisionState.AutomationPaused,
                null,
                BuildRecentProposalHistory(_decisionState.RecentProposalHistory, resolvedProposal));

            RecordDecisionProposalEvent(updatedAtUnixMs, resolvedProposal);
            interventionEvent = outcome.Execution?.Event.Copy();
            nextState = outcome.DidUpdateReadingSession ? _liveReadingSession.Copy() : null;
            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
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

        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> RejectDecisionProposalAsync(
        Guid proposalId,
        string source,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            if (_decisionState.ActiveProposal is null ||
                _decisionState.ActiveProposal.ProposalId != proposalId)
            {
                throw new InvalidOperationException("No active decision proposal matches the supplied id.");
            }

            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var rejectedProposal = _decisionState.ActiveProposal.WithResolution(
                DecisionProposalStatus.Rejected,
                updatedAtUnixMs,
                NormalizeDecisionResolutionSource(source));

            _decisionState = new DecisionRuntimeStateSnapshot(
                _decisionState.AutomationPaused,
                null,
                BuildRecentProposalHistory(_decisionState.RecentProposalHistory, rejectedProposal));

            RecordDecisionProposalEvent(updatedAtUnixMs, rejectedProposal);
            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
        }
        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> SetDecisionAutomationPausedAsync(
        bool automationPaused,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            _decisionState = _decisionState with
            {
                AutomationPaused = automationPaused
            };

            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
        }
        if (!automationPaused)
        {
            await EvaluateDecisionStrategiesAsync(ct);
        }

        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> SetDecisionExecutionModeAsync(
        string executionMode,
        CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot update;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var normalizedExecutionMode = NormalizeExecutionMode(executionMode);
            var executionModeChanged = !string.Equals(
                _decisionConfiguration.ExecutionMode,
                normalizedExecutionMode,
                StringComparison.Ordinal);

            _decisionConfiguration = _decisionConfiguration with
            {
                ExecutionMode = normalizedExecutionMode
            };

            if (executionModeChanged)
            {
                SupersedeActiveProposal(updatedAtUnixMs, "system");
            }

            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
        }
        await EvaluateDecisionStrategiesAsync(ct);
        return update;
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> EvaluateDecisionStrategiesAsync(CancellationToken ct = default)
    {
        DecisionRealtimeUpdateSnapshot? update = null;
        InterventionEventSnapshot? interventionEvent = null;
        LiveReadingSessionSnapshot? nextState = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            if (_decisionState.AutomationPaused ||
                string.Equals(_decisionConfiguration.ProviderId, DecisionProviderIds.Manual, StringComparison.Ordinal))
            {
                return BuildDecisionRealtimeUpdate();
            }

            var currentSnapshot = GetCurrentSnapshot();
            var proposal = await _decisionStrategyCoordinator.EvaluateAsync(
                currentSnapshot,
                _decisionConfiguration,
                _decisionState,
                ct);

            if (proposal is null)
            {
                return BuildDecisionRealtimeUpdate();
            }

            if (_decisionState.ActiveProposal is not null &&
                DecisionProposalLifecycleRules.CanTransition(
                    _decisionState.ActiveProposal.Status,
                    DecisionProposalStatus.Superseded) &&
                ProposalsMatch(_decisionState.ActiveProposal, proposal))
            {
                return BuildDecisionRealtimeUpdate();
            }

            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            SupersedeActiveProposal(updatedAtUnixMs, "system");

            if (string.Equals(_decisionConfiguration.ExecutionMode, DecisionExecutionModes.Autonomous, StringComparison.Ordinal))
            {
                var outcome = ScheduleOrApplyIntervention(proposal.ProposedIntervention, updatedAtUnixMs);
                var autoAppliedProposal = proposal.WithResolution(
                    DecisionProposalStatus.AutoApplied,
                    updatedAtUnixMs,
                    "system",
                    outcome.Execution?.Event.Id);

                _decisionState = new DecisionRuntimeStateSnapshot(
                    _decisionState.AutomationPaused,
                    null,
                    BuildRecentProposalHistory(_decisionState.RecentProposalHistory, autoAppliedProposal));

                RecordDecisionProposalEvent(updatedAtUnixMs, autoAppliedProposal);
                interventionEvent = outcome.Execution?.Event.Copy();
                nextState = outcome.DidUpdateReadingSession ? _liveReadingSession.Copy() : null;
            }
            else
            {
                _decisionState = new DecisionRuntimeStateSnapshot(
                    _decisionState.AutomationPaused,
                    proposal.Copy(),
                    _decisionState.RecentProposalHistory is null
                        ? []
                        : [.. _decisionState.RecentProposalHistory.Select(item => item.Copy())]);
                RecordDecisionProposalEvent(updatedAtUnixMs, proposal);
            }

            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        if (update is not null)
        {
            await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
            if (ShouldPublishToExternalProvider())
            {
                await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
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

        return update ?? BuildDecisionRealtimeUpdate();
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> SubmitExternalDecisionProposalAsync(
        ExternalDecisionProposalCommand command,
        CancellationToken ct = default)
    {
        return await ApplyExternalDecisionProposalAsync(command, applyAutonomously: false, ct);
    }

    public async ValueTask<DecisionRealtimeUpdateSnapshot> RequestExternalAutonomousApplyAsync(
        ExternalDecisionAutonomousApplyCommand command,
        CancellationToken ct = default)
    {
        return await ApplyExternalDecisionProposalAsync(
            new ExternalDecisionProposalCommand(
                command.ProviderId,
                command.SessionId,
                command.CorrelationId,
                Guid.NewGuid().ToString("D"),
                command.ExecutionMode,
                command.Rationale,
                command.SignalSummary,
                command.ProviderObservedAtUnixMs,
                command.RequestedIntervention),
            applyAutonomously: true,
            ct);
    }

    private async ValueTask<DecisionRealtimeUpdateSnapshot> ApplyExternalDecisionProposalAsync(
        ExternalDecisionProposalCommand command,
        bool applyAutonomously,
        CancellationToken ct)
    {
        DecisionRealtimeUpdateSnapshot update;
        InterventionEventSnapshot? interventionEvent = null;
        LiveReadingSessionSnapshot? nextState = null;

        await _lifecycleGate.WaitAsync(ct);
        try
        {
            ValidateExternalDecisionCommand(command, applyAutonomously);

            var proposal = BuildExternalProposal(command);
            var updatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            SupersedeActiveProposal(updatedAtUnixMs, "system");

            if (applyAutonomously)
            {
            var outcome = ScheduleOrApplyIntervention(proposal.ProposedIntervention, updatedAtUnixMs);
            var autoAppliedProposal = proposal.WithResolution(
                DecisionProposalStatus.AutoApplied,
                updatedAtUnixMs,
                command.ProviderId,
                outcome.Execution?.Event.Id);

                _decisionState = new DecisionRuntimeStateSnapshot(
                    _decisionState.AutomationPaused,
                    null,
                    BuildRecentProposalHistory(_decisionState.RecentProposalHistory, autoAppliedProposal));

                RecordDecisionProposalEvent(updatedAtUnixMs, autoAppliedProposal);
                interventionEvent = outcome.Execution?.Event.Copy();
                nextState = outcome.DidUpdateReadingSession ? _liveReadingSession.Copy() : null;
            }
            else
            {
                _decisionState = new DecisionRuntimeStateSnapshot(
                    _decisionState.AutomationPaused,
                    proposal.Copy(),
                    _decisionState.RecentProposalHistory is null
                        ? []
                        : [.. _decisionState.RecentProposalHistory.Select(item => item.Copy())]);
                RecordDecisionProposalEvent(updatedAtUnixMs, proposal);
            }

            update = BuildDecisionRealtimeUpdate();
            await SaveCurrentCheckpointAsync(ct);
        }
        finally
        {
            _lifecycleGate.Release();
        }

        await _clientBroadcasterAdapter.BroadcastAsync(MessageTypes.DecisionProposalChanged, update, ct);
        if (ShouldPublishToExternalProvider())
        {
            await _externalProviderGateway.PublishDecisionUpdateAsync(GetCurrentSessionId(), update, ct);
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

        return update;
    }

    private void ValidateExternalDecisionCommand(ExternalDecisionProposalCommand command, bool applyAutonomously)
    {
        if (!string.Equals(_decisionConfiguration.ProviderId, DecisionProviderIds.External, StringComparison.Ordinal))
        {
            throw new InvalidOperationException("External decision provider is not active for the current session.");
        }

        if (_decisionState.AutomationPaused)
        {
            throw new InvalidOperationException("Decision automation is paused.");
        }

        var currentSession = Volatile.Read(ref _session);
        if (!currentSession.IsActive || currentSession.Id is null)
        {
            throw new InvalidOperationException("No active experiment session is available.");
        }

        if (!Guid.TryParse(command.SessionId, out var sessionId) || sessionId != currentSession.Id.Value)
        {
            throw new InvalidOperationException("Provider session id does not match the active experiment session.");
        }

        var expectedMode = applyAutonomously
            ? DecisionExecutionModes.Autonomous
            : DecisionExecutionModes.Advisory;
        if (!string.Equals(_decisionConfiguration.ExecutionMode, expectedMode, StringComparison.Ordinal))
        {
            throw new InvalidOperationException($"Current decision execution mode must be '{expectedMode}' for this provider command.");
        }

        if (!string.Equals(command.ExecutionMode, expectedMode, StringComparison.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException("Provider execution mode does not match the active backend execution mode.");
        }

        IReadingInterventionModule? module = null;
        if (!string.IsNullOrWhiteSpace(command.ProposedIntervention.ModuleId) &&
            !_interventionModuleRegistry.TryResolve(command.ProposedIntervention.ModuleId, out module))
        {
            throw new InvalidOperationException($"Unknown intervention module '{command.ProposedIntervention.ModuleId}'.");
        }

        if (module is not null)
        {
            var validation = module.Validate(new ReadingInterventionRequest(
                module.Descriptor.ModuleId,
                command.ProposedIntervention.Parameters ?? new Dictionary<string, string?>(StringComparer.Ordinal)));
            if (!validation.IsValid)
            {
                throw new InvalidOperationException(validation.ErrorMessage ?? "Provider intervention payload is invalid.");
            }
        }
    }

    private DecisionProposalSnapshot BuildExternalProposal(ExternalDecisionProposalCommand command)
    {
        var proposalId = Guid.TryParse(command.ProposalId, out var parsedProposalId)
            ? parsedProposalId
            : Guid.NewGuid();
        var observedAtUnixMs = Math.Max(command.ProviderObservedAtUnixMs, 0);

        return new DecisionProposalSnapshot(
            proposalId,
            _decisionConfiguration.ConditionLabel,
            command.ProviderId.Trim(),
            _decisionConfiguration.ExecutionMode,
            DecisionProposalStatus.Pending,
            new DecisionSignalSnapshot(
                "external-provider",
                command.SignalSummary.Trim(),
                observedAtUnixMs,
                null),
            command.Rationale.Trim(),
            observedAtUnixMs,
            null,
            null,
            null,
            command.ProposedIntervention.Copy());
    }

    private DecisionProposalSnapshot? SupersedeActiveProposal(long resolvedAtUnixMs, string resolutionSource)
    {
        if (_decisionState.ActiveProposal is null ||
            !DecisionProposalLifecycleRules.CanTransition(
                _decisionState.ActiveProposal.Status,
                DecisionProposalStatus.Superseded))
        {
            return null;
        }

        var supersededProposal = _decisionState.ActiveProposal.WithResolution(
            DecisionProposalStatus.Superseded,
            resolvedAtUnixMs,
            NormalizeDecisionResolutionSource(resolutionSource));

        _decisionState = new DecisionRuntimeStateSnapshot(
            _decisionState.AutomationPaused,
            null,
            BuildRecentProposalHistory(_decisionState.RecentProposalHistory, supersededProposal));
        RecordDecisionProposalEvent(resolvedAtUnixMs, supersededProposal);

        return supersededProposal;
    }

    private DecisionRealtimeUpdateSnapshot BuildDecisionRealtimeUpdate()
    {
        return new DecisionRealtimeUpdateSnapshot(
            _decisionConfiguration.Copy(),
            _decisionState.Copy());
    }

    private static IReadOnlyList<DecisionProposalSnapshot> BuildRecentProposalHistory(
        IReadOnlyList<DecisionProposalSnapshot>? existing,
        DecisionProposalSnapshot next)
    {
        var items = existing is null
            ? new List<DecisionProposalSnapshot>()
            : existing.Select(item => item.Copy()).ToList();

        items.Insert(0, next.Copy());

        if (items.Count > MaxRecentDecisionHistory)
        {
            items.RemoveRange(MaxRecentDecisionHistory, items.Count - MaxRecentDecisionHistory);
        }

        return items;
    }

    private static DecisionConfigurationSnapshot NormalizeDecisionConfiguration(DecisionConfigurationSnapshot configuration)
    {
        return new DecisionConfigurationSnapshot(
            string.IsNullOrWhiteSpace(configuration.ConditionLabel)
                ? DecisionConfigurationSnapshot.Default.ConditionLabel
                : configuration.ConditionLabel.Trim(),
            NormalizeProviderId(configuration.ProviderId),
            NormalizeExecutionMode(configuration.ExecutionMode));
    }

    private static string NormalizeProviderId(string? providerId)
    {
        if (string.Equals(providerId?.Trim(), DecisionProviderIds.RuleBased, StringComparison.OrdinalIgnoreCase))
        {
            return DecisionProviderIds.RuleBased;
        }

        if (string.Equals(providerId?.Trim(), DecisionProviderIds.External, StringComparison.OrdinalIgnoreCase))
        {
            return DecisionProviderIds.External;
        }

        return DecisionProviderIds.Manual;
    }

    private static string NormalizeExecutionMode(string? executionMode)
    {
        return string.Equals(executionMode?.Trim(), DecisionExecutionModes.Autonomous, StringComparison.OrdinalIgnoreCase)
            ? DecisionExecutionModes.Autonomous
            : DecisionExecutionModes.Advisory;
    }

    private static string NormalizeDecisionResolutionSource(string? source)
    {
        return string.IsNullOrWhiteSpace(source) ? "system" : source.Trim();
    }

    private static bool ProposalsMatch(DecisionProposalSnapshot current, DecisionProposalSnapshot next)
    {
        return current with
        {
            ProposalId = Guid.Empty,
            ProposedAtUnixMs = 0,
            ResolvedAtUnixMs = null,
            ResolutionSource = null,
            AppliedInterventionId = null
        } == next with
        {
            ProposalId = Guid.Empty,
            ProposedAtUnixMs = 0,
            ResolvedAtUnixMs = null,
            ResolutionSource = null,
            AppliedInterventionId = null
        };
    }
}
