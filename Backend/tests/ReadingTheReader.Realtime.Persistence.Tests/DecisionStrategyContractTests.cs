using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class DecisionStrategyContractTests
{
    [Fact]
    public void DefaultConfiguration_UsesManualProviderAndAdvisoryMode()
    {
        var configuration = DecisionConfigurationSnapshot.Default;

        Assert.Equal("Manual only", configuration.ConditionLabel);
        Assert.Equal(DecisionProviderIds.Manual, configuration.ProviderId);
        Assert.Equal(DecisionExecutionModes.Advisory, configuration.ExecutionMode);
    }

    [Fact]
    public void ProposalStatuses_ContainAllLockedLifecycleValues()
    {
        Assert.Equal(
            [
                DecisionProposalStatus.Pending,
                DecisionProposalStatus.Approved,
                DecisionProposalStatus.Rejected,
                DecisionProposalStatus.AutoApplied,
                DecisionProposalStatus.Superseded,
                DecisionProposalStatus.Expired
            ],
            DecisionProposalStatus.All);
    }

    [Fact]
    public void PendingProposal_CanTransitionToResolvedStates_AndResolvedStatesStayTerminal()
    {
        Assert.Contains(DecisionProviderIds.Manual, DecisionProviderIds.All);
        Assert.Contains(DecisionProviderIds.RuleBased, DecisionProviderIds.All);
        Assert.Contains(DecisionProviderIds.External, DecisionProviderIds.All);
        Assert.Contains(DecisionExecutionModes.Advisory, DecisionExecutionModes.All);
        Assert.Contains(DecisionExecutionModes.Autonomous, DecisionExecutionModes.All);

        foreach (var status in DecisionProposalStatus.All)
        {
            Assert.True(DecisionProposalLifecycleRules.CanTransition(DecisionProposalStatus.Pending, status));
        }

        Assert.False(DecisionProposalLifecycleRules.CanTransition(
            DecisionProposalStatus.Approved,
            DecisionProposalStatus.Rejected));
        Assert.False(DecisionProposalLifecycleRules.CanTransition(
            DecisionProposalStatus.Superseded,
            DecisionProposalStatus.Pending));
        Assert.True(DecisionProposalLifecycleRules.IsResolved(DecisionProposalStatus.AutoApplied));
        Assert.False(DecisionProposalLifecycleRules.IsResolved(DecisionProposalStatus.Pending));
    }
}
