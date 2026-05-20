using FastEndpoints;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.WebApi.Contracts.ExperimentSession;

namespace ReadingTheReader.WebApi.ExperimentSessionEndpoints;

public sealed class SubmitQuizAnswersEndpoint : Endpoint<SubmitQuizAnswersRequest, ExperimentSessionSnapshot>
{
    private readonly IExperimentRuntimeAuthority _runtimeAuthority;
    private readonly IExperimentSessionQueryService _experimentSessionQueryService;

    public SubmitQuizAnswersEndpoint(
        IExperimentRuntimeAuthority runtimeAuthority,
        IExperimentSessionQueryService experimentSessionQueryService)
    {
        _runtimeAuthority = runtimeAuthority;
        _experimentSessionQueryService = experimentSessionQueryService;
    }

    public override void Configure()
    {
        Post("/experiment-session/quiz-answers");
        AllowAnonymous();
    }

    public override async Task HandleAsync(SubmitQuizAnswersRequest req, CancellationToken ct)
    {
        try
        {
            var answers = (req.Answers ?? [])
                .Select(answer => new SubmitQuizAnswerEntry(
                    answer.QuestionId ?? string.Empty,
                    answer.SelectedOptionId ?? string.Empty))
                .ToArray();

            IReadOnlyDictionary<string, QuizSelectionHistoryEntry>? selectionHistories = null;
            if (req.SelectionHistories is { Count: > 0 } histories)
            {
                selectionHistories = histories.ToDictionary(
                    pair => pair.Key,
                    pair => new QuizSelectionHistoryEntry(
                        pair.Value.QuestionShownAtUnixMs,
                        pair.Value.FirstSelectedAtUnixMs,
                        pair.Value.LastSelectedAtUnixMs,
                        pair.Value.SelectionChangeCount),
                    StringComparer.Ordinal);
            }

            await _runtimeAuthority.SubmitQuizAnswersAsync(
                new SubmitQuizAnswersCommand(req.MaterialItemId ?? string.Empty, answers, selectionHistories),
                ct);

            await Send.OkAsync(_experimentSessionQueryService.GetCurrentSnapshot(), ct);
        }
        catch (InvalidOperationException ex)
        {
            HttpContext.Response.StatusCode = StatusCodes.Status400BadRequest;
            await HttpContext.Response.WriteAsJsonAsync(new { message = ex.Message }, ct);
        }
    }
}
