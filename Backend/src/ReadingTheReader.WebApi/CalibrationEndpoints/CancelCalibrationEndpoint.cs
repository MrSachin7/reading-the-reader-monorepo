using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.CalibrationEndpoints;

public sealed class CancelCalibrationEndpoint : EndpointWithoutRequest<CalibrationSessionSnapshot>
{
    private readonly ICalibrationService _calibrationService;

    public CancelCalibrationEndpoint(ICalibrationService calibrationService)
    {
        _calibrationService = calibrationService;
    }

    public override void Configure()
    {
        Post("/calibration/cancel");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        await Send.OkAsync(await _calibrationService.CancelCalibrationAsync(ct), ct);
    }
}
