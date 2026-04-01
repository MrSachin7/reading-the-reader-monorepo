namespace ReadingTheReader.core.Domain.Decisioning;

public static class DecisionProposalLifecycleRules
{
    public static bool CanTransition(string fromStatus, string toStatus)
    {
        if (string.Equals(fromStatus, toStatus, StringComparison.Ordinal))
        {
            return true;
        }

        return string.Equals(fromStatus, DecisionProposalStatus.Pending, StringComparison.Ordinal) &&
               DecisionProposalStatus.All.Contains(toStatus, StringComparer.Ordinal);
    }

    public static bool IsResolved(string status)
    {
        return !string.Equals(status, DecisionProposalStatus.Pending, StringComparison.Ordinal);
    }
}
