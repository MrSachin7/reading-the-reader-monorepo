// Aggregate the displacement sweep into per-intervention summary statistics and
// a LaTeX table body for the evaluation chapter.
//
// Usage: bun run analyze.mjs

import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, "results")

const { meta, rows } = JSON.parse(readFileSync(join(OUT_DIR, "raw.json"), "utf8"))

const quantile = (values, q) => {
  const xs = values.filter((v) => v !== null && v !== undefined).sort((a, b) => a - b)
  if (xs.length === 0) return null
  const pos = (xs.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  if (lo === hi) return xs[lo]
  return xs[lo] + (xs[hi] - xs[lo]) * (pos - lo)
}
const median = (xs) => quantile(xs, 0.5)
const round = (v, d = 1) => (v === null ? null : Number(v.toFixed(d)))

function summarise(subset) {
  const disp = subset.map((r) => r.uncompensatedDisplacementPx)
  const resid = subset.map((r) => r.residualErrorPx)
  const n = subset.length
  const preserved = subset.filter((r) => r.status === "preserved").length
  const degraded = subset.filter((r) => r.status === "degraded").length
  const failed = subset.filter((r) => r.status === "failed").length
  const onScreen = subset.filter((r) => r.committedSentenceVisible === true).length
  return {
    n,
    dispMedianPx: round(median(disp)),
    dispP95Px: round(quantile(disp, 0.95)),
    dispMaxPx: round(Math.max(...disp.filter((v) => v !== null)), 1),
    dispMedianLines: round(median(disp) === null ? null : median(disp) / meta.baselineLinePx, 2),
    residMedianPx: round(median(resid), 2),
    residP95Px: round(quantile(resid, 0.95), 2),
    residMaxPx: round(Math.max(...resid.filter((v) => v !== null)), 2),
    preserved,
    degraded,
    failed,
    preservedPct: round((preserved / n) * 100, 0),
    onScreen,
    onScreenPct: round((onScreen / n) * 100, 0),
  }
}

const byIntervention = new Map()
for (const r of rows) {
  if (!byIntervention.has(r.intervention)) byIntervention.set(r.intervention, [])
  byIntervention.get(r.intervention).push(r)
}

const perIntervention = []
for (const [intervention, subset] of byIntervention) {
  perIntervention.push({ intervention, affected: subset[0].affected, ...summarise(subset) })
}
const overall = summarise(rows)

const summary = { meta, overall, perIntervention }
writeFileSync(join(OUT_DIR, "summary.json"), JSON.stringify(summary, null, 2))

// Human-readable markdown.
const md = []
md.push(`# Context-preservation displacement — summary\n`)
md.push(
  `Generated ${meta.generatedAtUtc} · viewport ${meta.viewport.width}x${meta.viewport.height} · ` +
    `${meta.trialCount} trials across ${meta.pageCount} pages · baseline line box ${meta.baselineLinePx.toFixed(1)} px\n`
)
md.push(`## Overall`)
md.push(
  `- Uncompensated displacement (no preservation): median ${overall.dispMedianPx} px ` +
    `(${overall.dispMedianLines} lines), p95 ${overall.dispP95Px} px, max ${overall.dispMaxPx} px`
)
md.push(
  `- Residual error (with preservation): median ${overall.residMedianPx} px, ` +
    `p95 ${overall.residP95Px} px, max ${overall.residMaxPx} px`
)
md.push(
  `- Outcome: ${overall.preserved} preserved / ${overall.degraded} degraded / ${overall.failed} failed ` +
    `(${overall.preservedPct}% preserved)`
)
md.push(
  `- Reading position retained on screen after restore: ${overall.onScreen}/${overall.n} ` +
    `(${overall.onScreenPct}%)\n`
)
md.push(`## Per intervention`)
md.push(
  `| Intervention | n | Disp. median (px) | Disp. p95 (px) | Disp. median (lines) | Residual median (px) | Residual p95 (px) | Preserved |`
)
md.push(`|---|--:|--:|--:|--:|--:|--:|--:|`)
for (const r of perIntervention) {
  md.push(
    `| ${r.intervention} | ${r.n} | ${r.dispMedianPx} | ${r.dispP95Px} | ${r.dispMedianLines} | ` +
      `${r.residMedianPx} | ${r.residP95Px} | ${r.preserved}/${r.n} |`
  )
}
writeFileSync(join(OUT_DIR, "summary.md"), md.join("\n") + "\n")

// LaTeX tabular body (rows only) for pasting into the thesis table.
const tex = []
for (const r of perIntervention) {
  tex.push(
    `${r.intervention.replace(/->/g, "$\\to$").replace(/_/g, "\\_")} & ${r.n} & ${r.dispMedianPx} & ${r.dispP95Px} & ` +
      `${r.dispMedianLines} & ${r.residMedianPx} & ${r.preserved}/${r.n} \\\\`
  )
}
tex.push(`\\midrule`)
tex.push(
  `\\textbf{Overall} & ${overall.n} & ${overall.dispMedianPx} & ${overall.dispP95Px} & ` +
    `${overall.dispMedianLines} & ${overall.residMedianPx} & ${overall.preserved}/${overall.n} \\\\`
)
writeFileSync(join(OUT_DIR, "table-body.tex"), tex.join("\n") + "\n")

console.log(md.join("\n"))
console.log(`\nWrote summary.json, summary.md, table-body.tex to ${OUT_DIR}`)
