// Three-condition comparison for the Evaluation chapter: reading-position
// displacement WITHOUT preservation, WITH the original (top-of-area)
// semantic-restart, and WITH the revised (offset-preserve) restore.
//
// Reads results/onoff-original-raw.json (ON column = original strategy) and
// results/onoff-revised-raw.json (OFF column + ON column = revised strategy).
// The two files come from running sweep-onoff.mjs against the two code versions
// (git fb367fc original, HEAD revised). OFF is restore-independent and is taken
// from the revised file.
//
// Usage: bun run analyze-three.mjs

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, "results")
const original = JSON.parse(readFileSync(join(OUT_DIR, "onoff-original-raw.json"), "utf8")).rows
const revised = JSON.parse(readFileSync(join(OUT_DIR, "onoff-revised-raw.json"), "utf8")).rows

const median = (values) => {
  const xs = values.filter((v) => v !== null && v !== undefined).sort((a, b) => a - b)
  if (xs.length === 0) return null
  const m = Math.floor((xs.length - 1) / 2)
  return xs.length % 2 ? xs[m] : (xs[m] + xs[m + 1]) / 2
}
const r1 = (v) => (v === null ? null : Number(v.toFixed(1)))
const overReposition = (rows) =>
  rows.filter(
    (r) =>
      r.offDisplacementPx !== null &&
      r.onDisplacementPx !== null &&
      r.onDisplacementPx > r.offDisplacementPx + 1
  ).length

const byIntervention = (rows) => {
  const m = new Map()
  for (const r of rows) {
    if (!m.has(r.intervention)) m.set(r.intervention, [])
    m.get(r.intervention).push(r)
  }
  return m
}
const go = byIntervention(original)
const gr = byIntervention(revised)

const order = []
for (const r of revised) if (!order.includes(r.intervention)) order.push(r.intervention)

const rowsOut = order.map((label) => ({
  label,
  n: gr.get(label).length,
  without: r1(median(gr.get(label).map((r) => r.offDisplacementPx))),
  withOriginal: r1(median(go.get(label).map((r) => r.onDisplacementPx))),
  withRevised: r1(median(gr.get(label).map((r) => r.onDisplacementPx))),
}))

const overall = {
  n: revised.length,
  without: r1(median(revised.map((r) => r.offDisplacementPx))),
  withOriginal: r1(median(original.map((r) => r.onDisplacementPx))),
  withRevised: r1(median(revised.map((r) => r.onDisplacementPx))),
  overRepositionOriginal: overReposition(original),
  overRepositionRevised: overReposition(revised),
}

writeFileSync(join(OUT_DIR, "three-summary.json"), JSON.stringify({ overall, perIntervention: rowsOut }, null, 2))

const md = [
  `# Reading-position displacement: without / original restore / revised restore\n`,
  `Median on-screen displacement of the reader's word (px; 1 line = 32.4 px).\n`,
  `| Intervention | n | Without | With original | With revised |`,
  `|---|--:|--:|--:|--:|`,
  ...rowsOut.map((r) => `| ${r.label} | ${r.n} | ${r.without} | ${r.withOriginal} | ${r.withRevised} |`),
  `| **Overall (median)** | ${overall.n} | ${overall.without} | ${overall.withOriginal} | ${overall.withRevised} |`,
  ``,
  `Over-repositioning (preservation moved the word further than the bare reflow): ` +
    `original ${overall.overRepositionOriginal}/${overall.n}, revised ${overall.overRepositionRevised}/${overall.n}.`,
]
writeFileSync(join(OUT_DIR, "three-summary.md"), md.join("\n") + "\n")

const esc = (s) =>
  s
    .replace(/->/g, "$\\to$")
    .replace(/\+(\d)/g, "$+$$1")
    .replace(/-(\d)/g, "$-$$1")
    .replace(/px/g, "\\,px")
    .replace(/em/g, "\\,em")
const tex = rowsOut.map(
  (r) => `${esc(r.label)} & ${r.n} & ${r.without} & ${r.withOriginal} & ${r.withRevised} \\\\`
)
tex.push(`\\midrule`)
tex.push(
  `\\textbf{Overall} & ${overall.n} & ${overall.without} & ${overall.withOriginal} & ${overall.withRevised} \\\\`
)
writeFileSync(join(OUT_DIR, "three-table-body.tex"), tex.join("\n") + "\n")

console.log(md.join("\n"))
console.log(`\nWrote three-summary.{json,md} and three-table-body.tex to ${OUT_DIR}`)
