using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.core.Domain;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.FacialState;

public sealed class FacialStateInboundHandler : IModuleInboundHandler
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    private readonly FacialStateService _service;

    public FacialStateInboundHandler(FacialStateService service)
    {
        _service = service;
    }

    public string ModuleId => FacialStateModuleIds.ModuleId;

    public async ValueTask HandleAsync(
        string messageType,
        string payloadJson,
        ModuleProviderContext context,
        CancellationToken ct = default)
    {
        switch (messageType)
        {
            case FacialStateInboundMessageTypes.FacialObservation:
                await HandleObservationAsync(payloadJson, context, ct);
                return;

            case FacialStateInboundMessageTypes.WebcamStatus:
                await HandleStatusAsync(payloadJson, context, ct);
                return;

            case FacialStateInboundMessageTypes.GazeSample:
                await HandleGazeSampleAsync(payloadJson, context, ct);
                return;

            default:
                Console.WriteLine(
                    $"FacialStateInboundHandler ignored unknown messageType '{messageType}' from providerId={context.ProviderId}.");
                return;
        }
    }

    private async ValueTask HandleObservationAsync(string json, ModuleProviderContext context, CancellationToken ct)
    {
        var payload = Deserialize<FacialStateObservationInboundPayload>(json);
        if (payload is null)
        {
            Console.WriteLine($"FacialStateInboundHandler received empty observation payload from {context.ProviderId}.");
            return;
        }

        var observation = new FacialObservationSnapshot(
            payload.CapturedAtUnixMs ?? context.ReceivedAtUnixMs,
            payload.LandmarkCount ?? 0,
            payload.HeadOffsetX ?? 0,
            payload.HeadOffsetY ?? 0,
            payload.LeftEyeOpenness ?? 0,
            payload.RightEyeOpenness ?? 0,
            payload.BlinkLikelihood ?? 0,
            payload.MouthTension ?? 0,
            payload.MotionScore ?? 0,
            payload.CaptureQuality ?? 0,
            payload.Confidence ?? 0,
            payload.Summary);

        await _service.IngestObservationAsync(observation.Copy(), ct);
    }

    private async ValueTask HandleStatusAsync(string json, ModuleProviderContext context, CancellationToken ct)
    {
        var payload = Deserialize<FacialStateWebcamStatusInboundPayload>(json);
        if (payload is null)
        {
            Console.WriteLine($"FacialStateInboundHandler received empty status payload from {context.ProviderId}.");
            return;
        }

        var status = new WebcamSensingStatusSnapshot(
            payload.IsConnected ?? false,
            WebcamSensingStatuses.Normalize(payload.Status),
            payload.LastFrameAtUnixMs,
            payload.LastProcessedAtUnixMs ?? context.ReceivedAtUnixMs,
            payload.CaptureQuality ?? 0,
            payload.ConsecutiveFailures ?? 0,
            payload.Detail);

        await _service.IngestStatusAsync(status.Copy(), ct);
    }

    private async ValueTask HandleGazeSampleAsync(string json, ModuleProviderContext context, CancellationToken ct)
    {
        var payload = Deserialize<FacialStateGazeSampleInboundPayload>(json);
        if (payload is null)
        {
            Console.WriteLine($"FacialStateInboundHandler received empty gaze payload from {context.ProviderId}.");
            return;
        }

        var capturedAtUnixMs = payload.CapturedAtUnixMs ?? context.ReceivedAtUnixMs;
        var gaze = new GazeData
        {
            DeviceTimeStamp = capturedAtUnixMs * 1000,
            SystemTimeStamp = capturedAtUnixMs * 1000,
            LeftEyeX = (float)(payload.LeftEyeX ?? 0),
            LeftEyeY = (float)(payload.LeftEyeY ?? 0),
            LeftEyeValidity = string.IsNullOrWhiteSpace(payload.LeftEyeValidity) ? "Valid" : payload.LeftEyeValidity!,
            RightEyeX = (float)(payload.RightEyeX ?? 0),
            RightEyeY = (float)(payload.RightEyeY ?? 0),
            RightEyeValidity = string.IsNullOrWhiteSpace(payload.RightEyeValidity) ? "Valid" : payload.RightEyeValidity!,
            LeftPupilDiameterMm = (float)(payload.LeftPupilDiameter ?? 0),
            RightPupilDiameterMm = (float)(payload.RightPupilDiameter ?? 0)
        };

        await _service.IngestGazeSampleAsync(gaze, capturedAtUnixMs, ct);
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
            Console.WriteLine($"FacialStateInboundHandler JSON parse error: {ex.Message}");
            return null;
        }
    }
}
