using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using ReadingTheReader.core.Domain;
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
        await harness.SessionManager.UpdateInterventionPolicyAsync(new ReadingInterventionPolicySnapshot(
            ReadingInterventionCommitBoundaries.Immediate,
            ReadingInterventionCommitBoundaries.Immediate,
            0));
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
        await harness.SessionManager.UpdateInterventionPolicyAsync(new ReadingInterventionPolicySnapshot(
            ReadingInterventionCommitBoundaries.Immediate,
            ReadingInterventionCommitBoundaries.Immediate,
            0));
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

    [Fact]
    public async Task ExternalAdvisoryProposal_CreatesPendingProposal_FromProviderIngress()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();
        await RegisterProviderAsync(harness);

        await harness.SessionManager.UpdateDecisionConfigurationAsync(
            new DecisionConfigurationSnapshot(
                "External advisory",
                DecisionProviderIds.External,
                DecisionExecutionModes.Advisory),
            automationPaused: false);
        await harness.SessionManager.UpdateReadingFocusAsync(
            new UpdateReadingFocusCommand(true, 0.42, 0.33, "token-2", "block-1"));
        await harness.SessionManager.UpdateReadingAttentionSummaryAsync(
            new UpdateReadingAttentionSummaryCommand(
                1_710_000_004_000,
                new Dictionary<string, ReadingAttentionTokenSnapshot>
                {
                    ["token-2"] = new(1_400, 2, 0, 900, 1_400)
                },
                "token-2",
                1_400,
                1,
                0));

        Assert.Contains(
            harness.ExternalProviderTransport.Messages,
            message => message.MessageType == ProviderMessageTypes.ProviderSessionSnapshot);
        Assert.Contains(
            harness.ExternalProviderTransport.Messages,
            message => message.MessageType == ProviderMessageTypes.ProviderDecisionContext);

        var sessionId = harness.SessionManager.GetCurrentSnapshot().SessionId!.Value.ToString("D");
        var result = await harness.ProviderIngress.HandleAsync(new ProviderSubmitProposalRealtimeCommand(
            "conn-1",
            new ProviderSubmitProposalRealtimePayload(
                "mock-python",
                sessionId,
                "corr-101",
                Guid.NewGuid().ToString("D"),
                DecisionExecutionModes.Advisory,
                "Sustained fixation suggests a small font size increase.",
                "token dwell time > 1200 ms",
                1_710_000_004_000,
                new ProviderProposedInterventionRealtimePayload(
                    ReadingInterventionModuleIds.FontSize,
                    "attention-summary",
                    "Increase font size to reduce strain.",
                    new ProviderReadingPresentationPatchRealtimePayload(null, 20, null, null, null, null),
                    new ProviderReaderAppearancePatchRealtimePayload(null, null, null),
                    new Dictionary<string, string?> { ["fontSizePx"] = "20" }))));

        Assert.False(result.ShouldCloseConnection);
        Assert.Empty(result.Responses);

        var update = GetLatestDecisionUpdate(harness);

        Assert.NotNull(update.DecisionState.ActiveProposal);
        Assert.Equal("mock-python", update.DecisionState.ActiveProposal!.ProviderId);
        Assert.Equal(DecisionProposalStatus.Pending, update.DecisionState.ActiveProposal.Status);
        Assert.Equal(ReadingInterventionModuleIds.FontSize, update.DecisionState.ActiveProposal.ProposedIntervention.ModuleId);
    }

    [Fact]
    public async Task ExternalAutonomousApply_IsAppliedImmediately_FromProviderIngress()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();
        await RegisterProviderAsync(harness);

        await harness.SessionManager.UpdateDecisionConfigurationAsync(
            new DecisionConfigurationSnapshot(
                "External autonomous",
                DecisionProviderIds.External,
                DecisionExecutionModes.Autonomous),
            automationPaused: false);
        await harness.SessionManager.UpdateInterventionPolicyAsync(new ReadingInterventionPolicySnapshot(
            ReadingInterventionCommitBoundaries.Immediate,
            ReadingInterventionCommitBoundaries.Immediate,
            0));

        var sessionId = harness.SessionManager.GetCurrentSnapshot().SessionId!.Value.ToString("D");
        var result = await harness.ProviderIngress.HandleAsync(new ProviderRequestAutonomousApplyRealtimeCommand(
            "conn-1",
            new ProviderRequestAutonomousApplyRealtimePayload(
                "mock-python",
                sessionId,
                "corr-202",
                DecisionExecutionModes.Autonomous,
                "External provider matched the autonomous condition.",
                "token dwell time > 1200 ms",
                1_710_000_005_000,
                new ProviderProposedInterventionRealtimePayload(
                    ReadingInterventionModuleIds.FontSize,
                    "attention-summary",
                    "Increase font size to reduce strain.",
                    new ProviderReadingPresentationPatchRealtimePayload(null, 20, null, null, null, null),
                    new ProviderReaderAppearancePatchRealtimePayload(null, null, null),
                    new Dictionary<string, string?> { ["fontSizePx"] = "20" }))));

        Assert.False(result.ShouldCloseConnection);
        Assert.Empty(result.Responses);

        var update = GetLatestDecisionUpdate(harness);

        Assert.Null(update.DecisionState.ActiveProposal);
        Assert.NotEmpty(update.DecisionState.RecentProposalHistory);
        Assert.Equal(DecisionProposalStatus.AutoApplied, update.DecisionState.RecentProposalHistory[0].Status);
        Assert.Contains(
            harness.Broadcaster.Broadcasts,
            message => message.MessageType == MessageTypes.InterventionEvent
                       && message.Payload is InterventionEventSnapshot intervention
                       && intervention.Source == "mock-python"
                       && intervention.ModuleId == ReadingInterventionModuleIds.FontSize);
    }

    [Fact]
    public async Task GazeStream_IsForwardedToExternalProvider_WithoutBrowserSubscriber()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();
        await RegisterProviderAsync(harness);

        await harness.SessionManager.UpdateDecisionConfigurationAsync(
            new DecisionConfigurationSnapshot(
                "External advisory",
                DecisionProviderIds.External,
                DecisionExecutionModes.Advisory),
            automationPaused: false);
        await harness.SessionManager.ResumeGazeStreamingAsync();

        harness.EyeTrackerAdapter.EmitGazeSample(new GazeData
        {
            DeviceTimeStamp = 123,
            SystemTimeStamp = 456,
            LeftEyeX = 0.25f,
            LeftEyeY = 0.35f,
            LeftEyeValidity = "Valid",
            RightEyeX = 0.26f,
            RightEyeY = 0.36f,
            RightEyeValidity = "Valid"
        });

        Assert.Contains(
            harness.ExternalProviderTransport.Messages,
            message => message.MessageType == ProviderMessageTypes.ProviderGazeSample
                       && message.Payload is GazeData gaze
                       && gaze.DeviceTimeStamp == 123);
    }

    private static async Task RegisterProviderAsync(RealtimeTestDoubles.RuntimeHarness harness)
    {
        var result = await harness.ProviderIngress.HandleAsync(new ProviderHelloRealtimeCommand(
            "conn-1",
            new ProviderHelloRealtimePayload(
                "mock-python",
                "Mock Python Provider",
                ProviderProtocolVersions.V1,
                harness.ExternalProviderOptions.SharedSecret,
                true,
                true,
                [ReadingInterventionModuleIds.FontSize])));

        Assert.False(result.ShouldCloseConnection);
    }

    private static DecisionRealtimeUpdateSnapshot GetLatestDecisionUpdate(RealtimeTestDoubles.RuntimeHarness harness)
    {
        return Assert.IsType<DecisionRealtimeUpdateSnapshot>(
            harness.Broadcaster.Broadcasts
                .Last(message => message.MessageType == MessageTypes.DecisionProposalChanged)
                .Payload);
    }
}
