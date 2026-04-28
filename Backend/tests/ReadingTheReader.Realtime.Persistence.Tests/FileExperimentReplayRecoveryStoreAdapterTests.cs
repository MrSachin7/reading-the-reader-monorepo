using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Domain.Reading;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class FileExperimentReplayRecoveryStoreAdapterTests : IDisposable
{
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), $"replay-recovery-store-{Guid.NewGuid():N}");

    [Fact]
    public async Task AppendChunkAsync_WritesChunkFilesAndBuildsCorrectExportOnRecovery()
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
        var metadataPath = Path.Combine(sessionDirectory, "session-meta.json");

        // Verify chunk files were written (one per AppendChunkAsync call)
        var chunkFiles = Directory.GetFiles(sessionDirectory, "chunk-*.json.gz");
        Assert.StartsWith("participant-1-", directoryName, StringComparison.Ordinal);
        Assert.True(File.Exists(metadataPath));
        Assert.Equal(2, chunkFiles.Length);
        Assert.False(File.Exists(Path.Combine(sessionDirectory, "participant-replay-recovery.json")));
        Assert.False(File.Exists(Path.Combine(sessionDirectory, "participant-replay-recovery.json.gz")));

        // Verify a new store instance recovers correctly from chunk files
        var recoveredStore = new FileExperimentReplayRecoveryStoreAdapter(_tempDirectory);
        var exportDocument = await recoveredStore.BuildExportAsync(
            sessionId,
            ExperimentReplayRecoveryStatuses.RecoveredIncomplete,
            snapshot.StartedAtUnixMs + 6_000);

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
        Assert.True(File.Exists(Path.Combine(sessionDirectory, "completed-experiment.json.gz")));
        Assert.Empty(Directory.GetFiles(sessionDirectory, "chunk-*.json.gz"));
        Assert.False(File.Exists(Path.Combine(sessionDirectory, "session-meta.json")));
    }

    [Fact]
    public async Task BuildProcessedExportAsync_PrefersEnrichedFocusSamplesWhenAvailable()
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
            snapshot.StartedAtUnixMs + 6_000,
            [new ExperimentLifecycleEventRecord(1, "session-started", "system", snapshot.StartedAtUnixMs)],
            [
                CreateGazeSampleRecord(20, snapshot.StartedAtUnixMs + 1_000),
                CreateGazeSampleRecord(40, snapshot.StartedAtUnixMs + 3_000),
                CreateGazeSampleRecord(60, snapshot.StartedAtUnixMs + 5_000),
            ],
            [
                CreateEnrichedGazeSampleRecord(21, snapshot.StartedAtUnixMs + 1_000, "token-1", "Alpha"),
                CreateEnrichedGazeSampleRecord(41, snapshot.StartedAtUnixMs + 3_000, null, null),
                CreateEnrichedGazeSampleRecord(61, snapshot.StartedAtUnixMs + 5_000, "token-2", "Beta"),
            ],
            [],
            [
                CreateFocusEventRecord(30, snapshot.StartedAtUnixMs + 2_000, "token-1", "Alpha"),
                CreateFocusEventRecord(50, snapshot.StartedAtUnixMs + 4_000, "token-2", "Beta"),
            ],
            [],
            [],
            []));

        var exportDocument = await store.BuildProcessedExportAsync(
            sessionId,
            "researcher-ui",
            snapshot.StartedAtUnixMs + 6_000);

        Assert.NotNull(exportDocument);
        Assert.Equal(ExperimentProcessedExportSchema.Name, exportDocument!.Manifest.Schema);
        Assert.Equal(ExperimentProcessedExportSchema.Version, exportDocument.Manifest.Version);
        Assert.Equal("processed", exportDocument.Manifest.ExportProfile);
        Assert.Equal(3, exportDocument.GazeSamples.Count);
        Assert.Equal([1L, 2L, 3L], exportDocument.GazeSamples.Select(item => item.SequenceNumber).ToArray());
        Assert.Equal("token-1", exportDocument.GazeSamples[0].Focus?.ActiveTokenId);
        Assert.Equal("Alpha", exportDocument.GazeSamples[0].Focus?.ActiveTokenText);
        Assert.NotNull(exportDocument.GazeSamples[1].Focus);
        Assert.False(exportDocument.GazeSamples[1].Focus!.IsInsideReadingArea);
        Assert.Null(exportDocument.GazeSamples[1].Focus?.ActiveTokenId);
        Assert.Equal("token-2", exportDocument.GazeSamples[2].Focus?.ActiveTokenId);
        Assert.Equal("Beta", exportDocument.GazeSamples[2].Focus?.ActiveTokenText);
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

    private static ReadingFocusEventRecord CreateFocusEventRecord(
        long sequenceNumber,
        long updatedAtUnixMs,
        string activeTokenId,
        string activeTokenText)
    {
        return new ReadingFocusEventRecord(
            sequenceNumber,
            updatedAtUnixMs,
            new ReadingFocusSnapshot(
                true,
                0.5,
                0.25,
                activeTokenId,
                "block-1",
                "sentence-1",
                updatedAtUnixMs,
                activeTokenText));
    }

    private static EnrichedGazeSampleRecord CreateEnrichedGazeSampleRecord(
        long sequenceNumber,
        long capturedAtUnixMs,
        string? activeTokenId,
        string? activeTokenText)
    {
        var focus = string.IsNullOrWhiteSpace(activeTokenId)
            ? ReadingFocusSnapshot.Empty with { UpdatedAtUnixMs = capturedAtUnixMs }
            : new ReadingFocusSnapshot(
                true,
                0.5,
                0.25,
                activeTokenId,
                "block-1",
                "sentence-1",
                capturedAtUnixMs,
                activeTokenText);

        return new EnrichedGazeSampleRecord(
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
                null),
            focus);
    }

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }
}
