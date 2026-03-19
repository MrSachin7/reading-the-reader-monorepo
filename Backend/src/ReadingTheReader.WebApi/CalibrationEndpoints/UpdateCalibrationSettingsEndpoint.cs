using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.CalibrationEndpoints;

public sealed class UpdateCalibrationSettingsEndpoint : Endpoint<UpdateCalibrationSettingsRequest, CalibrationSettingsSnapshot>
{
    private readonly ICalibrationService _calibrationService;

    public UpdateCalibrationSettingsEndpoint(ICalibrationService calibrationService)
    {
        _calibrationService = calibrationService;
    }

    public override void Configure()
    {
        Put("/calibration/settings");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateCalibrationSettingsRequest req, CancellationToken ct)
    {
        if (req.PresetPointCount <= 0)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "presetPointCount is required." }, ct);
            return;
        }

        try
        {
            await Send.OkAsync(await _calibrationService.UpdateSettingsAsync(req.PresetPointCount, ct), ct);
        }
        catch (ArgumentOutOfRangeException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
        catch (InvalidOperationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status409Conflict;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
    }
}

public sealed class UpdateCalibrationSettingsRequest
{
    public int PresetPointCount { get; set; }
}
