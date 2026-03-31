## Summary

Wave 4 made the module architecture usable in the researcher live workflow:

- The researcher live page now loads the intervention catalog before rendering module-driven controls.
- Live controls are grouped intentionally and now commit explicit `moduleId + parameters` payloads while preserving the current manual workflow.
- Live metadata and intervention history now show readable module names and parameter semantics instead of only raw reason text or presentation snapshots.
- The grouping logic is isolated in `group-intervention-modules.ts`, so future intervention modules can be added without re-hardcoding the whole panel layout.

## Verification

Frontend verification completed locally on 2026-03-31:

- `bun run build` in `Frontend/`
