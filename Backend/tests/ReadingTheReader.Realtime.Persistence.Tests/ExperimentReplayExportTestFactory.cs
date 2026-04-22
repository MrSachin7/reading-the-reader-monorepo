using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;

namespace ReadingTheReader.Realtime.Persistence.Tests;

internal static class ExperimentReplayExportTestFactory
{
    public static ExperimentReplayExport CreateReplayExport()
    {
        var sessionId = Guid.Parse("9d0f4abc-6b53-4e54-a8fa-8f57c1a8cd11");
        var presentation = new ReadingPresentationSnapshot("merriweather", 18, 680, 1.8, 0, true);
        var appearance = new ReaderAppearanceSnapshot("dark", "sepia", "inter");
        var screen = new ParticipantScreenSnapshot(1536, 864, 1536, 824, 1920, 1080, 1.25);
        var viewport = new ParticipantViewportSnapshot(true, 0.35, 420, 1280, 720, 2400, 900, 1_710_000_001_500, Screen: screen);
        var focus = new ReadingFocusSnapshot(true, 0.5, 0.4, "token-1", "block-1", "sentence-1", 1_710_000_001_600);
        var attentionSummary = new ReadingAttentionEventSummary(
            1_710_000_001_900,
            "token-1",
            340,
            1,
            1);
        var contextPreservation = new ReadingContextPreservationEventSnapshot(
            "preserved",
            "sentence-anchor",
            "sentence-1",
            "token-1",
            "block-1",
            6,
            2,
            ReadingInterventionCommitBoundaries.ParagraphEnd,
            300,
            1_710_000_002_000,
            1_710_000_002_100,
            null);
        var scheduledIntervention = new PendingInterventionSnapshot(
            Guid.Parse("f8edb76d-cb94-4d25-88b2-7b36a70d8b66"),
            PendingInterventionStatuses.Applied,
            ReadingInterventionCommitBoundaries.ParagraphEnd,
            ReadingInterventionCommitBoundaries.SentenceEnd,
            6_000,
            1_710_000_001_700,
            1_710_000_002_000,
            null,
            300,
            true,
            "boundary-met",
            new ApplyInterventionCommand(
                "manual",
                "researcher-ui",
                "Adjusted font size",
                new ReadingPresentationPatch(null, 20, null, null, null, null),
                new ReaderAppearancePatch(null, null, null),
                ReadingInterventionModuleIds.FontSize,
                new Dictionary<string, string?>
                {
                    ["fontSizePx"] = "20"
                }));
        var intervention = new InterventionEventSnapshot(
            Guid.Parse("f2220a31-1d74-48db-99fe-9e1a30f446f2"),
            "manual",
            "researcher-ui",
            "Adjusted font size",
            1_710_000_002_000,
            ReadingInterventionCommitBoundaries.ParagraphEnd,
            300,
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
                    ExperimentReplayExportSchema.Version.ToString()),
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
                ExperimentReplayScreen.FromSnapshot(screen),
                new ExperimentReplayCalibrationSummary(
                    CalibrationPatterns.ScreenBasedNinePoint,
                    true,
                    true,
                    "good",
                    0.5,
                    0.2,
                    9),
                [new ExperimentLifecycleEventRecord(1, "session-started", "system", 1_710_000_000_000)]),
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
                [new ParticipantViewportEventRecord(3, 1_710_000_001_500, viewport)],
                [new ReadingFocusEventRecord(4, 1_710_000_001_600, focus)],
                [new ReadingAttentionEventRecord(5, 1_710_000_001_900, attentionSummary)],
                [new ReadingContextPreservationEventRecord(6, 1_710_000_002_100, contextPreservation)]),
            new ExperimentReplayInterventions(
                [new DecisionProposalEventRecord(7, 1_710_000_002_000, proposal)],
                [new ScheduledInterventionEventRecord(8, 1_710_000_001_700, scheduledIntervention)],
                [new InterventionEventRecord(9, 1_710_000_002_000, intervention)]),
            new ExperimentReplayData(
                new ExperimentReplayBaseline(
                    presentation,
                    appearance)),
            []);
    }
}
