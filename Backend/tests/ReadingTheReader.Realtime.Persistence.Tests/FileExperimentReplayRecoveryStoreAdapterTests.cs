using System.Text.Json;
using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class FileExperimentReplayRecoveryStoreAdapterTests : IDisposable
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), $"replay-recovery-store-{Guid.NewGuid():N}");

    [Fact]
    public async Task AppendChunkAsync_OverwritesReplayImportFileInsideParticipantNamedFolder()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();
        var snapshot = harness.SessionManager.GetCurrentSnapshot();
        var sessionId = Assert.IsType<Guid>(snapshot.SessionId);

        var firstStore = new FileExperimentReplayRecoveryStoreAdapter(_tempDirectory);
        await firstStore.InitializeSessionAsync(new ExperimentReplayRecoverySessionSeed(
            sessionId,
            snapshot,
            snapshot.StartedAtUnixMs));
        await firstStore.AppendChunkAsync(new ExperimentReplayRecoveryChunkBatch(
            sessionId,
            snapshot,
            snapshot.StartedAtUnixMs + 3_000,
            [new ExperimentLifecycleEventRecord(1, "session-started", "system", snapshot.StartedAtUnixMs)],
            [CreateGazeSampleRecord(2, snapshot.StartedAtUnixMs + 2_500)],
            [],
            [],
            [],
            [],
            []));
        await firstStore.AppendChunkAsync(new ExperimentReplayRecoveryChunkBatch(
            sessionId,
            snapshot,
            snapshot.StartedAtUnixMs + 6_000,
            [new ExperimentLifecycleEventRecord(3, "session-heartbeat", "system", snapshot.StartedAtUnixMs + 5_000)],
            [CreateGazeSampleRecord(4, snapshot.StartedAtUnixMs + 5_500)],
            [],
            [],
            [],
            [],
            []));

        var sessionDirectory = Directory.GetDirectories(_tempDirectory, "*", SearchOption.TopDirectoryOnly).Single();
        var directoryName = Path.GetFileName(sessionDirectory);
        var replayImportPath = Path.Combine(sessionDirectory, "participant-replay-recovery.json");
        var metadataPath = Path.Combine(sessionDirectory, "session-meta.json");
        var recoveredStore = new FileExperimentReplayRecoveryStoreAdapter(_tempDirectory);
        var exportDocument = await recoveredStore.BuildExportAsync(
            sessionId,
            ExperimentReplayRecoveryStatuses.RecoveredIncomplete,
            snapshot.StartedAtUnixMs + 6_000);
        var persistedReplay = JsonSerializer.Deserialize<ExperimentReplayExport>(
            await File.ReadAllTextAsync(replayImportPath),
            JsonOptions);

        Assert.StartsWith("participant-1-", directoryName, StringComparison.Ordinal);
        Assert.True(File.Exists(metadataPath));
        Assert.True(File.Exists(replayImportPath));
        Assert.False(File.Exists(Path.Combine(sessionDirectory, "lifecycle.json")));
        Assert.False(File.Exists(Path.Combine(sessionDirectory, "gaze.json")));
        Assert.NotNull(persistedReplay);
        Assert.Equal(2, persistedReplay!.Sensing.GazeSamples.Count);
        Assert.Equal(2, persistedReplay.Experiment.LifecycleEvents.Count);
        Assert.NotNull(exportDocument);
        Assert.Equal(sessionId, exportDocument!.Experiment.SessionId);
        Assert.Equal(ExperimentReplayRecoveryStatuses.RecoveredIncomplete, exportDocument.Manifest.CompletionSource);
        Assert.Equal(2, exportDocument.Sensing.GazeSamples.Count);
        Assert.Equal(2, exportDocument.Experiment.LifecycleEvents.Count);
        Assert.True(exportDocument.Experiment.EndedAtUnixMs.HasValue);
    }

    [Fact]
    public async Task MarkCompletedAsync_KeepsOnlyCompletedExperimentFile()
    {
        var harness = RealtimeTestDoubles.CreateHarness();
        await RealtimeTestDoubles.TestRuntimeSetup.ConfigureReadySessionAsync(harness);
        await harness.SessionManager.StartSessionAsync();
        var snapshot = harness.SessionManager.GetCurrentSnapshot();
        var sessionId = Assert.IsType<Guid>(snapshot.SessionId);

        var store = new FileExperimentReplayRecoveryStoreAdapter(_tempDirectory);
        await store.InitializeSessionAsync(new ExperimentReplayRecoverySessionSeed(
            sessionId,
            snapshot,
            snapshot.StartedAtUnixMs));
        await store.AppendChunkAsync(new ExperimentReplayRecoveryChunkBatch(
            sessionId,
            snapshot,
            snapshot.StartedAtUnixMs + 3_000,
            [new ExperimentLifecycleEventRecord(1, "session-started", "system", snapshot.StartedAtUnixMs)],
            [CreateGazeSampleRecord(2, snapshot.StartedAtUnixMs + 2_500)],
            [],
            [],
            [],
            [],
            []));

        var completedExport = await store.BuildExportAsync(
            sessionId,
            "researcher-ui",
            snapshot.StartedAtUnixMs + 4_000);
        Assert.NotNull(completedExport);

        await store.MarkCompletedAsync(
            sessionId,
            completedExport!,
            snapshot.StartedAtUnixMs + 4_000);

        var sessionDirectory = Directory.GetDirectories(_tempDirectory, "*", SearchOption.TopDirectoryOnly).Single();
        Assert.True(File.Exists(Path.Combine(sessionDirectory, "completed-experiment.json")));
        Assert.False(File.Exists(Path.Combine(sessionDirectory, "participant-replay-recovery.json")));
        Assert.False(File.Exists(Path.Combine(sessionDirectory, "session-meta.json")));
    }

    private static RawGazeSampleRecord CreateGazeSampleRecord(long sequenceNumber, long capturedAtUnixMs)
    {
        return new RawGazeSampleRecord(
            sequenceNumber,
            capturedAtUnixMs,
            123,
            null,
            new ReplayEyeSample(
                new ReplayEyePoint2D(0.4f, 0.5f, "Valid"),
                null,
                null,
                null,
                null),
            new ReplayEyeSample(
                new ReplayEyePoint2D(0.45f, 0.55f, "Valid"),
                null,
                null,
                null,
                null));
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }
}
