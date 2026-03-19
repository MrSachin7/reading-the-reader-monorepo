using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Domain;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ExperimentReplayExportSerializerTests
{
    [Fact]
    public void SerializeCsv_AndDeserialize_RoundTripsReplayExport()
    {
        var serializer = new ExperimentReplayExportSerializer();
        var export = CreateReplayExport();

        var csv = serializer.Serialize(export, ExperimentReplayExportFormats.Csv);
        var roundTripped = serializer.Deserialize(csv, ExperimentReplayExportFormats.Csv);

        Assert.Equal(
            serializer.Serialize(export, ExperimentReplayExportFormats.Json),
            serializer.Serialize(roundTripped, ExperimentReplayExportFormats.Json));
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
        var content = new ReadingContentSnapshot("doc-1", "Sample", "# Hello", null, 1_710_000_001_000);
        var viewport = new ParticipantViewportSnapshot(true, 0.35, 1280, 720, 2400, 900, 1_710_000_001_500);
        var focus = new ReadingFocusSnapshot(true, 0.5, 0.4, "token-1", "block-1", 1_710_000_001_600);
        var intervention = new InterventionEventSnapshot(
            Guid.Parse("f2220a31-1d74-48db-99fe-9e1a30f446f2"),
            "manual",
            "researcher-ui",
            "Adjusted font size",
            1_710_000_002_000,
            presentation);
        var readingSession = new LiveReadingSessionSnapshot(
            content,
            presentation,
            viewport,
            focus,
            intervention,
            [intervention]);
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
            readingSession);
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
            new ExperimentReplayStatistics(2, 1, 1, 1, 1, 1),
            initialSnapshot,
            finalSnapshot,
            [new ExperimentLifecycleEventRecord(1, "session-started", "system", 1_710_000_000_000, 0)],
            [new GazeSampleRecord(2, 1_710_000_000_100, 100, gaze)],
            [new ReadingSessionStateRecord(3, "reading-session-configured", 1_710_000_000_500, 500, readingSession)],
            [new ParticipantViewportEventRecord(4, 1_710_000_001_500, 1500, viewport)],
            [new ReadingFocusEventRecord(5, 1_710_000_001_600, 1600, focus)],
            [new InterventionEventRecord(6, 1_710_000_002_000, 2000, intervention)]);
    }
}
