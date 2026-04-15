using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using ReadingTheReader.WebApi.Contracts.ExperimentSession;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class UpdateEyeMovementAnalysisConfigurationEndpoint
    : Endpoint<UpdateEyeMovementAnalysisConfigurationRequest, ExperimentSessionSnapshot>
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public UpdateEyeMovementAnalysisConfigurationEndpoint(
        IExperimentRuntimeAuthority runtimeAuthority,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _runtimeAuthority = runtimeAuthority;
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Put("/experiment-session/eye-movement-analysis-configuration");
        AllowAnonymous();
    }

    public override async Task HandleAsync(UpdateEyeMovementAnalysisConfigurationRequest req, CancellationToken ct)
    {
        await _runtimeAuthority.UpdateEyeMovementAnalysisConfigurationAsync(
            new EyeMovementAnalysisConfigurationSnapshot(req.ProviderId),
            ct);

        await Send.OkAsync(_experimentSessionQueryService.GetCurrentSnapshot(), ct);
    }
}
