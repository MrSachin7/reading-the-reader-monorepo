using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.EyeTrackerEndpoints;

public class StartTrackingEndpoint : EndpointWithoutRequest
{
    private readonly IEyeTrackerService _eyeTrackerService;

    public StartTrackingEndpoint(IEyeTrackerService eyeTrackerService)
    {
        _eyeTrackerService = eyeTrackerService;
    }

    public override void Configure()
    {
        Post("/eyetrackers/start");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            await _eyeTrackerService.StartTrackingAsync(ct);
        }
        catch (InvalidOperationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
            return;
        }

        await Send.OkAsync(cancellation: ct);
    }
}
