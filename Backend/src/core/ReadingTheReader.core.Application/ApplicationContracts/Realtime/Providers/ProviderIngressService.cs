using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;

public sealed record ProviderIngressResponse(
    string MessageType,
    object Payload,
    string? ProviderId = null,
    string? SessionId = null,
    string? CorrelationId = null);

public sealed record ProviderIngressHandlingResult(
    bool ShouldCloseConnection,
    IReadOnlyList<ProviderIngressResponse> Responses)
{
    public static ProviderIngressHandlingResult NoOp { get; } = new(false, []);
}

public interface IProviderIngressService
{
    Task<ProviderIngressHandlingResult> HandleAsync(IProviderIngressCommand command, CancellationToken ct = default);
}

public sealed class ProviderIngressService : IProviderIngressService
{
    private readonly IProviderConnectionRegistry _providerConnectionRegistry;
    private readonly IExperimentRuntimeAuthority _experimentRuntimeAuthority;
    private readonly ExternalProviderOptions _options;

    public ProviderIngressService(
        IProviderConnectionRegistry providerConnectionRegistry,
        IExperimentRuntimeAuthority experimentRuntimeAuthority,
        ExternalProviderOptions options)
    {
        _providerConnectionRegistry = providerConnectionRegistry;
        _experimentRuntimeAuthority = experimentRuntimeAuthority;
        _options = options;
    }

    public async Task<ProviderIngressHandlingResult> HandleAsync(IProviderIngressCommand command, CancellationToken ct = default)
    {
        return command switch
        {
            ProviderHelloRealtimeCommand hello => HandleHello(hello),
            ProviderHeartbeatRealtimeCommand heartbeat => HandleHeartbeat(heartbeat),
            ProviderSubmitProposalRealtimeCommand proposal => await HandleProposalAsync(proposal, ct),
            ProviderRequestAutonomousApplyRealtimeCommand autonomousApply => await HandleAutonomousApplyAsync(autonomousApply, ct),
            ProviderErrorReportedRealtimeCommand error => HandleProviderError(error),
            ProviderDisconnectRealtimeCommand disconnect => HandleDisconnect(disconnect),
            InvalidProviderRealtimeCommand invalid => ErrorAndClose(
                null,
                null,
                null,
                "invalid-provider-command",
                invalid.ErrorMessage),
            UnsupportedProviderRealtimeCommand unsupported => ErrorAndClose(
                null,
                null,
                null,
                "unsupported-provider-command",
                $"Unsupported provider message type '{unsupported.MessageType}'."),
            _ => ErrorAndClose(
                null,
                null,
                null,
                "unsupported-provider-command",
                "Unsupported provider command.")
        };
    }

    private ProviderIngressHandlingResult HandleHello(ProviderHelloRealtimeCommand command)
    {
        var result = _providerConnectionRegistry.Register(command.ConnectionId, command.Payload);
        if (!result.Succeeded || result.Provider is null)
        {
            return ErrorAndClose(
                command.Payload.ProviderId,
                null,
                null,
                result.ErrorCode ?? "provider-registration-failed",
                result.ErrorMessage ?? "Provider registration failed.");
        }

        return new ProviderIngressHandlingResult(
            false,
            [
                new ProviderIngressResponse(
                    ProviderMessageTypes.ProviderWelcome,
                    new ProviderWelcomeRealtimePayload(
                        result.Provider.ProviderId,
                        result.Provider.DisplayName,
                        result.Provider.ProtocolVersion,
                        result.Provider.Status,
                        result.Provider.RegisteredAtUnixMs,
                        _options.HeartbeatTimeoutMilliseconds),
                    result.Provider.ProviderId)
            ]);
    }

    private ProviderIngressHandlingResult HandleHeartbeat(ProviderHeartbeatRealtimeCommand command)
    {
        var result = _providerConnectionRegistry.AcceptHeartbeat(command.ConnectionId, command.Payload);
        if (!result.Succeeded || result.Provider is null)
        {
            return ErrorAndClose(
                command.Payload.ProviderId,
                null,
                null,
                result.ErrorCode ?? "provider-heartbeat-failed",
                result.ErrorMessage ?? "Provider heartbeat failed.");
        }

        return ProviderIngressHandlingResult.NoOp;
    }

    private ProviderIngressHandlingResult HandleProviderError(ProviderErrorReportedRealtimeCommand command)
    {
        _providerConnectionRegistry.ReportProviderError(command.ConnectionId, command.Payload);
        return ProviderIngressHandlingResult.NoOp;
    }

    private async Task<ProviderIngressHandlingResult> HandleProposalAsync(
        ProviderSubmitProposalRealtimeCommand command,
        CancellationToken ct)
    {
        var provider = ValidateConnectedProvider(
            command.ConnectionId,
            command.Payload.ProviderId,
            command.Payload.ExecutionMode,
            requiresAutonomousExecution: false);
        if (provider.Error is not null)
        {
            return provider.Error;
        }

        try
        {
            await _experimentRuntimeAuthority.SubmitExternalDecisionProposalAsync(
                new ExternalDecisionProposalCommand(
                    command.Payload.ProviderId,
                    command.Payload.SessionId,
                    command.Payload.CorrelationId,
                    command.Payload.ProposalId,
                    command.Payload.ExecutionMode,
                    command.Payload.Rationale,
                    command.Payload.SignalSummary,
                    command.Payload.ProviderObservedAtUnixMs,
                    ToApplyIntervention(command.Payload.ProviderId, command.Payload.ProposedIntervention)),
                ct);

            return ProviderIngressHandlingResult.NoOp;
        }
        catch (InvalidOperationException ex)
        {
            return ProviderError(
                command.Payload.ProviderId,
                command.Payload.SessionId,
                command.Payload.CorrelationId,
                "proposal-rejected",
                ex.Message);
        }
    }

