using System.Text.RegularExpressions;
using ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups.Commands;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.core.Application.ApplicationContracts.ExperimentSetups;

public sealed class ExperimentSetupService : IExperimentSetupService
{
    private static readonly Regex ValidFontFamilyRegex = new(@"^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$", RegexOptions.Compiled);

    private readonly IExperimentSetupStoreAdapter _experimentSetupStoreAdapter;
    private readonly IReadingMaterialSetupStoreAdapter _readingMaterialSetupStoreAdapter;

    public ExperimentSetupService(
        IExperimentSetupStoreAdapter experimentSetupStoreAdapter,
        IReadingMaterialSetupStoreAdapter readingMaterialSetupStoreAdapter)
    {
        _experimentSetupStoreAdapter = experimentSetupStoreAdapter;
        _readingMaterialSetupStoreAdapter = readingMaterialSetupStoreAdapter;
    }

    public async ValueTask<ExperimentSetup> SaveAsync(SaveExperimentSetupCommand command, CancellationToken ct = default)
    {
        var normalizedItems = await NormalizeSaveItemsAsync(command.Items, ct);

        await ValidateAsync(
            command.Name,
            command.Status,
            command.OrderMode,
            command.DefaultFontFamily,
            command.DefaultFontSizePx,
            command.DefaultLineWidthPx,
            command.DefaultLineHeight,
            command.DefaultLetterSpacingEm,
            normalizedItems,
            ct);

        return await _experimentSetupStoreAdapter.SaveAsync(new SaveExperimentSetupCommand
        {
            Name = command.Name,
            Description = command.Description,
            Status = command.Status,
            OrderMode = command.OrderMode,
            DefaultFontFamily = command.DefaultFontFamily,
            DefaultFontSizePx = command.DefaultFontSizePx,
            DefaultLineWidthPx = command.DefaultLineWidthPx,
            DefaultLineHeight = command.DefaultLineHeight,
            DefaultLetterSpacingEm = command.DefaultLetterSpacingEm,
            DefaultEditableByExperimenter = command.DefaultEditableByExperimenter,
            DecisionProviderId = command.DecisionProviderId,
            DecisionExecutionMode = command.DecisionExecutionMode,
            CalibrationRequired = command.CalibrationRequired,
            Items = normalizedItems
        }, ct);
    }

    public ValueTask<IReadOnlyCollection<ExperimentSetup>> ListAsync(CancellationToken ct = default)
        => _experimentSetupStoreAdapter.ListAsync(ct);

