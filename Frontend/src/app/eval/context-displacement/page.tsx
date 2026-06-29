"use client"

// Evaluation-only harness. Mounts the real ReaderShell and drives the real
// usePreserveReadingContext capture-and-restore so an external Playwright sweep
// can measure how far the reader's reading position (AOI) is displaced by each
// typographic intervention, and how much of that displacement the context-
// preservation mechanism absorbs. Every number reported here is produced by the
// production hook, not a reimplementation. See experiments/context-displacement/.

import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { ReaderShell } from "@/modules/pages/reading/components/ReaderShell"
import { MOCK_READING_MD } from "@/modules/pages/reading/content/mockReading"
import { normalizeReaderAppearance } from "@/lib/reader-appearance"
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import type {
  AffectedPresentationProperty,
  InterventionEventSnapshot,
  ReadingContextPreservationSnapshot,
  ReadingPresentationSnapshot,
} from "@/lib/experiment-session"

const DOC_ID = "eval-context-displacement"

const BASELINE: ReadingPresentationSettings = {
  fontFamily: "merriweather",
  fontSizePx: 18,
  lineWidthPx: 680,
  lineHeight: 1.8,
  letterSpacingEm: 0,
  editableByExperimenter: true,
}

type FireConfig = {
  patch: Partial<ReadingPresentationSettings>
  affected: AffectedPresentationProperty[]
}

type ReadingAnchor = {
  sentenceId: string | null
  tokenId: string | null
  blockId: string | null
  offsetPx: number | null
}

function toSnapshotPresentation(p: ReadingPresentationSettings): ReadingPresentationSnapshot {
  return {
    fontFamily: p.fontFamily,
    fontSizePx: p.fontSizePx,
    lineWidthPx: p.lineWidthPx,
    lineHeight: p.lineHeight,
    letterSpacingEm: p.letterSpacingEm,
    editableByResearcher: p.editableByExperimenter,
  }
}

// Mirror of getFirstVisibleWord in usePreserveReadingContext: the first word near
// 35% of the reading viewport. This is the reading-position proxy the harness
// commits the intervention against (as the backend commits against the active
// sentence in a live session).
function findReadingAnchor(): ReadingAnchor {
  const content = document.querySelector<HTMLElement>("[data-reader-content='true']")
  const container = content?.parentElement ?? null
  if (!content || !container) {
    return { sentenceId: null, tokenId: null, blockId: null, offsetPx: null }
  }

  const containerRect = container.getBoundingClientRect()
  const target = containerRect.top + containerRect.height * 0.35
  const words = Array.from(
    content.querySelectorAll<HTMLElement>("[data-token-id][data-token-kind='word']")
  )

  let best: { el: HTMLElement; score: number } | null = null
  for (const el of words) {
    const rect = el.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) continue
    if (rect.bottom < containerRect.top || rect.top > containerRect.bottom) continue
    const score = Math.abs(rect.top - target)
    if (!best || score < best.score) best = { el, score }
  }

  if (!best) {
    return { sentenceId: null, tokenId: null, blockId: null, offsetPx: null }
  }

  const rect = best.el.getBoundingClientRect()
  return {
    sentenceId: best.el.dataset.sentenceId ?? null,
    tokenId: best.el.dataset.tokenId ?? null,
    blockId: best.el.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ?? null,
    offsetPx: rect.top - containerRect.top,
  }
}

export default function ContextDisplacementHarnessPage() {
  const [presentation, setPresentation] = useState<ReadingPresentationSettings>(BASELINE)
  const [intervention, setIntervention] = useState<InterventionEventSnapshot | null>(null)
  // Preservation can be toggled so the sweep can fire the SAME intervention with
  // the restore disabled (OFF) and enabled (ON), to compare the final on-screen
  // displacement of the relevant reading position between the two conditions.
  const [preserve, setPreserve] = useState(true)
  const preserveRef = useRef(true)
  useEffect(() => {
    preserveRef.current = preserve
  }, [preserve])
  const pendingResolveRef = useRef<((snap: ReadingContextPreservationSnapshot | null) => void) | null>(null)
  const snapshotsRef = useRef<ReadingContextPreservationSnapshot[]>([])

  const appearance = useMemo(() => normalizeReaderAppearance(null), [])

  const handleContextPreservationChange = useCallback(
    (snap: ReadingContextPreservationSnapshot) => {
      snapshotsRef.current.push(snap)
      const resolve = pendingResolveRef.current
      if (resolve) {
        pendingResolveRef.current = null
        resolve(snap)
      }
    },
    []
  )

  const fire = useCallback(
    (config: FireConfig) =>
      new Promise<ReadingContextPreservationSnapshot | null>((resolve) => {
        const anchor = findReadingAnchor()
        const snapshotPresentation = toSnapshotPresentation({ ...BASELINE, ...config.patch })
        const event: InterventionEventSnapshot = {
          id: `eval-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          source: "eval-harness",
          trigger: "eval-sweep",
          reason: "displacement measurement",
          appliedAtUnixMs: Date.now(),
          appliedBoundary: "immediate",
          waitDurationMs: null,
          appliedPresentation: snapshotPresentation,
          appliedAppearance: appearance,
          moduleId: null,
          parameters: null,
          affectedPresentationProperties: config.affected,
          committedActiveTokenId: anchor.tokenId,
          committedActiveSentenceId: anchor.sentenceId,
          committedActiveBlockId: anchor.blockId,
        }

        setPresentation((current) => ({ ...current, ...config.patch }))
        setIntervention(event)

        if (preserveRef.current) {
          // ON: resolve when the restore hook emits its outcome snapshot.
          pendingResolveRef.current = resolve
        } else {
          // OFF: the restore hook is disabled and emits nothing, so settle the
          // reflow over two frames plus a short delay, then resolve with no
          // snapshot. The sweep measures the resulting position separately.
          pendingResolveRef.current = null
          window.requestAnimationFrame(() =>
            window.requestAnimationFrame(() => window.setTimeout(() => resolve(null), 220))
          )
        }
      }),
    [appearance]
  )

  const reset = useCallback(() => {
    // Restore baseline without recording: clear any pending resolver so the
    // reflow-back snapshot is discarded.
    pendingResolveRef.current = null
    setIntervention(null)
    setPresentation(BASELINE)
  }, [])

  // Expose the control surface for the Playwright sweep.
  useEffect(() => {
    ;(window as unknown as { __harness?: unknown }).__harness = {
      ready: true,
      baseline: BASELINE,
      fire,
      reset,
      setPreserve: (value: boolean) => setPreserve(Boolean(value)),
      getAnchor: findReadingAnchor,
      snapshots: () => snapshotsRef.current.slice(),
      clearSnapshots: () => {
        snapshotsRef.current = []
      },
    }
  }, [fire, reset])

  return (
    <div data-harness="context-displacement" className="h-screen w-screen">
      <ReaderShell
        key={DOC_ID}
        docId={DOC_ID}
        markdown={MOCK_READING_MD}
        presentation={presentation}
        initialPresentation={toSnapshotPresentation(BASELINE)}
        latestIntervention={intervention}
        preserveContextOnIntervention={preserve}
        highlightContext={false}
        enableLiveGazeTracking={false}
        displayGazePosition={false}
        showToolbar={false}
        showBackButton={false}
        showLixScores={false}
        gazeOverlayEnabled={false}
        onContextPreservationChange={handleContextPreservationChange}
      />
    </div>
  )
}
