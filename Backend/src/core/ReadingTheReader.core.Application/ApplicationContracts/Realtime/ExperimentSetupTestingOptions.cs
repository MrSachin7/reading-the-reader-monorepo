namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class ExperimentSetupTestingOptions
{
    public const string SectionName = "ExperimentSetupTesting";

    public bool? ForceEyeTrackerReady { get; set; }

    public bool? ForceParticipantReady { get; set; }

    public bool? ForceCalibrationReady { get; set; }

    public bool? ForceReadingMaterialReady { get; set; }
}
