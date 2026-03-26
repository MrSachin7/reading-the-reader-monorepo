## Summary

Wave 1 introduced the stable decision-strategy contract surface in the backend:

- `DecisionStrategyContracts.cs` now defines provider ids, execution modes, proposal statuses, curated decision context, decision configuration, runtime state, and realtime decision update snapshots.
- `IDecisionStrategy`, `IDecisionStrategyRegistry`, and `IDecisionContextFactory` establish the seam for swappable non-manual decision providers.
- `DecisionContextFactory` maps authoritative session state into the curated decision context without exposing the full experiment snapshot.
- `ApplicationModuleInstaller` now registers the decision context factory and strategy infrastructure.
- Added `DecisionStrategyContractTests.cs` and `DecisionContextFactoryTests.cs` to pin the contract defaults and curated-context boundary.

## Verification

Static implementation completed. Backend build/test verification is pending user-run commands.
