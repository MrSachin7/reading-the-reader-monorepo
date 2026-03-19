using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;
using ReadingTheReader.Realtime.Persistence;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class FileReadingMaterialSetupStoreAdapterTests : IDisposable
{
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), "reading-material-setup-store-tests", Guid.NewGuid().ToString("N"));

    [Fact]
    public async Task SaveAsync_WritesMarkdownAndMetadata_AndReturnsSetup()
    {
        var sut = new FileReadingMaterialSetupStoreAdapter(_tempDirectory);

        var result = await sut.SaveAsync(new SaveReadingMaterialSetupCommand
        {
            Title = "My Custom Material",
            Markdown = "# Hello",
            FontFamily = "merriweather",
            FontSizePx = 20,
            LineWidthPx = 680,
            LineHeight = 1.8,
            LetterSpacingEm = 0.04,
            EditableByExperimenter = true
        });

        Assert.NotEmpty(result.Id);
        Assert.Equal("My Custom Material", result.Title);
        Assert.Matches("^my-custom-material-[a-f0-9]{8}\\.md$", result.FileName);
        Assert.True(result.CreatedAtUnixMs > 0);
        Assert.Equal(result.CreatedAtUnixMs, result.UpdatedAtUnixMs);
        Assert.True(File.Exists(Path.Combine(_tempDirectory, result.FileName)));
        Assert.True(File.Exists(Path.Combine(_tempDirectory, Path.ChangeExtension(result.FileName, ".json"))));
    }

    [Fact]
    public async Task SaveAsync_UsesUniqueFileNames_ForDuplicateTitles()
    {
        var sut = new FileReadingMaterialSetupStoreAdapter(_tempDirectory);

        var first = await sut.SaveAsync(new SaveReadingMaterialSetupCommand
        {
            Title = "Duplicate Title",
            Markdown = "First",
            FontFamily = "inter",
            FontSizePx = 18,
            LineWidthPx = 700,
            LineHeight = 1.6,
            LetterSpacingEm = 0.02,
            EditableByExperimenter = false
        });

        var second = await sut.SaveAsync(new SaveReadingMaterialSetupCommand
        {
            Title = "Duplicate Title",
            Markdown = "Second",
            FontFamily = "inter",
            FontSizePx = 18,
            LineWidthPx = 700,
            LineHeight = 1.6,
            LetterSpacingEm = 0.02,
            EditableByExperimenter = false
        });

        Assert.NotEqual(first.Id, second.Id);
        Assert.NotEqual(first.FileName, second.FileName);
    }

    [Fact]
    public async Task ListAndGetByIdAsync_ReturnSavedReadingMaterialSetups()
    {
        var sut = new FileReadingMaterialSetupStoreAdapter(_tempDirectory);

        var first = await sut.SaveAsync(new SaveReadingMaterialSetupCommand
        {
            Title = "First Material",
            Markdown = "Alpha",
            FontFamily = "inter",
            FontSizePx = 18,
            LineWidthPx = 700,
            LineHeight = 1.6,
            LetterSpacingEm = 0.02,
            EditableByExperimenter = false
        });

        await Task.Delay(10);

        var second = await sut.SaveAsync(new SaveReadingMaterialSetupCommand
        {
            Title = "Second/Material",
            Markdown = "Bravo",
            FontFamily = "merriweather",
            FontSizePx = 20,
            LineWidthPx = 680,
            LineHeight = 1.8,
            LetterSpacingEm = 0.04,
            EditableByExperimenter = true
        });

        var list = await sut.ListAsync();
        var detail = await sut.GetByIdAsync(second.Id);

        Assert.Equal(2, list.Count);
        Assert.Equal(second.Id, list.First().Id);
        Assert.NotNull(detail);
        Assert.Equal("Second/Material", detail.Title);
        Assert.Equal("Bravo", detail.Markdown);
        Assert.True(detail.EditableByExperimenter);
        Assert.Matches("^second-material-[a-f0-9]{8}\\.md$", detail.FileName);
        Assert.Contains(list, item => item.Id == first.Id);
    }

    [Fact]
    public async Task UpdateAsync_RewritesMarkdownAndPresentation()
    {
        var sut = new FileReadingMaterialSetupStoreAdapter(_tempDirectory);

        var saved = await sut.SaveAsync(new SaveReadingMaterialSetupCommand
        {
            Title = "Initial",
            Markdown = "Before",
            FontFamily = "inter",
            FontSizePx = 18,
            LineWidthPx = 700,
            LineHeight = 1.6,
            LetterSpacingEm = 0.02,
            EditableByExperimenter = false
        });

        await Task.Delay(10);

        var updated = await sut.UpdateAsync(new UpdateReadingMaterialSetupCommand
        {
            Id = saved.Id,
            Title = "Updated",
            Markdown = "After",
            FontFamily = "merriweather",
            FontSizePx = 20,
            LineWidthPx = 680,
            LineHeight = 1.8,
            LetterSpacingEm = 0.04,
            EditableByExperimenter = true
        });

        Assert.NotNull(updated);
        Assert.Equal("Updated", updated.Title);
        Assert.Equal("After", updated.Markdown);
        Assert.True(updated.EditableByExperimenter);
        Assert.True(updated.UpdatedAtUnixMs > updated.CreatedAtUnixMs);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }
}