    private async Task<ProviderIngressHandlingResult> HandleAutonomousApplyAsync(
        ProviderRequestAutonomousApplyRealtimeCommand command,
        CancellationToken ct)
    {
        var provider = ValidateConnectedProvider(
            command.ConnectionId,
            command.Payload.ProviderId,
            command.Payload.ExecutionMode,
            requiresAutonomousExecution: true);
        if (provider.Error is not null)
        {
            return provider.Error;
        }

        try
        {
            await _experimentRuntimeAuthority.RequestExternalAutonomousApplyAsync(
                new ExternalDecisionAutonomousApplyCommand(
                    command.Payload.ProviderId,
                    command.Payload.SessionId,
                    command.Payload.CorrelationId,
                    command.Payload.ExecutionMode,
                    command.Payload.Rationale,
                    command.Payload.SignalSummary,
                    command.Payload.ProviderObservedAtUnixMs,
                    ToApplyIntervention(command.Payload.ProviderId, command.Payload.RequestedIntervention)),
                ct);

            return ProviderIngressHandlingResult.NoOp;
        }
        catch (InvalidOperationException ex)
        {
            return ProviderError(
                command.Payload.ProviderId,
                command.Payload.SessionId,
                command.Payload.CorrelationId,
                "autonomous-apply-rejected",
                ex.Message);
        }
    }

    private ProviderIngressHandlingResult HandleDisconnect(ProviderDisconnectRealtimeCommand command)
    {
        _providerConnectionRegistry.Disconnect(command.ConnectionId);
        return ProviderIngressHandlingResult.NoOp;
    }

    private (ProviderConnectionRecord? Provider, ProviderIngressHandlingResult? Error) ValidateConnectedProvider(
        string connectionId,
        string providerId,
        string executionMode,
        bool requiresAutonomousExecution)
    {
        if (!_providerConnectionRegistry.TryGetByConnectionId(connectionId, out var provider) || provider is null)
        {
            return (null, ProviderError(providerId, null, null, "provider-not-registered", "Provider is not registered."));
        }

        if (!string.Equals(provider.ProviderId, providerId, StringComparison.Ordinal))
        {
            return (null, ProviderError(providerId, null, null, "provider-id-mismatch", "Provider identity does not match the registered connection."));
        }

        if (requiresAutonomousExecution)
        {
            if (!provider.Capabilities.SupportsAutonomousExecution)
            {
                return (null, ProviderError(providerId, null, null, "provider-capability-mismatch", "Provider does not support autonomous execution."));
            }
        }
        else if (!provider.Capabilities.SupportsAdvisoryExecution)
        {
            return (null, ProviderError(providerId, null, null, "provider-capability-mismatch", "Provider does not support advisory execution."));
        }

        if (!string.Equals(executionMode, requiresAutonomousExecution ? DecisionExecutionModes.Autonomous : DecisionExecutionModes.Advisory, StringComparison.OrdinalIgnoreCase))
        {
            return (null, ProviderError(providerId, null, null, "execution-mode-mismatch", "Provider execution mode does not match the submitted command type."));
        }

        return (provider, null);
    }

    private static ApplyInterventionCommand ToApplyIntervention(
        string providerId,
        ProviderProposedInterventionRealtimePayload payload)
    {
        return new ApplyInterventionCommand(
            providerId,
            payload.Trigger,
            payload.Reason,
            new ReadingPresentationPatch(
                payload.Presentation.FontFamily,
                payload.Presentation.FontSizePx,
                payload.Presentation.LineWidthPx,
                payload.Presentation.LineHeight,
                payload.Presentation.LetterSpacingEm,
                payload.Presentation.EditableByResearcher),
            new ReaderAppearancePatch(
                payload.Appearance.ThemeMode,
                payload.Appearance.Palette,
                payload.Appearance.AppFont),
            payload.ModuleId,
            payload.Parameters is null
                ? null
                : new Dictionary<string, string?>(payload.Parameters, StringComparer.Ordinal));
    }

    private static ProviderIngressHandlingResult ProviderError(
        string? providerId,
        string? sessionId,
        string? correlationId,
        string code,
        string message)
    {
        return new ProviderIngressHandlingResult(
            false,
            [
                new ProviderIngressResponse(
                    ProviderMessageTypes.ProviderError,
                    new ProviderErrorRealtimePayload(providerId ?? "unknown-provider", code, message),
                    providerId,
                    sessionId,
                    correlationId)
            ]);
    }

    private static ProviderIngressHandlingResult ErrorAndClose(
        string? providerId,
        string? sessionId,
        string? correlationId,
        string code,
        string message)
    {
        return new ProviderIngressHandlingResult(
            true,
            [
                new ProviderIngressResponse(
                    ProviderMessageTypes.ProviderError,
                    new ProviderErrorRealtimePayload(providerId ?? "unknown-provider", code, message),
                    providerId,
                    sessionId,
                    correlationId)
            ]);
    }
}
