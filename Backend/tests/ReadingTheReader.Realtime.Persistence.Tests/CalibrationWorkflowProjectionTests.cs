using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class CalibrationWorkflowProjectionTests
{
    [Fact]
    public async Task GetCurrentSnapshot_WhenValidationPasses_ProjectsCalibrationQualitySummary()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.True(snapshot.Setup.Calibration.IsReady);
        Assert.True(snapshot.Setup.Calibration.HasCalibrationSession);
        Assert.True(snapshot.Setup.Calibration.IsCalibrationApplied);
        Assert.True(snapshot.Setup.Calibration.IsValidationPassed);
        Assert.Equal("completed", snapshot.Setup.Calibration.Status);
        Assert.Equal("completed", snapshot.Setup.Calibration.ValidationStatus);
        Assert.Equal("good", snapshot.Setup.Calibration.ValidationQuality);
        Assert.Equal(0.5, snapshot.Setup.Calibration.AverageAccuracyDegrees);
        Assert.Equal(0.2, snapshot.Setup.Calibration.AveragePrecisionDegrees);
        Assert.Equal(9, snapshot.Setup.Calibration.SampleCount);
        Assert.Null(snapshot.Setup.Calibration.BlockReason);
    }

    [Fact]
    public async Task GetCurrentSnapshot_WhenValidationFails_ProjectsCalibrationBlockReasonAndPoorQuality()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        await harness.SessionManager.SetCalibrationStateAsync(new CalibrationSessionSnapshot(
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
                    false,
                    "poor",
                    0.9,
                    0.45,
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
                    false,
                    "poor",
                    0.9,
                    0.45,
                    9,
                    [],
                    []),
                []),
            []));

        var snapshot = harness.SessionManager.GetCurrentSnapshot();

        Assert.False(snapshot.Setup.Calibration.IsReady);
        Assert.True(snapshot.Setup.Calibration.HasCalibrationSession);
        Assert.True(snapshot.Setup.Calibration.IsCalibrationApplied);
        Assert.False(snapshot.Setup.Calibration.IsValidationPassed);
        Assert.Equal("completed", snapshot.Setup.Calibration.Status);
        Assert.Equal("completed", snapshot.Setup.Calibration.ValidationStatus);
        Assert.Equal("poor", snapshot.Setup.Calibration.ValidationQuality);
        Assert.Equal(0.9, snapshot.Setup.Calibration.AverageAccuracyDegrees);
        Assert.Equal(0.45, snapshot.Setup.Calibration.AveragePrecisionDegrees);
        Assert.Equal(9, snapshot.Setup.Calibration.SampleCount);
        Assert.Equal(
            "Calibration validation must pass before the session can start.",
            snapshot.Setup.Calibration.BlockReason);
    }
}
