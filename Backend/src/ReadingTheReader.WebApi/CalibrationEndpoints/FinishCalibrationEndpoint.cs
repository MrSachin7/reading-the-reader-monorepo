using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.CalibrationEndpoints;

public sealed class FinishCalibrationEndpoint : EndpointWithoutRequest<CalibrationSessionSnapshot>
{
    private readonly ICalibrationService _calibrationService;

    public FinishCalibrationEndpoint(ICalibrationService calibrationService)
    {
        _calibrationService = calibrationService;
    }

    public override void Configure()
    {
        Post("/calibration/finish");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            await Send.OkAsync(await _calibrationService.FinishCalibrationAsync(ct), ct);
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
    }
}
