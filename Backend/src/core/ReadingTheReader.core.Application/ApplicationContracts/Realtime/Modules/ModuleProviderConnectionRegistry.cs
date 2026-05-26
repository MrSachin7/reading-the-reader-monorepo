using System.Collections.Concurrent;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed class ModuleProviderConnectionRegistry : IModuleProviderConnectionRegistry, IModuleProviderCoordinator
{
    private readonly ModuleProviderOptions _options;
    private readonly IModuleRegistry _modules;
    private readonly ConcurrentDictionary<string, ModuleProviderConnectionRecord> _byConnectionId = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, string> _connectionIdByProviderId = new(StringComparer.Ordinal);
    private readonly ConcurrentDictionary<string, string> _connectionIdByModuleId = new(StringComparer.OrdinalIgnoreCase);
    private readonly object _gate = new();

    public ModuleProviderConnectionRegistry(ModuleProviderOptions options, IModuleRegistry modules)
    {
        _options = options;
        _modules = modules;
    }

    public event EventHandler<ModuleProviderSourceChangedEventArgs>? SourceChanged;

    public ModuleProviderRegistrationResult Register(string connectionId, ModuleProviderHelloPayload payload)
    {
        if (payload is null)
        {
            return ModuleProviderRegistrationResult.Failure(
                ModuleProviderErrorCodes.InvalidPayload,
                "Hello payload is required.");
        }

        if (!string.Equals(payload.ProtocolVersion, ModuleProviderProtocolVersions.V1, StringComparison.Ordinal))
        {
            return ModuleProviderRegistrationResult.Failure(
                ModuleProviderErrorCodes.ProtocolMismatch,
                $"Framework protocol version '{payload.ProtocolVersion}' is not supported. Expected '{ModuleProviderProtocolVersions.V1}'.");
        }

        if (!string.Equals(payload.AuthToken, _options.SharedSecret, StringComparison.Ordinal))
        {
            return ModuleProviderRegistrationResult.Failure(
                ModuleProviderErrorCodes.AuthFailed,
                "Module provider authentication token is invalid.");
        }

        if (string.IsNullOrWhiteSpace(payload.ProviderId))
        {
            return ModuleProviderRegistrationResult.Failure(
                ModuleProviderErrorCodes.InvalidPayload,
                "providerId is required.");
        }

        if (payload.Modules is null || payload.Modules.Count == 0)
        {
            return ModuleProviderRegistrationResult.Failure(
                ModuleProviderErrorCodes.InvalidPayload,
                "At least one module entry is required in hello.modules.");
        }

        var providerId = payload.ProviderId.Trim();
        var displayName = string.IsNullOrWhiteSpace(payload.DisplayName) ? providerId : payload.DisplayName.Trim();
        var now = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

        var accepted = new List<string>();
        var rejected = new List<ModuleProviderRegistrationModuleRejection>();
        ModuleProviderConnectionRecord record;
        List<string> newlyClaimedModules;

        lock (_gate)
        {
            if (_byConnectionId.ContainsKey(connectionId))
            {
                return ModuleProviderRegistrationResult.Failure(
                    ModuleProviderErrorCodes.ProviderAlreadyActive,
                    "This connection has already registered.");
            }

            if (_connectionIdByProviderId.ContainsKey(providerId))
            {
                return ModuleProviderRegistrationResult.Failure(
                    ModuleProviderErrorCodes.ProviderAlreadyActive,
                    $"Provider id '{providerId}' is already registered on another connection.");
            }

            foreach (var entry in payload.Modules)
            {
                var moduleId = entry.ModuleId?.Trim() ?? string.Empty;
                if (string.IsNullOrWhiteSpace(moduleId))
                {
                    rejected.Add(new ModuleProviderRegistrationModuleRejection(
                        string.Empty,
                        ModuleProviderErrorCodes.InvalidPayload,
                        "Module entry has empty moduleId."));
                    continue;
                }

                var module = _modules.Find(moduleId);
                if (module is null)
                {
                    rejected.Add(new ModuleProviderRegistrationModuleRejection(
                        moduleId,
                        ModuleProviderErrorCodes.UnknownModule,
                        $"No module registered with id '{moduleId}'."));
                    continue;
                }

                if (!string.Equals(entry.ProtocolVersion, module.ProtocolVersion, StringComparison.Ordinal))
                {
                    rejected.Add(new ModuleProviderRegistrationModuleRejection(
                        moduleId,
                        ModuleProviderErrorCodes.ModuleProtocolMismatch,
                        $"Module '{moduleId}' expected protocol '{module.ProtocolVersion}' but provider declared '{entry.ProtocolVersion}'."));
                    continue;
                }

                if (_connectionIdByModuleId.ContainsKey(moduleId))
                {
                    rejected.Add(new ModuleProviderRegistrationModuleRejection(
                        moduleId,
                        ModuleProviderErrorCodes.ModuleAlreadyClaimed,
                        $"Module '{moduleId}' is already claimed by another provider."));
                    continue;
                }

                accepted.Add(module.ModuleId);
            }

            if (accepted.Count == 0)
            {
                return new ModuleProviderRegistrationResult(
                    false,
                    ModuleProviderErrorCodes.UnknownModule,
                    "No modules from this hello could be accepted.",
                    null,
                    null,
                    [],
                    rejected);
            }

            var capsByModule = new Dictionary<string, ModuleCapabilities>(StringComparer.OrdinalIgnoreCase);
            foreach (var entry in payload.Modules)
            {
                if (!string.IsNullOrWhiteSpace(entry.ModuleId) && entry.Capabilities is not null && entry.Capabilities.Count > 0)
                {
                    capsByModule[entry.ModuleId] = new ModuleCapabilities(
                        new Dictionary<string, string?>(entry.Capabilities, StringComparer.OrdinalIgnoreCase));
                }
            }

            record = new ModuleProviderConnectionRecord(
                connectionId,
                providerId,
                displayName,
                accepted,
                now,
                now,
                capsByModule.Count > 0 ? capsByModule : null,
                null);

            _byConnectionId[connectionId] = record;
            _connectionIdByProviderId[providerId] = connectionId;
            newlyClaimedModules = new List<string>(accepted.Count);
            foreach (var moduleId in accepted)
            {
                _connectionIdByModuleId[moduleId] = connectionId;
                newlyClaimedModules.Add(moduleId);
            }
        }

        foreach (var moduleId in newlyClaimedModules)
        {
            RaiseSourceChanged(moduleId, record);
        }

        return new ModuleProviderRegistrationResult(
            true,
            null,
            null,
            null,
            record,
            accepted,
            rejected);
    }

    public ModuleProviderHeartbeatResult AcceptHeartbeat(string connectionId, ModuleProviderHeartbeatPayload payload)
    {
        if (payload is null)
        {
            return new ModuleProviderHeartbeatResult(false, ModuleProviderErrorCodes.InvalidPayload, "Heartbeat payload is required.", null);
        }

        lock (_gate)
        {
            if (!_byConnectionId.TryGetValue(connectionId, out var existing))
            {
                return new ModuleProviderHeartbeatResult(
                    false,
                    ModuleProviderErrorCodes.NotRegistered,
                    "Heartbeat received before successful hello.",
                    null);
            }

            if (!string.Equals(existing.ProviderId, payload.ProviderId, StringComparison.Ordinal))
            {
                return new ModuleProviderHeartbeatResult(
                    false,
                    ModuleProviderErrorCodes.NotRegistered,
                    "Heartbeat providerId does not match this connection.",
                    null);
            }

            if (!string.Equals(payload.ProtocolVersion, ModuleProviderProtocolVersions.V1, StringComparison.Ordinal))
            {
                return new ModuleProviderHeartbeatResult(
                    false,
                    ModuleProviderErrorCodes.ProtocolMismatch,
                    $"Heartbeat protocol version '{payload.ProtocolVersion}' is not supported.",
                    null);
            }

            var updated = existing.WithHeartbeat(DateTimeOffset.UtcNow.ToUnixTimeMilliseconds());
            _byConnectionId[connectionId] = updated;
            return new ModuleProviderHeartbeatResult(true, null, null, updated);
        }
    }

    public void ReportError(string connectionId, ModuleProviderErrorPayload payload)
    {
        if (payload is null)
        {
            return;
        }

        lock (_gate)
        {
            if (!_byConnectionId.TryGetValue(connectionId, out var existing))
            {
                return;
            }

            _byConnectionId[connectionId] = existing.WithError(new ModuleProviderConnectionErrorRecord(
                payload.Code,
                payload.Message,
                payload.Detail,
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));
        }
    }

    public void Disconnect(string connectionId)
    {
        ModuleProviderConnectionRecord? removed;
        List<string> releasedModules;

        lock (_gate)
        {
            if (!_byConnectionId.TryRemove(connectionId, out removed))
            {
                return;
            }

            _connectionIdByProviderId.TryRemove(removed.ProviderId, out _);
            releasedModules = new List<string>(removed.ModuleIds.Count);
            foreach (var moduleId in removed.ModuleIds)
            {
                if (_connectionIdByModuleId.TryGetValue(moduleId, out var holder)
                    && string.Equals(holder, connectionId, StringComparison.Ordinal))
                {
                    _connectionIdByModuleId.TryRemove(moduleId, out _);
                    releasedModules.Add(moduleId);
                }
            }
        }

        foreach (var moduleId in releasedModules)
        {
            RaiseSourceChanged(moduleId, null);
        }
    }

    public bool TryGetByConnectionId(string connectionId, out ModuleProviderConnectionRecord? connection)
    {
        if (_byConnectionId.TryGetValue(connectionId, out var existing))
        {
            connection = existing;
            return true;
        }

        connection = null;
        return false;
    }

    public IReadOnlyCollection<ModuleProviderConnectionRecord> List()
    {
        return _byConnectionId.Values.ToArray();
    }

    public bool IsExternalActive(string moduleId)
    {
        return !string.IsNullOrWhiteSpace(moduleId)
            && _connectionIdByModuleId.ContainsKey(moduleId);
    }

    public ModuleProviderConnectionRecord? GetActiveProvider(string moduleId)
    {
        if (string.IsNullOrWhiteSpace(moduleId))
        {
            return null;
        }

        if (!_connectionIdByModuleId.TryGetValue(moduleId, out var connectionId))
        {
            return null;
        }

        return _byConnectionId.TryGetValue(connectionId, out var record) ? record : null;
    }

    private void RaiseSourceChanged(string moduleId, ModuleProviderConnectionRecord? activeProvider)
    {
        try
        {
            SourceChanged?.Invoke(this, new ModuleProviderSourceChangedEventArgs(moduleId, activeProvider));
        }
        catch (Exception ex)
        {
            Console.WriteLine($"ModuleProviderConnectionRegistry SourceChanged handler error. ModuleId={moduleId}, Error={ex.Message}");
        }
    }
}
