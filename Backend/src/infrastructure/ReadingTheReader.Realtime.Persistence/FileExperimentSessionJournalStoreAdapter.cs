using System.Text;
using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime;
using ReadingTheReader.core.Application.InfrastructureContracts;

namespace ReadingTheReader.Realtime.Persistence;

public sealed class FileExperimentSessionJournalStoreAdapter : IExperimentSessionJournalStoreAdapter
{
    private const string InitialSnapshotFileName = "initial-snapshot.json";
    private const string ManifestFileName = "manifest.json";
    private const string LifecycleEventsFileName = "lifecycle-events.jsonl";
    private const string GazeSamplesFileName = "gaze-samples.jsonl";
    private const string ReadingSessionStatesFileName = "reading-session-states.jsonl";
    private const string ParticipantViewportEventsFileName = "participant-viewport-events.jsonl";
    private const string ReadingFocusEventsFileName = "reading-focus-events.jsonl";
    private const string InterventionEventsFileName = "intervention-events.jsonl";

    private readonly string _rootDirectoryPath;
    private readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };
    private readonly object _gate = new();
    private readonly int _gazeBatchSize;
    private readonly Dictionary<Guid, GazeBufferState> _gazeBuffers = [];

    public FileExperimentSessionJournalStoreAdapter(string rootDirectoryPath, int gazeBatchSize)
    {
        _rootDirectoryPath = rootDirectoryPath;
        _gazeBatchSize = Math.Max(1, gazeBatchSize);
    }

    public void StartSession(ExperimentSessionSnapshot initialSnapshot)
    {
        if (initialSnapshot.SessionId is not Guid sessionId)
        {
            return;
        }

        lock (_gate)
        {
            var sessionDirectoryPath = GetSessionDirectoryPath(sessionId);
            Directory.CreateDirectory(sessionDirectoryPath);
            _gazeBuffers.Remove(sessionId);

            WriteJsonFile(GetInitialSnapshotPath(sessionId), initialSnapshot);
            WriteJsonFile(GetManifestPath(sessionId), JournalManifest.Started(sessionId, initialSnapshot.StartedAtUnixMs));
        }
    }

    public void AppendLifecycleEvent(Guid sessionId, ExperimentLifecycleEventRecord record)
    {
        AppendRecord(sessionId, LifecycleEventsFileName, record);
    }

    public void AppendGazeSample(Guid sessionId, GazeSampleRecord record)
    {
        lock (_gate)
        {
            var line = JsonSerializer.Serialize(record, _jsonOptions);
            if (!_gazeBuffers.TryGetValue(sessionId, out var buffer))
            {
                buffer = new GazeBufferState();
                _gazeBuffers[sessionId] = buffer;
            }

            buffer.Lines.Add(line);
            if (buffer.Lines.Count >= _gazeBatchSize)
            {
                FlushGazeBuffer(sessionId, buffer);
            }
        }
    }

    public void AppendReadingSessionState(Guid sessionId, ReadingSessionStateRecord record)
    {
        AppendRecord(sessionId, ReadingSessionStatesFileName, record);
    }

    public void AppendParticipantViewportEvent(Guid sessionId, ParticipantViewportEventRecord record)
    {
        AppendRecord(sessionId, ParticipantViewportEventsFileName, record);
    }

    public void AppendReadingFocusEvent(Guid sessionId, ReadingFocusEventRecord record)
    {
        AppendRecord(sessionId, ReadingFocusEventsFileName, record);
    }

    public void AppendInterventionEvent(Guid sessionId, InterventionEventRecord record)
    {
        AppendRecord(sessionId, InterventionEventsFileName, record);
    }

    public void MarkCompleted(Guid sessionId, string completionSource, long completedAtUnixMs)
    {
        lock (_gate)
        {
            FlushPending(sessionId);
            var manifest = LoadManifest(sessionId) ?? JournalManifest.Started(sessionId, completedAtUnixMs);
            WriteJsonFile(
                GetManifestPath(sessionId),
                manifest with
                {
                    IsCompleted = true,
                    CompletionSource = string.IsNullOrWhiteSpace(completionSource) ? "unknown" : completionSource.Trim(),
                    CompletedAtUnixMs = completedAtUnixMs
                });
        }
    }

    public ExperimentJournalRecovery? LoadRecovery(Guid sessionId)
    {
        lock (_gate)
        {
            FlushPending(sessionId);
            var initialSnapshotPath = GetInitialSnapshotPath(sessionId);
            if (!File.Exists(initialSnapshotPath))
            {
                return null;
            }

            var initialSnapshot = ReadJsonFile<ExperimentSessionSnapshot>(initialSnapshotPath);
            if (initialSnapshot is null)
            {
                return null;
            }

            var lifecycleEvents = ReadJsonLines<ExperimentLifecycleEventRecord>(GetDataPath(sessionId, LifecycleEventsFileName));
            var gazeSamples = ReadJsonLines<GazeSampleRecord>(GetDataPath(sessionId, GazeSamplesFileName));
            var readingSessionStates = ReadJsonLines<ReadingSessionStateRecord>(GetDataPath(sessionId, ReadingSessionStatesFileName));
            var participantViewportEvents = ReadJsonLines<ParticipantViewportEventRecord>(GetDataPath(sessionId, ParticipantViewportEventsFileName));
            var readingFocusEvents = ReadJsonLines<ReadingFocusEventRecord>(GetDataPath(sessionId, ReadingFocusEventsFileName));
            var interventionEvents = ReadJsonLines<InterventionEventRecord>(GetDataPath(sessionId, InterventionEventsFileName));
            var manifest = LoadManifest(sessionId);

            var lastSequenceNumber = 0L;
            lastSequenceNumber = Max(lastSequenceNumber, lifecycleEvents.Select(item => item.SequenceNumber));
            lastSequenceNumber = Max(lastSequenceNumber, gazeSamples.Select(item => item.SequenceNumber));
            lastSequenceNumber = Max(lastSequenceNumber, readingSessionStates.Select(item => item.SequenceNumber));
            lastSequenceNumber = Max(lastSequenceNumber, participantViewportEvents.Select(item => item.SequenceNumber));
            lastSequenceNumber = Max(lastSequenceNumber, readingFocusEvents.Select(item => item.SequenceNumber));
            lastSequenceNumber = Max(lastSequenceNumber, interventionEvents.Select(item => item.SequenceNumber));

            return new ExperimentJournalRecovery(
                sessionId,
                initialSnapshot.Copy(),
                lifecycleEvents,
                gazeSamples,
                readingSessionStates,
                participantViewportEvents,
                readingFocusEvents,
                interventionEvents,
                lastSequenceNumber,
                manifest?.IsCompleted == true,
                manifest?.CompletionSource,
                manifest?.CompletedAtUnixMs);
        }
    }

    public void FlushPending()
    {
        lock (_gate)
        {
            foreach (var sessionId in _gazeBuffers.Keys.ToArray())
            {
                FlushPending(sessionId);
            }
        }
    }

    private void AppendRecord<TRecord>(Guid sessionId, string fileName, TRecord record)
    {
        lock (_gate)
        {
            var dataPath = GetDataPath(sessionId, fileName);
            Directory.CreateDirectory(Path.GetDirectoryName(dataPath)!);
            var line = JsonSerializer.Serialize(record, _jsonOptions);
            File.AppendAllText(dataPath, line + Environment.NewLine, new UTF8Encoding(false));
        }
    }

    private void FlushPending(Guid sessionId)
    {
        if (_gazeBuffers.TryGetValue(sessionId, out var buffer))
        {
            FlushGazeBuffer(sessionId, buffer);
            if (buffer.Lines.Count == 0)
            {
                _gazeBuffers.Remove(sessionId);
            }
        }
    }

    private void FlushGazeBuffer(Guid sessionId, GazeBufferState buffer)
    {
        if (buffer.Lines.Count == 0)
        {
            return;
        }

        var dataPath = GetDataPath(sessionId, GazeSamplesFileName);
        Directory.CreateDirectory(Path.GetDirectoryName(dataPath)!);
        var payload = string.Join(Environment.NewLine, buffer.Lines) + Environment.NewLine;
        File.AppendAllText(dataPath, payload, new UTF8Encoding(false));
        buffer.Lines.Clear();
    }

    private JournalManifest? LoadManifest(Guid sessionId)
    {
        return ReadJsonFile<JournalManifest>(GetManifestPath(sessionId));
    }

    private TDocument? ReadJsonFile<TDocument>(string path)
    {
        if (!File.Exists(path))
        {
            return default;
        }

        var json = File.ReadAllText(path);
        return JsonSerializer.Deserialize<TDocument>(json, _jsonOptions);
    }

    private TRecord[] ReadJsonLines<TRecord>(string path)
    {
        if (!File.Exists(path))
        {
            return [];
        }

        var items = new List<TRecord>();
        foreach (var line in File.ReadLines(path))
        {
            if (string.IsNullOrWhiteSpace(line))
            {
                continue;
            }

            try
            {
                var item = JsonSerializer.Deserialize<TRecord>(line, _jsonOptions);
                if (item is not null)
                {
                    items.Add(item);
                }
            }
            catch (JsonException)
            {
                // Ignore truncated or malformed tail lines so crash recovery can continue.
            }
        }

        return [.. items];
    }

    private void WriteJsonFile<TDocument>(string path, TDocument document)
    {
        Directory.CreateDirectory(Path.GetDirectoryName(path)!);
        var tempPath = $"{path}.tmp";
        File.WriteAllText(tempPath, JsonSerializer.Serialize(document, _jsonOptions), Encoding.UTF8);
        File.Move(tempPath, path, overwrite: true);
    }

    private string GetSessionDirectoryPath(Guid sessionId)
    {
        return Path.Combine(_rootDirectoryPath, sessionId.ToString("N"));
    }

    private string GetInitialSnapshotPath(Guid sessionId)
    {
        return Path.Combine(GetSessionDirectoryPath(sessionId), InitialSnapshotFileName);
    }

    private string GetManifestPath(Guid sessionId)
    {
        return Path.Combine(GetSessionDirectoryPath(sessionId), ManifestFileName);
    }

    private string GetDataPath(Guid sessionId, string fileName)
    {
        return Path.Combine(GetSessionDirectoryPath(sessionId), fileName);
    }

    private static long Max(long current, IEnumerable<long> values)
    {
        foreach (var value in values)
        {
            if (value > current)
            {
                current = value;
            }
        }

        return current;
    }

    private sealed record JournalManifest(
        Guid SessionId,
        long StartedAtUnixMs,
        bool IsCompleted,
        string? CompletionSource,
        long? CompletedAtUnixMs)
    {
        public static JournalManifest Started(Guid sessionId, long startedAtUnixMs)
        {
            return new JournalManifest(sessionId, startedAtUnixMs, false, null, null);
        }
    }

    private sealed class GazeBufferState
    {
        public List<string> Lines { get; } = [];
    }
}
