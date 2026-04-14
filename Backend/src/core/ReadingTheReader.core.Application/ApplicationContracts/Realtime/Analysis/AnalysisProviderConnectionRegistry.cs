using System.Collections.Concurrent;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed record AnalysisProviderConnectionRecord(
    string ConnectionId,
    string ProviderId,
    string DisplayName,
    string ProtocolVersion,
    string Status,
    long RegisteredAtUnixMs,
    long LastHeartbeatAtUnixMs,
    string? LastErrorCode,
    string? LastErrorMessage)
{
    public AnalysisProviderConnectionRecord Copy()
    {
        return this with { };
    }
}

public sealed record AnalysisProviderRegistrationResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    AnalysisProviderConnectionRecord? Provider);

public sealed record AnalysisProviderHeartbeatResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    AnalysisProviderConnectionRecord? Provider);

public interface IAnalysisProviderConnectionRegistry
{
    AnalysisProviderRegistrationResult Register(string connectionId, AnalysisProviderHelloRealtimePayload payload);

    AnalysisProviderHeartbeatResult AcceptHeartbeat(string connectionId, AnalysisProviderHeartbeatRealtimePayload payload);

    void ReportProviderError(string connectionId, AnalysisProviderErrorRealtimePayload payload);

    void Disconnect(string connectionId);

    bool TryGetByConnectionId(string connectionId, out AnalysisProviderConnectionRecord? provider);

    bool TryGetActiveProvider(out AnalysisProviderConnectionRecord? provider);
}

public sealed class AnalysisProviderConnectionRegistry : IAnalysisProviderConnectionRegistry
{
    private readonly ExternalAnalysisProviderOptions _options;
    private readonly ConcurrentDictionary<string, AnalysisProviderConnectionRecord> _providersByConnectionId = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, string> _connectionIdsByProviderId = new(StringComparer.Ordinal);
    private readonly object _gate = new();

    public AnalysisProviderConnectionRegistry(ExternalAnalysisProviderOptions options)
    {
        _options = options;
    }

    public AnalysisProviderRegistrationResult Register(string connectionId, AnalysisProviderHelloRealtimePayload payload)
    {
        lock (_gate)
        {
            if (!string.Equals(payload.ProtocolVersion, AnalysisProviderProtocolVersions.V1, StringComparison.Ordinal))
            {
                return new AnalysisProviderRegistrationResult(false, "unsupported-protocol-version", "Unsupported analysis provider protocol.", null);
            }

            if (!string.Equals(payload.AuthToken, _options.SharedSecret, StringComparison.Ordinal))
            {
                return new AnalysisProviderRegistrationResult(false, "invalid-auth-token", "Analysis provider authentication token is invalid.", null);
            }

            if (_providersByConnectionId.TryGetValue(connectionId, out var existing))
            {
                return new AnalysisProviderRegistrationResult(true, null, null, existing.Copy());
            }

            if (_connectionIdsByProviderId.ContainsKey(payload.ProviderId))
            {
                return new AnalysisProviderRegistrationResult(false, "duplicate-provider-id", "Analysis provider id is already registered.", null);
            }

            if (!_providersByConnectionId.IsEmpty)
            {
                return new AnalysisProviderRegistrationResult(false, "provider-already-active", "An active analysis provider is already registered.", null);
            }

            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var record = new AnalysisProviderConnectionRecord(
                connectionId,
                payload.ProviderId.Trim(),
                payload.DisplayName.Trim(),
                payload.ProtocolVersion.Trim(),
                "active",
                now,
                now,
                null,
                null);

            _providersByConnectionId[connectionId] = record;
            _connectionIdsByProviderId[payload.ProviderId.Trim()] = connectionId;
            return new AnalysisProviderRegistrationResult(true, null, null, record.Copy());
        }
    }

    public AnalysisProviderHeartbeatResult AcceptHeartbeat(string connectionId, AnalysisProviderHeartbeatRealtimePayload payload)
    {
        lock (_gate)
        {
            if (!_providersByConnectionId.TryGetValue(connectionId, out var existing))
            {
                return new AnalysisProviderHeartbeatResult(false, "provider-not-registered", "Analysis provider heartbeat received before registration.", null);
            }

            if (!string.Equals(existing.ProviderId, payload.ProviderId, StringComparison.Ordinal))
            {
                return new AnalysisProviderHeartbeatResult(false, "provider-id-mismatch", "Analysis provider identity does not match the registered connection.", null);
            }

            if (!string.Equals(payload.ProtocolVersion, AnalysisProviderProtocolVersions.V1, StringComparison.Ordinal))
            {
                return new AnalysisProviderHeartbeatResult(false, "unsupported-protocol-version", "Unsupported analysis provider protocol.", null);
            }

            var updated = existing with
            {
                LastHeartbeatAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };
            _providersByConnectionId[connectionId] = updated;
            return new AnalysisProviderHeartbeatResult(true, null, null, updated.Copy());
        }
    }

    public void ReportProviderError(string connectionId, AnalysisProviderErrorRealtimePayload payload)
    {
        lock (_gate)
        {
            if (!_providersByConnectionId.TryGetValue(connectionId, out var existing))
            {
                return;
            }

            _providersByConnectionId[connectionId] = existing with
            {
                LastErrorCode = payload.Code,
                LastErrorMessage = payload.Message
            };
        }
    }

    public void Disconnect(string connectionId)
    {
        lock (_gate)
        {
            if (!_providersByConnectionId.TryRemove(connectionId, out var existing))
            {
                return;
            }

            _connectionIdsByProviderId.TryRemove(existing.ProviderId, out _);
        }
    }

    public bool TryGetByConnectionId(string connectionId, out AnalysisProviderConnectionRecord? provider)
    {
        if (_providersByConnectionId.TryGetValue(connectionId, out var existing))
        {
            provider = existing.Copy();
            return true;
        }

        provider = null;
        return false;
    }

    public bool TryGetActiveProvider(out AnalysisProviderConnectionRecord? provider)
    {
        var active = _providersByConnectionId.Values.FirstOrDefault();
        if (active is not null)
        {
            provider = active.Copy();
            return true;
        }

        provider = null;
        return false;
    }
}
