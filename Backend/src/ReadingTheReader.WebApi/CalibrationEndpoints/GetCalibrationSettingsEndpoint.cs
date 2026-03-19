using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.CalibrationEndpoints;

public sealed class GetCalibrationSettingsEndpoint : EndpointWithoutRequest<CalibrationSettingsSnapshot>
{
    private readonly ICalibrationService _calibrationService;

    public GetCalibrationSettingsEndpoint(ICalibrationService calibrationService)
    {
        _calibrationService = calibrationService;
    }

    public override void Configure()
    {
        Get("/calibration/settings");
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct)
    {
        return Send.OkAsync(_calibrationService.GetSettings(), ct);
    }
}
