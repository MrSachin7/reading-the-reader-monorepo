using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Domain;

namespace ReadingTheReader.WebApi.EyeTrackerEndpoints;

public sealed record EyeTrackerSummaryResponse(
    string Name,
    string Model,
    string SerialNumber,
    bool HasSavedLicence,
    bool IsSelected);

public class GetConnectedEyetrackersEndpoint : EndpointWithoutRequest<List<EyeTrackerSummaryResponse>>
{
    private readonly IEyeTrackerService _eyeTrackerService;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public GetConnectedEyetrackersEndpoint(
        IEyeTrackerService eyeTrackerService,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _eyeTrackerService = eyeTrackerService;
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Get("/eyetrackers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        var trackers = await _eyeTrackerService.GetAllConnectedEyeTrackersAsync(ct);
        var selectedSerialNumber = _experimentSessionQueryService.GetCurrentSnapshot().EyeTrackerDevice?.SerialNumber;
        var response = trackers
            .Select(tracker => MapTracker(tracker, selectedSerialNumber))
            .ToList();

        await Send.OkAsync(response, ct);
    }

    private static EyeTrackerSummaryResponse MapTracker(EyeTrackerDevice tracker, string? selectedSerialNumber)
    {
        return new EyeTrackerSummaryResponse(
            tracker.Name,
            tracker.Model,
            tracker.SerialNumber,
            tracker.HasSavedLicence,
            !string.IsNullOrWhiteSpace(selectedSerialNumber) &&
            tracker.SerialNumber.Equals(selectedSerialNumber, StringComparison.OrdinalIgnoreCase));
    }
}
