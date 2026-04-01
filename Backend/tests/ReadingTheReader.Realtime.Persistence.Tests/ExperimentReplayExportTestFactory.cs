using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;

namespace ReadingTheReader.Realtime.Persistence.Tests;

internal static class ExperimentReplayExportTestFactory
{
    public static ExperimentReplayExport CreateReplayExport()
    {
        var sessionId = Guid.Parse("9d0f4abc-6b53-4e54-a8fa-8f57c1a8cd11");
        var presentation = new ReadingPresentationSnapshot("merriweather", 18, 680, 1.8, 0, true);
        var appearance = new ReaderAppearanceSnapshot("dark", "sepia", "inter");
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

        return new ExperimentReplayExport(
            new ExperimentReplayExportManifest(
                ExperimentReplayExportSchema.Name,
                ExperimentReplayExportSchema.Version,
                1_710_000_010_000,
                "participant-view",
                "core",
                new ExperimentReplayExportProducer(
                    "reading-the-reader",
                    "Tobii.Research.x64",
                    "1.11.0.1334",
                    "2"),
                "Sample export"),
            new ExperimentReplayContext(
                sessionId,
                1_710_000_000_000,
                1_710_000_010_000,
                10_000,
                new DecisionConfigurationSnapshot(
                    "Rule-based advisory",
                    DecisionProviderIds.RuleBased,
                    DecisionExecutionModes.Advisory),
                new ExperimentReplayParticipant("Participant 1", 29, "female", "none", "advanced"),
                new ExperimentReplayDevice("Tobii Pro Nano", "Nano", "nano-001", true),
                new ExperimentReplayCalibrationSummary(
                    CalibrationPatterns.ScreenBasedNinePoint,
                    true,
                    true,
                    "good",
                    0.5,
                    0.2,
                    9),
                [new ExperimentLifecycleEventRecord(1, "session-started", "system", 1_710_000_000_000, 0)]),
            new ExperimentReplayContent(
                "doc-1",
                "Sample",
                "# Hello",
                null,
                1_710_000_001_000,
                "hash-1",
                new ExperimentReplayContentTokenization("minimal-markdown", "v1")),
            new ExperimentReplaySensing(
                [
                    new RawGazeSampleRecord(
                        2,
                        1_710_000_000_100,
                        100,
                        123,
                        321,
                        new ReplayEyeSample(
                            new ReplayEyePoint2D(10, 20, "Valid"),
                            new ReplayEyePoint3D(1, 2, 3),
                            new ReplayEyePupil(3.2f, "Valid"),
                            new ReplayEyeOrigin3D(4, 5, 6, "Valid"),
                            new ReplayEyeTrackBoxPoint(0.1f, 0.2f, 0.3f)),
                        new ReplayEyeSample(
                            new ReplayEyePoint2D(30, 40, "Valid"),
                            new ReplayEyePoint3D(7, 8, 9),
                            new ReplayEyePupil(3.1f, "Valid"),
                            new ReplayEyeOrigin3D(10, 11, 12, "Valid"),
                            new ReplayEyeTrackBoxPoint(0.4f, 0.5f, 0.6f)))
                ]),
            new ExperimentReplayDerived(
                [new ParticipantViewportEventRecord(3, 1_710_000_001_500, 1500, viewport)],
                [new ReadingFocusEventRecord(4, 1_710_000_001_600, 1600, focus)],
                [new ReadingAttentionEventRecord(5, 1_710_000_001_900, 1900, attentionSummary)]),
            new ExperimentReplayInterventions(
                [new DecisionProposalEventRecord(6, 1_710_000_002_000, 2000, proposal)],
                [new InterventionEventRecord(7, 1_710_000_002_000, 2000, intervention)]),
            new ExperimentReplayData(
                new ExperimentReplayBaseline(
                    presentation,
                    appearance)),
            []);
    }
}
