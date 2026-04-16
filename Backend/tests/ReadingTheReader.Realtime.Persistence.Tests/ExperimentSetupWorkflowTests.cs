using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;
using ReadingTheReader.core.Domain;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ExperimentSetupWorkflowTests
{
    [Fact]
    public void GetCurrentSnapshot_WhenSetupIsEmpty_ProjectsEyeTrackerAsFirstBlocker()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.False(snapshot.Setup.IsReadyForSessionStart);
        Assert.Equal(0, snapshot.Setup.CurrentStepIndex);
        Assert.NotNull(snapshot.Setup.CurrentBlocker);
        Assert.Equal("eye-tracker", snapshot.Setup.CurrentBlocker!.StepKey);
        Assert.Equal("Select and license an eye tracker before starting the session.", snapshot.Setup.CurrentBlocker.Reason);
        Assert.False(snapshot.Setup.EyeTracker.IsReady);
        Assert.False(snapshot.Setup.EyeTracker.HasSelectedEyeTracker);
        Assert.False(snapshot.Setup.EyeTracker.HasAppliedLicence);
        Assert.False(snapshot.Setup.EyeTracker.HasSavedLicence);
        Assert.False(snapshot.Setup.Participant.IsReady);
        Assert.False(snapshot.Setup.Calibration.IsReady);
        Assert.Equal("idle", snapshot.Setup.Calibration.Status);
        Assert.Equal("idle", snapshot.Setup.Calibration.ValidationStatus);
        Assert.False(snapshot.Setup.ReadingMaterial.IsReady);
        Assert.False(snapshot.LiveMonitoring.CanStartSession);
        Assert.False(snapshot.LiveMonitoring.CanFinishSession);
        Assert.False(snapshot.LiveMonitoring.HasParticipantViewConnection);
        Assert.False(snapshot.LiveMonitoring.HasParticipantViewportData);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenTrackerSelectionUsesUnsavedLicence_StillReflectsSavedLicenceGap()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        await harness.SessionManager.SetCurrentEyeTrackerAsync(new EyeTrackerDevice
        {
            Name = "Tobii Pro Nano",
            Model = "Nano",
            SerialNumber = "nano-001",
            HasSavedLicence = false
        });

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.True(snapshot.Setup.EyeTracker.IsReady);
        Assert.True(snapshot.Setup.EyeTracker.HasSelectedEyeTracker);
        Assert.True(snapshot.Setup.EyeTracker.HasAppliedLicence);
        Assert.False(snapshot.Setup.EyeTracker.HasSavedLicence);
        Assert.True(snapshot.Setup.EyeTracker.SavedLicenceMissing);
        Assert.Equal("nano-001", snapshot.Setup.EyeTracker.SelectedTrackerSerialNumber);
        Assert.Equal("Participant", snapshot.Setup.CurrentBlocker!.StepLabel);
        Assert.Equal("Save the participant information before starting the session.", snapshot.Setup.CurrentBlocker.Reason);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenTrackerIsProFusion_DoesNotReflectSavedLicenceGap()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        await harness.SessionManager.SetCurrentEyeTrackerAsync(new EyeTrackerDevice
        {
            Name = "Tobii Pro Fusion",
            Model = "Tobii Pro Fusion",
            SerialNumber = "fusion-001",
            HasSavedLicence = false
        });

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.True(snapshot.Setup.EyeTracker.IsReady);
        Assert.True(snapshot.Setup.EyeTracker.HasSelectedEyeTracker);
        Assert.True(snapshot.Setup.EyeTracker.HasAppliedLicence);
        Assert.False(snapshot.Setup.EyeTracker.HasSavedLicence);
        Assert.False(snapshot.Setup.EyeTracker.SavedLicenceMissing);
        Assert.Equal("fusion-001", snapshot.Setup.EyeTracker.SelectedTrackerSerialNumber);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenValidationFails_ProjectsCalibrationQualityAndBlockReason()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        await harness.SessionManager.SetCurrentParticipantAsync(new Participant
        {
            Name = "Participant 1",
            Age = 29,
            Sex = "female",
            ExistingEyeCondition = "none",
            ReadingProficiency = "advanced"
        });
        await harness.SessionManager.SetCurrentEyeTrackerAsync(new EyeTrackerDevice
        {
            Name = "Tobii Pro Nano",
            Model = "Nano",
            SerialNumber = "nano-001",
            HasSavedLicence = true
        });
        await harness.SessionManager.SetReadingSessionAsync(new UpsertReadingSessionCommand(
            "doc-1",
            "Sample document",
            "# Hello reader",
            null,
            ReadingPresentationSnapshot.Default,
            ReaderAppearanceSnapshot.Default));
        await harness.SessionManager.SetCalibrationStateAsync(CreateCalibrationSnapshot(passed: false, quality: "poor"));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.False(snapshot.Setup.IsReadyForSessionStart);
        Assert.Equal(2, snapshot.Setup.CurrentStepIndex);
        Assert.Equal("calibration", snapshot.Setup.CurrentBlocker!.StepKey);
        Assert.Equal("Calibration validation must pass before the session can start.", snapshot.Setup.CurrentBlocker.Reason);
        Assert.True(snapshot.Setup.Calibration.HasCalibrationSession);
        Assert.True(snapshot.Setup.Calibration.IsCalibrationApplied);
        Assert.False(snapshot.Setup.Calibration.IsValidationPassed);
        Assert.Equal("completed", snapshot.Setup.Calibration.Status);
        Assert.Equal("completed", snapshot.Setup.Calibration.ValidationStatus);
        Assert.Equal("poor", snapshot.Setup.Calibration.ValidationQuality);
        Assert.Equal(0.9, snapshot.Setup.Calibration.AverageAccuracyDegrees);
        Assert.Equal(0.45, snapshot.Setup.Calibration.AveragePrecisionDegrees);
        Assert.Equal(9, snapshot.Setup.Calibration.SampleCount);
        Assert.True(snapshot.Setup.ReadingMaterial.IsReady);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenReadingMaterialIsMissing_ProjectsReadingMaterialBlocker()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        await harness.SessionManager.SetCurrentParticipantAsync(new Participant
        {
            Name = "Participant 1",
            Age = 29,
            Sex = "female",
            ExistingEyeCondition = "none",
            ReadingProficiency = "advanced"
        });
        await harness.SessionManager.SetCurrentEyeTrackerAsync(new EyeTrackerDevice
        {
            Name = "Tobii Pro Nano",
            Model = "Nano",
            SerialNumber = "nano-001",
            HasSavedLicence = true
        });
        await harness.SessionManager.SetCalibrationStateAsync(CreateCalibrationSnapshot(passed: true, quality: "good"));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.False(snapshot.Setup.IsReadyForSessionStart);
        Assert.Equal(3, snapshot.Setup.CurrentStepIndex);
        Assert.Equal("reading-material", snapshot.Setup.CurrentBlocker!.StepKey);
        Assert.Equal("Choose the reading material before starting the session.", snapshot.Setup.CurrentBlocker.Reason);
        Assert.True(snapshot.Setup.EyeTracker.IsReady);
        Assert.True(snapshot.Setup.Participant.IsReady);
        Assert.True(snapshot.Setup.Calibration.IsReady);
        Assert.False(snapshot.Setup.ReadingMaterial.IsReady);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenReadingSessionUsesSavedSetup_ProjectsControlledBaselineSemantics()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        await harness.SessionManager.SetReadingSessionAsync(new UpsertReadingSessionCommand(
            "setup-42",
            "Locked saved baseline",
            "# Controlled text",
            "setup-42",
            new ReadingPresentationSnapshot(
                "merriweather",
                20,
                640,
                1.75,
                0.02,
                false),
            ReaderAppearanceSnapshot.Default));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.True(snapshot.Setup.ReadingMaterial.IsReady);
        Assert.Equal("setup-42", snapshot.Setup.ReadingMaterial.DocumentId);
        Assert.Equal("Locked saved baseline", snapshot.Setup.ReadingMaterial.Title);
        Assert.Equal("setup-42", snapshot.Setup.ReadingMaterial.SourceSetupId);
        Assert.True(snapshot.Setup.ReadingMaterial.UsesSavedSetup);
        Assert.NotNull(snapshot.Setup.ReadingMaterial.ConfiguredAtUnixMs);
        Assert.False(snapshot.Setup.ReadingMaterial.AllowsResearcherPresentationChanges);
        Assert.True(snapshot.Setup.ReadingMaterial.IsPresentationLocked);
        Assert.True(snapshot.ReadingSession!.Content!.UsesSavedSetup);
        Assert.True(snapshot.ReadingSession.Presentation.IsPresentationLocked);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenSetupIsReady_ProjectsReadyWorkflowForSessionStart()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.True(snapshot.Setup.IsReadyForSessionStart);
        Assert.Null(snapshot.Setup.CurrentBlocker);
        Assert.True(snapshot.Setup.EyeTracker.IsReady);
        Assert.True(snapshot.Setup.Participant.IsReady);
        Assert.True(snapshot.Setup.Calibration.IsReady);
        Assert.True(snapshot.Setup.Calibration.IsValidationPassed);
        Assert.Equal("good", snapshot.Setup.Calibration.ValidationQuality);
        Assert.True(snapshot.Setup.ReadingMaterial.IsReady);
        Assert.Equal("Sample document", snapshot.Setup.ReadingMaterial.Title);
        Assert.False(snapshot.Setup.ReadingMaterial.UsesSavedSetup);
        Assert.True(snapshot.Setup.ReadingMaterial.AllowsResearcherPresentationChanges);
        Assert.False(snapshot.Setup.ReadingMaterial.IsPresentationLocked);
        Assert.True(snapshot.LiveMonitoring.CanStartSession);
        Assert.False(snapshot.LiveMonitoring.CanFinishSession);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenMouseModeIsActive_SkipsEyeTrackerAndCalibrationReadiness()
    {
        var sensingMode = new RealtimeTestDoubles.InMemorySensingModeSettingsService();
        await sensingMode.UpdateModeAsync(SensingModes.Mouse);
        var harness = RealtimeTestDoubles.CreateHarness(sensingModeSettingsService: sensingMode);

        var emptySnapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.Equal(SensingModes.Mouse, emptySnapshot.SensingMode);
        Assert.True(emptySnapshot.Setup.EyeTracker.IsReady);
        Assert.False(emptySnapshot.Setup.EyeTracker.HasSelectedEyeTracker);
        Assert.True(emptySnapshot.Setup.Calibration.IsReady);
        Assert.Equal("skipped", emptySnapshot.Setup.Calibration.Status);
        Assert.Equal("skipped", emptySnapshot.Setup.Calibration.ValidationStatus);
        Assert.Equal(1, emptySnapshot.Setup.CurrentStepIndex);
        Assert.Equal("participant", emptySnapshot.Setup.CurrentBlocker!.StepKey);

        await harness.SessionManager.SetCurrentParticipantAsync(new Participant
        {
            Name = "Participant 1",
            Age = 29,
            Sex = "female",
            ExistingEyeCondition = "none",
            ReadingProficiency = "advanced"
        });
        await harness.SessionManager.SetReadingSessionAsync(new UpsertReadingSessionCommand(
            "doc-1",
            "Sample document",
            "# Hello reader",
            null,
            ReadingPresentationSnapshot.Default,
            ReaderAppearanceSnapshot.Default));

        var readySnapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.True(readySnapshot.Setup.IsReadyForSessionStart);
        Assert.Null(readySnapshot.EyeTrackerDevice);
        Assert.Null(readySnapshot.Setup.CurrentBlocker);
    }

    [Fact]
    public async Task StartSessionAsync_WhenValidationIsPoor_KeepsCalibrationAsTheAuthoritativeBlocker()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        await harness.SessionManager.SetCurrentParticipantAsync(new Participant
        {
            Name = "Participant 1",
            Age = 29,
            Sex = "female",
            ExistingEyeCondition = "none",
            ReadingProficiency = "advanced"
        });
        await harness.SessionManager.SetCurrentEyeTrackerAsync(new EyeTrackerDevice
        {
            Name = "Tobii Pro Nano",
            Model = "Nano",
            SerialNumber = "nano-001",
            HasSavedLicence = true
        });
        await harness.SessionManager.SetReadingSessionAsync(new UpsertReadingSessionCommand(
            "doc-1",
            "Sample document",
            "# Hello reader",
            null,
            ReadingPresentationSnapshot.Default,
            ReaderAppearanceSnapshot.Default));
        await harness.SessionManager.SetCalibrationStateAsync(CreateCalibrationSnapshot(passed: false, quality: "poor"));

        var error = await Assert.ThrowsAsync<InvalidOperationException>(() => harness.SessionManager.StartSessionAsync());

        Assert.Equal("Calibration validation must pass before the session can start.", error.Message);

        var snapshot = harness.SessionManager.GetCurrentSnapshot();
        Assert.False(snapshot.IsActive);
        Assert.False(snapshot.Setup.IsReadyForSessionStart);
        Assert.NotNull(snapshot.Setup.CurrentBlocker);
        Assert.Equal("calibration", snapshot.Setup.CurrentBlocker!.StepKey);
        Assert.Equal(error.Message, snapshot.Setup.CurrentBlocker.Reason);
        Assert.True(snapshot.Setup.EyeTracker.IsReady);
        Assert.True(snapshot.Setup.Participant.IsReady);
        Assert.False(snapshot.Setup.Calibration.IsReady);
        Assert.True(snapshot.Setup.ReadingMaterial.IsReady);
    }

    [Fact]
    public void GetCurrentSnapshot_WhenEyeTrackerOverrideIsForcedTrue_ProjectsStepAsReady()
    {
        var harness = RealtimeTestDoubles.CreateHarness(
            experimentSetupTestingOptions: new ExperimentSetupTestingOptions
            {
                ForceEyeTrackerReady = true
            });

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.True(snapshot.Setup.EyeTracker.IsReady);
        Assert.Equal(1, snapshot.Setup.CurrentStepIndex);
        Assert.NotNull(snapshot.Setup.CurrentBlocker);
        Assert.Equal("participant", snapshot.Setup.CurrentBlocker!.StepKey);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenParticipantOverrideIsForcedFalse_KeepsParticipantAsTheAuthoritativeBlocker()
    {
        var harness = RealtimeTestDoubles.CreateHarness(
            experimentSetupTestingOptions: new ExperimentSetupTestingOptions
            {
                ForceParticipantReady = false
            });
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.False(snapshot.Setup.IsReadyForSessionStart);
        Assert.False(snapshot.Setup.Participant.IsReady);
        Assert.Equal(1, snapshot.Setup.CurrentStepIndex);
        Assert.NotNull(snapshot.Setup.CurrentBlocker);
        Assert.Equal("participant", snapshot.Setup.CurrentBlocker!.StepKey);
        Assert.Equal("Save the participant information before starting the session.", snapshot.Setup.CurrentBlocker.Reason);
    }

    private static CalibrationSessionSnapshot CreateCalibrationSnapshot(bool passed, string quality)
    {
        return new CalibrationSessionSnapshot(
            Guid.NewGuid(),
            "completed",
            CalibrationPatterns.ScreenBasedNinePoint,
            1_710_000_000_000,
            1_710_000_001_000,
            1_710_000_002_000,
            [],
            new CalibrationRunResult(
                "applied",
                true,
                9,
                [],
                new CalibrationValidationResult(
                    passed,
                    quality,
                    passed ? 0.5 : 0.9,
                    passed ? 0.2 : 0.45,
                    9,
                    [],
                    []),
                []),
            new CalibrationValidationSnapshot(
                "completed",
                1_710_000_001_000,
                1_710_000_001_500,
                1_710_000_002_000,
                [],
                new CalibrationValidationResult(
                    passed,
                    quality,
                    passed ? 0.5 : 0.9,
                    passed ? 0.2 : 0.45,
                    9,
                    [],
                    []),
                []),
            []);
    }
}
