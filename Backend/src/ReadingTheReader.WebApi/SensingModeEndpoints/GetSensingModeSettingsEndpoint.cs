using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.WebApi.SensingModeEndpoints;

public sealed class GetSensingModeSettingsEndpoint : EndpointWithoutRequest<SensingModeSettingsSnapshot>
{
    private const string ActiveSessionBlockReason = "Finish the active experiment session before changing sensing mode.";

    private readonly ISensingModeSettingsService _sensingModeSettingsService;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public GetSensingModeSettingsEndpoint(
        ISensingModeSettingsService sensingModeSettingsService,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _sensingModeSettingsService = sensingModeSettingsService;
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Get("/sensing-mode/settings");
        AllowAnonymous();
    }

    public override Task HandleAsync(CancellationToken ct)
    {
        var canChangeMode = !_experimentSessionQueryService.GetCurrentSnapshot().IsActive;
        return Send.OkAsync(
            _sensingModeSettingsService.GetSettings(
                canChangeMode,
                canChangeMode ? null : ActiveSessionBlockReason),
            ct);
    }
}
