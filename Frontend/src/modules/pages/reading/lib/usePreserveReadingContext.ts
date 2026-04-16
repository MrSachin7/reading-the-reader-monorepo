"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"

import type {
  InterventionEventSnapshot,
  ReadingContextPreservationSnapshot,
} from "@/lib/experiment-session"

type UsePreserveReadingContextParams = {
  containerRef: RefObject<HTMLElement | null>
  contentRef?: RefObject<HTMLElement | null>
  enabled?: boolean
  highlightContext?: boolean
  contentKey: string
  interventionKey: string
  latestIntervention?: InterventionEventSnapshot | null
  currentPageIndex?: number
  pageWidthPx?: number
  setActivePageIndex?: (pageIndex: number, options?: { persist?: boolean; markTurn?: boolean }) => void
  onContextPreservationChange?: (snapshot: ReadingContextPreservationSnapshot) => void
}

type InternalAnchorSource = "sentence-anchor" | "active-token" | "fallback-token" | "block-anchor"

type AnchorSnapshot = {
  capturedAtUnixMs: number
  source: InternalAnchorSource
  anchorSentenceId: string | null
  anchorTokenId: string | null
  anchorBlockId: string | null
  anchorViewportOffsetPx: number
  scrollTopPx: number
}

type LocatedAnchor =
  | {
      anchorSource: ReadingContextPreservationSnapshot["anchorSource"]
      anchorElements: HTMLElement[]
      primaryElement: HTMLElement
      anchorViewportOffsetPx: number
      reason: string | null
    }
  | null

type RestoreMode = "offset-preserve" | "semantic-restart"

const CAPTURE_REFRESH_MS = 120
const ANCHOR_STALE_AFTER_MS = 15_000
const HIGHLIGHT_HOLD_MS = 3_000
const HIGHLIGHT_FADE_MS = 3_000
const HIGHLIGHT_BACKGROUND = "rgba(245, 158, 11, 0.18)"
const HIGHLIGHT_RING = "0 0 0 1px rgba(245, 158, 11, 0.34)"

