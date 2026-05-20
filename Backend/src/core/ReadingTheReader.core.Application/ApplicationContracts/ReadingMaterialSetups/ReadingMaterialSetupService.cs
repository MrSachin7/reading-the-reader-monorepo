using System.Text.RegularExpressions;
using ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups.Commands;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.core.Application.ApplicationContracts.ReadingMaterialSetups;

public sealed class ReadingMaterialSetupService : IReadingMaterialSetupService
{
    private static readonly Regex ValidFontFamilyRegex = new(@"^[A-Za-z0-9][A-Za-z0-9 _-]{0,63}$", RegexOptions.Compiled);
    private readonly IReadingMaterialSetupStoreAdapter _readingMaterialSetupStoreAdapter;

    public ReadingMaterialSetupService(IReadingMaterialSetupStoreAdapter readingMaterialSetupStoreAdapter)
    {
        _readingMaterialSetupStoreAdapter = readingMaterialSetupStoreAdapter;
    }

    public async ValueTask<ReadingMaterialSetup> SaveAsync(SaveReadingMaterialSetupCommand command, CancellationToken ct = default)
    {
        Validate(command.Name, command.Title, command.Markdown, command.FontFamily, command.FontSizePx, command.LineWidthPx, command.LineHeight, command.LetterSpacingEm);
        ValidateComprehensionQuiz(command.ComprehensionQuiz);
        return await _readingMaterialSetupStoreAdapter.SaveAsync(command, ct);
    }

    public ValueTask<IReadOnlyCollection<ReadingMaterialSetup>> ListAsync(CancellationToken ct = default) => _readingMaterialSetupStoreAdapter.ListAsync(ct);

    public async ValueTask<ReadingMaterialSetup> GetByIdAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ReadingMaterialSetupValidationException("id is required.");
        }

        var item = await _readingMaterialSetupStoreAdapter.GetByIdAsync(id, ct);
        if (item is null)
        {
            throw new ReadingMaterialSetupNotFoundException(id);
        }

        return item;
        
    }

    public async ValueTask<ReadingMaterialSetup> UpdateAsync(UpdateReadingMaterialSetupCommand command, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(command.Id))
        {
            throw new ReadingMaterialSetupValidationException("id is required.");
        }

        Validate(command.Name, command.Title, command.Markdown, command.FontFamily, command.FontSizePx, command.LineWidthPx, command.LineHeight, command.LetterSpacingEm);
        ValidateComprehensionQuiz(command.ComprehensionQuiz);

        var updated = await _readingMaterialSetupStoreAdapter.UpdateAsync(command, ct);
        if (updated is null)
        {
            throw new ReadingMaterialSetupNotFoundException(command.Id);
        }

        return updated;
    }

    public async ValueTask DeleteAsync(string id, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(id))
        {
            throw new ReadingMaterialSetupValidationException("id is required.");
        }

        var deleted = await _readingMaterialSetupStoreAdapter.DeleteAsync(id, ct);
        if (!deleted)
        {
            throw new ReadingMaterialSetupNotFoundException(id);
        }
    }

    private static void Validate(string name, string title, string markdown, string fontFamily, int fontSizePx, int lineWidthPx, double lineHeight, double letterSpacingEm)
    {
        if (string.IsNullOrWhiteSpace(title))
        {
            throw new ReadingMaterialSetupValidationException("title is required.");
        }

        if (string.IsNullOrWhiteSpace(markdown))
        {
            throw new ReadingMaterialSetupValidationException("markdown is required.");
        }

        if (string.IsNullOrWhiteSpace(fontFamily) || !ValidFontFamilyRegex.IsMatch(fontFamily.Trim()))
        {
            throw new ReadingMaterialSetupValidationException("fontFamily is invalid.");
        }

        if (fontSizePx < ReadingPresentationRules.MinFontSizePx || fontSizePx > ReadingPresentationRules.MaxFontSizePx)
        {
            throw new ReadingMaterialSetupValidationException($"fontSizePx must be between {ReadingPresentationRules.MinFontSizePx} and {ReadingPresentationRules.MaxFontSizePx}.");
        }

        if (lineWidthPx < ReadingPresentationRules.MinLineWidthPx || lineWidthPx > ReadingPresentationRules.MaxLineWidthPx)
        {
            throw new ReadingMaterialSetupValidationException($"lineWidthPx must be between {ReadingPresentationRules.MinLineWidthPx} and {ReadingPresentationRules.MaxLineWidthPx}.");
        }

        if (lineHeight < ReadingPresentationRules.MinLineHeight || lineHeight > ReadingPresentationRules.MaxLineHeight)
        {
            throw new ReadingMaterialSetupValidationException($"lineHeight must be between {ReadingPresentationRules.MinLineHeight} and {ReadingPresentationRules.MaxLineHeight}.");
        }

        if (letterSpacingEm < ReadingPresentationRules.MinLetterSpacingEm || letterSpacingEm > ReadingPresentationRules.MaxLetterSpacingEm)
        {
            throw new ReadingMaterialSetupValidationException($"letterSpacingEm must be between {ReadingPresentationRules.MinLetterSpacingEm} and {ReadingPresentationRules.MaxLetterSpacingEm}.");
        }
    }

    private static void ValidateComprehensionQuiz(IReadOnlyList<ComprehensionQuestion>? quiz)
    {
        if (quiz is null || quiz.Count == 0)
        {
            return;
        }

        var seenQuestionIds = new HashSet<string>(StringComparer.Ordinal);

        for (var index = 0; index < quiz.Count; index++)
        {
            var question = quiz[index];
            var label = $"comprehensionQuiz[{index}]";

            if (string.IsNullOrWhiteSpace(question.Id))
            {
                throw new ReadingMaterialSetupValidationException($"{label}.id is required.");
            }

            if (!seenQuestionIds.Add(question.Id))
            {
                throw new ReadingMaterialSetupValidationException($"{label}.id is duplicated.");
            }

            if (string.IsNullOrWhiteSpace(question.Prompt))
            {
                throw new ReadingMaterialSetupValidationException($"{label}.prompt is required.");
            }

            if (question.Options is null || question.Options.Count < 2)
            {
                throw new ReadingMaterialSetupValidationException($"{label}.options must contain at least two options.");
            }

            var seenOptionIds = new HashSet<string>(StringComparer.Ordinal);
            for (var optionIndex = 0; optionIndex < question.Options.Count; optionIndex++)
            {
                var option = question.Options[optionIndex];
                var optionLabel = $"{label}.options[{optionIndex}]";

                if (string.IsNullOrWhiteSpace(option.Id))
                {
                    throw new ReadingMaterialSetupValidationException($"{optionLabel}.id is required.");
                }

                if (!seenOptionIds.Add(option.Id))
                {
                    throw new ReadingMaterialSetupValidationException($"{optionLabel}.id is duplicated within question.");
                }

                if (string.IsNullOrWhiteSpace(option.Text))
                {
                    throw new ReadingMaterialSetupValidationException($"{optionLabel}.text is required.");
                }
            }

            if (string.IsNullOrWhiteSpace(question.CorrectOptionId) ||
                !question.Options.Any(option => string.Equals(option.Id, question.CorrectOptionId, StringComparison.Ordinal)))
            {
                throw new ReadingMaterialSetupValidationException($"{label}.correctOptionId must match one of the option ids.");
            }
        }
    }
}
