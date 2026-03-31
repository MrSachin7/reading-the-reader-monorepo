## Summary

Wave 3 exposed the intervention catalog as a shared backend/frontend contract:

- Added a backend query surface and REST endpoint for the authoritative intervention-module catalog.
- Added Web API response contracts for module descriptors and parameter metadata.
- Added frontend intervention-module mirrors and an RTK Query endpoint for catalog discovery.
- Updated frontend session, socket, and replay contracts so intervention and proposal provenance now understand `moduleId` and `parameters`.

## Verification

Cross-layer verification completed locally on 2026-03-31:

- `dotnet build Backend/reading-the-reader-backend.sln -v minimal`
- `bun run build` in `Frontend/`
