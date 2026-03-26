namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime;

public sealed class RuleBasedDecisionStrategy : IDecisionStrategy
{
    private static readonly TimeSpan InterventionCooldown = TimeSpan.FromSeconds(45);

    public string ProviderId => DecisionProviderIds.RuleBased;

    public ValueTask<DecisionProposalSnapshot?> EvaluateAsync(DecisionContextSnapshot context, CancellationToken ct = default)
    {
        if (!context.IsSessionActive ||
            context.AutomationPaused ||
            context.AttentionSummary?.CurrentTokenDurationMs is null ||
            context.AttentionSummary.CurrentTokenDurationMs.Value < 1_200 ||
            !context.Focus.IsInsideReadingArea)
        {
            return ValueTask.FromResult<DecisionProposalSnapshot?>(null);
        }

        var latestIntervention = context.RecentInterventions.FirstOrDefault();
        if (latestIntervention is not null)
        {
            var elapsedSinceIntervention = Math.Max(0, context.AttentionSummary.UpdatedAtUnixMs - latestIntervention.AppliedAtUnixMs);
            if (elapsedSinceIntervention < (long)InterventionCooldown.TotalMilliseconds)
            {
                return ValueTask.FromResult<DecisionProposalSnapshot?>(null);
            }
        }

        if (context.Presentation.FontSizePx >= ReadingPresentationRules.MaxFontSizePx)
        {
            return ValueTask.FromResult<DecisionProposalSnapshot?>(null);
        }

        var updatedFontSize = Math.Min(context.Presentation.FontSizePx + 2, ReadingPresentationRules.MaxFontSizePx);
        if (updatedFontSize == context.Presentation.FontSizePx)
        {
            return ValueTask.FromResult<DecisionProposalSnapshot?>(null);
        }

        var proposedAtUnixMs = context.AttentionSummary.UpdatedAtUnixMs;
        var signal = new DecisionSignalSnapshot(
            "attention-summary",
            $"Token dwell time reached {context.AttentionSummary.CurrentTokenDurationMs.Value} ms.",
            proposedAtUnixMs,
            0.66);

        var intervention = new ApplyInterventionCommand(
            ProviderId,
            signal.SignalType,
            "Increase font size to reduce local reading strain.",
            new ReadingPresentationPatch(null, updatedFontSize, null, null, null, null),
            new ReaderAppearancePatch(null, null, null));

        return ValueTask.FromResult<DecisionProposalSnapshot?>(new DecisionProposalSnapshot(
            Guid.NewGuid(),
            context.ConditionLabel,
            ProviderId,
            context.ExecutionMode,
            DecisionProposalStatus.Pending,
            signal,
            "Sustained fixation on the current token suggests the reader may benefit from a small size increase.",
            proposedAtUnixMs,
            null,
            null,
            null,
            intervention));
    }
}
