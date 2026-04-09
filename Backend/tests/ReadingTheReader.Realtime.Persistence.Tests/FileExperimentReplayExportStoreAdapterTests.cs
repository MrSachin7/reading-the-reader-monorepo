using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
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
    public async Task SaveNamedAsync_CanPersistAndLoadJsonExport()
    {
        var export = ExperimentReplayExportTestFactory.CreateReplayExport();

        var saved = await _sut.SaveNamedAsync("Study Export", ExperimentReplayExportFormats.Json, export);
        var listed = await _sut.ListSavedAsync();
        var loaded = await _sut.LoadSavedByIdAsync(saved.Id);

        Assert.Equal(ExperimentReplayExportFormats.Json, saved.Format);
        Assert.StartsWith("participant-1-", saved.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.EndsWith(".json", saved.FileName, StringComparison.OrdinalIgnoreCase);
        Assert.Contains(listed, item => item.Id == saved.Id && item.Format == ExperimentReplayExportFormats.Json);
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
}
