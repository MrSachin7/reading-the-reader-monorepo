using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class FileSnapshotExperimentStateStoreAdapterTests : IDisposable
{
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), $"active-replay-store-{Guid.NewGuid():N}");
    private readonly FileSnapshotExperimentStateStoreAdapter _sut;
    private readonly ExperimentReplayExportSerializer _serializer = new();

    public FileSnapshotExperimentStateStoreAdapterTests()
    {
        _sut = new FileSnapshotExperimentStateStoreAdapter(_tempDirectory);
    }

    [Fact]
    public async Task SaveActiveReplayAsync_CreatesPerSessionFolderAndLoadsReplay()
    {
        var exportDocument = ExperimentReplayExportTestFactory.CreateReplayExport();

        await _sut.SaveActiveReplayAsync(exportDocument);
        var loaded = await _sut.LoadActiveReplayAsync();

        var expectedPath = Path.Combine(
            _tempDirectory,
            exportDocument.Experiment.SessionId!.Value.ToString("N"),
            "experiment-session-live.json");

        Assert.True(File.Exists(expectedPath));
        Assert.NotNull(loaded);
        Assert.Equal(
            _serializer.Serialize(exportDocument, ExperimentReplayExportFormats.Json),
            _serializer.Serialize(loaded!, ExperimentReplayExportFormats.Json));
    }

    [Fact]
    public async Task ClearActiveReplayAsync_RemovesLatestLiveFile()
    {
        var exportDocument = ExperimentReplayExportTestFactory.CreateReplayExport();

        await _sut.SaveActiveReplayAsync(exportDocument);
        await _sut.ClearActiveReplayAsync();

        var expectedDirectory = Path.Combine(_tempDirectory, exportDocument.Experiment.SessionId!.Value.ToString("N"));
        var expectedPath = Path.Combine(expectedDirectory, "experiment-session-live.json");

        Assert.False(File.Exists(expectedPath));
        Assert.False(Directory.Exists(expectedDirectory));
        Assert.Null(await _sut.LoadActiveReplayAsync());
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }
}
