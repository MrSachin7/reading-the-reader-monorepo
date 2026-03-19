using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Domain;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class FileExperimentReplayExportStoreAdapterTests : IDisposable
{
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), $"replay-export-store-{Guid.NewGuid():N}");
    private readonly FileExperimentReplayExportStoreAdapter _sut;
    private readonly ExperimentReplayExportSerializer _serializer = new();

    public FileExperimentReplayExportStoreAdapterTests()
    {
        _sut = new FileExperimentReplayExportStoreAdapter(
            Path.Combine(_tempDirectory, "latest.json"),
            Path.Combine(_tempDirectory, "saved"),
            _serializer);
    }

    [Fact]
    public async Task SaveNamedAsync_CanPersistAndLoadCsvExport()
    {
        var export = CreateReplayExport();

        var saved = await _sut.SaveNamedAsync("CSV Export", ExperimentReplayExportFormats.Csv, export);
        var listed = await _sut.ListSavedAsync();
        var loaded = await _sut.LoadSavedByIdAsync(saved.Id);

        Assert.Equal(ExperimentReplayExportFormats.Csv, saved.Format);
        Assert.EndsWith(".csv", saved.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(listed, item => item.Id == saved.Id && item.Format == ExperimentReplayExportFormats.Csv);
        Assert.NotNull(loaded);
        Assert.Equal(
            _serializer.Serialize(export, ExperimentReplayExportFormats.Json),
            _serializer.Serialize(loaded!, ExperimentReplayExportFormats.Json));
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }

    private static ExperimentReplayExport CreateReplayExport()
    {
        var sessionId = Guid.Parse("b6f52b68-fd24-4255-9e2e-87c1d8b22527");
        var gaze = new GazeData
        {
            DeviceTimeStamp = 456,
            LeftEyeX = 11,
            LeftEyeY = 21,
            LeftEyeValidity = "Valid",
            RightEyeX = 31,
            RightEyeY = 41,
            RightEyeValidity = "Valid"
        };
        var presentation = new ReadingPresentationSnapshot("merriweather", 18, 680, 1.8, 0, true);
        var appearance = new ReaderAppearanceSnapshot("light", "high-contrast", "space-grotesk");
        var content = new ReadingContentSnapshot("doc-2", "CSV Sample", "## Title", null, 1_710_001_001_000);
        var viewport = new ParticipantViewportSnapshot(true, 0.2, 260, 1440, 900, 2600, 980, 1_710_001_001_500);
        var focus = new ReadingFocusSnapshot(true, 0.25, 0.75, "token-2", "block-2", 1_710_001_001_600);
        var readingSession = new LiveReadingSessionSnapshot(
            content,
            presentation,
            appearance,
            viewport,
            focus,
            null,
            []);
        var initialSnapshot = new ExperimentSessionSnapshot(
            sessionId,
            true,
            1_710_001_000_000,
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
            StoppedAtUnixMs = 1_710_001_004_000,
            ReceivedGazeSamples = 1,
            LatestGazeSample = gaze
        };

        return new ExperimentReplayExport(
            new ExperimentReplayMetadata(
                "reading-the-reader.experiment-replay",
                1,
                1_710_001_004_000,
                sessionId,
                "participant-view",
                1_710_001_000_000,
                1_710_001_004_000,
                4_000,
                "CSV Export"),
            new ExperimentReplayStatistics(1, 1, 1, 1, 1, 0),
            initialSnapshot,
            finalSnapshot,
            [new ExperimentLifecycleEventRecord(1, "session-started", "system", 1_710_001_000_000, 0)],
            [new GazeSampleRecord(2, 1_710_001_000_100, 100, gaze)],
            [new ReadingSessionStateRecord(3, "reading-session-configured", 1_710_001_000_400, 400, readingSession)],
            [new ParticipantViewportEventRecord(4, 1_710_001_001_500, 1500, viewport)],
            [new ReadingFocusEventRecord(5, 1_710_001_001_600, 1600, focus)],
            []);
    }
}
