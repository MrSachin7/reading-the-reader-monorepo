using System.IO.Compression;
using System.Text.Json;
using System.Text.Json.Serialization;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;
using ReadingTheReader.core.Domain.Reading;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileExperimentReplayRecoveryStoreAdapter : IExperimentReplayRecoveryStoreAdapter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly JsonSerializerOptions ExportJsonOptions = new(JsonSerializerDefaults.Web)
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
    private const string SessionMetadataFileName = "session-meta.json";
    private const string CompletedExportFileName = "completed-experiment.json.gz";
    private const string ChunkFilePrefix = "chunk-";
    private const string ChunkFileSuffix = ".json.gz";

    private readonly string _rootDirectoryPath;
    private readonly Dictionary<Guid, string> _sessionDirectoryPathsBySessionId = [];
    private readonly Dictionary<Guid, int> _nextChunkNumberBySessionId = [];
    private readonly Lock _sessionDirectoryGate = new();
    private readonly Lock _chunkNumberGate = new();

    public FileExperimentReplayRecoveryStoreAdapter(string rootDirectoryPath)
    {
        _rootDirectoryPath = rootDirectoryPath;
        Directory.CreateDirectory(_rootDirectoryPath);
        RecoverInterruptedSessions();
    }

    public async ValueTask InitializeSessionAsync(ExperimentReplayRecoverySessionSeed seed, CancellationToken ct = default)
    {
        var directoryName = BuildDirectoryName(seed.InitialSnapshot, seed.SessionId);
        var sessionDirectoryPath = Path.Combine(_rootDirectoryPath, directoryName);
        Directory.CreateDirectory(sessionDirectoryPath);
        RememberSessionDirectoryPath(seed.SessionId, sessionDirectoryPath);

        var metadata = new RecoverySessionMetadata
        {
            Id = seed.SessionId.ToString("N"),
            SessionId = seed.SessionId,
            DirectoryName = directoryName,
            Name = BuildName(seed.InitialSnapshot, seed.SessionId),
            Status = ExperimentReplayRecoveryStatuses.Recording,
            CreatedAtUnixMs = seed.CreatedAtUnixMs,
            UpdatedAtUnixMs = seed.CreatedAtUnixMs,
            InitialSnapshot = seed.InitialSnapshot.Copy(),
            LatestSnapshot = seed.InitialSnapshot.Copy()
        };

        await WriteMetadataAsync(metadata, ct);
    }

    public async ValueTask AppendChunkAsync(ExperimentReplayRecoveryChunkBatch batch, CancellationToken ct = default)
    {
        var metadata = await ReadMetadataAsync(batch.SessionId, ct);
        if (metadata is null)
        {
            return;
        }

        metadata.UpdatedAtUnixMs = batch.FlushedAtUnixMs;
        metadata.LatestSnapshot = batch.LatestSnapshot.Copy();
        if (batch.LatestTokenStats is not null)
        {
            metadata.LatestTokenStats = batch.LatestTokenStats.ToDictionary(
                e => e.Key, e => e.Value.Copy(), StringComparer.Ordinal);
        }

        var sessionDirectoryPath = GetSessionDirectoryPath(batch.SessionId);
        var chunkNumber = GetNextChunkNumber(batch.SessionId, sessionDirectoryPath);
        await WriteChunkFileAsync(sessionDirectoryPath, chunkNumber, batch, ct);
        await WriteMetadataAsync(metadata, ct);
    }

    public async ValueTask<ExperimentReplayExport?> BuildExportAsync(
        Guid sessionId,
        string completionSource,
        long exportedAtUnixMs,
        CancellationToken ct = default)
    {
        var metadata = await ReadMetadataAsync(sessionId, ct);
        if (metadata?.InitialSnapshot is null || metadata.LatestSnapshot is null)
        {
            return null;
        }

        var sessionDirectoryPath = GetSessionDirectoryPath(sessionId);
        var chunks = await ReadAllChunksAsync(sessionDirectoryPath, ct);
        return BuildMergedExportFromChunks(metadata, chunks, completionSource, exportedAtUnixMs);
    }

    public async ValueTask<ExperimentProcessedExport?> BuildProcessedExportAsync(
        Guid sessionId,
        string completionSource,
        long exportedAtUnixMs,
        CancellationToken ct = default)
    {
        var metadata = await ReadMetadataAsync(sessionId, ct);
        if (metadata?.InitialSnapshot is null || metadata.LatestSnapshot is null)
        {
            return null;
        }

        var sessionDirectoryPath = GetSessionDirectoryPath(sessionId);
        var chunks = await ReadAllChunksAsync(sessionDirectoryPath, ct);
        return BuildMergedProcessedExportFromChunks(metadata, chunks, completionSource, exportedAtUnixMs);
    }

    public async ValueTask MarkCompletedAsync(
        Guid sessionId,
        ExperimentReplayExport completedExport,
        long completedAtUnixMs,
        CancellationToken ct = default)
    {
        var metadata = await ReadMetadataAsync(sessionId, ct);
        if (metadata is null)
        {
            return;
        }

        var sessionDirectoryPath = GetSessionDirectoryPath(sessionId);
        await WriteBytesAsync(
            Path.Combine(sessionDirectoryPath, CompletedExportFileName),
            SerializeToGzip(completedExport),
            ct);

        foreach (var chunkPath in EnumerateChunkFiles(sessionDirectoryPath))
        {
            DeleteFileIfExists(chunkPath);
        }
        DeleteFileIfExists(Path.Combine(sessionDirectoryPath, SessionMetadataFileName));
    }

    private IEnumerable<string> EnumerateSessionDirectories()
    {
        if (!Directory.Exists(_rootDirectoryPath))
        {
            return [];
        }

        return Directory.EnumerateDirectories(_rootDirectoryPath, "*", SearchOption.TopDirectoryOnly);
    }

    private static IEnumerable<string> EnumerateChunkFiles(string sessionDirectoryPath)
    {
        if (!Directory.Exists(sessionDirectoryPath))
        {
            return [];
        }

        return Directory.EnumerateFiles(sessionDirectoryPath, $"{ChunkFilePrefix}*{ChunkFileSuffix}");
    }

    private ExperimentReplayExport BuildMergedExportFromChunks(
        RecoverySessionMetadata metadata,
        RecoveryChunkData[] chunks,
        string completionSource,
        long exportedAtUnixMs)
    {
        static T[] Merge<T>(RecoveryChunkData[] items, Func<RecoveryChunkData, T[]?> selector, Func<T, long> getSequenceNumber)
            => items.SelectMany(c => selector(c) ?? []).OrderBy(getSequenceNumber).ToArray();

        var finalTokenStats = chunks
            .LastOrDefault(c => c.LatestTokenStats is not null)?.LatestTokenStats
            ?? metadata.LatestTokenStats;

        return ExperimentReplayExportFactory.Create(
            metadata.InitialSnapshot,
            metadata.LatestSnapshot,
            completionSource,
            exportedAtUnixMs,
            Merge(chunks, c => c.LifecycleEvents, e => e.SequenceNumber),
            Merge(chunks, c => c.GazeSamples, e => e.SequenceNumber),
            Merge(chunks, c => c.ViewportEvents, e => e.SequenceNumber),
            Merge(chunks, c => c.FocusEvents, e => e.SequenceNumber),
            Merge(chunks, c => c.AttentionEvents, e => e.SequenceNumber),
            Merge(chunks, c => c.ContextPreservationEvents, e => e.SequenceNumber),
            Merge(chunks, c => c.DecisionProposalEvents, e => e.SequenceNumber),
            Merge(chunks, c => c.ScheduledInterventionEvents, e => e.SequenceNumber),
            Merge(chunks, c => c.InterventionEvents, e => e.SequenceNumber),
            finalTokenStats);
    }

    private ExperimentProcessedExport BuildMergedProcessedExportFromChunks(
        RecoverySessionMetadata metadata,
        RecoveryChunkData[] chunks,
        string completionSource,
        long exportedAtUnixMs)
    {
        static T[] Merge<T>(RecoveryChunkData[] items, Func<RecoveryChunkData, T[]?> selector, Func<T, long> getSequenceNumber)
            => items.SelectMany(c => selector(c) ?? []).OrderBy(getSequenceNumber).ToArray();

        return ExperimentProcessedExportFactory.Create(
            metadata.InitialSnapshot,
            metadata.LatestSnapshot,
            completionSource,
            exportedAtUnixMs,
            Merge(chunks, c => c.LifecycleEvents, e => e.SequenceNumber),
            Merge(chunks, c => c.GazeSamples, e => e.SequenceNumber),
            Merge(chunks, c => c.FocusEvents, e => e.SequenceNumber),
            Merge(chunks, c => c.EnrichedGazeSamples, e => e.SequenceNumber));
    }

    private async ValueTask<RecoveryChunkData[]> ReadAllChunksAsync(string sessionDirectoryPath, CancellationToken ct)
    {
        var results = new List<(int number, RecoveryChunkData chunk)>();
        foreach (var filePath in EnumerateChunkFiles(sessionDirectoryPath))
        {
            var baseName = Path.GetFileName(filePath);
            if (!baseName.StartsWith(ChunkFilePrefix, StringComparison.Ordinal) ||
                !baseName.EndsWith(ChunkFileSuffix, StringComparison.Ordinal))
            {
                continue;
            }

            var numberPart = baseName[ChunkFilePrefix.Length..^ChunkFileSuffix.Length];
            if (!int.TryParse(numberPart, out var chunkNumber))
            {
                continue;
            }

            try
            {
                var bytes = await File.ReadAllBytesAsync(filePath, ct);
                var chunk = DeserializeFromGzip<RecoveryChunkData>(bytes);
                if (chunk is not null)
                {
                    results.Add((chunkNumber, chunk));
                }
            }
            catch
            {
                // Skip corrupted chunks rather than aborting the merge
            }
        }

        return results.OrderBy(r => r.number).Select(r => r.chunk).ToArray();
    }

    private async ValueTask WriteChunkFileAsync(
        string sessionDirectoryPath,
        int chunkNumber,
        ExperimentReplayRecoveryChunkBatch batch,
        CancellationToken ct)
    {
        var chunk = new RecoveryChunkData
        {
            FlushedAtUnixMs = batch.FlushedAtUnixMs,
            LifecycleEvents = batch.LifecycleEvents?.ToArray(),
            GazeSamples = batch.GazeSamples?.ToArray(),
            EnrichedGazeSamples = batch.EnrichedGazeSamples?.ToArray(),
            ViewportEvents = batch.ViewportEvents?.ToArray(),
            FocusEvents = batch.FocusEvents?.ToArray(),
            AttentionEvents = batch.AttentionEvents?.ToArray(),
            ContextPreservationEvents = batch.ContextPreservationEvents?.ToArray(),
            DecisionProposalEvents = batch.DecisionProposalEvents?.ToArray(),
            ScheduledInterventionEvents = batch.ScheduledInterventionEvents?.ToArray(),
            InterventionEvents = batch.InterventionEvents?.ToArray(),
            LatestTokenStats = batch.LatestTokenStats?.ToDictionary(e => e.Key, e => e.Value.Copy(), StringComparer.Ordinal),
        };

        var path = Path.Combine(sessionDirectoryPath, BuildChunkFileName(chunkNumber));
        await WriteBytesAsync(path, SerializeToGzip(chunk), ct);
    }

    private void RecoverInterruptedSessions()
    {
        foreach (var sessionDirectory in EnumerateSessionDirectories())
        {
            RecoverySessionMetadata? metadata;
            try
            {
                metadata = ReadMetadataAsync(sessionDirectory, CancellationToken.None).AsTask().GetAwaiter().GetResult();
            }
            catch
            {
                continue;
            }

            if (metadata is null ||
                !string.Equals(metadata.Status, ExperimentReplayRecoveryStatuses.Recording, StringComparison.Ordinal))
            {
                continue;
            }

            metadata.Status = ExperimentReplayRecoveryStatuses.RecoveredIncomplete;
            metadata.UpdatedAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            metadata.LatestSnapshot = metadata.LatestSnapshot with
            {
                IsActive = false,
                StoppedAtUnixMs = metadata.LatestSnapshot.StoppedAtUnixMs ?? metadata.UpdatedAtUnixMs
            };

            RememberSessionDirectoryPath(metadata.SessionId, sessionDirectory);
            WriteMetadataAsync(metadata, CancellationToken.None).AsTask().GetAwaiter().GetResult();
        }
    }

    private async ValueTask<RecoverySessionMetadata?> ReadMetadataAsync(Guid sessionId, CancellationToken ct)
    {
        return await ReadMetadataAsync(GetSessionDirectoryPath(sessionId), ct);
    }

    private async ValueTask<RecoverySessionMetadata?> ReadMetadataAsync(string sessionDirectoryPath, CancellationToken ct)
    {
        var metadataPath = Path.Combine(sessionDirectoryPath, SessionMetadataFileName);
        if (!File.Exists(metadataPath))
        {
            return null;
        }

        try
        {
            var content = await File.ReadAllTextAsync(metadataPath, ct);
            var metadata = JsonSerializer.Deserialize<RecoverySessionMetadata>(content, JsonOptions);
            if (metadata is null)
            {
                return null;
            }

            if (string.IsNullOrWhiteSpace(metadata.DirectoryName))
            {
                metadata.DirectoryName = Path.GetFileName(sessionDirectoryPath);
            }

            return metadata;
        }
        catch (IOException)
        {
            return null;
        }
        catch (JsonException)
        {
            return null;
        }
    }

    private async ValueTask WriteMetadataAsync(RecoverySessionMetadata metadata, CancellationToken ct)
    {
        RememberSessionDirectoryPath(metadata.SessionId, Path.Combine(_rootDirectoryPath, metadata.DirectoryName));
        await WriteContentAsync(
            Path.Combine(GetSessionDirectoryPath(metadata.SessionId), SessionMetadataFileName),
            JsonSerializer.Serialize(metadata, JsonOptions),
            ct);
    }

    private static string BuildName(ExperimentSessionSnapshot snapshot, Guid sessionId)
    {
        return snapshot.ReadingSession?.Content?.Title?.Trim() switch
        {
            { Length: > 0 } title => title,
            _ => snapshot.Participant?.Name?.Trim() switch
            {
                { Length: > 0 } participantName => participantName,
                _ => $"Recovered session {sessionId:N}"
            }
        };
    }

    private static string BuildDirectoryName(ExperimentSessionSnapshot snapshot, Guid sessionId)
    {
        var participantName = snapshot.Participant?.Name?.Trim();
        var sanitizedParticipantName = SanitizePathSegment(participantName);
        return string.IsNullOrWhiteSpace(sanitizedParticipantName)
            ? $"session-{sessionId:N}"
            : $"{sanitizedParticipantName}-{sessionId:N}";
    }

    private static string BuildChunkFileName(int chunkNumber)
        => $"{ChunkFilePrefix}{chunkNumber:D6}{ChunkFileSuffix}";

    private static string SanitizePathSegment(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return string.Empty;
        }

        var builder = new System.Text.StringBuilder(value.Length);
        var previousWasSeparator = false;

        foreach (var character in value.Trim().ToLowerInvariant())
        {
            if (char.IsLetterOrDigit(character))
            {
                builder.Append(character);
                previousWasSeparator = false;
                continue;
            }

            if (previousWasSeparator)
            {
                continue;
            }

            builder.Append('-');
            previousWasSeparator = true;
        }

        return builder.ToString().Trim('-');
    }

    private int GetNextChunkNumber(Guid sessionId, string sessionDirectoryPath)
    {
        lock (_chunkNumberGate)
        {
            if (!_nextChunkNumberBySessionId.TryGetValue(sessionId, out var next))
            {
                next = FindMaxChunkNumber(sessionDirectoryPath) + 1;
                if (next <= 0)
                {
                    next = 1;
                }
            }
            _nextChunkNumberBySessionId[sessionId] = next + 1;
            return next;
        }
    }

    private static int FindMaxChunkNumber(string sessionDirectoryPath)
    {
        var max = 0;
        foreach (var filePath in EnumerateChunkFiles(sessionDirectoryPath))
        {
            var baseName = Path.GetFileName(filePath);
            if (!baseName.StartsWith(ChunkFilePrefix, StringComparison.Ordinal) ||
                !baseName.EndsWith(ChunkFileSuffix, StringComparison.Ordinal))
            {
                continue;
            }

            var numberPart = baseName[ChunkFilePrefix.Length..^ChunkFileSuffix.Length];
            if (int.TryParse(numberPart, out var n) && n > max)
            {
                max = n;
            }
        }
        return max;
    }

    private string GetSessionDirectoryPath(Guid sessionId)
    {
        lock (_sessionDirectoryGate)
        {
            if (_sessionDirectoryPathsBySessionId.TryGetValue(sessionId, out var knownPath))
            {
                return knownPath;
            }
        }

        foreach (var sessionDirectory in EnumerateSessionDirectories())
        {
            var metadata = ReadMetadataAsync(sessionDirectory, CancellationToken.None).AsTask().GetAwaiter().GetResult();
            if (metadata?.SessionId != sessionId)
            {
                continue;
            }

            RememberSessionDirectoryPath(sessionId, sessionDirectory);
            return sessionDirectory;
        }

        return Path.Combine(_rootDirectoryPath, sessionId.ToString("N"));
    }

    private void RememberSessionDirectoryPath(Guid sessionId, string sessionDirectoryPath)
    {
        lock (_sessionDirectoryGate)
        {
            _sessionDirectoryPathsBySessionId[sessionId] = sessionDirectoryPath;
        }
    }

    private byte[] SerializeToGzip<T>(T value)
    {
        using var ms = new MemoryStream();
        using (var gz = new GZipStream(ms, CompressionLevel.Optimal))
        {
            JsonSerializer.Serialize(gz, value, ExportJsonOptions);
        }
        return ms.ToArray();
    }

    private T? DeserializeFromGzip<T>(byte[] bytes)
    {
        using var ms = new MemoryStream(bytes);
        using var gz = new GZipStream(ms, CompressionMode.Decompress);
        return JsonSerializer.Deserialize<T>(gz, ExportJsonOptions);
    }

    private static async ValueTask WriteContentAsync(string path, string content, CancellationToken ct)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var tempPath = Path.Combine(
            directory ?? Path.GetTempPath(),
            $"{Path.GetFileName(path)}.{Guid.NewGuid():N}.tmp");

        try
        {
            await File.WriteAllTextAsync(tempPath, content, ct);
            await ReplaceFileWithRetryAsync(tempPath, path, ct);
        }
        finally
        {
            DeleteFileIfExists(tempPath);
        }
    }

    private static async ValueTask WriteBytesAsync(string path, byte[] bytes, CancellationToken ct)
    {
        var directory = Path.GetDirectoryName(path);
        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var tempPath = Path.Combine(
            directory ?? Path.GetTempPath(),
            $"{Path.GetFileName(path)}.{Guid.NewGuid():N}.tmp");

        try
        {
            await File.WriteAllBytesAsync(tempPath, bytes, ct);
            await ReplaceFileWithRetryAsync(tempPath, path, ct);
        }
        finally
        {
            DeleteFileIfExists(tempPath);
        }
    }

    private static async ValueTask ReplaceFileWithRetryAsync(string tempPath, string destinationPath, CancellationToken ct)
    {
        const int maxAttempts = 5;

        for (var attempt = 1; attempt <= maxAttempts; attempt++)
        {
            try
            {
                File.Move(tempPath, destinationPath, overwrite: true);
                return;
            }
            catch (Exception ex) when ((ex is IOException or UnauthorizedAccessException) && attempt < maxAttempts)
            {
                await Task.Delay(20, ct);
            }
        }

        File.Move(tempPath, destinationPath, overwrite: true);
    }

    private static void DeleteFileIfExists(string path)
    {
        if (!File.Exists(path))
        {
            return;
        }

        File.Delete(path);
    }

    private sealed class RecoveryChunkData
    {
        public long FlushedAtUnixMs { get; set; }
        public ExperimentLifecycleEventRecord[]? LifecycleEvents { get; set; }
        public RawGazeSampleRecord[]? GazeSamples { get; set; }
        public EnrichedGazeSampleRecord[]? EnrichedGazeSamples { get; set; }
        public ParticipantViewportEventRecord[]? ViewportEvents { get; set; }
        public ReadingFocusEventRecord[]? FocusEvents { get; set; }
        public ReadingAttentionEventRecord[]? AttentionEvents { get; set; }
        public ReadingContextPreservationEventRecord[]? ContextPreservationEvents { get; set; }
        public DecisionProposalEventRecord[]? DecisionProposalEvents { get; set; }
        public ScheduledInterventionEventRecord[]? ScheduledInterventionEvents { get; set; }
        public InterventionEventRecord[]? InterventionEvents { get; set; }
        public Dictionary<string, ReadingAttentionTokenSnapshot>? LatestTokenStats { get; set; }
    }

    private sealed class RecoverySessionMetadata
    {
        public string Id { get; set; } = string.Empty;
        public Guid SessionId { get; set; }
        public string DirectoryName { get; set; } = string.Empty;
        public string Name { get; set; } = string.Empty;
        public string Status { get; set; } = ExperimentReplayRecoveryStatuses.Recording;
        public long CreatedAtUnixMs { get; set; }
        public long UpdatedAtUnixMs { get; set; }
        public long? CompletedAtUnixMs { get; set; }
        public ExperimentSessionSnapshot InitialSnapshot { get; set; } = null!;
        public ExperimentSessionSnapshot LatestSnapshot { get; set; } = null!;
        public Dictionary<string, ReadingAttentionTokenSnapshot>? LatestTokenStats { get; set; }
    }
}
