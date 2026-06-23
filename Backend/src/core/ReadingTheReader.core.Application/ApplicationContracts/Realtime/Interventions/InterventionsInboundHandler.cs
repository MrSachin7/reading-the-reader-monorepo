using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.Decisioning;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.   Realtime.Interventions;

public sealed class InterventionsInboundHandler : IModuleInboundHandler
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly IModuleProviderCoordinator _coordinator;
    private readonly IModuleProviderGateway _gateway;
    private readonly IModuleProviderRttTracker _rttTracker;

    public InterventionsInboundHandler(
        IExperimentRuntimeAuthority runtimeAuthority,
        IModuleProviderCoordinator coordinator,
        IModuleProviderGateway gateway,
        IModuleProviderRttTracker rttTracker)
    {
        _runtimeAuthority = runtimeAuthority;
        _coordinator = coordinator;
        _gateway = gateway;
        _rttTracker = rttTracker;
    }

    public string ModuleId => InterventionsModuleIds.ModuleId;

    public async ValueTask HandleAsync(
        string messageType,
        string payloadJson,
        ModuleProviderContext context,
        CancellationToken ct = default)
    {
        switch (messageType)
        {
            case InterventionsInboundMessageTypes.SubmitProposal:
                await HandleProposalAsync(payloadJson, context, ct);
                return;

            case InterventionsInboundMessageTypes.RequestAutonomousApply:
                await HandleAutonomousApplyAsync(payloadJson, context, ct);
                return;

            case InterventionsInboundMessageTypes.ProviderError:
                HandleProviderError(payloadJson, context);
                return;

            default:
                Console.WriteLine(
                    $"InterventionsInboundHandler ignored unknown messageType '{messageType}' from providerId={context.ProviderId}.");
                return;
        }
    }

    private async ValueTask HandleProposalAsync(string json, ModuleProviderContext context, CancellationToken ct)
    {
        var payload = Deserialize<InterventionsSubmitProposalPayload>(json);
        if (payload is null)
        {
            Console.WriteLine($"InterventionsInboundHandler: empty submitProposal payload from {context.ProviderId}.");
            return;
        }

        await TryRecordDecisionProviderRttAsync(context, ct);

        var caps = GetProviderCapabilities(context);
        if (!caps.HasFlag(InterventionsModuleCapabilityKeys.SupportsAdvisoryExecution))
        {
            await PublishErrorAsync(context, "provider-capability-mismatch", "Provider does not support advisory execution.", ct);
            return;
        }

        if (!string.Equals(payload.ExecutionMode, DecisionExecutionModes.Advisory, StringComparison.OrdinalIgnoreCase))
        {
            await PublishErrorAsync(context, "execution-mode-mismatch", "Expected advisory execution mode for submitProposal.", ct);
            return;
        }

        try
        {
            await _runtimeAuthority.SubmitExternalDecisionProposalAsync(
                new ExternalDecisionProposalCommand(
                    payload.ProviderId ?? context.ProviderId,
                    payload.SessionId ?? context.SessionId ?? string.Empty,
                    payload.CorrelationId ?? context.CorrelationId ?? string.Empty,
                    payload.ProposalId ?? string.Empty,
                    payload.ExecutionMode,
                    payload.Rationale ?? string.Empty,
                    payload.SignalSummary ?? string.Empty,
                    payload.ProviderObservedAtUnixMs,
                    ToApplyIntervention(context.ProviderId, payload.ProposedIntervention)),
                ct);
        }
        catch (InvalidOperationException ex)
        {
            await PublishErrorAsync(context, "proposal-rejected", ex.Message, ct);
        }
    }

    private async ValueTask HandleAutonomousApplyAsync(string json, ModuleProviderContext context, CancellationToken ct)
    {
        var payload = Deserialize<InterventionsRequestAutonomousApplyPayload>(json);
        if (payload is null)
        {
            Console.WriteLine($"InterventionsInboundHandler: empty requestAutonomousApply payload from {context.ProviderId}.");
            return;
        }

        await TryRecordDecisionProviderRttAsync(context, ct);

        var caps = GetProviderCapabilities(context);
        if (!caps.HasFlag(InterventionsModuleCapabilityKeys.SupportsAutonomousExecution))
        {
            await PublishErrorAsync(context, "provider-capability-mismatch", "Provider does not support autonomous execution.", ct);
            return;
        }

        if (!string.Equals(payload.ExecutionMode, DecisionExecutionModes.Autonomous, StringComparison.OrdinalIgnoreCase))
        {
            await PublishErrorAsync(context, "execution-mode-mismatch", "Expected autonomous execution mode for requestAutonomousApply.", ct);
            return;
        }

        try
        {
            await _runtimeAuthority.RequestExternalAutonomousApplyAsync(
                new ExternalDecisionAutonomousApplyCommand(
                    payload.ProviderId ?? context.ProviderId,
                    payload.SessionId ?? context.SessionId ?? string.Empty,
                    payload.CorrelationId ?? context.CorrelationId ?? string.Empty,
                    payload.ExecutionMode,
                    payload.Rationale ?? string.Empty,
                    payload.SignalSummary ?? string.Empty,
                    payload.ProviderObservedAtUnixMs,
                    ToApplyIntervention(context.ProviderId, payload.RequestedIntervention)),
                ct);
        }
        catch (InvalidOperationException ex)
        {
            await PublishErrorAsync(context, "autonomous-apply-rejected", ex.Message, ct);
        }
    }

    private void HandleProviderError(string json, ModuleProviderContext context)
    {
        var payload = Deserialize<InterventionsErrorPayload>(json);
        Console.WriteLine(
            $"InterventionsInboundHandler received provider error from {context.ProviderId}. " +
            $"Code={payload?.Code ?? "unknown"}, Message={payload?.Message ?? "unknown"}");
    }

    private async ValueTask TryRecordDecisionProviderRttAsync(ModuleProviderContext context, CancellationToken ct)
    {
        // The provider echoes the backend-issued correlation id from the decision
        // context; matching it against the recorded send time gives a single-clock
        // round-trip latency for the out-of-process decision path (evaluation RQ2).
        if (string.IsNullOrWhiteSpace(context.CorrelationId))
        {
            return;
        }

        if (_rttTracker.TryComplete(context.CorrelationId, context.ReceivedAtUnixMs, out var rttMs))
        {
            await _runtimeAuthority.RecordClientTelemetrySampleAsync(
                ExperimentTelemetryRoles.DecisionProviderRtt, rttMs, null, null, ct);
        }
    }

    private ModuleCapabilities GetProviderCapabilities(ModuleProviderContext context)
    {
        var provider = _coordinator.GetActiveProvider(InterventionsModuleIds.ModuleId);
        if (provider?.CapabilitiesByModule is null)
        {
            return ModuleCapabilities.None;
        }

        return provider.CapabilitiesByModule.TryGetValue(InterventionsModuleIds.ModuleId, out var caps)
            ? caps
            : ModuleCapabilities.None;
    }

    private async ValueTask PublishErrorAsync(ModuleProviderContext context, string code, string message, CancellationToken ct)
    {
        await _gateway.PublishAsync(
            InterventionsModuleIds.ModuleId,
            InterventionsOutboundMessageTypes.Error,
            new InterventionsErrorPayload(code, message),
            new ModuleProviderPublishContext(context.SessionId, context.CorrelationId),
            ct);
    }

    private static ApplyInterventionCommand ToApplyIntervention(
        string providerId,
        InterventionsProposedInterventionPayload payload)
    {
        return new ApplyInterventionCommand(
            providerId,
            payload.Trigger,
            payload.Reason,
            new ReadingPresentationPatch(
                payload.Presentation?.FontFamily,
                payload.Presentation?.FontSizePx,
                payload.Presentation?.LineWidthPx,
                payload.Presentation?.LineHeight,
                payload.Presentation?.LetterSpacingEm,
                payload.Presentation?.EditableByResearcher),
            new ReaderAppearancePatch(
                payload.Appearance?.ThemeMode,
                payload.Appearance?.Palette,
                payload.Appearance?.AppFont),
            payload.ModuleId,
            payload.Parameters is null
                ? null
                : new Dictionary<string, string?>(payload.Parameters, StringComparer.Ordinal));
    }

    private static T? Deserialize<T>(string json) where T : class
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return null;
        }

        try
        {
            return JsonSerializer.Deserialize<T>(json, JsonOptions);
        }
        catch (JsonException ex)
        {
            Console.WriteLine($"InterventionsInboundHandler JSON parse error: {ex.Message}");
            return null;
        }
    }
}
