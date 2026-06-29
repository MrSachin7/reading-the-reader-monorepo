// Context-preservation displacement sweep.
//
// Drives the real ReaderShell (via /eval/context-displacement) with Playwright
// and fires each typographic intervention from a range of reading positions.
// For every trial it records the numbers emitted by the production
// usePreserveReadingContext hook:
//   - viewportDeltaPx : uncompensated displacement of the reading position (AOI)
//                       caused by the reflow, i.e. how far the reader's current
//                       word moves WITHOUT context preservation.
//   - anchorErrorPx   : residual offset AFTER the capture-and-restore, i.e. how
//                       far the reading position is from where it should be WITH
//                       preservation.
//   - status          : preserved | degraded | failed (the graded outcome).
//
// Usage: bun run sweep.mjs   (requires `next dev` on http://localhost:3000)

import { chromium } from "playwright"
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, "results")
const BASE_URL = process.env.HARNESS_URL ?? "http://localhost:3000/eval/context-displacement"
const VIEWPORT = { width: 1440, height: 900 }

// Baseline line box in px (fontSizePx * lineHeight) — used to express
// displacement in reading lines as well as pixels.
const BASELINE_LINE_PX = 18 * 1.8

const INTERVENTIONS = [
  { label: "Font size +2px (18->20)", patch: { fontSizePx: 20 }, affected: ["font-size"] },
  { label: "Font size +6px (18->24)", patch: { fontSizePx: 24 }, affected: ["font-size"] },
  { label: "Font size -2px (18->16)", patch: { fontSizePx: 16 }, affected: ["font-size"] },
  { label: "Line height +0.3 (1.8->2.1)", patch: { lineHeight: 2.1 }, affected: ["line-height"] },
  { label: "Line height -0.3 (1.8->1.5)", patch: { lineHeight: 1.5 }, affected: ["line-height"] },
  { label: "Line width -120px (680->560)", patch: { lineWidthPx: 560 }, affected: ["line-width"] },
  { label: "Line width +80px (680->760)", patch: { lineWidthPx: 760 }, affected: ["line-width"] },
  { label: "Letter spacing +0.06em", patch: { letterSpacingEm: 0.06 }, affected: ["letter-spacing"] },
  { label: "Letter spacing +0.12em", patch: { letterSpacingEm: 0.12 }, affected: ["letter-spacing"] },
  { label: "Font family -> Inter", patch: { fontFamily: "inter" }, affected: ["font-family"] },
  { label: "Font family -> Space Grotesk", patch: { fontFamily: "space-grotesk" }, affected: ["font-family"] },
]

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function getPageInfo(page) {
  return page.evaluate(() => {
    const footer = Array.from(document.querySelectorAll("p")).find((p) => /Page\s+\d+\s*\/\s*\d+/.test(p.textContent ?? ""))
    const m = footer?.textContent?.match(/Page\s+(\d+)\s*\/\s*(\d+)/)
    return m ? { current: Number(m[1]), total: Number(m[2]) } : { current: 1, total: 1 }
  })
}

