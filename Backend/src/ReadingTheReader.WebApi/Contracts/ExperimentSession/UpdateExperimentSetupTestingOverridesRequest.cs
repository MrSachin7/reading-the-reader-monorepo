namespace ReadingTheReader.WebApi.Contracts.ExperimentSession;

public sealed class UpdateExperimentSetupTestingOverridesRequest
{
    public bool? ForceEyeTrackerReady { get; set; }

    public bool? ForceParticipantReady { get; set; }

    public bool? ForceCalibrationReady { get; set; }

    public bool? ForceReadingMaterialReady { get; set; }
}
