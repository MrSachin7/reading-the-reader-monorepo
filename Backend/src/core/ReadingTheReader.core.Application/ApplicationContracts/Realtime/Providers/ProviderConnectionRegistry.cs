using System.Collections.Concurrent;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;

public static class ProviderConnectionStatuses
{
    public const string Active = "active";
}

public sealed record ProviderCapabilityDescriptor(
    bool SupportsAdvisoryExecution,
    bool SupportsAutonomousExecution,
    IReadOnlyList<string> SupportedInterventionModuleIds)
{
    public ProviderCapabilityDescriptor Copy()
    {
        return new ProviderCapabilityDescriptor(
            SupportsAdvisoryExecution,
            SupportsAutonomousExecution,
            SupportedInterventionModuleIds is null ? [] : [.. SupportedInterventionModuleIds]);
    }
}

public sealed record ProviderConnectionRecord(
    string ConnectionId,
    string ProviderId,
    string DisplayName,
    string ProtocolVersion,
    string Status,
    ProviderCapabilityDescriptor Capabilities,
    long RegisteredAtUnixMs,
    long LastHeartbeatAtUnixMs,
    string? LastErrorCode,
    string? LastErrorMessage)
{
    public ProviderConnectionRecord Copy()
    {
        return new ProviderConnectionRecord(
            ConnectionId,
            ProviderId,
            DisplayName,
            ProtocolVersion,
            Status,
            Capabilities.Copy(),
            RegisteredAtUnixMs,
            LastHeartbeatAtUnixMs,
            LastErrorCode,
            LastErrorMessage);
    }
}

public sealed record ProviderRegistrationResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    ProviderConnectionRecord? Provider);

public sealed record ProviderHeartbeatResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    ProviderConnectionRecord? Provider);

public interface IProviderConnectionRegistry
{
    ProviderRegistrationResult Register(string connectionId, ProviderHelloRealtimePayload payload);

    ProviderHeartbeatResult AcceptHeartbeat(string connectionId, ProviderHeartbeatRealtimePayload payload);

    void ReportProviderError(string connectionId, ProviderErrorRealtimePayload payload);

    void Disconnect(string connectionId);

    bool TryGetByConnectionId(string connectionId, out ProviderConnectionRecord? provider);

    bool TryGetActiveProvider(out ProviderConnectionRecord? provider);

    IReadOnlyCollection<ProviderConnectionRecord> List();
}

public sealed class ProviderConnectionRegistry : IProviderConnectionRegistry
{
    private readonly ExternalProviderOptions _options;
    private readonly ConcurrentDictionary<string, ProviderConnectionRecord> _providersByConnectionId = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, string> _connectionIdsByProviderId = new(StringComparer.Ordinal);
    private readonly object _gate = new();

    public ProviderConnectionRegistry(ExternalProviderOptions options)
    {
        _options = options;
    }

    public ProviderRegistrationResult Register(string connectionId, ProviderHelloRealtimePayload payload)
    {
        lock (_gate)
        {
            if (!string.Equals(payload.ProtocolVersion, ProviderProtocolVersions.V1, StringComparison.Ordinal))
            {
                return new ProviderRegistrationResult(
                    false,
                    "unsupported-protocol-version",
                    $"Protocol version '{payload.ProtocolVersion}' is not supported.",
                    null);
            }

            if (!string.Equals(payload.AuthToken, _options.SharedSecret, StringComparison.Ordinal))
            {
                return new ProviderRegistrationResult(
                    false,
                    "invalid-auth-token",
                    "Provider authentication token is invalid.",
                    null);
            }

            if (_providersByConnectionId.TryGetValue(connectionId, out var existingByConnection))
            {
                return new ProviderRegistrationResult(true, null, null, existingByConnection.Copy());
            }

            if (_connectionIdsByProviderId.ContainsKey(payload.ProviderId))
            {
                return new ProviderRegistrationResult(
                    false,
                    "duplicate-provider-id",
                    $"Provider id '{payload.ProviderId}' is already registered.",
                    null);
            }

            if (!_providersByConnectionId.IsEmpty)
            {
                return new ProviderRegistrationResult(
                    false,
                    "provider-already-active",
                    "An active provider is already registered for this backend instance.",
                    null);
            }

            var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
            var record = new ProviderConnectionRecord(
                connectionId,
                payload.ProviderId.Trim(),
                payload.DisplayName.Trim(),
                payload.ProtocolVersion.Trim(),
                ProviderConnectionStatuses.Active,
                new ProviderCapabilityDescriptor(
                    payload.SupportsAdvisoryExecution,
                    payload.SupportsAutonomousExecution,
                    payload.SupportedInterventionModuleIds is null
                        ? []
                        : payload.SupportedInterventionModuleIds
                            .Where(id => !string.IsNullOrWhiteSpace(id))
                            .Select(id => id.Trim())
                            .Distinct(StringComparer.Ordinal)
                            .ToArray()),
                now,
                now,
                null,
                null);

            _providersByConnectionId[connectionId] = record;
            _connectionIdsByProviderId[payload.ProviderId.Trim()] = connectionId;
            return new ProviderRegistrationResult(true, null, null, record.Copy());
        }
    }

    public ProviderHeartbeatResult AcceptHeartbeat(string connectionId, ProviderHeartbeatRealtimePayload payload)
    {
        lock (_gate)
        {
            if (!_providersByConnectionId.TryGetValue(connectionId, out var existing))
            {
                return new ProviderHeartbeatResult(
                    false,
                    "provider-not-registered",
                    "Provider heartbeat received before registration.",
                    null);
            }

            if (!string.Equals(existing.ProviderId, payload.ProviderId, StringComparison.Ordinal))
            {
                return new ProviderHeartbeatResult(
                    false,
                    "provider-id-mismatch",
                    "Provider heartbeat identity does not match the registered connection.",
                    null);
            }

            if (!string.Equals(payload.ProtocolVersion, ProviderProtocolVersions.V1, StringComparison.Ordinal))
            {
                return new ProviderHeartbeatResult(
                    false,
                    "unsupported-protocol-version",
                    $"Protocol version '{payload.ProtocolVersion}' is not supported.",
                    null);
            }

            var updated = existing with
            {
                LastHeartbeatAtUnixMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
            };

            _providersByConnectionId[connectionId] = updated;
            return new ProviderHeartbeatResult(true, null, null, updated.Copy());
        }
    }

    public void ReportProviderError(string connectionId, ProviderErrorRealtimePayload payload)
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

    public bool TryGetByConnectionId(string connectionId, out ProviderConnectionRecord? provider)
    {
        if (_providersByConnectionId.TryGetValue(connectionId, out var existing))
        {
            provider = existing.Copy();
            return true;
        }

        provider = null;
        return false;
    }

    public bool TryGetActiveProvider(out ProviderConnectionRecord? provider)
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

    public IReadOnlyCollection<ProviderConnectionRecord> List()
    {
        return _providersByConnectionId.Values
            .Select(record => record.Copy())
            .ToArray();
    }
}
