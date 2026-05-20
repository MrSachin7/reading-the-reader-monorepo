using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.Realtime.Persistence;

internal static class ComprehensionQuizPersistenceMapping
{
    public static List<StoredComprehensionQuestion> ToStored(IReadOnlyList<ComprehensionQuestion>? quiz)
    {
        if (quiz is null || quiz.Count == 0)
        {
            return [];
        }

        var result = new List<StoredComprehensionQuestion>(quiz.Count);
        foreach (var question in quiz)
        {
            result.Add(new StoredComprehensionQuestion
            {
                Id = question.Id,
                Order = question.Order,
                Prompt = question.Prompt,
                CorrectOptionId = question.CorrectOptionId,
                Options = question.Options
                    .Select(option => new StoredComprehensionOption { Id = option.Id, Text = option.Text })
                    .ToList()
            });
        }

        return result;
    }

    public static IReadOnlyList<ComprehensionQuestion> ToDomain(List<StoredComprehensionQuestion>? quiz)
    {
        if (quiz is null || quiz.Count == 0)
        {
            return Array.Empty<ComprehensionQuestion>();
        }

        return quiz
            .OrderBy(question => question.Order)
            .Select(question => new ComprehensionQuestion(
                question.Id ?? string.Empty,
                question.Order,
                question.Prompt ?? string.Empty,
                (question.Options ?? [])
                    .Select(option => new ComprehensionOption(option.Id ?? string.Empty, option.Text ?? string.Empty))
                    .ToArray(),
                question.CorrectOptionId ?? string.Empty))
            .ToArray();
    }
}
