using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed class FixationAnalysisInboundHandler : IModuleInboundHandler
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly IModuleProviderGateway _gateway;

    public FixationAnalysisInboundHandler(
        IExperimentRuntimeAuthority runtimeAuthority,
        IModuleProviderGateway gateway)
    {
        _runtimeAuthority = runtimeAuthority;
        _gateway = gateway;
    }

    public string ModuleId => FixationAnalysisModuleIds.ModuleId;

    public async ValueTask HandleAsync(
        string messageType,
        string payloadJson,
        ModuleProviderContext context,
        CancellationToken ct = default)
    {
        switch (messageType)
        {
            case FixationAnalysisInboundMessageTypes.SubmitAnalysis:
                await HandleSubmitAnalysisAsync(payloadJson, context, ct);
                return;

            case FixationAnalysisInboundMessageTypes.ProviderError:
                HandleProviderError(payloadJson, context);
                return;

            default:
                Console.WriteLine(
                    $"FixationAnalysisInboundHandler ignored unknown messageType '{messageType}' from providerId={context.ProviderId}.");
                return;
        }
    }

    private async ValueTask HandleSubmitAnalysisAsync(string json, ModuleProviderContext context, CancellationToken ct)
    {
        var payload = Deserialize<FixationAnalysisSubmitAnalysisPayload>(json);
        if (payload is null)
        {
            Console.WriteLine($"FixationAnalysisInboundHandler: empty submitAnalysis payload from {context.ProviderId}.");
            return;
        }

        if (payload.AnalysisState is null)
        {
            await PublishErrorAsync(context, "invalid-payload", "submitAnalysis requires a non-null analysisState.", ct);
            return;
        }

        try
        {
            await _runtimeAuthority.ApplyExternalEyeMovementAnalysisAsync(
                new ExternalEyeMovementAnalysisCommand(
                    payload.ProviderId ?? context.ProviderId,
                    payload.SessionId ?? context.SessionId ?? string.Empty,
                    payload.CorrelationId ?? context.CorrelationId ?? string.Empty,
                    payload.ObservedAtUnixMs,
                    payload.CurrentFixation,
                    payload.CompletedFixation,
                    payload.CompletedSaccade,
                    payload.AnalysisState),
                ct);
        }
        catch (InvalidOperationException ex)
        {
            await PublishErrorAsync(context, "analysis-rejected", ex.Message, ct);
        }
    }

    private void HandleProviderError(string json, ModuleProviderContext context)
    {
        var payload = Deserialize<FixationAnalysisErrorPayload>(json);
        Console.WriteLine(
            $"FixationAnalysisInboundHandler received provider error from {context.ProviderId}. " +
            $"Code={payload?.Code ?? "unknown"}, Message={payload?.Message ?? "unknown"}");
    }

    private async ValueTask PublishErrorAsync(ModuleProviderContext context, string code, string message, CancellationToken ct)
    {
        await _gateway.PublishAsync(
            FixationAnalysisModuleIds.ModuleId,
            FixationAnalysisOutboundMessageTypes.Error,
            new FixationAnalysisErrorPayload(code, message),
            new ModuleProviderPublishContext(context.SessionId, context.CorrelationId),
            ct);
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
            Console.WriteLine($"FixationAnalysisInboundHandler JSON parse error: {ex.Message}");
            return null;
        }
    }
}
