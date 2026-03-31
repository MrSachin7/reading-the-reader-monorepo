## Summary

Wave 1 established the intervention-module seam on the backend:

- Added canonical intervention module ids, parameter descriptors, execution contracts, and validation/result types.
- Introduced additive module lookup through `IReadingInterventionModule`, `IReadingInterventionModuleRegistry`, and `ReadingInterventionModuleRegistry`.
- Registered the first built-in catalog for the current researcher control surface:
  - font family
  - font size
  - line width
  - line height
  - letter spacing
  - theme mode
  - palette
  - participant edit lock
- Wired the catalog into DI and pinned it with new catalog tests.

## Verification

Backend verification completed locally on 2026-03-31:

- `dotnet test Backend/tests/ReadingTheReader.Realtime.Persistence.Tests/ReadingTheReader.Realtime.Persistence.Tests.csproj --no-restore --filter "FullyQualifiedName~ReadingInterventionModuleCatalogTests"`
- `dotnet build Backend/reading-the-reader-backend.sln -v minimal`
