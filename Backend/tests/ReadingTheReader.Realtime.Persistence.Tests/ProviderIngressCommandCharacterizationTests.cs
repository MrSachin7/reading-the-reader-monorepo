using System.Text.Json;
using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Messaging;
using Xunit;

namespace ReadingTheReader.Realtime.Persistence.Tests;

public sealed class ProviderIngressCommandCharacterizationTests
{
    [Fact]
    public void ProviderIngress_HelloPayload_ParsesIntoDedicatedProviderCommand()
    {
        var command = ProviderIngressCommandFactory.Create(
            "provider-conn-1",
            ProviderMessageTypes.ProviderHello,
            CreatePayload(new
            {
                providerId = "mock-python",
                displayName = "Mock Python Provider",
                protocolVersion = ProviderProtocolVersions.V1,
                authToken = "local-dev-token",
                supportsAdvisoryExecution = true,
                supportsAutonomousExecution = true,
                supportedInterventionModuleIds = new[] { "font-size", "line-height" }
            }));

        var hello = Assert.IsType<ProviderHelloRealtimeCommand>(command);
        Assert.Equal("provider-conn-1", hello.ConnectionId);
        Assert.Equal("mock-python", hello.Payload.ProviderId);
        Assert.Equal(ProviderProtocolVersions.V1, hello.Payload.ProtocolVersion);
        Assert.True(hello.Payload.SupportsAdvisoryExecution);
        Assert.True(hello.Payload.SupportsAutonomousExecution);
        Assert.Contains("font-size", hello.Payload.SupportedInterventionModuleIds!);
    }

    [Fact]
    public void ProviderIngress_ProposalPayload_ParsesIntoDedicatedProviderCommand()
    {
        var command = ProviderIngressCommandFactory.Create(
            "provider-conn-1",
            ProviderMessageTypes.ProviderSubmitProposal,
            CreatePayload(new
            {
                providerId = "mock-python",
                sessionId = "session-42",
                correlationId = "corr-1001",
                proposalId = "proposal-7",
                executionMode = "advisory",
                rationale = "Sustained fixation suggests a small font-size increase.",
                signalSummary = "token dwell time > 1200 ms",
                providerObservedAtUnixMs = 1710000001234L,
                proposedIntervention = new
                {
                    moduleId = "font-size",
                    trigger = "attention-summary",
                    reason = "Increase font size to reduce strain.",
                    presentation = new
                    {
                        fontFamily = (string?)null,
                        fontSizePx = 20,
                        lineWidthPx = (int?)null,
                        lineHeight = (double?)null,
                        letterSpacingEm = (double?)null,
                        editableByResearcher = (bool?)null
                    },
                    appearance = new
                    {
                        themeMode = (string?)null,
                        palette = (string?)null,
                        appFont = (string?)null
                    },
                    parameters = new Dictionary<string, string?>
                    {
                        ["fontSizePx"] = "20"
                    }
                }
            }));

        var proposal = Assert.IsType<ProviderSubmitProposalRealtimeCommand>(command);
        Assert.Equal("session-42", proposal.Payload.SessionId);
        Assert.Equal("corr-1001", proposal.Payload.CorrelationId);
        Assert.Equal("proposal-7", proposal.Payload.ProposalId);
        Assert.Equal("font-size", proposal.Payload.ProposedIntervention.ModuleId);
        Assert.Equal("20", proposal.Payload.ProposedIntervention.Parameters!["fontSizePx"]);
    }

    [Fact]
    public void ProviderIngress_InvalidProposalPayload_ReturnsInvalidProviderCommand()
    {
        var command = ProviderIngressCommandFactory.Create(
            "provider-conn-1",
            ProviderMessageTypes.ProviderSubmitProposal,
            CreatePayload(new
            {
                providerId = "mock-python",
                sessionId = "",
                correlationId = "corr-1001"
            }));

        var invalid = Assert.IsType<InvalidProviderRealtimeCommand>(command);
        Assert.Equal("provider-conn-1", invalid.ConnectionId);
        Assert.Equal("Provider proposal payload is invalid.", invalid.ErrorMessage);
    }

    [Fact]
    public void ProviderIngress_RejectsBrowserRealtimeMessageTypes()
    {
        var command = ProviderIngressCommandFactory.Create(
            "provider-conn-1",
            MessageTypes.Ping,
            CreatePayload(new { }));

        var unsupported = Assert.IsType<UnsupportedProviderRealtimeCommand>(command);
        Assert.Equal(MessageTypes.Ping, unsupported.MessageType);
    }

    [Fact]
    public void BrowserRealtimeIngress_RejectsProviderRealtimeMessageTypes()
    {
        var command = RealtimeIngressCommandFactory.Create(
            "browser-1",
            ProviderMessageTypes.ProviderHello,
            CreatePayload(new
            {
                providerId = "mock-python",
                displayName = "Mock Python Provider",
                protocolVersion = ProviderProtocolVersions.V1,
                authToken = "local-dev-token",
                supportsAdvisoryExecution = true,
                supportsAutonomousExecution = false,
                supportedInterventionModuleIds = Array.Empty<string>()
            }));

        var unsupported = Assert.IsType<UnsupportedRealtimeCommand>(command);
        Assert.Equal("browser-1", unsupported.ConnectionId);
        Assert.Equal(ProviderMessageTypes.ProviderHello, unsupported.MessageType);
    }

    private static JsonElement CreatePayload<T>(T payload)
    {
        return JsonSerializer.SerializeToElement(payload, new JsonSerializerOptions
        {
            PropertyNamingPolicy = JsonNamingPolicy.CamelCase
        });
    }
}
