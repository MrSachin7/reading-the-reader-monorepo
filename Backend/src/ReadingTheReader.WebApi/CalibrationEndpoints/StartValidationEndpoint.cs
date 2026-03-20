using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.CalibrationEndpoints;

public sealed class StartValidationEndpoint : EndpointWithoutRequest<CalibrationSessionSnapshot>
{
    private readonly ICalibrationService _calibrationService;

    public StartValidationEndpoint(ICalibrationService calibrationService)
    {
        _calibrationService = calibrationService;
    }

    public override void Configure()
    {
        Post("/calibration/validation/start");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CancellationToken ct)
    {
        try
        {
            await Send.OkAsync(await _calibrationService.StartValidationAsync(ct), ct);
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
    }
}
