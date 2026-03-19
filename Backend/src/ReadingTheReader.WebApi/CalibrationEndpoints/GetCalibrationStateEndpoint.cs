using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.CalibrationEndpoints;

public sealed class GetCalibrationStateEndpoint : EndpointWithoutRequest<CalibrationSessionSnapshot>
{
    private readonly ICalibrationService _calibrationService;

    public GetCalibrationStateEndpoint(ICalibrationService calibrationService)
    {
        _calibrationService = calibrationService;
    }

    public override void Configure()
    {
        Get("/calibration");
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct)
    {
        return Send.OkAsync(_calibrationService.GetCurrentSnapshot(), ct);
    }
}