    public async ValueTask<ExperimentSetup> GetByIdAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ExperimentSetupValidationException("id is required.");
        }

        var item = await _experimentSetupStoreAdapter.GetByIdAsync(id, ct);
        if (item is null)
        {
            throw new ExperimentSetupNotFoundException(id);
        }

        return item;
    }

    public async ValueTask<ExperimentSetup> UpdateAsync(UpdateExperimentSetupCommand command, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.Id))
        {
            throw new ExperimentSetupValidationException("id is required.");
        }

        var normalizedItems = await NormalizeUpdateItemsAsync(command.Items, ct);

        await ValidateAsync(
            command.Name,
            command.Status,
            command.OrderMode,
            command.DefaultFontFamily,
            command.DefaultFontSizePx,
            command.DefaultLineWidthPx,
            command.DefaultLineHeight,
            command.DefaultLetterSpacingEm,
            normalizedItems.Select(MapItem).ToArray(),
            ct);

        var updated = await _experimentSetupStoreAdapter.UpdateAsync(new UpdateExperimentSetupCommand
        {
            Id = command.Id,
            Name = command.Name,
            Description = command.Description,
            Status = command.Status,
            OrderMode = command.OrderMode,
            DefaultFontFamily = command.DefaultFontFamily,
            DefaultFontSizePx = command.DefaultFontSizePx,
            DefaultLineWidthPx = command.DefaultLineWidthPx,
            DefaultLineHeight = command.DefaultLineHeight,
            DefaultLetterSpacingEm = command.DefaultLetterSpacingEm,
            DefaultEditableByExperimenter = command.DefaultEditableByExperimenter,
            DecisionProviderId = command.DecisionProviderId,
            DecisionExecutionMode = command.DecisionExecutionMode,
            CalibrationRequired = command.CalibrationRequired,
            Items = normalizedItems
        }, ct);
        if (updated is null)
        {
            throw new ExperimentSetupNotFoundException(command.Id);
        }

        return updated;
    }

    public async ValueTask DeleteAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ExperimentSetupValidationException("id is required.");
        }

        var deleted = await _experimentSetupStoreAdapter.DeleteAsync(id, ct);
        if (!deleted)
        {
            throw new ExperimentSetupNotFoundException(id);
        }
    }

    private async ValueTask ValidateAsync(
        string name,
        string status,
        string orderMode,
        string defaultFontFamily,
        int defaultFontSizePx,
        int defaultLineWidthPx,
        double defaultLineHeight,
        double defaultLetterSpacingEm,
        IReadOnlyList<SaveExperimentSetupItemCommand> items,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ExperimentSetupValidationException("name is required.");
        }

        var normalizedStatus = ExperimentSetupStatuses.Normalize(status);
        if (normalizedStatus == ExperimentSetupStatuses.Ready && items.Count == 0)
        {
            throw new ExperimentSetupValidationException("At least one reading material is required before a template can be marked ready.");
        }

        if (string.IsNullOrWhiteSpace(defaultFontFamily) || !ValidFontFamilyRegex.IsMatch(defaultFontFamily.Trim()))
        {
            throw new ExperimentSetupValidationException("defaultFontFamily is invalid.");
        }

        if (ExperimentSetupOrderModes.Normalize(orderMode) == ExperimentSetupOrderModes.Random && items.Count < 2)
        {
            throw new ExperimentSetupValidationException("Random order requires at least two reading materials.");
        }

        if (defaultFontSizePx < ReadingPresentationRules.MinFontSizePx || defaultFontSizePx > ReadingPresentationRules.MaxFontSizePx)
        {
            throw new ExperimentSetupValidationException($"defaultFontSizePx must be between {ReadingPresentationRules.MinFontSizePx} and {ReadingPresentationRules.MaxFontSizePx}.");
        }

        if (defaultLineWidthPx < ReadingPresentationRules.MinLineWidthPx || defaultLineWidthPx > ReadingPresentationRules.MaxLineWidthPx)
        {
            throw new ExperimentSetupValidationException($"defaultLineWidthPx must be between {ReadingPresentationRules.MinLineWidthPx} and {ReadingPresentationRules.MaxLineWidthPx}.");
        }

        if (defaultLineHeight < ReadingPresentationRules.MinLineHeight || defaultLineHeight > ReadingPresentationRules.MaxLineHeight)
        {
            throw new ExperimentSetupValidationException($"defaultLineHeight must be between {ReadingPresentationRules.MinLineHeight} and {ReadingPresentationRules.MaxLineHeight}.");
        }

        if (defaultLetterSpacingEm < ReadingPresentationRules.MinLetterSpacingEm || defaultLetterSpacingEm > ReadingPresentationRules.MaxLetterSpacingEm)
        {
            throw new ExperimentSetupValidationException($"defaultLetterSpacingEm must be between {ReadingPresentationRules.MinLetterSpacingEm} and {ReadingPresentationRules.MaxLetterSpacingEm}.");
        }

        for (var index = 0; index < items.Count; index++)
        {
            var item = items[index];
            var label = $"items[{index}]";

            if (string.IsNullOrWhiteSpace(item.Title))
            {
                throw new ExperimentSetupValidationException($"{label}.title is required.");
            }

            if (string.IsNullOrWhiteSpace(item.Markdown))
            {
                throw new ExperimentSetupValidationException($"{label}.markdown is required.");
            }

            if (string.IsNullOrWhiteSpace(item.SourceReadingMaterialTitle))
            {
                throw new ExperimentSetupValidationException($"{label}.sourceReadingMaterialTitle is required.");
            }

            if (string.IsNullOrWhiteSpace(item.FontFamily) || !ValidFontFamilyRegex.IsMatch(item.FontFamily.Trim()))
            {
                throw new ExperimentSetupValidationException($"{label}.fontFamily is invalid.");
            }

            if (item.FontSizePx < ReadingPresentationRules.MinFontSizePx || item.FontSizePx > ReadingPresentationRules.MaxFontSizePx)
            {
                throw new ExperimentSetupValidationException($"{label}.fontSizePx must be between {ReadingPresentationRules.MinFontSizePx} and {ReadingPresentationRules.MaxFontSizePx}.");
            }

            if (item.LineWidthPx < ReadingPresentationRules.MinLineWidthPx || item.LineWidthPx > ReadingPresentationRules.MaxLineWidthPx)
            {
                throw new ExperimentSetupValidationException($"{label}.lineWidthPx must be between {ReadingPresentationRules.MinLineWidthPx} and {ReadingPresentationRules.MaxLineWidthPx}.");
            }

            if (item.LineHeight < ReadingPresentationRules.MinLineHeight || item.LineHeight > ReadingPresentationRules.MaxLineHeight)
            {
                throw new ExperimentSetupValidationException($"{label}.lineHeight must be between {ReadingPresentationRules.MinLineHeight} and {ReadingPresentationRules.MaxLineHeight}.");
            }

            if (item.LetterSpacingEm < ReadingPresentationRules.MinLetterSpacingEm || item.LetterSpacingEm > ReadingPresentationRules.MaxLetterSpacingEm)
            {
                throw new ExperimentSetupValidationException($"{label}.letterSpacingEm must be between {ReadingPresentationRules.MinLetterSpacingEm} and {ReadingPresentationRules.MaxLetterSpacingEm}.");
            }

        }
    }

    private async ValueTask<SaveExperimentSetupItemCommand[]> NormalizeSaveItemsAsync(
        IReadOnlyList<SaveExperimentSetupItemCommand> items,
        CancellationToken ct)
    {
        var normalizedItems = new SaveExperimentSetupItemCommand[items.Count];
        for (var index = 0; index < items.Count; index++)
        {
            normalizedItems[index] = await NormalizeSaveItemAsync(items[index], ct);
        }

        return normalizedItems;
    }

    private async ValueTask<UpdateExperimentSetupItemCommand[]> NormalizeUpdateItemsAsync(
        IReadOnlyList<UpdateExperimentSetupItemCommand> items,
        CancellationToken ct)
    {
        var normalizedItems = new UpdateExperimentSetupItemCommand[items.Count];
        for (var index = 0; index < items.Count; index++)
        {
            normalizedItems[index] = await NormalizeUpdateItemAsync(items[index], ct);
        }

        return normalizedItems;
    }

    private async ValueTask<SaveExperimentSetupItemCommand> NormalizeSaveItemAsync(
        SaveExperimentSetupItemCommand item,
        CancellationToken ct)
    {
        return new SaveExperimentSetupItemCommand
        {
            SourceReadingMaterialSetupId = await NormalizeSourceReadingMaterialSetupIdAsync(item.SourceReadingMaterialSetupId, ct),
            SourceReadingMaterialTitle = item.SourceReadingMaterialTitle,
            Title = item.Title,
            Markdown = item.Markdown,
            ResearcherQuestions = item.ResearcherQuestions,
            FontFamily = item.FontFamily,
            FontSizePx = item.FontSizePx,
            LineWidthPx = item.LineWidthPx,
            LineHeight = item.LineHeight,
            LetterSpacingEm = item.LetterSpacingEm,
            EditableByExperimenter = item.EditableByExperimenter
        };
    }

    private async ValueTask<UpdateExperimentSetupItemCommand> NormalizeUpdateItemAsync(
        UpdateExperimentSetupItemCommand item,
        CancellationToken ct)
    {
        return new UpdateExperimentSetupItemCommand
        {
            Id = item.Id,
            SourceReadingMaterialSetupId = await NormalizeSourceReadingMaterialSetupIdAsync(item.SourceReadingMaterialSetupId, ct),
            SourceReadingMaterialTitle = item.SourceReadingMaterialTitle,
            Title = item.Title,
            Markdown = item.Markdown,
            ResearcherQuestions = item.ResearcherQuestions,
            FontFamily = item.FontFamily,
            FontSizePx = item.FontSizePx,
            LineWidthPx = item.LineWidthPx,
            LineHeight = item.LineHeight,
            LetterSpacingEm = item.LetterSpacingEm,
            EditableByExperimenter = item.EditableByExperimenter
        };
    }

    private async ValueTask<string?> NormalizeSourceReadingMaterialSetupIdAsync(string? sourceReadingMaterialSetupId, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(sourceReadingMaterialSetupId))
        {
            return null;
        }

        var normalizedSourceId = sourceReadingMaterialSetupId.Trim();
        var existing = await _readingMaterialSetupStoreAdapter.GetByIdAsync(normalizedSourceId, ct);
        return existing is null ? null : normalizedSourceId;
    }

    private static SaveExperimentSetupItemCommand MapItem(UpdateExperimentSetupItemCommand item)
    {
        return new SaveExperimentSetupItemCommand
        {
            SourceReadingMaterialSetupId = item.SourceReadingMaterialSetupId,
            SourceReadingMaterialTitle = item.SourceReadingMaterialTitle,
            Title = item.Title,
            Markdown = item.Markdown,
            ResearcherQuestions = item.ResearcherQuestions,
            FontFamily = item.FontFamily,
            FontSizePx = item.FontSizePx,
            LineWidthPx = item.LineWidthPx,
            LineHeight = item.LineHeight,
            LetterSpacingEm = item.LetterSpacingEm,
            EditableByExperimenter = item.EditableByExperimenter
        };
    }
}
