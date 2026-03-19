using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.CalibrationEndpoints;

public sealed class CollectCalibrationPointEndpoint : Endpoint<CollectCalibrationPointRequest, CalibrationSessionSnapshot>
{
    private readonly ICalibrationService _calibrationService;

    public CollectCalibrationPointEndpoint(ICalibrationService calibrationService)
    {
        _calibrationService = calibrationService;
    }

    public override void Configure()
    {
        Post("/calibration/collect");
        AllowAnonymous();
    }

    public override async Task HandleAsync(CollectCalibrationPointRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.PointId))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "pointId is required." }, ct);
            return;
        }

        try
        {
            await Send.OkAsync(await _calibrationService.CollectPointAsync(req.PointId, ct), ct);
        }
        catch (Exception ex) when (ex is InvalidOperationException or ArgumentException)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
    }
}

public sealed class CollectCalibrationPointRequest
{
    public string PointId { get; set; } = string.Empty;
}
