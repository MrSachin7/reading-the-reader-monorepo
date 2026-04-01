using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class DecisionProposalLifecycleTests
{
    [Fact]
    public async Task AdvisoryProposal_StaysPendingUntilReviewed()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();

        await harness.SessionManager.UpdateDecisionConfigurationAsync(
            new DecisionConfigurationSnapshot(
                "Rule-based advisory",
                DecisionProviderIds.RuleBased,
                DecisionExecutionModes.Advisory),
            automationPaused: false);
        await harness.SessionManager.UpdateReadingFocusAsync(
            new UpdateReadingFocusCommand(true, 0.4, 0.3, "token-1", "block-1"));
        await harness.SessionManager.UpdateReadingAttentionSummaryAsync(
            new UpdateReadingAttentionSummaryCommand(
                1_710_000_003_000,
                new Dictionary<string, ReadingAttentionTokenSnapshot>
                {
                    ["token-1"] = new(1_500, 3, 0, 900, 1_500)
                },
                "token-1",
                1_500,
                1,
                0));

        var update = GetLatestDecisionUpdate(harness);

        Assert.NotNull(update.DecisionState.ActiveProposal);
        Assert.Equal(DecisionProposalStatus.Pending, update.DecisionState.ActiveProposal!.Status);
        Assert.Equal(DecisionProviderIds.RuleBased, update.DecisionState.ActiveProposal.ProviderId);
        Assert.Equal(ReadingInterventionModuleIds.FontSize, update.DecisionState.ActiveProposal.ProposedIntervention.ModuleId);
        Assert.Equal(
            "20",
            Assert.Contains("fontSizePx", update.DecisionState.ActiveProposal.ProposedIntervention.Parameters!));
        Assert.Empty(update.DecisionState.RecentProposalHistory);
        Assert.DoesNotContain(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.InterventionEvent);
    }

    [Fact]
    public async Task AutonomousProposal_IsAppliedImmediately()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();

        await harness.SessionManager.UpdateDecisionConfigurationAsync(
            new DecisionConfigurationSnapshot(
                "Rule-based autonomous",
                DecisionProviderIds.RuleBased,
                DecisionExecutionModes.Autonomous),
            automationPaused: false);
        await harness.SessionManager.UpdateReadingFocusAsync(
            new UpdateReadingFocusCommand(true, 0.45, 0.32, "token-1", "block-1"));
        await harness.SessionManager.UpdateReadingAttentionSummaryAsync(
            new UpdateReadingAttentionSummaryCommand(
                1_710_000_003_000,
                new Dictionary<string, ReadingAttentionTokenSnapshot>
                {
                    ["token-1"] = new(1_500, 3, 0, 900, 1_500)
                },
                "token-1",
                1_500,
                1,
                0));

        var update = GetLatestDecisionUpdate(harness);

        Assert.Null(update.DecisionState.ActiveProposal);
        Assert.NotEmpty(update.DecisionState.RecentProposalHistory);
        Assert.Equal(DecisionProposalStatus.AutoApplied, update.DecisionState.RecentProposalHistory[0].Status);
        Assert.NotNull(update.DecisionState.RecentProposalHistory[0].AppliedInterventionId);
        Assert.Equal(ReadingInterventionModuleIds.FontSize, update.DecisionState.RecentProposalHistory[0].ProposedIntervention.ModuleId);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.InterventionEvent
                       && message.Payload is InterventionEventSnapshot intervention
                       && intervention.Source == DecisionProviderIds.RuleBased
                       && intervention.ModuleId == ReadingInterventionModuleIds.FontSize);
    }

    [Fact]
    public async Task ManualIntervention_SupersedesPendingProposal()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();

        await harness.SessionManager.UpdateDecisionConfigurationAsync(
            new DecisionConfigurationSnapshot(
                "Rule-based advisory",
                DecisionProviderIds.RuleBased,
                DecisionExecutionModes.Advisory),
            automationPaused: false);
        await harness.SessionManager.UpdateReadingFocusAsync(
            new UpdateReadingFocusCommand(true, 0.41, 0.31, "token-1", "block-1"));
        await harness.SessionManager.UpdateReadingAttentionSummaryAsync(
            new UpdateReadingAttentionSummaryCommand(
                1_710_000_003_000,
                new Dictionary<string, ReadingAttentionTokenSnapshot>
                {
                    ["token-1"] = new(1_500, 3, 0, 900, 1_500)
                },
                "token-1",
                1_500,
                1,
                0));

        await harness.SessionManager.ApplyInterventionAsync(new ApplyInterventionCommand(
            "manual",
            "researcher-ui",
            "Researcher override",
            new ReadingPresentationPatch(null, null, null, null, null, null),
            new ReaderAppearancePatch(null, null, null),
            ReadingInterventionModuleIds.FontSize,
            new Dictionary<string, string?>
            {
                ["fontSizePx"] = "20"
            }));

        var update = GetLatestDecisionUpdate(harness);

        Assert.Null(update.DecisionState.ActiveProposal);
        Assert.NotEmpty(update.DecisionState.RecentProposalHistory);
        Assert.Equal(DecisionProposalStatus.Superseded, update.DecisionState.RecentProposalHistory[0].Status);
        Assert.Equal("researcher", update.DecisionState.RecentProposalHistory[0].ResolutionSource);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.InterventionEvent
                       && message.Payload is InterventionEventSnapshot intervention
                       && intervention.Source == "manual"
                       && intervention.ModuleId == ReadingInterventionModuleIds.FontSize);
    }

    private static DecisionRealtimeUpdateSnapshot GetLatestDecisionUpdate(RealtimeTestDoubles.RuntimeHarness harness)
    {
        return Assert.IsType<DecisionRealtimeUpdateSnapshot>(
            harness.Broadcaster.Broadcasts
                .Last(message => message.MessageType == MessageTypes.DecisionProposalChanged)
                .Payload);
    }
}
