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
        await ValidateAsync(command.Name, command.Items, ct);
        return await _experimentSetupStoreAdapter.SaveAsync(command, ct);
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

        await ValidateAsync(command.Name, command.Items.Select(MapItem).ToArray(), ct);

        var updated = await _experimentSetupStoreAdapter.UpdateAsync(command, ct);
        if (updated is null)
        {
            throw new ExperimentSetupNotFoundException(command.Id);
        }

        return updated;
    }

    private async ValueTask ValidateAsync(
        string name,
        IReadOnlyList<SaveExperimentSetupItemCommand> items,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(name))
        {
            throw new ExperimentSetupValidationException("name is required.");
        }

        if (items.Count == 0)
        {
            throw new ExperimentSetupValidationException("At least one reading material is required.");
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

            if (!string.IsNullOrWhiteSpace(item.SourceReadingMaterialSetupId))
            {
                var existing = await _readingMaterialSetupStoreAdapter.GetByIdAsync(item.SourceReadingMaterialSetupId.Trim(), ct);
                if (existing is null)
                {
                    throw new ExperimentSetupValidationException($"{label}.sourceReadingMaterialSetupId does not exist.");
                }
            }
        }
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
