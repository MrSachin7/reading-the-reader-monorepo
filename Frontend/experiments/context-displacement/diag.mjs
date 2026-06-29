import { chromium } from "playwright"

const BASE_URL = "http://localhost:3000/eval/context-displacement"
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(BASE_URL, { waitUntil: "networkidle" })
await page.waitForFunction(
  () => window.__harness?.ready === true && document.querySelectorAll("[data-token-id][data-token-kind='word']").length > 0,
  { timeout: 30000 }
)
await sleep(600)

const probe = () =>
  page.evaluate(() => {
    const content = document.querySelector("[data-reader-content='true']")
    const container = content?.parentElement
    const cr = container.getBoundingClientRect()
    const anchor = window.__harness.getAnchor()
    return {
      scrollTop: container.scrollTop,
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      overflow: container.scrollHeight - container.clientHeight,
      anchor,
    }
  })

console.log("=== baseline (page 0) ===")
console.log(JSON.stringify(await probe(), null, 2))

await sleep(300)
const snap = await page.evaluate(
  ([cfg]) => window.__harness.fire(cfg),
  [{ patch: { fontSizePx: 24 }, affected: ["font-size"] }]
)
await sleep(400)
console.log("=== after font +6 intervention ===")
console.log("snapshot:", JSON.stringify(snap, null, 2))
console.log("post-restore probe:", JSON.stringify(await probe(), null, 2))

// Where did the committed sentence end up?
const committed = await page.evaluate((sid) => {
  const content = document.querySelector("[data-reader-content='true']")
  const container = content.parentElement
  const cr = container.getBoundingClientRect()
  const el = content.querySelector(`[data-sentence-id="${CSS.escape(sid)}"]:not([data-token-id])`) || content.querySelector(`[data-sentence-id="${CSS.escape(sid)}"]`)
  if (!el) return { found: false }
  const r = el.getBoundingClientRect()
  return { found: true, topOffset: r.top - cr.top, visible: r.bottom > cr.top && r.top < cr.bottom }
}, snap.anchorSentenceId)
console.log("committed sentence after restore:", JSON.stringify(committed, null, 2))

await browser.close()
