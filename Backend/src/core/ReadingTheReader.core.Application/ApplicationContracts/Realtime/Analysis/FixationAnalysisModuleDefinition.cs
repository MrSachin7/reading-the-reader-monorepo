using ReadingTheReader.core.Application.ApplicationContracts.Realtime.Modules;

namespace ReadingTheReader.core.Application.ApplicationContracts.Realtime.Analysis;

public sealed class FixationAnalysisModuleDefinition : IModuleDefinition
{
    public string ModuleId => FixationAnalysisModuleIds.ModuleId;

    public string DisplayName => "Fixation and saccade analysis provider";

    public string ProtocolVersion => FixationAnalysisProtocolVersions.V1;

    public IReadOnlyList<string> InboundMessageTypes =>
    [
        FixationAnalysisInboundMessageTypes.SubmitAnalysis,
        FixationAnalysisInboundMessageTypes.ProviderError
    ];

    public IReadOnlyList<string> OutboundMessageTypes =>
    [
        FixationAnalysisOutboundMessageTypes.SessionSnapshot,
        FixationAnalysisOutboundMessageTypes.GazeSample,
        FixationAnalysisOutboundMessageTypes.ReadingObservation,
        FixationAnalysisOutboundMessageTypes.ViewportChanged,
        FixationAnalysisOutboundMessageTypes.StateChanged,
        FixationAnalysisOutboundMessageTypes.Error
    ];

    public ModuleCapabilities Capabilities { get; } = ModuleCapabilities.None;
}
