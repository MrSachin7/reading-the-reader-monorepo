using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ExperimentReplayExportSerializerTests
{
    [Fact]
    public void ReplayExport_RoundTripsJson()
    {
        var serializer = new ExperimentReplayExportSerializer();
        var export = ExperimentReplayExportTestFactory.CreateReplayExport();

        var json = serializer.Serialize(export, ExperimentReplayExportFormats.Json);
        var roundTripped = serializer.Deserialize(json, ExperimentReplayExportFormats.Json);

        Assert.Equal(
            serializer.Serialize(export, ExperimentReplayExportFormats.Json),
            serializer.Serialize(roundTripped, ExperimentReplayExportFormats.Json));
    }

    [Fact]
    public void ReplayExport_PreservesModuleProvenanceAndEnrichedGaze()
    {
        var serializer = new ExperimentReplayExportSerializer();
        var export = ExperimentReplayExportTestFactory.CreateReplayExport();

        var json = serializer.Serialize(export, ExperimentReplayExportFormats.Json);
        var roundTripped = serializer.Deserialize(json, ExperimentReplayExportFormats.Json);

        var intervention = Assert.Single(roundTripped.Interventions.InterventionEvents);
        Assert.Equal(ReadingInterventionModuleIds.FontSize, intervention.Intervention.ModuleId);
        Assert.Equal("20", Assert.Contains("fontSizePx", intervention.Intervention.Parameters!));

        var proposal = Assert.Single(roundTripped.Interventions.DecisionProposals);
        Assert.Equal(ReadingInterventionModuleIds.FontSize, proposal.Proposal.ProposedIntervention.ModuleId);
        Assert.Equal("20", Assert.Contains("fontSizePx", proposal.Proposal.ProposedIntervention.Parameters!));
        var gaze = Assert.Single(roundTripped.Sensing.GazeSamples);
        Assert.Equal(321, gaze.SystemTimeStampUs);
        Assert.Equal(3.2f, gaze.Left!.Pupil!.DiameterMm);
        Assert.Equal("Valid", gaze.Right!.GazePoint2D.Validity);
        Assert.NotNull(roundTripped.Experiment.Screen);
        Assert.Equal(1920, roundTripped.Experiment.Screen!.PhysicalScreenWidthPx);
        Assert.Equal(1080, roundTripped.Experiment.Screen.PhysicalScreenHeightPx);
        Assert.Equal(1.25, roundTripped.Experiment.Screen.DevicePixelRatio);
    }

    [Fact]
    public void ReplayExport_PreservesFixationSaccadeAndRegressionEvents()
    {
        var serializer = new ExperimentReplayExportSerializer();
        var export = ExperimentReplayExportTestFactory.CreateReplayExport();

        var json = serializer.Serialize(export, ExperimentReplayExportFormats.Json);
        var roundTripped = serializer.Deserialize(json, ExperimentReplayExportFormats.Json);

        var fixation = Assert.Single(roundTripped.Derived.FixationEvents!);
        Assert.Equal("token-1", fixation.Fixation.TokenId);
        Assert.Equal(340, fixation.Fixation.DurationMs);

        Assert.Equal(2, roundTripped.Derived.SaccadeEvents!.Count);
        var regression = Assert.Single(roundTripped.Derived.SaccadeEvents!.Where(item => item.Saccade.IsRegression));
        Assert.Equal(SaccadeDirections.Backward, regression.Saccade.Direction);
        Assert.Equal("token-0", regression.Saccade.ToTokenId);
        Assert.Equal(1, roundTripped.Derived.RegressionCount);
    }

    [Fact]
    public void ReplayExport_CsvIncludesFixationSaccadeAndRegressionRows()
    {
        var serializer = new ExperimentReplayExportSerializer();
        var export = ExperimentReplayExportTestFactory.CreateReplayExport();

        var csv = serializer.Serialize(export, ExperimentReplayExportFormats.Csv);
        var rows = csv.Split('\n').Select(line => line.TrimEnd('\r')).ToArray();

        Assert.Single(rows.Where(row => row.StartsWith("fixation,", StringComparison.Ordinal)));
        Assert.Equal(2, rows.Count(row => row.StartsWith("saccade,", StringComparison.Ordinal)));
        var regressionRow = Assert.Single(rows.Where(row => row.StartsWith("regression,", StringComparison.Ordinal)));
        Assert.Contains(SaccadeDirections.Backward, regressionRow);

        var roundTripped = serializer.Deserialize(csv, ExperimentReplayExportFormats.Csv);
        Assert.Equal(2, roundTripped.Derived.SaccadeEvents!.Count);
        Assert.Equal(1, roundTripped.Derived.RegressionCount);
    }
}
