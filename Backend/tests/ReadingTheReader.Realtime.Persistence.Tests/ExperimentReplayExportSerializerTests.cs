using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Domain;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ExperimentReplayExportSerializerTests
{
    [Fact]
    public void DecisionProposalEvents_RoundTripReplayExport()
    {
        var serializer = new ExperimentReplayExportSerializer();
        var export = CreateReplayExport();

        var csv = serializer.Serialize(export, ExperimentReplayExportFormats.Csv);
        var roundTripped = serializer.Deserialize(csv, ExperimentReplayExportFormats.Csv);

        Assert.Equal(
            serializer.Serialize(export, ExperimentReplayExportFormats.Json),
            serializer.Serialize(roundTripped, ExperimentReplayExportFormats.Json));
    }

    [Fact]
    public void ModuleProvenance_RoundTrips()
    {
        var serializer = new ExperimentReplayExportSerializer();
        var export = CreateReplayExport();

        var json = serializer.Serialize(export, ExperimentReplayExportFormats.Json);
        var roundTripped = serializer.Deserialize(json, ExperimentReplayExportFormats.Json);

        var intervention = Assert.Single(roundTripped.InterventionEvents);
        Assert.Equal(ReadingInterventionModuleIds.FontSize, intervention.Intervention.ModuleId);
        Assert.Equal("20", Assert.Contains("fontSizePx", intervention.Intervention.Parameters!));

        var proposal = Assert.Single(roundTripped.DecisionProposalEvents);
        Assert.Equal(ReadingInterventionModuleIds.FontSize, proposal.Proposal.ProposedIntervention.ModuleId);
        Assert.Equal("20", Assert.Contains("fontSizePx", proposal.Proposal.ProposedIntervention.Parameters!));
    }

    private static ExperimentReplayExport CreateReplayExport()
    {
        var sessionId = Guid.Parse("9d0f4abc-6b53-4e54-a8fa-8f57c1a8cd11");
        var gaze = new GazeData
        {
            DeviceTimeStamp = 123,
            LeftEyeX = 10,
            LeftEyeY = 20,
            LeftEyeValidity = "Valid",
            RightEyeX = 30,
            RightEyeY = 40,
            RightEyeValidity = "Valid"
        };
        var presentation = new ReadingPresentationSnapshot("merriweather", 18, 680, 1.8, 0, true);
        var appearance = new ReaderAppearanceSnapshot("dark", "sepia", "inter");
        var content = new ReadingContentSnapshot("doc-1", "Sample", "# Hello", null, 1_710_000_001_000);
        var viewport = new ParticipantViewportSnapshot(true, 0.35, 420, 1280, 720, 2400, 900, 1_710_000_001_500);
        var focus = new ReadingFocusSnapshot(true, 0.5, 0.4, "token-1", "block-1", 1_710_000_001_600);
        var attentionSummary = new ReadingAttentionSummarySnapshot(
            1_710_000_001_900,
            new Dictionary<string, ReadingAttentionTokenSnapshot>
            {
                ["token-1"] = new(340, 1, 0, 340, 340),
                ["token-2"] = new(0, 0, 1, 0, 0)
            },
            "token-1",
            340,
            1,
            1);
        var intervention = new InterventionEventSnapshot(
            Guid.Parse("f2220a31-1d74-48db-99fe-9e1a30f446f2"),
            "manual",
            "researcher-ui",
            "Adjusted font size",
            1_710_000_002_000,
            presentation,
            appearance,
            ReadingInterventionModuleIds.FontSize,
            new Dictionary<string, string?>
            {
                ["fontSizePx"] = "20"
            });
        var readingSession = new LiveReadingSessionSnapshot(
            content,
            presentation,
            appearance,
            viewport,
            focus,
            intervention,
            [intervention],
            attentionSummary);
        var decisionConfiguration = new DecisionConfigurationSnapshot(
            "Rule-based advisory",
            DecisionProviderIds.RuleBased,
            DecisionExecutionModes.Advisory);
        var proposal = new DecisionProposalSnapshot(
            Guid.Parse("edb79e0c-7766-426d-a5a0-6d8decc68d3f"),
            "Rule-based advisory",
            DecisionProviderIds.RuleBased,
            DecisionExecutionModes.Advisory,
            DecisionProposalStatus.Approved,
            new DecisionSignalSnapshot("attention-summary", "Token dwell time reached 340 ms.", 1_710_000_001_900, 0.66),
            "Increase font size to reduce local reading strain.",
            1_710_000_001_900,
            1_710_000_002_000,
            "researcher",
            intervention.Id,
            new ApplyInterventionCommand(
                DecisionProviderIds.RuleBased,
                "attention-summary",
                "Increase font size to reduce local reading strain.",
                new ReadingPresentationPatch(null, 20, null, null, null, null),
                new ReaderAppearancePatch(null, null, null),
                ReadingInterventionModuleIds.FontSize,
                new Dictionary<string, string?>
                {
                    ["fontSizePx"] = "20"
                }));
        var initialSnapshot = new ExperimentSessionSnapshot(
            sessionId,
            true,
            1_710_000_000_000,
            null,
            null,
            null,
            CalibrationSessionSnapshots.CreateIdle(),
            new ExperimentSetupSnapshot(true, true, true, true, 3),
            0,
            null,
            1,
            readingSession,
            decisionConfiguration,
            new DecisionRuntimeStateSnapshot(false, null, [proposal]));
        var finalSnapshot = initialSnapshot with
        {
            IsActive = false,
            StoppedAtUnixMs = 1_710_000_010_000,
            ReceivedGazeSamples = 1,
            LatestGazeSample = gaze
        };

        return new ExperimentReplayExport(
            new ExperimentReplayMetadata(
                "reading-the-reader.experiment-replay",
                1,
                1_710_000_010_000,
                sessionId,
                "participant-view",
                1_710_000_000_000,
                1_710_000_010_000,
                10_000,
                "Sample export"),
            new ExperimentReplayStatistics(2, 1, 1, 1, 1, 1, 1),
            initialSnapshot,
            finalSnapshot,
            [new ExperimentLifecycleEventRecord(1, "session-started", "system", 1_710_000_000_000, 0)],
            [new GazeSampleRecord(2, 1_710_000_000_100, 100, gaze)],
            [new ReadingSessionStateRecord(3, "reading-session-configured", 1_710_000_000_500, 500, readingSession)],
            [new ParticipantViewportEventRecord(4, 1_710_000_001_500, 1500, viewport)],
            [new ReadingFocusEventRecord(5, 1_710_000_001_600, 1600, focus)],
            [new DecisionProposalEventRecord(6, 1_710_000_002_000, 2000, proposal)],
            [new InterventionEventRecord(7, 1_710_000_002_000, 2000, intervention)]);
    }
}
