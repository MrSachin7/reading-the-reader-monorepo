using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;

namespace ReadingTheReader.WebApi.EyeTrackerEndpoints;

public sealed record SelectEyeTrackerResponse(
    EyeTrackerSummaryResponse SelectedTracker,
    ExperimentSetupSnapshot Setup);

public sealed class SelectEyeTrackerEndpoint : Endpoint<SelectEyeTrackerRequest>
{
    private readonly IEyeTrackerService _eyeTrackerService;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public SelectEyeTrackerEndpoint(
        IEyeTrackerService eyeTrackerService,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _eyeTrackerService = eyeTrackerService;
        _experimentSessionQueryService = experimentSessionQueryService;
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

        var snapshot = _experimentSessionQueryService.GetCurrentSnapshot();
        var selectedTracker = snapshot.EyeTrackerDevice;
        if (selectedTracker is null)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            await HttpContext.Response.WriteAsJsonAsync(
                new { message = "Eye tracker selection completed but no authoritative device state was projected." },
                ct);
            return;
        }

        var response = new SelectEyeTrackerResponse(
            new EyeTrackerSummaryResponse(
                selectedTracker.Name,
                selectedTracker.Model,
                selectedTracker.SerialNumber,
                selectedTracker.HasSavedLicence,
                true),
            snapshot.Setup);

        await Send.OkAsync(response, ct);
    }
}

public sealed class SelectEyeTrackerRequest
{
    public string SerialNumber { get; set; } = string.Empty;
    public bool SaveLicence { get; set; }
    public IFormFile? LicenceFile { get; set; }
}
