// Matched three-condition sweep: preservation OFF, ON with the original restore,
// and ON with the revised restore, fired from the SAME page, position, and anchor
// word inside ONE browser session, so the three conditions differ only in the
// restore strategy. This replaces the two separate runs behind
// onoff-original-raw.json and onoff-revised-raw.json, which resolved different
// anchor words in a third of the trial keys and are therefore not comparable
// trial by trial.
//
// Requires the harness control surface to expose setRestoreStrategy (see
// src/app/eval/context-displacement/page.tsx) and `next dev` on
// http://localhost:3000. Writes results/matched-raw.json.
//
// Usage: bun run sweep-matched.mjs

import { chromium } from "playwright"
import { writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const HERE = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(HERE, "results")
const BASE_URL = process.env.HARNESS_URL ?? "http://localhost:3000/eval/context-displacement"
const VIEWPORT = { width: 1440, height: 900 }
const BASELINE_LINE_PX = 18 * 1.8

// Same eleven interventions as sweep-onoff.mjs, in the same order.
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

const CONDITIONS = [
  { key: "off", preserve: false, strategy: "revised" },
  { key: "onOriginal", preserve: true, strategy: "original" },
  { key: "onRevised", preserve: true, strategy: "revised" },
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

async function runCondition(page, condition, intervention, pageIndex) {
  await page.evaluate(([preserve, strategy]) => {
    window.__harness.setPreserve(preserve)
    window.__harness.setRestoreStrategy(strategy)
  }, [condition.preserve, condition.strategy])
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
      typeof window.__harness.setRestoreStrategy === "function" &&
      document.querySelectorAll("[data-token-id][data-token-kind='word']").length > 0,
    { timeout: 30_000 }
  )
  await sleep(500)

  const { total: pageCount } = await getPageInfo(page)
  console.log(`Reader paginated into ${pageCount} page(s).`)

  const rows = []
  let anchorMismatches = 0
  for (const intervention of INTERVENTIONS) {
    for (let pageIndex = 0; pageIndex < pageCount; pageIndex += 1) {
      const results = {}
      for (const condition of CONDITIONS) {
        results[condition.key] = await runCondition(page, condition, intervention, pageIndex)
      }
      if (CONDITIONS.some((c) => !results[c.key])) continue

      const anchorIds = CONDITIONS.map((c) => results[c.key].anchor.tokenId)
      const anchorsMatch = anchorIds.every((id) => id === anchorIds[0])
      if (!anchorsMatch) anchorMismatches += 1

      const row = {
        intervention: intervention.label,
        affected: intervention.affected.join("+"),
        pageIndex,
        anchorTokenId: anchorIds[0],
        anchorsMatch,
        anchorTokenIds: anchorIds,
        offDisplacementPx: results.off.displacementPx,
        offVisible: results.off.finalVisible,
        onOriginalDisplacementPx: results.onOriginal.displacementPx,
        onOriginalVisible: results.onOriginal.finalVisible,
        onOriginalStatus: results.onOriginal.snap?.status ?? null,
        onRevisedDisplacementPx: results.onRevised.displacementPx,
        onRevisedVisible: results.onRevised.finalVisible,
        onRevisedStatus: results.onRevised.snap?.status ?? null,
      }
      rows.push(row)
      console.log(
        `${intervention.label.padEnd(30)} p${pageIndex}  ` +
          `OFF=${row.offDisplacementPx}px  ON-original=${row.onOriginalDisplacementPx}px  ` +
          `ON-revised=${row.onRevisedDisplacementPx}px${anchorsMatch ? "" : "  (anchor differs across conditions)"}`
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
    anchorMismatches,
    conditions: CONDITIONS,
    note:
      "displacement = |final on-screen offset of the relevant reading word - its offset before the intervention|; " +
      "all three conditions of a trial run in one browser session from the same page and anchor word",
  }
  writeFileSync(join(OUT_DIR, "matched-raw.json"), JSON.stringify({ meta, rows }, null, 2))
  console.log(`\nWrote ${rows.length} matched trials (${anchorMismatches} with differing anchors) to ${OUT_DIR}/matched-raw.json`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
