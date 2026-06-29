# Context-preservation displacement experiment

Deterministic measurement of how far a typographic intervention displaces the
reader's reading position (the area of interest) in the participant reader, and
how the production context-preservation mechanism responds. Backs the controlled
sweep reported in the Evaluation chapter (Context Preservation section).

Every reported number is emitted by the production `usePreserveReadingContext`
hook driven through the real `ReaderShell`, not a reimplementation.

## Pieces

- `../../src/app/eval/context-displacement/page.tsx` — eval-only Next.js route
  that mounts the real `ReaderShell` with context preservation enabled and
  exposes a small control surface on `window.__harness` (fire an intervention,
  reset to baseline, read the current reading anchor, collect snapshots).
- `sweep.mjs` — Playwright sweep. For each intervention × reading position it
  fires the intervention and records the hook's `viewportDeltaPx` (uncompensated
  displacement of the reading position), `anchorErrorPx` (residual after the
  restore), the graded `status`, and whether the committed position stayed on
  screen. Writes `results/raw.{json,csv}`.
- `sweep-onoff.mjs` — fires the SAME intervention from the SAME position with
  preservation OFF then ON, and measures the final on-screen displacement of the
  relevant reading word in each condition. Writes `results/onoff-raw.json`. This
  is the comparison that tests whether preservation makes the relevant text shift
  *less*. It surfaced the original semantic-restart over-reposition (ON moved the
  relevant word further than OFF) and then verified the offset-preserve revision
  in `usePreserveReadingContext.ts` (layout restore now returns the captured
  reading position to its prior on-screen offset, so ON <= OFF).
- `analyze.mjs` — aggregates the raw trials into per-intervention statistics and
  writes `results/summary.{json,md}` plus `results/table-body.tex`.
- `analyze-onoff.mjs` — aggregates `onoff-raw.json` into a without/with
  displacement table (`onoff-summary.{json,md}`, `onoff-table-body.tex`).
- `analyze-three.mjs` — builds the three-condition table used in the Evaluation
  chapter (without preservation / original restore / revised restore) from
  `onoff-original-raw.json` and `onoff-revised-raw.json`. To regenerate those two
  inputs, run `sweep-onoff.mjs` against each restore version: the original is
  git `fb367fc` of `usePreserveReadingContext.ts`, the revised is `HEAD`
  (`git checkout <rev> -- <hook>`, restart `next dev`, run the sweep, copy
  `onoff-raw.json` to the matching `onoff-{original,revised}-raw.json`).
- `diag.mjs` — single-trial diagnostic used to confirm the restore geometry.

Note on what the numbers support: the revised restore **removes the
over-repositioning** (ON moves the word further than OFF in 4/63 trials, vs
46/62 before) and reduces displacement where the reflow is large (font +6px:
142->43 px median), but does **not** uniformly reduce displacement: where the
reflow already moves the word by about a line or less it is left ~unchanged, a
font reduction is marginally worse, and line-width changes repaginate and are
not compensated. The hook's own `anchorErrorPx`/grade is sentence-anchored and
reads more favourably than the word-level displacement; the word-level numbers
are the stricter measure reported in the thesis.

## Run

```bash
# from Frontend/
./node_modules/.bin/next dev        # serve http://localhost:3000
# in another shell, from this directory:
bun run sweep.mjs                   # produces results/raw.{json,csv}
bun run analyze.mjs                 # produces results/summary.* and table-body.tex
```

Set `HARNESS_URL` to point the sweep at a non-default host/port.

## Notes

- Gaze tracking is disabled in the harness, so the reading-position anchor falls
  back deterministically to the first visible word near 35 % of the viewport
  (the same fallback the production hook uses when no gaze-active token exists).
- The route is evaluation-only; it is not linked from the application UI.
