using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ModuleProviderStatusBroadcastTests
{
    [Fact]
    public void EyeMovementAnalysisProviderConnect_BroadcastsExperimentStateWithConnectedStatus()
    {
        var harness = RealtimeTestDoubles.CreateHarness();

        // The analyzer service connecting must push a fresh snapshot so live clients
        // (the researcher view) learn the provider is connected — otherwise the
        // reader-analysis (reading style / cognitive load) panel never turns on.
        harness.ModuleProviderCoordinator.SetActiveProvider(
            FixationAnalysisModuleIds.ModuleId,
            CreateProviderRecord());

        var snapshot = LatestExperimentState(harness);
        Assert.True(snapshot.EyeMovementAnalysisProviderStatus.IsConnected);
    }

    [Fact]
    public void EyeMovementAnalysisProviderDisconnect_BroadcastsExperimentStateWithDisconnectedStatus()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        harness.ModuleProviderCoordinator.SetActiveProvider(
            FixationAnalysisModuleIds.ModuleId,
            CreateProviderRecord());

        harness.ModuleProviderCoordinator.RemoveProvider(FixationAnalysisModuleIds.ModuleId);

        var snapshot = LatestExperimentState(harness);
        Assert.False(snapshot.EyeMovementAnalysisProviderStatus.IsConnected);
    }

    private static ExperimentSessionSnapshot LatestExperimentState(RealtimeTestDoubles.RuntimeHarness harness)
    {
        return Assert.IsType<ExperimentSessionSnapshot>(
            harness.Broadcaster.Broadcasts
                .Last(message => message.MessageType == MessageTypes.ExperimentState)
                .Payload);
    }

    private static ModuleProviderConnectionRecord CreateProviderRecord()
    {
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        return new ModuleProviderConnectionRecord(
            "conn-analyzer-1",
            "mock-python",
            "Mock Eye-Movement Analyzer",
            [FixationAnalysisModuleIds.ModuleId],
            now,
            now);
    }
}
