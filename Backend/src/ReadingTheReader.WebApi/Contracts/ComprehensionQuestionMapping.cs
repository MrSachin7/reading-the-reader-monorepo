using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.WebApi.Contracts;

internal static class ComprehensionQuestionMapping
{
    public static IReadOnlyList<ComprehensionQuestion> ToDomain(List<ComprehensionQuestionDto>? quiz)
    {
        if (quiz is null || quiz.Count == 0)
        {
            return Array.Empty<ComprehensionQuestion>();
        }

        var result = new ComprehensionQuestion[quiz.Count];
        for (var index = 0; index < quiz.Count; index++)
        {
            var question = quiz[index];
            var options = (question.Options ?? [])
                .Select(option => new ComprehensionOption(option.Id ?? string.Empty, option.Text ?? string.Empty))
                .ToArray();

            result[index] = new ComprehensionQuestion(
                question.Id ?? string.Empty,
                question.Order,
                question.Prompt ?? string.Empty,
                options,
                question.CorrectOptionId ?? string.Empty);
        }

        return result;
    }
}
