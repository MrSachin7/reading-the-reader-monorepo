using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.EyeTrackerEndpoints;

public class StopTrackingEndpoint : EndpointWithoutRequest
{
    private readonly IEyeTrackerService _eyeTrackerService;

    public StopTrackingEndpoint(IEyeTrackerService eyeTrackerService)
    {
        _eyeTrackerService = eyeTrackerService;
    }

    public override void Configure()
    {
        Post("/eyetrackers/stop");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await _eyeTrackerService.StopTrackingAsync(ct);
        await Send.OkAsync(cancellation: ct);
    }
}
