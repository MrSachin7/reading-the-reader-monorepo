using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.WebApi.SensingModeEndpoints;

public sealed class UpdateSensingModeSettingsEndpoint : Endpoint<UpdateSensingModeSettingsRequest, SensingModeSettingsSnapshot>
{
    private const string ActiveSessionBlockReason = "Finish the active experiment session before changing sensing mode.";

    private readonly ISensingModeSettingsService _sensingModeSettingsService;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public UpdateSensingModeSettingsEndpoint(
        ISensingModeSettingsService sensingModeSettingsService,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _sensingModeSettingsService = sensingModeSettingsService;
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Put("/sensing-mode/settings");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateSensingModeSettingsRequest req, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req.Mode))
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = "mode is required." }, ct);
            return;
        }

        var canChangeMode = !_experimentSessionQueryService.GetCurrentSnapshot().IsActive;
        if (!canChangeMode)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status409Conflict;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ActiveSessionBlockReason }, ct);
            return;
        }

        try
        {
            await Send.OkAsync(
                await _sensingModeSettingsService.UpdateModeAsync(req.Mode, canChangeMode, null, ct),
                ct);
        }
        catch (ArgumentException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
    }
}

public sealed class UpdateSensingModeSettingsRequest
{
    public string Mode { get; set; } = string.Empty;
}
