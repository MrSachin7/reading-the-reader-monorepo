using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
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
        RegisterProvider(harness);

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

        var sessionId = harness.SessionManager.GetCurrentSnapshot().SessionId!.Value.ToString("D");
        var handler = CreateInterventionsHandler(harness);
        var proposalPayload = SerializePayload(new
        {
            providerId = "mock-python",
            sessionId,
            correlationId = "corr-101",
            proposalId = Guid.NewGuid().ToString("D"),
            executionMode = DecisionExecutionModes.Advisory,
            rationale = "Sustained fixation suggests a small font size increase.",
            signalSummary = "token dwell time > 1200 ms",
            providerObservedAtUnixMs = 1_710_000_004_000L,
            proposedIntervention = new
            {
                moduleId = ReadingInterventionModuleIds.FontSize,
                trigger = "attention-summary",
                reason = "Increase font size to reduce strain.",
                presentation = new { fontFamily = (string?)null, fontSizePx = 20, lineWidthPx = (int?)null, lineHeight = (double?)null, letterSpacingEm = (double?)null, editableByResearcher = (bool?)null },
                appearance = new { themeMode = (string?)null, palette = (string?)null, appFont = (string?)null },
                parameters = new Dictionary<string, string?> { ["fontSizePx"] = "20" }
            }
        });
        await handler.HandleAsync(
            InterventionsInboundMessageTypes.SubmitProposal,
            proposalPayload,
            new ModuleProviderContext("conn-1", "mock-python", InterventionsModuleIds.ModuleId, sessionId, "corr-101", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));

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
        RegisterProvider(harness);

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
        var handler = CreateInterventionsHandler(harness);
        var applyPayload = SerializePayload(new
        {
            providerId = "mock-python",
            sessionId,
            correlationId = "corr-202",
            executionMode = DecisionExecutionModes.Autonomous,
            rationale = "External provider matched the autonomous condition.",
            signalSummary = "token dwell time > 1200 ms",
            providerObservedAtUnixMs = 1_710_000_005_000L,
            requestedIntervention = new
            {
                moduleId = ReadingInterventionModuleIds.FontSize,
                trigger = "attention-summary",
                reason = "Increase font size to reduce strain.",
                presentation = new { fontFamily = (string?)null, fontSizePx = 20, lineWidthPx = (int?)null, lineHeight = (double?)null, letterSpacingEm = (double?)null, editableByResearcher = (bool?)null },
                appearance = new { themeMode = (string?)null, palette = (string?)null, appFont = (string?)null },
                parameters = new Dictionary<string, string?> { ["fontSizePx"] = "20" }
            }
        });
        await handler.HandleAsync(
            InterventionsInboundMessageTypes.RequestAutonomousApply,
            applyPayload,
            new ModuleProviderContext("conn-1", "mock-python", InterventionsModuleIds.ModuleId, sessionId, "corr-202", DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));

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
        RegisterProvider(harness);

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
            harness.ExternalProviderGateway.GazeSamples,
            gaze => gaze.DeviceTimeStamp == 123);
    }

    [Fact]
    public async Task ExternalDecisionEvaluation_RecordsPipelineDecisionTelemetry_OnDispatch()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();
        RegisterProvider(harness);

        await harness.SessionManager.UpdateDecisionConfigurationAsync(
            new DecisionConfigurationSnapshot(
                "External advisory",
                DecisionProviderIds.External,
                DecisionExecutionModes.Advisory),
            automationPaused: false);
        await harness.SessionManager.SubscribeGazeDataAsync("researcher-1");

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

        await harness.SessionManager.EvaluateDecisionStrategiesAsync();

        await harness.SessionManager.StopSessionAsync();

        var telemetry = harness.ReplayExportStore.LatestTelemetryExport;
        Assert.NotNull(telemetry);
        Assert.Contains(
            telemetry!.Samples,
            sample => sample.Role == ExperimentTelemetryRoles.PipelineDecision && sample.RttMs is >= 0);
    }

    private static void RegisterProvider(RealtimeTestDoubles.RuntimeHarness harness)
    {
        var caps = new ModuleCapabilities(new Dictionary<string, string?>
        {
            [InterventionsModuleCapabilityKeys.SupportsAdvisoryExecution] = "true",
            [InterventionsModuleCapabilityKeys.SupportsAutonomousExecution] = "true",
            [InterventionsModuleCapabilityKeys.SupportedInterventionModuleIds] = ReadingInterventionModuleIds.FontSize
        });
        harness.ModuleProviderCoordinator.SetActiveProvider(
            InterventionsModuleIds.ModuleId,
            new ModuleProviderConnectionRecord(
                "conn-1",
                "mock-python",
                "Mock Python Provider",
                [InterventionsModuleIds.ModuleId],
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
                new Dictionary<string, ModuleCapabilities>
                {
                    [InterventionsModuleIds.ModuleId] = caps
                }));
    }

    private static InterventionsInboundHandler CreateInterventionsHandler(RealtimeTestDoubles.RuntimeHarness harness)
    {
        return new InterventionsInboundHandler(
            harness.SessionManager,
            harness.ModuleProviderCoordinator,
            new RealtimeTestDoubles.FakeModuleProviderGateway(),
            new ModuleProviderRttTracker());
    }

    private static string SerializePayload<T>(T payload)
    {
        return JsonSerializer.Serialize(payload, new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
    }

    private static DecisionRealtimeUpdateSnapshot GetLatestDecisionUpdate(RealtimeTestDoubles.RuntimeHarness harness)
    {
        return Assert.IsType<DecisionRealtimeUpdateSnapshot>(
            harness.Broadcaster.Broadcasts
                .Last(message => message.MessageType == MessageTypes.DecisionProposalChanged)
                .Payload);
    }
}
