using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Sensing;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.Decisioning;
using ReadingTheReader.core.Domain.EyeMovementAnalysis;
using ReadingTheReader.core.Domain.Sensing.Calibration;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class RegressionDetectionTests
{
    [Theory]
    [InlineData(SaccadeDirections.Backward, true)]
    [InlineData(SaccadeDirections.LineChangeBackward, true)]
    [InlineData(SaccadeDirections.Forward, false)]
    [InlineData(SaccadeDirections.LineChangeForward, false)]
    [InlineData(SaccadeDirections.Unknown, false)]
    public void SaccadeDirections_ClassifyRegressions(string direction, bool expectedIsRegression)
    {
        Assert.Equal(expectedIsRegression, SaccadeDirections.IsRegression(direction));

        var saccade = new SaccadeSnapshot(
            "token-a", "token-b", "block-1", "block-1", 1, 2, 0, 0, 100, 150, 50, direction);
        Assert.Equal(expectedIsRegression, saccade.IsRegression);
    }

    [Fact]
    public async Task SameLineForwardSaccade_IsNotRegression()
    {
        var state = await RunSaccadeScenarioAsync(
            from: (TokenIndex: 0, LineIndex: 0),
            to: (TokenIndex: 1, LineIndex: 0));

        var saccade = Assert.Single(state.RecentSaccades);
        Assert.Equal(SaccadeDirections.Forward, saccade.Direction);
        Assert.False(saccade.IsRegression);
        Assert.Equal(0, state.RegressionCount);
    }

    [Fact]
    public async Task SameLineBackwardSaccade_IsRegression()
    {
        var state = await RunSaccadeScenarioAsync(
            from: (TokenIndex: 5, LineIndex: 0),
            to: (TokenIndex: 3, LineIndex: 0));

        var saccade = Assert.Single(state.RecentSaccades);
        Assert.Equal(SaccadeDirections.Backward, saccade.Direction);
        Assert.True(saccade.IsRegression);
        Assert.Equal(1, state.RegressionCount);
    }

    [Fact]
    public async Task LineChangeBackwardSaccade_IsRegression()
    {
        var state = await RunSaccadeScenarioAsync(
            from: (TokenIndex: 12, LineIndex: 3),
            to: (TokenIndex: 4, LineIndex: 2));

        var saccade = Assert.Single(state.RecentSaccades);
        Assert.Equal(SaccadeDirections.LineChangeBackward, saccade.Direction);
        Assert.True(saccade.IsRegression);
        Assert.Equal(1, state.RegressionCount);
    }

    [Fact]
    public async Task ReturnSweepToNextLine_IsNotRegression()
    {
        var state = await RunSaccadeScenarioAsync(
            from: (TokenIndex: 20, LineIndex: 0),
            to: (TokenIndex: 21, LineIndex: 1));

        var saccade = Assert.Single(state.RecentSaccades);
        Assert.Equal(SaccadeDirections.LineChangeForward, saccade.Direction);
        Assert.False(saccade.IsRegression);
        Assert.Equal(0, state.RegressionCount);
    }

    [Fact]
    public async Task RegressionCount_AccumulatesAcrossSaccades()
    {
        var strategy = new BuiltInEyeMovementAnalysisStrategy();
        var session = CreateActiveSession();
        var state = EyeMovementAnalysisRuntimeState.Empty;
        var time = 1_000L;

        // token-0 (line 0) -> token-1 (line 0): forward.
        state = await ConfirmFixationAsync(strategy, session, state, "token-0", 0, 0, time);
        time += 500;
        state = await ConfirmFixationAsync(strategy, session, state, "token-1", 1, 0, time);
        time += 500;
        // token-1 -> token-0: same-line regression.
        state = await ConfirmFixationAsync(strategy, session, state, "token-0", 0, 0, time);
        time += 500;
        // token-0 (line 0) -> token-5 (line 1): forward line change.
        state = await ConfirmFixationAsync(strategy, session, state, "token-5", 5, 1, time);
        time += 500;
        // token-5 (line 1) -> token-2 (line 0): line-change regression.
        state = await ConfirmFixationAsync(strategy, session, state, "token-2", 2, 0, time);

        Assert.Equal(4, state.RecentSaccades.Count);
        Assert.Equal(2, state.RegressionCount);
        Assert.Equal(2, state.RecentSaccades.Count(item => item.IsRegression));

        Assert.Equal(2, state.Copy().RegressionCount);
    }

    [Fact]
    public async Task SessionExport_IncludesFixationSaccadeAndRegressionEvents_EndToEnd()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        Assert.True(await harness.SessionManager.StartSessionAsync());

        // Forward read: token-0 -> token-1, then a same-line regression back to token-0.
        var time = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        await ObserveTokenAsync(harness.SessionManager, "token-0", 0, 0, time);
        await ObserveTokenAsync(harness.SessionManager, "token-1", 1, 0, time + 1_000);
        await ObserveTokenAsync(harness.SessionManager, "token-0", 0, 0, time + 2_000);

        await harness.SessionManager.FlushPendingReplayChunksAsync();
        var export = harness.SessionManager.GetCurrentActiveReplayExport();

        Assert.NotNull(export);
        Assert.Equal(2, export!.Derived.FixationEvents!.Count);
        Assert.Equal(2, export.Derived.SaccadeEvents!.Count);
        Assert.Equal(SaccadeDirections.Forward, export.Derived.SaccadeEvents[0].Saccade.Direction);
        Assert.Equal(SaccadeDirections.Backward, export.Derived.SaccadeEvents[1].Saccade.Direction);
        Assert.True(export.Derived.SaccadeEvents[1].Saccade.IsRegression);
        Assert.Equal(1, export.Derived.RegressionCount);

        var serializer = new ExperimentReplayExportSerializer();

        var json = serializer.Serialize(export, ExperimentReplayExportFormats.Json);
        Assert.Contains("\"isRegression\":true", json);
        Assert.Contains("\"regressionCount\":1", json);
        var fromJson = serializer.Deserialize(json, ExperimentReplayExportFormats.Json);
        Assert.Equal(1, fromJson.Derived.RegressionCount);

        var csv = serializer.Serialize(export, ExperimentReplayExportFormats.Csv);
        Assert.Contains("\nfixation,", csv);
        Assert.Contains("\nsaccade,", csv);
        Assert.Contains("\nregression,", csv);
        var fromCsv = serializer.Deserialize(csv, ExperimentReplayExportFormats.Csv);
        Assert.Equal(1, fromCsv.Derived.RegressionCount);
        Assert.Equal(2, fromCsv.Derived.FixationEvents!.Count);
    }

    private static async Task ObserveTokenAsync(
        ExperimentSessionManager sessionManager,
        string tokenId,
        int tokenIndex,
        int lineIndex,
        long startedAtUnixMs)
    {
        foreach (var offsetMs in new[] { 0L, BuiltInEyeMovementAnalysisStrategy.NewLineFixationThresholdMs + 10 })
        {
            await sessionManager.UpdateReadingGazeObservationAsync(new ReadingGazeObservationCommand(
                startedAtUnixMs + offsetMs,
                true,
                0.5,
                0.5,
                tokenId,
                tokenId,
                "word",
                "block-1",
                tokenIndex,
                lineIndex,
                0,
                false,
                null));
        }
    }

    private static async Task<EyeMovementAnalysisRuntimeState> RunSaccadeScenarioAsync(
        (int TokenIndex, int LineIndex) from,
        (int TokenIndex, int LineIndex) to)
    {
        var strategy = new BuiltInEyeMovementAnalysisStrategy();
        var session = CreateActiveSession();
        var state = EyeMovementAnalysisRuntimeState.Empty;

        state = await ConfirmFixationAsync(strategy, session, state, $"token-{from.TokenIndex}", from.TokenIndex, from.LineIndex, 1_000);
        state = await ConfirmFixationAsync(strategy, session, state, $"token-{to.TokenIndex}", to.TokenIndex, to.LineIndex, 2_000);

        return state;
    }

    private static async Task<EyeMovementAnalysisRuntimeState> ConfirmFixationAsync(
        BuiltInEyeMovementAnalysisStrategy strategy,
        ExperimentSessionSnapshot session,
        EyeMovementAnalysisRuntimeState state,
        string tokenId,
        int tokenIndex,
        int lineIndex,
        long startedAtUnixMs)
    {
        // First observation creates the candidate; the second confirms it once the
        // dwell time exceeds the strictest fixation threshold.
        state = await AnalyzeAsync(strategy, session, state, Observation(startedAtUnixMs, tokenId, tokenIndex, lineIndex));
        return await AnalyzeAsync(
            strategy,
            session,
            state,
            Observation(
                startedAtUnixMs + BuiltInEyeMovementAnalysisStrategy.NewLineFixationThresholdMs + 10,
                tokenId,
                tokenIndex,
                lineIndex));
    }

    private static async Task<EyeMovementAnalysisRuntimeState> AnalyzeAsync(
        BuiltInEyeMovementAnalysisStrategy strategy,
        ExperimentSessionSnapshot session,
        EyeMovementAnalysisRuntimeState state,
        ReadingGazeObservationSnapshot observation)
    {
        var result = await strategy.AnalyzeAsync(new EyeMovementAnalysisContextSnapshot(
            session,
            EyeMovementAnalysisConfigurationSnapshot.Default,
            state,
            observation));

        Assert.NotNull(result);
        return result!.RuntimeState;
    }

    private static ReadingGazeObservationSnapshot Observation(
        long observedAtUnixMs,
        string tokenId,
        int tokenIndex,
        int lineIndex)
    {
        return new ReadingGazeObservationSnapshot(
            observedAtUnixMs,
            true,
            0.5,
            0.5,
            tokenId,
            tokenId,
            "word",
            "block-1",
            tokenIndex,
            lineIndex,
            0,
            false,
            ReadingGazeObservationStaleReasons.None);
    }

    private static ExperimentSessionSnapshot CreateActiveSession()
    {
        return new ExperimentSessionSnapshot(
            Guid.NewGuid(),
            true,
            1_000,
            null,
            null,
            null,
            SensingModes.EyeTracker,
            CalibrationSessionSnapshots.CreateIdle(),
            null!,
            0,
            null,
            0,
            ExperimentLiveMonitoringSnapshot.Empty,
            SensingSignalSourcesSnapshot.Default,
            WebcamSensingStatusSnapshot.Default,
            ExternalProviderStatusSnapshot.Disconnected,
            null,
            DecisionConfigurationSnapshot.Default,
            DecisionRuntimeStateSnapshot.Empty);
    }
}
