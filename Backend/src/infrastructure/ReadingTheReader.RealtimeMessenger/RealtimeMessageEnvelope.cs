namespace ReadingTheReader.RealtimeMessenger;

public sealed record RealtimeMessageEnvelope<T>(string Type, long SentAtUnixMs, T Payload);
