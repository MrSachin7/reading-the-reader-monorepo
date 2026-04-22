using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Replay;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Session;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileExperimentReplayRecoveryStoreAdapter : IExperimentReplayRecoveryStoreAdapter
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private const string SessionMetadataFileName = "session-meta.json";
    private const string RecoveryExportFileName = "participant-replay-recovery.json";
    private const string CompletedExportFileName = "completed-experiment.json";

    private readonly string _rootDirectoryPath;
    private readonly Dictionary<Guid, string> _sessionDirectoryPathsBySessionId = [];
    private readonly Lock _sessionDirectoryGate = new();

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

        var recoveryExport = ExperimentReplayExportFactory.Create(
            metadata.InitialSnapshot,
            metadata.LatestSnapshot,
            ExperimentReplayRecoveryStatuses.Recording,
            seed.CreatedAtUnixMs,
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []);

        await WriteMetadataAsync(metadata, ct);
        await WriteRecoveryExportAsync(sessionDirectoryPath, recoveryExport, ct);
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

        var sessionDirectoryPath = GetSessionDirectoryPath(batch.SessionId);
        var existingExport = await ReadRecoveryExportAsync(sessionDirectoryPath, ct);
        var recoveryExport = BuildMergedExport(
            metadata,
            existingExport,
            ExperimentReplayRecoveryStatuses.Recording,
            batch.FlushedAtUnixMs,
            batch.LifecycleEvents,
            batch.GazeSamples,
            batch.ViewportEvents,
            batch.FocusEvents,
            batch.AttentionEvents,
            batch.ContextPreservationEvents ?? [],
            batch.DecisionProposalEvents ?? [],
            batch.ScheduledInterventionEvents ?? [],
            batch.InterventionEvents ?? []);

        await WriteMetadataAsync(metadata, ct);
        await WriteRecoveryExportAsync(sessionDirectoryPath, recoveryExport, ct);
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
        var existingExport = await ReadRecoveryExportAsync(sessionDirectoryPath, ct);
        return BuildMergedExport(
            metadata,
            existingExport,
            completionSource,
            exportedAtUnixMs,
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []);
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
        await WriteContentAsync(
            Path.Combine(sessionDirectoryPath, CompletedExportFileName),
            JsonSerializer.Serialize(completedExport, JsonOptions),
            ct);
        DeleteFileIfExists(Path.Combine(sessionDirectoryPath, RecoveryExportFileName));
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

    private ExperimentReplayExport BuildMergedExport(
        RecoverySessionMetadata metadata,
        ExperimentReplayExport? existingExport,
        string completionSource,
        long exportedAtUnixMs,
        IReadOnlyList<ExperimentLifecycleEventRecord> lifecycleEvents,
        IReadOnlyList<RawGazeSampleRecord> gazeSamples,
        IReadOnlyList<ParticipantViewportEventRecord> viewportEvents,
        IReadOnlyList<ReadingFocusEventRecord> focusEvents,
        IReadOnlyList<ReadingAttentionEventRecord> attentionEvents,
        IReadOnlyList<ReadingContextPreservationEventRecord> contextPreservationEvents,
        IReadOnlyList<DecisionProposalEventRecord> decisionProposalEvents,
        IReadOnlyList<ScheduledInterventionEventRecord> scheduledInterventionEvents,
        IReadOnlyList<InterventionEventRecord> interventionEvents)
    {
        return ExperimentReplayExportFactory.Create(
            metadata.InitialSnapshot,
            metadata.LatestSnapshot,
            completionSource,
            exportedAtUnixMs,
            MergeAndSort(existingExport?.Experiment.LifecycleEvents, lifecycleEvents, item => item.SequenceNumber),
            MergeAndSort(existingExport?.Sensing.GazeSamples, gazeSamples, item => item.SequenceNumber),
            MergeAndSort(existingExport?.Derived.ViewportEvents, viewportEvents, item => item.SequenceNumber),
            MergeAndSort(existingExport?.Derived.FocusEvents, focusEvents, item => item.SequenceNumber),
            MergeAndSort(existingExport?.Derived.AttentionEvents, attentionEvents, item => item.SequenceNumber),
            MergeAndSort(existingExport?.Derived.ContextPreservationEvents, contextPreservationEvents, item => item.SequenceNumber),
            MergeAndSort(existingExport?.Interventions.DecisionProposals, decisionProposalEvents, item => item.SequenceNumber),
            MergeAndSort(existingExport?.Interventions.ScheduledInterventions, scheduledInterventionEvents, item => item.SequenceNumber),
            MergeAndSort(existingExport?.Interventions.InterventionEvents, interventionEvents, item => item.SequenceNumber));
    }

    private static T[] MergeAndSort<T>(
        IReadOnlyList<T>? existingItems,
        IReadOnlyList<T> newItems,
        Func<T, long> getSequenceNumber)
    {
        return (existingItems ?? [])
            .Concat(newItems)
            .OrderBy(getSequenceNumber)
            .ToArray();
    }

    private async ValueTask<ExperimentReplayExport?> ReadRecoveryExportAsync(string sessionDirectoryPath, CancellationToken ct)
    {
        var path = Path.Combine(sessionDirectoryPath, RecoveryExportFileName);
        if (!File.Exists(path))
        {
            return null;
        }

        try
        {
            var content = await File.ReadAllTextAsync(path, ct);
            return JsonSerializer.Deserialize<ExperimentReplayExport>(content, JsonOptions);
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
            RewriteRecoveryExportForRecoveredSession(metadata, sessionDirectory);
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

    private async ValueTask WriteRecoveryExportAsync(
        string sessionDirectoryPath,
        ExperimentReplayExport exportDocument,
        CancellationToken ct)
    {
        await WriteContentAsync(
            Path.Combine(sessionDirectoryPath, RecoveryExportFileName),
            JsonSerializer.Serialize(exportDocument, JsonOptions),
            ct);
    }

    private void RewriteRecoveryExportForRecoveredSession(RecoverySessionMetadata metadata, string sessionDirectoryPath)
    {
        var existingExport = ReadRecoveryExportAsync(sessionDirectoryPath, CancellationToken.None).AsTask().GetAwaiter().GetResult();
        if (existingExport is null)
        {
            return;
        }

        var recoveredExport = BuildMergedExport(
            metadata,
            existingExport,
            ExperimentReplayRecoveryStatuses.RecoveredIncomplete,
            metadata.UpdatedAtUnixMs,
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            [],
            []);

        WriteRecoveryExportAsync(sessionDirectoryPath, recoveredExport, CancellationToken.None).AsTask().GetAwaiter().GetResult();
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

    private string GetSessionDirectoryPath(string sessionId)
    {
        return Path.Combine(_rootDirectoryPath, Path.GetFileName(sessionId));
    }

    private void RememberSessionDirectoryPath(Guid sessionId, string sessionDirectoryPath)
    {
        lock (_sessionDirectoryGate)
        {
            _sessionDirectoryPathsBySessionId[sessionId] = sessionDirectoryPath;
        }
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
    }
}