function escapeAttributeValue(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value)
  }

  return value.replace(/["\\]/g, "\\$&")
}

function getContainerRect(container: HTMLElement) {
  return container.getBoundingClientRect()
}

function intersectsViewport(rect: DOMRect, viewportRect: DOMRect) {
  return (
    rect.right >= viewportRect.left &&
    rect.left <= viewportRect.right &&
    rect.bottom >= viewportRect.top &&
    rect.top <= viewportRect.bottom
  )
}

function getFirstVisibleWord(content: HTMLElement, containerRect: DOMRect) {
  const tokens = Array.from(
    content.querySelectorAll<HTMLElement>("[data-token-id][data-token-kind='word']")
  )

  let best: { element: HTMLElement; score: number } | null = null
  const viewportCenter = containerRect.top + containerRect.height * 0.35

  for (const element of tokens) {
    const rect = element.getBoundingClientRect()
    if (rect.width <= 0 || rect.height <= 0) {
      continue
    }

    if (!intersectsViewport(rect, containerRect)) {
      continue
    }

    const score = Math.abs(rect.top - viewportCenter)
    if (!best || score < best.score) {
      best = { element, score }
    }
  }

  return best?.element ?? null
}

function measureAnchor(
  container: HTMLElement,
  content: HTMLElement
): AnchorSnapshot | null {
  const containerRect = getContainerRect(container)
  const activeTokenCandidate = content.querySelector<HTMLElement>("[data-gaze-active='true'][data-token-id]")
  const activeToken =
    activeTokenCandidate && intersectsViewport(activeTokenCandidate.getBoundingClientRect(), containerRect)
      ? activeTokenCandidate
      : null
  const visibleToken = activeToken ?? getFirstVisibleWord(content, containerRect)
  const anchorBlockId =
    visibleToken?.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ??
    content.querySelector<HTMLElement>("[data-block-id]")?.dataset.blockId ??
    null

  if (visibleToken) {
    const tokenRect = visibleToken.getBoundingClientRect()
    return {
      capturedAtUnixMs: Date.now(),
      source: activeToken ? "active-token" : "fallback-token",
      anchorSentenceId: visibleToken.dataset.sentenceId ?? null,
      anchorTokenId: visibleToken.dataset.tokenId ?? null,
      anchorBlockId,
      anchorViewportOffsetPx: tokenRect.top - containerRect.top,
      scrollTopPx: container.scrollTop,
    }
  }

  const visibleBlock = Array.from(content.querySelectorAll<HTMLElement>("[data-block-id]")).find((element) => {
    const rect = element.getBoundingClientRect()
    return intersectsViewport(rect, containerRect)
  })

  if (!visibleBlock) {
    return null
  }

  const blockRect = visibleBlock.getBoundingClientRect()
  return {
    capturedAtUnixMs: Date.now(),
    source: "block-anchor",
    anchorSentenceId: null,
    anchorTokenId: null,
    anchorBlockId: visibleBlock.dataset.blockId ?? null,
    anchorViewportOffsetPx: blockRect.top - containerRect.top,
    scrollTopPx: container.scrollTop,
  }
}

function findSentenceElements(content: HTMLElement, sentenceId: string) {
  const selector = `[data-sentence-id="${escapeAttributeValue(sentenceId)}"]:not([data-token-id])`
  const wrappers = Array.from(content.querySelectorAll<HTMLElement>(selector))
  if (wrappers.length > 0) {
    return wrappers
  }

  return Array.from(content.querySelectorAll<HTMLElement>(`[data-sentence-id="${escapeAttributeValue(sentenceId)}"]`))
}

function locateAnchor(content: HTMLElement, anchor: AnchorSnapshot): LocatedAnchor {
  if (anchor.anchorSentenceId) {
    const sentenceElements = findSentenceElements(content, anchor.anchorSentenceId)
    if (sentenceElements.length > 0) {
      return {
        anchorSource: "sentence-anchor",
        anchorElements: sentenceElements,
        primaryElement: sentenceElements[0]!,
        anchorViewportOffsetPx: anchor.anchorViewportOffsetPx,
        reason: null,
      }
    }
  }

  if (anchor.anchorTokenId) {
    const token = content.querySelector<HTMLElement>(
      `[data-token-id="${escapeAttributeValue(anchor.anchorTokenId)}"]`
    )
    if (token) {
      return {
        anchorSource: anchor.source === "active-token" ? "active-token" : "fallback-token",
        anchorElements: [token],
        primaryElement: token,
        anchorViewportOffsetPx: anchor.anchorViewportOffsetPx,
        reason: anchor.anchorSentenceId ? "Sentence anchor unavailable; restored token anchor instead." : null,
      }
    }
  }

  if (anchor.anchorBlockId) {
    const block = content.querySelector<HTMLElement>(
      `[data-block-id="${escapeAttributeValue(anchor.anchorBlockId)}"]`
    )
    if (block) {
      return {
        anchorSource: "block-anchor",
        anchorElements: [block],
        primaryElement: block,
        anchorViewportOffsetPx: anchor.anchorViewportOffsetPx,
        reason:
          anchor.anchorSentenceId || anchor.anchorTokenId
            ? "Semantic anchors unavailable; restored block anchor instead."
            : null,
      }
    }
  }

  return null
}

function isLayoutAffectingIntervention(intervention: InterventionEventSnapshot | null | undefined) {
  return (intervention?.affectedPresentationProperties?.length ?? 0) > 0
}

function locateSemanticRestartAnchor(
  content: HTMLElement,
  intervention: InterventionEventSnapshot | null | undefined
): LocatedAnchor {
  if (!intervention) {
    return null
  }

  if (intervention.committedActiveSentenceId) {
    const sentenceElements = findSentenceElements(content, intervention.committedActiveSentenceId)
    if (sentenceElements.length > 0) {
      return {
        anchorSource: "sentence-anchor",
        anchorElements: sentenceElements,
        primaryElement: sentenceElements[0]!,
        anchorViewportOffsetPx: 0,
        reason: null,
      }
    }
  }

  if (intervention.committedActiveBlockId) {
    const block = content.querySelector<HTMLElement>(
      `[data-block-id="${escapeAttributeValue(intervention.committedActiveBlockId)}"]`
    )
    if (block) {
      return {
        anchorSource: "block-anchor",
        anchorElements: [block],
        primaryElement: block,
        anchorViewportOffsetPx: 0,
        reason: intervention.committedActiveSentenceId
          ? "Sentence anchor unavailable; restarted from paragraph anchor instead."
          : null,
      }
    }
  }

  return null
}

function highlightAnchor(elements: HTMLElement[]) {
  const timers: number[] = []
  const previous = elements.map((element) => ({
    element,
    backgroundColor: element.style.backgroundColor,
    boxShadow: element.style.boxShadow,
    borderRadius: element.style.borderRadius,
    boxDecorationBreak: (element.style as CSSStyleDeclaration & { boxDecorationBreak?: string }).boxDecorationBreak ?? "",
    webkitBoxDecorationBreak: (element.style as CSSStyleDeclaration & { webkitBoxDecorationBreak?: string }).webkitBoxDecorationBreak ?? "",
    paddingInline: element.style.paddingInline,
    transition: element.style.transition,
  }))

  for (const element of elements) {
    element.style.transition = "none"
    element.style.backgroundColor = HIGHLIGHT_BACKGROUND
    element.style.boxShadow = HIGHLIGHT_RING
    element.style.borderRadius = "0.35rem"
    element.style.paddingInline = "0.08em"
    ;(element.style as CSSStyleDeclaration & { boxDecorationBreak?: string }).boxDecorationBreak = "clone"
    ;(element.style as CSSStyleDeclaration & { webkitBoxDecorationBreak?: string }).webkitBoxDecorationBreak = "clone"
  }

  timers.push(
    window.setTimeout(() => {
      for (const element of elements) {
        element.style.transition = `background-color ${HIGHLIGHT_FADE_MS}ms ease, box-shadow ${HIGHLIGHT_FADE_MS}ms ease`
        element.style.backgroundColor = "transparent"
        element.style.boxShadow = "none"
      }
    }, HIGHLIGHT_HOLD_MS)
  )

  timers.push(
    window.setTimeout(() => {
      for (const item of previous) {
        item.element.style.backgroundColor = item.backgroundColor
        item.element.style.boxShadow = item.boxShadow
        item.element.style.borderRadius = item.borderRadius
        item.element.style.paddingInline = item.paddingInline
        ;(item.element.style as CSSStyleDeclaration & { boxDecorationBreak?: string }).boxDecorationBreak = item.boxDecorationBreak
        ;(item.element.style as CSSStyleDeclaration & { webkitBoxDecorationBreak?: string }).webkitBoxDecorationBreak = item.webkitBoxDecorationBreak
        item.element.style.transition = item.transition
      }
    }, HIGHLIGHT_HOLD_MS + HIGHLIGHT_FADE_MS + 60)
  )

  return () => {
    for (const timer of timers) {
      window.clearTimeout(timer)
    }

    for (const item of previous) {
      item.element.style.backgroundColor = item.backgroundColor
      item.element.style.boxShadow = item.boxShadow
      item.element.style.borderRadius = item.borderRadius
      item.element.style.paddingInline = item.paddingInline
      ;(item.element.style as CSSStyleDeclaration & { boxDecorationBreak?: string }).boxDecorationBreak = item.boxDecorationBreak
      ;(item.element.style as CSSStyleDeclaration & { webkitBoxDecorationBreak?: string }).webkitBoxDecorationBreak = item.webkitBoxDecorationBreak
      item.element.style.transition = item.transition
    }
  }
}

function resolveAnchorPageIndex(
  primaryElement: HTMLElement,
  containerRect: DOMRect,
  currentPageIndex: number,
  pageWidthPx: number
) {
  if (!Number.isFinite(pageWidthPx) || pageWidthPx <= 0) {
    return currentPageIndex
  }

  const rect = primaryElement.getBoundingClientRect()
  const pageDelta = Math.round((rect.left - containerRect.left) / pageWidthPx)
  return Math.max(0, currentPageIndex + pageDelta)
}

export function usePreserveReadingContext({
  containerRef,
  contentRef,
  enabled = false,
  highlightContext = false,
  contentKey,
  interventionKey,
  latestIntervention = null,
  currentPageIndex = 0,
  pageWidthPx,
  setActivePageIndex,
  onContextPreservationChange,
}: UsePreserveReadingContextParams) {
  const currentSignature =
    `${interventionKey}:${latestIntervention?.id ?? "none"}:${latestIntervention?.appliedAtUnixMs ?? "none"}`
  const latestAnchorRef = useRef<AnchorSnapshot | null>(null)
  const highlightCleanupRef = useRef<(() => void) | null>(null)
  const latestSignatureRef = useRef(currentSignature)
  const lastHandledSignatureRef = useRef<string>(currentSignature)

  const captureContextAnchor = useCallback(() => {
    const container = containerRef.current
    const content = contentRef?.current ?? container?.querySelector<HTMLElement>("[data-reader-content='true']") ?? null
    if (!enabled || !container || !content) {
      latestAnchorRef.current = null
      return
    }

    latestAnchorRef.current = measureAnchor(container, content)
  }, [containerRef, contentRef, enabled])

  useEffect(() => {
    latestSignatureRef.current = currentSignature
  }, [currentSignature])

  useEffect(() => {
    latestAnchorRef.current = null
    highlightCleanupRef.current?.()
    highlightCleanupRef.current = null
    lastHandledSignatureRef.current = latestSignatureRef.current
  }, [contentKey])

  useEffect(() => {
    if (!enabled) {
      latestAnchorRef.current = null
      highlightCleanupRef.current?.()
      highlightCleanupRef.current = null
      return
    }

    captureContextAnchor()
    const interval = window.setInterval(captureContextAnchor, CAPTURE_REFRESH_MS)
    return () => {
      window.clearInterval(interval)
    }
  }, [captureContextAnchor, enabled])

  useEffect(() => {
    if (!enabled) {
      return
    }

    const signature = currentSignature
    if (lastHandledSignatureRef.current === signature) {
      return
    }

    const anchor = latestAnchorRef.current
    const hasFreshAnchor = anchor ? Date.now() - anchor.capturedAtUnixMs <= ANCHOR_STALE_AFTER_MS : false
    const container = containerRef.current
    const content = contentRef?.current ?? container?.querySelector<HTMLElement>("[data-reader-content='true']") ?? null
    if (!container || !content) {
      return
    }

    lastHandledSignatureRef.current = signature

    const restoreMode: RestoreMode = isLayoutAffectingIntervention(latestIntervention)
      ? "semantic-restart"
      : "offset-preserve"
    const effectiveBoundary = latestIntervention?.appliedBoundary ?? "immediate"
    const effectiveAppliedAt = latestIntervention?.appliedAtUnixMs ?? Date.now()
    const effectiveWaitDurationMs = latestIntervention?.waitDurationMs ?? null
    const reportedAnchorSentenceId =
      latestIntervention?.committedActiveSentenceId ?? anchor?.anchorSentenceId ?? null
    const reportedAnchorTokenId =
      latestIntervention?.committedActiveTokenId ?? anchor?.anchorTokenId ?? null
    const reportedAnchorBlockId =
      latestIntervention?.committedActiveBlockId ?? anchor?.anchorBlockId ?? null

    // Non-layout sentence/paragraph boundaries still use frozen segments, so
    // there is no document-wide reflow to compensate for.
    if (
      restoreMode === "offset-preserve" &&
      effectiveBoundary !== "immediate" &&
      effectiveBoundary !== "page-turn"
    ) {
      const anchorForReport = latestAnchorRef.current
      onContextPreservationChange?.({
        status: "preserved",
        anchorSource: "scroll-only",
        anchorSentenceId: anchorForReport?.anchorSentenceId ?? null,
        anchorTokenId: anchorForReport?.anchorTokenId ?? null,
        anchorBlockId: anchorForReport?.anchorBlockId ?? null,
        anchorErrorPx: 0,
        viewportDeltaPx: 0,
        commitBoundary: effectiveBoundary,
        waitDurationMs: effectiveWaitDurationMs,
        interventionAppliedAtUnixMs: effectiveAppliedAt,
        measuredAtUnixMs: Date.now(),
        reason: "Segment-based layout preserves position; anchor restore skipped.",
      })
      return
    }

    const commitFailure = (reason: string) => {
      onContextPreservationChange?.({
        status: "failed",
        anchorSource: "scroll-only",
        anchorSentenceId: reportedAnchorSentenceId,
        anchorTokenId: reportedAnchorTokenId,
        anchorBlockId: reportedAnchorBlockId,
        anchorErrorPx: null,
        viewportDeltaPx: null,
        commitBoundary: effectiveBoundary,
        waitDurationMs: effectiveWaitDurationMs,
        interventionAppliedAtUnixMs: effectiveAppliedAt,
        measuredAtUnixMs: Date.now(),
        reason,
      })
    }

    if (restoreMode === "offset-preserve" && !hasFreshAnchor) {
      commitFailure("Anchor snapshot was unavailable or stale.")
      return
    }

    let cancelled = false
    let frameId = 0

    const restore = () => {
      if (cancelled) {
        return
      }

      const located =
        restoreMode === "semantic-restart"
          ? locateSemanticRestartAnchor(content, latestIntervention)
          : anchor
            ? locateAnchor(content, anchor)
            : null
      if (!located) {
        if (!anchor || !hasFreshAnchor) {
          commitFailure(
            restoreMode === "semantic-restart"
              ? "Semantic restart anchor was unavailable and no fresh fallback anchor existed."
              : "Anchor snapshot was unavailable or stale."
          )
          return
        }

        container.scrollTop = anchor.scrollTopPx
        onContextPreservationChange?.({
          status: "degraded",
          anchorSource: "scroll-only",
          anchorSentenceId: reportedAnchorSentenceId,
          anchorTokenId: reportedAnchorTokenId,
          anchorBlockId: reportedAnchorBlockId,
          anchorErrorPx: null,
          viewportDeltaPx: Math.abs(container.scrollTop - anchor.scrollTopPx),
          commitBoundary: effectiveBoundary,
          waitDurationMs: effectiveWaitDurationMs,
          interventionAppliedAtUnixMs: effectiveAppliedAt,
          measuredAtUnixMs: Date.now(),
          reason:
            restoreMode === "semantic-restart"
              ? "Semantic anchor elements were not found; restored scroll position only."
              : "Anchor elements were not found; restored scroll position only.",
        })
        return
      }

      const applyFinalAlignment = (viewportDeltaPx: number | null) => {
        const finalContainerRect = getContainerRect(container)
        const beforeScrollTop = container.scrollTop
        const currentTop = located.primaryElement.getBoundingClientRect().top - finalContainerRect.top
        container.scrollTop += currentTop - located.anchorViewportOffsetPx

        const finalTop = located.primaryElement.getBoundingClientRect().top - finalContainerRect.top
        const anchorErrorPx = Math.abs(finalTop - located.anchorViewportOffsetPx)
        const scrollDeltaPx = Math.abs(container.scrollTop - beforeScrollTop)
        const effectiveViewportDeltaPx =
          viewportDeltaPx === null ? scrollDeltaPx : Math.max(viewportDeltaPx, scrollDeltaPx)
        const status =
          restoreMode === "semantic-restart"
            ? anchorErrorPx <= 72
              ? "preserved"
              : "degraded"
            : located.anchorSource === "sentence-anchor" && anchorErrorPx <= 48
              ? "preserved"
              : anchorErrorPx > 120 || located.anchorSource === "block-anchor"
                ? "degraded"
                : "preserved"

        if (highlightContext && restoreMode === "semantic-restart") {
          highlightCleanupRef.current?.()
          highlightCleanupRef.current = highlightAnchor(located.anchorElements)
        }

        onContextPreservationChange?.({
          status,
          anchorSource: located.anchorSource,
          anchorSentenceId: reportedAnchorSentenceId,
          anchorTokenId: reportedAnchorTokenId,
          anchorBlockId: reportedAnchorBlockId,
          anchorErrorPx,
          viewportDeltaPx: effectiveViewportDeltaPx,
          commitBoundary: effectiveBoundary,
          waitDurationMs: effectiveWaitDurationMs,
          interventionAppliedAtUnixMs: effectiveAppliedAt,
          measuredAtUnixMs: Date.now(),
          reason: located.reason,
        })
      }

      if (setActivePageIndex && pageWidthPx && pageWidthPx > 0) {
        const containerRect = getContainerRect(container)
        const targetPageIndex = resolveAnchorPageIndex(
          located.primaryElement,
          containerRect,
          currentPageIndex,
          pageWidthPx
        )
        const viewportDeltaPx = Math.abs(targetPageIndex - currentPageIndex) * pageWidthPx

        setActivePageIndex(targetPageIndex, { persist: false, markTurn: false })
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            if (!cancelled) {
              applyFinalAlignment(viewportDeltaPx)
            }
          })
        })
        return
      }

      applyFinalAlignment(null)
    }

    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(restore)
    })

    return () => {
      cancelled = true
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [
    containerRef,
    contentRef,
    enabled,
    highlightContext,
    interventionKey,
    currentSignature,
    latestIntervention,
    currentPageIndex,
    onContextPreservationChange,
    pageWidthPx,
    setActivePageIndex,
  ])

  useEffect(() => {
    return () => {
      highlightCleanupRef.current?.()
      highlightCleanupRef.current = null
    }
  }, [])

  return { captureContextAnchor }
}
