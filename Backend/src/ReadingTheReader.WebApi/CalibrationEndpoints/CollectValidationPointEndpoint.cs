using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.CalibrationEndpoints;

public sealed class CollectValidationPointEndpoint : Endpoint<CollectValidationPointRequest, CalibrationSessionSnapshot>
{
    private readonly ICalibrationService _calibrationService;

    public CollectValidationPointEndpoint(ICalibrationService calibrationService)
    {
        _calibrationService = calibrationService;
    }

    public override void Configure()
    {
        Post("/calibration/validation/collect");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CollectValidationPointRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.PointId))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "pointId is required." }, ct);
            return;
        }

        try
        {
            await Send.OkAsync(await _calibrationService.CollectValidationPointAsync(req.PointId, ct), ct);
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
    }
}

public sealed class CollectValidationPointRequest
{
    public string PointId { get; set; } = string.Empty;
}
