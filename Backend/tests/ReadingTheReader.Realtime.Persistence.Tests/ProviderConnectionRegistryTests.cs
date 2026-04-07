using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Providers;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ProviderConnectionRegistryTests
{
    private static readonly ExternalProviderOptions TestOptions = new()
    {
        SharedSecret = "test-provider-secret",
        HeartbeatTimeoutMilliseconds = 12_000
    };

    [Fact]
    public void Register_WithValidHello_StoresSingleActiveProvider()
    {
        var registry = new ProviderConnectionRegistry(TestOptions);

        var result = registry.Register("conn-1", CreateHelloPayload());

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Provider);
        Assert.True(registry.TryGetActiveProvider(out var activeProvider));
        Assert.NotNull(activeProvider);
        Assert.Equal("mock-python", activeProvider!.ProviderId);
        Assert.Equal(ProviderConnectionStatuses.Active, activeProvider.Status);
        Assert.True(activeProvider.Capabilities.SupportsAdvisoryExecution);
        Assert.True(activeProvider.Capabilities.SupportsAutonomousExecution);
    }

    [Fact]
    public void Register_WithInvalidAuthToken_IsRejected()
    {
        var registry = new ProviderConnectionRegistry(TestOptions);

        var result = registry.Register("conn-1", CreateHelloPayload(authToken: "wrong-secret"));

        Assert.False(result.Succeeded);
        Assert.Equal("invalid-auth-token", result.ErrorCode);
        Assert.False(registry.TryGetActiveProvider(out _));
    }

    [Fact]
    public void Register_WithUnsupportedProtocolVersion_IsRejected()
    {
        var registry = new ProviderConnectionRegistry(TestOptions);

        var result = registry.Register("conn-1", CreateHelloPayload(protocolVersion: "provider.v0"));

        Assert.False(result.Succeeded);
        Assert.Equal("unsupported-protocol-version", result.ErrorCode);
        Assert.False(registry.TryGetActiveProvider(out _));
    }

    [Fact]
    public void Register_WithDuplicateProviderId_IsRejected()
    {
        var registry = new ProviderConnectionRegistry(TestOptions);

        var first = registry.Register("conn-1", CreateHelloPayload());
        var second = registry.Register("conn-2", CreateHelloPayload());

        Assert.True(first.Succeeded);
        Assert.False(second.Succeeded);
        Assert.Equal("duplicate-provider-id", second.ErrorCode);
        Assert.Single(registry.List());
    }

    [Fact]
    public void AcceptHeartbeat_ForRegisteredProvider_RefreshesHeartbeatTimestamp()
    {
        var registry = new ProviderConnectionRegistry(TestOptions);
        registry.Register("conn-1", CreateHelloPayload());

        var result = registry.AcceptHeartbeat(
            "conn-1",
            new ProviderHeartbeatRealtimePayload(
                "mock-python",
                ProviderProtocolVersions.V1,
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()));

        Assert.True(result.Succeeded);
        Assert.NotNull(result.Provider);
        Assert.True(result.Provider!.LastHeartbeatAtUnixMs >= result.Provider.RegisteredAtUnixMs);
    }

    [Fact]
    public void Disconnect_RemovesProviderRegistration()
    {
        var registry = new ProviderConnectionRegistry(TestOptions);
        registry.Register("conn-1", CreateHelloPayload());

        registry.Disconnect("conn-1");

        Assert.Empty(registry.List());
        Assert.False(registry.TryGetActiveProvider(out _));
    }

    [Fact]
    public async Task IngressService_HelloSuccess_ReturnsProviderWelcome()
    {
        var registry = new ProviderConnectionRegistry(TestOptions);
        var harness = RealtimeTestDoubles.CreateHarness();
        var ingress = new ProviderIngressService(registry, harness.SessionManager, TestOptions);

        var result = await ingress.HandleAsync(new ProviderHelloRealtimeCommand("conn-1", CreateHelloPayload()));

        Assert.False(result.ShouldCloseConnection);
        var response = Assert.Single(result.Responses);
        Assert.Equal(ProviderMessageTypes.ProviderWelcome, response.MessageType);
        var payload = Assert.IsType<ProviderWelcomeRealtimePayload>(response.Payload);
        Assert.Equal("mock-python", payload.ProviderId);
        Assert.Equal(ProviderProtocolVersions.V1, payload.AcceptedProtocolVersion);
        Assert.Equal(TestOptions.HeartbeatTimeoutMilliseconds, payload.HeartbeatTimeoutMilliseconds);
    }

    [Fact]
    public async Task IngressService_UnsupportedCommand_ReturnsProviderErrorAndClosesConnection()
    {
        var registry = new ProviderConnectionRegistry(TestOptions);
        var harness = RealtimeTestDoubles.CreateHarness();
        var ingress = new ProviderIngressService(registry, harness.SessionManager, TestOptions);

        var result = await ingress.HandleAsync(new UnsupportedProviderRealtimeCommand("conn-1", MessageTypes.Ping));

        Assert.True(result.ShouldCloseConnection);
        var response = Assert.Single(result.Responses);
        Assert.Equal(ProviderMessageTypes.ProviderError, response.MessageType);
        var payload = Assert.IsType<ProviderErrorRealtimePayload>(response.Payload);
        Assert.Equal("unsupported-provider-command", payload.Code);
    }

    private static ProviderHelloRealtimePayload CreateHelloPayload(
        string protocolVersion = ProviderProtocolVersions.V1,
        string authToken = "test-provider-secret")
    {
        return new ProviderHelloRealtimePayload(
            "mock-python",
            "Mock Python Provider",
            protocolVersion,
            authToken,
            true,
            true,
            ["font-size", "line-height"]);
    }
}
