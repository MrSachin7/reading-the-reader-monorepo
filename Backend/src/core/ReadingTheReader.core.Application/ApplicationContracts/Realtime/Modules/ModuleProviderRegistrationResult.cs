namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public sealed record ModuleProviderRegistrationResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    string? ErrorDetail,
    ModuleProviderConnectionRecord? Connection,
    IReadOnlyList<string> AcceptedModules,
    IReadOnlyList<ModuleProviderRegistrationModuleRejection> RejectedModules)
{
    public static ModuleProviderRegistrationResult Failure(string code, string message, string? detail = null)
    {
        return new ModuleProviderRegistrationResult(false, code, message, detail, null, [], []);
    }
}

public sealed record ModuleProviderRegistrationModuleRejection(
    string ModuleId,
    string Code,
    string Message);

public sealed record ModuleProviderHeartbeatResult(
    bool Succeeded,
    string? ErrorCode,
    string? ErrorMessage,
    ModuleProviderConnectionRecord? Connection);
