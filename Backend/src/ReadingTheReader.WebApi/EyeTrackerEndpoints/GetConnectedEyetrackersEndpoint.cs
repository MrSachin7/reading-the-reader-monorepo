using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.WebApi.EyeTrackerEndpoints;

public class GetConnectedEyetrackersEndpoint: EndpointWithoutRequest<List<EyeTrackerDevice>> {
    private readonly IEyeTrackerService _eyeTrackerService;

    public GetConnectedEyetrackersEndpoint(IEyeTrackerService eyeTrackerService) {
        _eyeTrackerService = eyeTrackerService;
    }

    public override void Configure() {
        Get("/eyetrackers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct) {
        var trackers = await _eyeTrackerService.GetAllConnectedEyeTrackersAsync(ct);
        await Send.OkAsync(trackers, ct);
    }
}