async function gotoPage(page, targetIndex) {
  // Home -> page 0, then ArrowRight targetIndex times.
  await page.keyboard.press("Home")
  await sleep(120)
  for (let i = 0; i < targetIndex; i += 1) {
    await page.keyboard.press("ArrowRight")
    await sleep(120)
  }
  await sleep(150)
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  page.on("pageerror", (e) => console.error("pageerror:", e.message))

  await page.goto(BASE_URL, { waitUntil: "networkidle" })
  // Wait until the harness control surface and the rendered tokens exist.
  await page.waitForFunction(
    () =>
      window.__harness?.ready === true &&
      document.querySelectorAll("[data-token-id][data-token-kind='word']").length > 0,
    { timeout: 30_000 }
  )
  await sleep(500)

  const { total: pageCount } = await getPageInfo(page)
  console.log(`Reader paginated into ${pageCount} page(s).`)

  const positions = []
  for (let p = 0; p < pageCount; p += 1) positions.push(p)

  const rows = []
  for (const intervention of INTERVENTIONS) {
    for (const pageIndex of positions) {
      // Fresh baseline for every trial.
      await page.evaluate(() => window.__harness.reset())
      await sleep(220)
      await gotoPage(page, pageIndex)

      const anchor = await page.evaluate(() => window.__harness.getAnchor())
      if (!anchor.tokenId) {
        // No visible reading word on this page (e.g. empty trailing page); skip.
        continue
      }
      // Let the continuous 120ms capture record a fresh anchor.
      await sleep(260)

      const snap = await page.evaluate(
        ([cfg]) => window.__harness.fire(cfg),
        [{ patch: intervention.patch, affected: intervention.affected }]
      )

      // After the full capture-and-restore, measure whether the reading position
      // (the committed sentence and the captured word) is still on screen and
      // where it landed. This is the unambiguous place-keeping outcome, free of
      // the semantic-restart top-of-area target that anchorErrorPx encodes.
      const after = await page.evaluate(
        ([sid, tid, originalOffset]) => {
          const content = document.querySelector("[data-reader-content='true']")
          const container = content?.parentElement
          if (!content || !container) return null
          const cr = container.getBoundingClientRect()
          const measure = (sel) => {
            const el = content.querySelector(sel)
            if (!el) return { found: false, visible: false, topOffset: null }
            const r = el.getBoundingClientRect()
            return {
              found: true,
              visible: r.bottom > cr.top && r.top < cr.bottom,
              topOffset: r.top - cr.top,
            }
          }
          const esc = (v) => (window.CSS && CSS.escape ? CSS.escape(v) : v)
          const sentence = sid
            ? measure(`[data-sentence-id="${esc(sid)}"]:not([data-token-id])`).found
              ? measure(`[data-sentence-id="${esc(sid)}"]:not([data-token-id])`)
              : measure(`[data-sentence-id="${esc(sid)}"]`)
            : { found: false, visible: false, topOffset: null }
          const word = tid ? measure(`[data-token-id="${esc(tid)}"]`) : { found: false, visible: false, topOffset: null }
          return {
            committedSentenceVisible: sentence.visible,
            committedSentenceTopPx: sentence.topOffset === null ? null : Number(sentence.topOffset.toFixed(2)),
            capturedWordVisible: word.visible,
            capturedWordResidualPx:
              word.topOffset === null || originalOffset === null
                ? null
                : Number(Math.abs(word.topOffset - originalOffset).toFixed(2)),
          }
        },
        [snap.anchorSentenceId, snap.anchorTokenId, anchor.offsetPx]
      )

      rows.push({
        intervention: intervention.label,
        affected: intervention.affected.join("+"),
        pageIndex,
        anchorTokenId: anchor.tokenId,
        anchorSentenceId: anchor.sentenceId,
        status: snap.status,
        anchorSource: snap.anchorSource,
        uncompensatedDisplacementPx:
          snap.viewportDeltaPx === null ? null : Number(snap.viewportDeltaPx.toFixed(2)),
        residualErrorPx: snap.anchorErrorPx === null ? null : Number(snap.anchorErrorPx.toFixed(2)),
        uncompensatedDisplacementLines:
          snap.viewportDeltaPx === null ? null : Number((snap.viewportDeltaPx / BASELINE_LINE_PX).toFixed(3)),
        committedSentenceVisible: after?.committedSentenceVisible ?? null,
        committedSentenceTopPx: after?.committedSentenceTopPx ?? null,
        capturedWordVisible: after?.capturedWordVisible ?? null,
        capturedWordResidualPx: after?.capturedWordResidualPx ?? null,
        reason: snap.reason,
      })
      console.log(
        `${intervention.label.padEnd(30)} p${pageIndex}  ` +
          `disp=${rows.at(-1).uncompensatedDisplacementPx}px  ` +
          `resid=${rows.at(-1).residualErrorPx}px  ${snap.status}`
      )
    }
  }

  await browser.close()

  const meta = {
    generatedAtUtc: new Date().toISOString(),
    viewport: VIEWPORT,
    baselineLinePx: BASELINE_LINE_PX,
    pageCount,
    interventionCount: INTERVENTIONS.length,
    trialCount: rows.length,
  }
  writeFileSync(join(OUT_DIR, "raw.json"), JSON.stringify({ meta, rows }, null, 2))

  const header = [
    "intervention",
    "affected",
    "pageIndex",
    "anchorTokenId",
    "anchorSentenceId",
    "status",
    "anchorSource",
    "uncompensatedDisplacementPx",
    "residualErrorPx",
    "uncompensatedDisplacementLines",
    "committedSentenceVisible",
    "committedSentenceTopPx",
    "capturedWordVisible",
    "capturedWordResidualPx",
    "reason",
  ]
  const csv = [header.join(",")]
    .concat(
      rows.map((r) =>
        header
          .map((k) => {
            const v = r[k]
            if (v === null || v === undefined) return ""
            const s = String(v)
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
          })
          .join(",")
      )
    )
    .join("\n")
  writeFileSync(join(OUT_DIR, "raw.csv"), csv)

  console.log(`\nWrote ${rows.length} trials to ${OUT_DIR}/raw.json and raw.csv`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
