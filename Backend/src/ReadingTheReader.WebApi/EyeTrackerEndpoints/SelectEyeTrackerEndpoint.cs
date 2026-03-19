using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.EyeTrackerEndpoints;

public sealed class SelectEyeTrackerEndpoint : Endpoint<SelectEyeTrackerRequest>
{
    private readonly IEyeTrackerService _eyeTrackerService;

    public SelectEyeTrackerEndpoint(IEyeTrackerService eyeTrackerService)
    {
        _eyeTrackerService = eyeTrackerService;
    }

    public override void Configure()
    {
        Post("/eyetrackers/select");
        AllowAnonymous();
        AllowFileUploads();
    }

    public override async Task HandleAsync(SelectEyeTrackerRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.SerialNumber))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "serialNumber is required." }, ct);
            return;
        }

        byte[]? licenseBytes = null;
        if (req.LicenceFile is { Length: > 0 })
        {
            await using var ms = new MemoryStream();
            await req.LicenceFile.CopyToAsync(ms, ct);
            licenseBytes = ms.ToArray();
        }

        try
        {
            await _eyeTrackerService.SelectEyeTrackerAsync(
                req.SerialNumber,
                licenseBytes,
                req.SaveLicence,
                ct);
        }
        catch (ArgumentException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
            return;
        }

        await Send.OkAsync(cancellation: ct);
    }
}

public sealed class SelectEyeTrackerRequest
{
    public string SerialNumber { get; set; } = string.Empty;
    public bool SaveLicence { get; set; }
    public IFormFile? LicenceFile { get; set; }
}
