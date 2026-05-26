using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Interventions;

public sealed class InterventionsModuleDefinition : IModuleDefinition
{
    public string ModuleId => InterventionsModuleIds.ModuleId;

    public string DisplayName => "Intervention provider";

    public string ProtocolVersion => InterventionsProtocolVersions.V1;

    public IReadOnlyList<string> InboundMessageTypes =>
    [
        InterventionsInboundMessageTypes.SubmitProposal,
        InterventionsInboundMessageTypes.RequestAutonomousApply,
        InterventionsInboundMessageTypes.ProviderError
    ];

    public IReadOnlyList<string> OutboundMessageTypes =>
    [
        InterventionsOutboundMessageTypes.DecisionContext,
        InterventionsOutboundMessageTypes.SessionSnapshot,
        InterventionsOutboundMessageTypes.GazeSample,
        InterventionsOutboundMessageTypes.ReadingFocusChanged,
        InterventionsOutboundMessageTypes.ViewportChanged,
        InterventionsOutboundMessageTypes.AttentionSummaryChanged,
        InterventionsOutboundMessageTypes.InterventionEvent,
        InterventionsOutboundMessageTypes.DecisionModeChanged,
        InterventionsOutboundMessageTypes.Error
    ];

    public ModuleCapabilities Capabilities { get; } = ModuleCapabilities.None;
}
