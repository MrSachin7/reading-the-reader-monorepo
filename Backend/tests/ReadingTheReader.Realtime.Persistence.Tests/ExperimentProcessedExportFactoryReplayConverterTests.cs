using ReadingTheReader.Realtime.Persistence;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Domain.Reading;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ExperimentProcessedExportFactoryReplayConverterTests : IDisposable
{
    private readonly string _tempDirectory = Path.Combine(Path.GetTempPath(), $"replay-converter-{Guid.NewGuid():N}");

    [Fact]
    public async Task Create_FromReplayExport_ProducesSameShapeAsLiveProcessedExport()
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
                BuildGazeSample(20, snapshot.StartedAtUnixMs + 1_000),
                BuildGazeSample(40, snapshot.StartedAtUnixMs + 3_000),
                BuildGazeSample(60, snapshot.StartedAtUnixMs + 5_000),
            ],
            [],
            [],
            [],
            [
                BuildFocusEvent(30, snapshot.StartedAtUnixMs + 2_000, "token-1", "Alpha"),
                BuildFocusEvent(50, snapshot.StartedAtUnixMs + 4_000, "token-2", "Beta"),
            ],
            [],
            []));

        var liveProcessed = await store.BuildProcessedExportAsync(
            sessionId,
            "researcher-ui",
            snapshot.StartedAtUnixMs + 6_000);
        Assert.NotNull(liveProcessed);

        var replayExport = await store.BuildExportAsync(
            sessionId,
            "researcher-ui",
            snapshot.StartedAtUnixMs + 6_000);
        Assert.NotNull(replayExport);

        var convertedProcessed = ExperimentProcessedExportFactory.Create(replayExport!);

        Assert.Equal(ExperimentProcessedExportSchema.Name, convertedProcessed.Manifest.Schema);
        Assert.Equal(ExperimentProcessedExportSchema.Version, convertedProcessed.Manifest.Version);
        Assert.Equal("processed", convertedProcessed.Manifest.ExportProfile);
        Assert.Equal(
            ExperimentProcessedExportSchema.Version.ToString(),
            convertedProcessed.Manifest.Producer.ExporterVersion);

        Assert.Equal(liveProcessed!.Experiment.SessionId, convertedProcessed.Experiment.SessionId);
        Assert.Equal(liveProcessed.Content.DocumentId, convertedProcessed.Content.DocumentId);
        Assert.Equal(liveProcessed.GazeSamples.Count, convertedProcessed.GazeSamples.Count);
        Assert.Equal(
            liveProcessed.GazeSamples.Select(s => s.Focus?.ActiveTokenId).ToArray(),
            convertedProcessed.GazeSamples.Select(s => s.Focus?.ActiveTokenId).ToArray());
        Assert.Equal(liveProcessed.MaterialSummaries.Count, convertedProcessed.MaterialSummaries.Count);

        // Empty intervention/token streams in this chunk-built scenario flow through as empty (not null).
        Assert.NotNull(convertedProcessed.Interventions);
        Assert.Empty(convertedProcessed.Interventions.DecisionProposals);
        Assert.Empty(convertedProcessed.Interventions.InterventionEvents);
    }

    [Fact]
    public void Create_FromReplayExport_NullArgument_Throws()
    {
        Assert.Throws<ArgumentNullException>(() => ExperimentProcessedExportFactory.Create((ExperimentReplayExport)null!));
    }

    private static RawGazeSampleRecord BuildGazeSample(long sequenceNumber, long capturedAtUnixMs)
    {
        var eye = new ReplayEyeSample(
            new ReplayEyePoint2D(0.4f, 0.5f, "Valid"),
            null,
            null,
            null,
            null);
        return new RawGazeSampleRecord(sequenceNumber, capturedAtUnixMs, 123, null, eye, eye);
    }

    private static ReadingFocusEventRecord BuildFocusEvent(
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

    public void Dispose()
    {
        if (Directory.Exists(_tempDirectory))
        {
            Directory.Delete(_tempDirectory, recursive: true);
        }
    }
}
