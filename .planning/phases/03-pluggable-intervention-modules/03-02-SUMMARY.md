## Summary

Wave 2 moved authoritative intervention execution and provenance onto the module boundary:

- `ApplyInterventionCommand` and `InterventionEventSnapshot` now carry `moduleId` and normalized parameter values.
- `ReadingInterventionRuntime` now resolves explicit modules through the registry and records module provenance in intervention events.
- `RuleBasedDecisionStrategy` now proposes the `font-size` module explicitly instead of only emitting an inline patch.
- Replay/export now preserves module provenance for intervention events and linked decision proposals.
- A compatibility bridge remains for older multi-field legacy patch callers so existing runtime paths still work while new code uses explicit modules.

## Verification

Backend verification completed locally on 2026-03-31:

- `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~InterventionModuleExecutionTests|FullyQualifiedName~ReadingInterventionRuntimeTests|FullyQualifiedName~DecisionProposalLifecycleTests|FullyQualifiedName~ExperimentReplayExportSerializerTests"`
