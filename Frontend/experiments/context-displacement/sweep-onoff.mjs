// OFF-vs-ON comparison for the relevant reading position.
//
// For each intervention and reading position, fires the SAME intervention twice
// from the same starting state: once with context preservation OFF (no restore)
// and once ON (restore runs). In each condition it measures the final on-screen
// displacement of the relevant reading word (the word the reader was on, near
// 35% of the viewport) from where it sat before the intervention.
//
//   offDisplacementPx : |final offset - captured offset| with preservation OFF
//   onDisplacementPx  : |final offset - captured offset| with preservation ON
//
// If preservation keeps the relevant text in place, onDisplacementPx should be
// smaller than offDisplacementPx. (Spoiler the data answers, not the script.)
//
// Usage: bun run sweep-onoff.mjs   (requires `next dev` on http://localhost:3000)

import { chromium } from "playwright"
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, "results")
const BASE_URL = process.env.HARNESS_URL ?? "http://localhost:3000/eval/context-displacement"
const VIEWPORT = { width: 1440, height: 900 }
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
  await page.keyboard.press("Home")
  await sleep(120)
  for (let i = 0; i < targetIndex; i += 1) {
    await page.keyboard.press("ArrowRight")
    await sleep(120)
  }
  await sleep(150)
}

// Final on-screen offset of a token by id (relative to the reading container).
async function tokenOffset(page, tokenId) {
  return page.evaluate((tid) => {
    const content = document.querySelector("[data-reader-content='true']")
    const container = content?.parentElement
    if (!content || !container || !tid) return null
    const el = content.querySelector(`[data-token-id="${window.CSS && CSS.escape ? CSS.escape(tid) : tid}"]`)
    if (!el) return { found: false, visible: false, topOffset: null }
    const cr = container.getBoundingClientRect()
    const r = el.getBoundingClientRect()
    return { found: true, visible: r.bottom > cr.top && r.top < cr.bottom, topOffset: r.top - cr.top }
  }, tokenId)
}

async function runCondition(page, preserve, intervention, pageIndex) {
  await page.evaluate((p) => window.__harness.setPreserve(p), preserve)
  await page.evaluate(() => window.__harness.reset())
  await sleep(240)
  await gotoPage(page, pageIndex)
  const anchor = await page.evaluate(() => window.__harness.getAnchor())
  if (!anchor.tokenId) return null
  await sleep(260)

  const snap = await page.evaluate(
    ([cfg]) => window.__harness.fire(cfg),
    [{ patch: intervention.patch, affected: intervention.affected }]
  )
  await sleep(120)

  const after = await tokenOffset(page, anchor.tokenId)
  const displacementPx =
    after?.topOffset === null || after?.topOffset === undefined || anchor.offsetPx === null
      ? null
      : Math.abs(after.topOffset - anchor.offsetPx)

  return {
    anchor,
    snap,
    finalVisible: after?.visible ?? null,
    finalTopPx: after?.topOffset ?? null,
    displacementPx: displacementPx === null ? null : Number(displacementPx.toFixed(2)),
  }
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 1 })
  page.on("pageerror", (e) => console.error("pageerror:", e.message))

  await page.goto(BASE_URL, { waitUntil: "networkidle" })
  await page.waitForFunction(
    () =>
      window.__harness?.ready === true &&
      typeof window.__harness.setPreserve === "function" &&
      document.querySelectorAll("[data-token-id][data-token-kind='word']").length > 0,
    { timeout: 30_000 }
  )
  await sleep(500)

  const { total: pageCount } = await getPageInfo(page)
  console.log(`Reader paginated into ${pageCount} page(s).`)

  const rows = []
  for (const intervention of INTERVENTIONS) {
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const off = await runCondition(page, false, intervention, pageIndex)
      const on = await runCondition(page, true, intervention, pageIndex)
      if (!off || !on) continue

      rows.push({
        intervention: intervention.label,
        affected: intervention.affected.join("+"),
        pageIndex,
        anchorTokenId: on.anchor.tokenId,
        offDisplacementPx: off.displacementPx,
        offVisible: off.finalVisible,
        onDisplacementPx: on.displacementPx,
        onVisible: on.finalVisible,
        onStatus: on.snap?.status ?? null,
        reductionPx:
          off.displacementPx === null || on.displacementPx === null
            ? null
            : Number((off.displacementPx - on.displacementPx).toFixed(2)),
      })
      const r = rows.at(-1)
      console.log(
        `${intervention.label.padEnd(30)} p${pageIndex}  ` +
          `OFF=${r.offDisplacementPx}px  ON=${r.onDisplacementPx}px  ` +
          `${r.reductionPx >= 0 ? "reduced" : "INCREASED"} by ${Math.abs(r.reductionPx)}px`
      )
    }
  }

  await browser.close()

  const meta = {
    generatedAtUtc: new Date().toISOString(),
    viewport: VIEWPORT,
    baselineLinePx: BASELINE_LINE_PX,
    pageCount,
    trialCount: rows.length,
    note: "displacement = |final on-screen offset of the relevant reading word - its offset before the intervention|",
  }
  writeFileSync(join(OUT_DIR, "onoff-raw.json"), JSON.stringify({ meta, rows }, null, 2))
  console.log(`\nWrote ${rows.length} OFF/ON pairs to ${OUT_DIR}/onoff-raw.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
