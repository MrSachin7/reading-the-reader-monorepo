# Deferred Items

## 2026-03-31

- Frontend lint still fails in unrelated researcher-live files:
  - `Frontend/src/modules/pages/researcher/current-live/components/LiveMetadataColumn.tsx`
  - `Frontend/src/modules/pages/researcher/current-live/lib/group-intervention-modules.ts`
  These files trigger `@next/next/no-assign-module-variable` on the local variable name `module`. They were not touched by 04-03 and were left unchanged.
