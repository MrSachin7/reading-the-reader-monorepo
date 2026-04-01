using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Decisioning;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Reading;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class DecisionContextFactoryTests
{
    [Fact]
    public async Task MapsFocusAttentionViewportAndRecentInterventions()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        var factory = new DecisionContextFactory();

        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.RegisterParticipantViewAsync("participant-1");
        await harness.SessionManager.UpdateParticipantViewportAsync(
            "participant-1",
            new UpdateParticipantViewportCommand(0.42, 320, 1440, 900, 2800, 920));
        await harness.SessionManager.UpdateReadingFocusAsync(
            new UpdateReadingFocusCommand(true, 0.5, 0.35, "token-1", "block-1"));
        await harness.SessionManager.UpdateReadingAttentionSummaryAsync(
            new UpdateReadingAttentionSummaryCommand(
                1_710_000_002_000,
                new Dictionary<string, ReadingAttentionTokenSnapshot>
                {
                    ["token-1"] = new(340, 1, 0, 340, 340)
                },
                "token-1",
                340,
                1,
                0));

        var intervention = await harness.SessionManager.ApplyInterventionAsync(new ApplyInterventionCommand(
            "manual",
            "researcher-ui",
            "Adjusted font size",
            new ReadingPresentationPatch(null, 20, null, null, null, null),
            new ReaderAppearancePatch(null, "sepia", null)));

        Assert.NotNull(intervention);

        var context = factory.Create(
            harness.SessionManager.GetCurrentSnapshot(),
            new DecisionConfigurationSnapshot(
                "Rule-based advisory",
                DecisionProviderIds.RuleBased,
                DecisionExecutionModes.Advisory),
            new DecisionRuntimeStateSnapshot(true, null, []));

        Assert.Equal("Rule-based advisory", context.ConditionLabel);
        Assert.Equal(DecisionProviderIds.RuleBased, context.ProviderId);
        Assert.Equal(DecisionExecutionModes.Advisory, context.ExecutionMode);
        Assert.True(context.AutomationPaused);
        Assert.False(context.IsSessionActive);
        Assert.Equal(0.42, context.ParticipantViewport.ScrollProgress);
        Assert.Equal("token-1", context.Focus.ActiveTokenId);
        Assert.NotNull(context.AttentionSummary);
        Assert.Equal("token-1", context.AttentionSummary!.CurrentTokenId);
        Assert.Single(context.RecentInterventions);
        Assert.Equal(intervention!.Id, context.RecentInterventions[0].Id);
        Assert.Null(context.RecentInterventions[0].ModuleId);
        Assert.Equal("20", context.RecentInterventions[0].Parameters!["fontSizePx"]);
        Assert.Equal("sepia", context.RecentInterventions[0].Parameters!["palette"]);
        Assert.Equal("sepia", context.Appearance.Palette);
        Assert.Equal(20, context.Presentation.FontSizePx);
    }

    [Fact]
    public void DoesNotExposeFullExperimentSnapshot()
    {
        var propertyNames = typeof(DecisionContextSnapshot)
            .GetProperties()
            .Select(property => property.Name)
            .ToArray();

        Assert.DoesNotContain("Calibration", propertyNames);
        Assert.DoesNotContain("ConnectedClients", propertyNames);
        Assert.DoesNotContain("LatestGazeSample", propertyNames);
        Assert.DoesNotContain("ReadingSession", propertyNames);
        Assert.DoesNotContain("Setup", propertyNames);
    }
}
