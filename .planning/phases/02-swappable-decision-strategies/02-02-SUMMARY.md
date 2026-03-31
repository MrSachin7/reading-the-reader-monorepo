## Summary

Wave 2 wired the strategy boundary into runtime behavior while preserving the researcher-first manual path:

- Added `DecisionStrategyRegistry`, `DecisionStrategyCoordinator`, `RuleBasedDecisionStrategy`, and `ExternalDecisionStrategyStub`.
- Extended `ExperimentSessionManager` and `IExperimentRuntimeAuthority` with decision configuration updates, proposal approval/rejection, pause/resume automation, execution-mode switching, and strategy evaluation.
- Manual `applyIntervention` remains immediate and now supersedes unresolved non-manual proposals.
- Added realtime ingress commands and message types for proposal review and automation supervision.
- Added `DecisionProposalLifecycleTests.cs` covering advisory pending behavior, autonomous auto-apply behavior, and manual superseding behavior.

## Verification

Backend validation completed locally on 2026-03-31. Targeted proposal-lifecycle coverage and the full backend solution test command passed.
