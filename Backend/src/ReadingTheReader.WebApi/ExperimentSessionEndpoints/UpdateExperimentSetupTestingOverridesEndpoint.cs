using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.WebApi.Contracts.ExperimentSession;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class UpdateExperimentSetupTestingOverridesEndpoint
    : Endpoint<UpdateExperimentSetupTestingOverridesRequest, ExperimentSessionSnapshot>
{
    private readonly ExperimentSetupTestingOptions _experimentSetupTestingOptions;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public UpdateExperimentSetupTestingOverridesEndpoint(
        ExperimentSetupTestingOptions experimentSetupTestingOptions,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _experimentSetupTestingOptions = experimentSetupTestingOptions;
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Put("/experiment-session/testing-overrides");
        AllowAnonymous();
    }

    public override Task HandleAsync(UpdateExperimentSetupTestingOverridesRequest req, CancellationToken ct)
    {
        _experimentSetupTestingOptions.ForceEyeTrackerReady = req.ForceEyeTrackerReady;
        _experimentSetupTestingOptions.ForceParticipantReady = req.ForceParticipantReady;
        _experimentSetupTestingOptions.ForceCalibrationReady = req.ForceCalibrationReady;
        _experimentSetupTestingOptions.ForceReadingMaterialReady = req.ForceReadingMaterialReady;

        return Send.OkAsync(_experimentSessionQueryService.GetCurrentSnapshot(), ct);
    }
}
