// Aggregate the OFF-vs-ON sweep into the without/with displacement table used in
// the Evaluation chapter (Context Preservation). Reads results/onoff-raw.json.
//
// Usage: bun run analyze-onoff.mjs

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, "results")
const { meta, rows } = JSON.parse(readFileSync(join(OUT_DIR, "onoff-raw.json"), "utf8"))

const quantile = (values, q) => {
  const xs = values.filter((v) => v !== null && v !== undefined).sort((a, b) => a - b)
  if (xs.length === 0) return null
  const pos = (xs.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return lo === hi ? xs[lo] : xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)
}
const r1 = (v) => (v === null ? null : Number(v.toFixed(1)))

// Preserve the intervention order as it first appears in the raw rows.
const order = []
const groups = new Map()
for (const r of rows) {
  if (!groups.has(r.intervention)) {
    groups.set(r.intervention, [])
    order.push(r.intervention)
  }
  groups.get(r.intervention).push(r)
}

const rowsOut = []
let worseTotal = 0
for (const label of order) {
  const v = groups.get(label)
  const off = v.map((r) => r.offDisplacementPx)
  const on = v.map((r) => r.onDisplacementPx)
  const worse = v.filter(
    (r) =>
      r.offDisplacementPx !== null &&
      r.onDisplacementPx !== null &&
      r.onDisplacementPx > r.offDisplacementPx + 1
  ).length
  worseTotal += worse
  rowsOut.push({
    label,
    n: v.length,
    offMedian: r1(quantile(off, 0.5)),
    offP95: r1(quantile(off, 0.95)),
    onMedian: r1(quantile(on, 0.5)),
    onP95: r1(quantile(on, 0.95)),
    onWorseThanOff: worse,
  })
}

const allOff = rows.map((r) => r.offDisplacementPx)
const allOn = rows.map((r) => r.onDisplacementPx)
const overall = {
  n: rows.length,
  offMedian: r1(quantile(allOff, 0.5)),
  offP95: r1(quantile(allOff, 0.95)),
  onMedian: r1(quantile(allOn, 0.5)),
  onP95: r1(quantile(allOn, 0.95)),
  onWorseThanOff: worseTotal,
}

writeFileSync(join(OUT_DIR, "onoff-summary.json"), JSON.stringify({ meta, overall, perIntervention: rowsOut }, null, 2))

// Markdown
const md = [
  `# Reading-position displacement without vs with preservation\n`,
  `Generated ${meta.generatedAtUtc} · ${meta.trialCount} trials · displacement = |final word offset - offset before intervention| (px; 1 line = ${meta.baselineLinePx.toFixed(1)} px)\n`,
  `| Intervention | n | Without median | Without p95 | With median | With p95 | ON worse |`,
  `|---|--:|--:|--:|--:|--:|--:|`,
  ...rowsOut.map(
    (r) => `| ${r.label} | ${r.n} | ${r.offMedian} | ${r.offP95} | ${r.onMedian} | ${r.onP95} | ${r.onWorseThanOff}/${r.n} |`
  ),
  `| **Overall** | ${overall.n} | ${overall.offMedian} | ${overall.offP95} | ${overall.onMedian} | ${overall.onP95} | ${overall.onWorseThanOff}/${overall.n} |`,
]
writeFileSync(join(OUT_DIR, "onoff-summary.md"), md.join("\n") + "\n")

// LaTeX tabular body for tab:eval-displacement
const esc = (s) =>
  s
    .replace(/->/g, "$\\to$")
    .replace(/\+(\d)/g, "$+$$1")
    .replace(/-(\d)/g, "$-$$1")
    .replace(/px/g, "\\,px")
    .replace(/em/g, "\\,em")
const tex = rowsOut.map(
  (r) => `${esc(r.label)} & ${r.n} & ${r.offMedian} & ${r.offP95} & ${r.onMedian} & ${r.onP95} \\\\`
)
tex.push(`\\midrule`)
tex.push(
  `\\textbf{Overall} & ${overall.n} & ${overall.offMedian} & ${overall.offP95} & ${overall.onMedian} & ${overall.onP95} \\\\`
)
writeFileSync(join(OUT_DIR, "onoff-table-body.tex"), tex.join("\n") + "\n")

console.log(md.join("\n"))
console.log(`\nON moved the word further than OFF in ${overall.onWorseThanOff} of ${overall.n} trials.`)
console.log(`Wrote onoff-summary.{json,md} and onoff-table-body.tex to ${OUT_DIR}`)
