using Microsoft.Extensions.DependencyInjection;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

public static class ModuleProviderFrameworkInstaller
{
    public static IServiceCollection InstallModuleProviderFramework(
        this IServiceCollection services,
        ModuleProviderOptions options)
    {
        services.AddSingleton(options);
        services.AddSingleton<IModuleRegistry>(sp => new ModuleRegistry(
            sp.GetServices<IModuleDefinition>()));
        services.AddSingleton<ModuleProviderConnectionRegistry>();
        services.AddSingleton<IModuleProviderConnectionRegistry>(sp =>
            sp.GetRequiredService<ModuleProviderConnectionRegistry>());
        services.AddSingleton<IModuleProviderCoordinator>(sp =>
            sp.GetRequiredService<ModuleProviderConnectionRegistry>());
        services.AddSingleton<IModuleProviderIngressService, ModuleProviderIngressService>();
        services.AddSingleton<IModuleProviderGateway, ModuleProviderGateway>();
        return services;
    }
}
