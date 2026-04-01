using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
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
    }
}
