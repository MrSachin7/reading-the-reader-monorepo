using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;
using ReadingTheReader.Realtime.Persistence;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ExperimentSetupServiceTests
{
    [Fact]
    public async Task UpdateAsync_WhenSourceReadingMaterialNoLongerExists_ClearsSourceLinkAndKeepsSnapshot()
    {
        var experimentStore = new InMemoryExperimentSetupStoreAdapter();
        var readingMaterialStore = new InMemoryReadingMaterialSetupStoreAdapter();
        var service = new ExperimentSetupService(experimentStore, readingMaterialStore);

        var staleSourceId = "missing-material-id";
        var saved = await experimentStore.SaveAsync(new SaveExperimentSetupCommand
        {
            Name = "Experiment A",
            Description = "Snapshot test",
            Status = ExperimentSetupStatuses.Draft,
            OrderMode = ExperimentSetupOrderModes.Fixed,
            DefaultFontFamily = "merriweather",
            DefaultFontSizePx = 18,
            DefaultLineWidthPx = 680,
            DefaultLineHeight = 1.7,
            DefaultLetterSpacingEm = 0.02,
            DefaultEditableByExperimenter = true,
            DecisionProviderId = "manual",
            DecisionExecutionMode = "advisory",
            CalibrationRequired = true,
            Items =
            [
                new SaveExperimentSetupItemCommand
                {
                    SourceReadingMaterialSetupId = staleSourceId,
                    SourceReadingMaterialTitle = "Material A",
                    Title = "Material A",
                    Markdown = "# Material A",
                    ResearcherQuestions = "Why?",
                    FontFamily = "merriweather",
                    FontSizePx = 18,
                    LineWidthPx = 680,
                    LineHeight = 1.7,
                    LetterSpacingEm = 0.02,
                    EditableByExperimenter = true
                }
            ]
        });

        var updated = await service.UpdateAsync(new UpdateExperimentSetupCommand
        {
            Id = saved.Id,
            Name = saved.Name,
            Description = saved.Description,
            Status = saved.Status,
            OrderMode = saved.OrderMode,
            DefaultFontFamily = saved.DefaultFontFamily,
            DefaultFontSizePx = saved.DefaultFontSizePx,
            DefaultLineWidthPx = saved.DefaultLineWidthPx,
            DefaultLineHeight = saved.DefaultLineHeight,
            DefaultLetterSpacingEm = saved.DefaultLetterSpacingEm,
            DefaultEditableByExperimenter = saved.DefaultEditableByExperimenter,
            DecisionProviderId = saved.DecisionProviderId,
            DecisionExecutionMode = saved.DecisionExecutionMode,
            CalibrationRequired = saved.CalibrationRequired,
            Items =
            [
                new UpdateExperimentSetupItemCommand
                {
                    Id = saved.Items[0].Id,
                    SourceReadingMaterialSetupId = staleSourceId,
                    SourceReadingMaterialTitle = saved.Items[0].SourceReadingMaterialTitle,
                    Title = "Updated title",
                    Markdown = saved.Items[0].Markdown,
                    ResearcherQuestions = saved.Items[0].ResearcherQuestions,
                    FontFamily = saved.Items[0].FontFamily,
                    FontSizePx = saved.Items[0].FontSizePx,
                    LineWidthPx = saved.Items[0].LineWidthPx,
                    LineHeight = saved.Items[0].LineHeight,
                    LetterSpacingEm = saved.Items[0].LetterSpacingEm,
                    EditableByExperimenter = saved.Items[0].EditableByExperimenter
                }
            ]
        });

        Assert.Single(updated.Items);
        Assert.Null(updated.Items[0].SourceReadingMaterialSetupId);
        Assert.Equal(saved.Items[0].SourceReadingMaterialTitle, updated.Items[0].SourceReadingMaterialTitle);
        Assert.Equal(saved.Items[0].Markdown, updated.Items[0].Markdown);
        Assert.Equal("Updated title", updated.Items[0].Title);
    }
}
