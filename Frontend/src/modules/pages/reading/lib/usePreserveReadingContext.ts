"use client"

import { useCallback, useEffect, useRef, type RefObject } from "react"

import type {
  ReadingContextPreservationSnapshot,
  ReadingInterventionCommitBoundary,
} from "@/lib/experiment-session"

type UsePreserveReadingContextParams = {
  containerRef: RefObject<HTMLElement | null>
  contentRef?: RefObject<HTMLElement | null>
  enabled?: boolean
  highlightContext?: boolean
  contentKey: string
  interventionKey: string
  interventionAppliedAtUnixMs?: number | null
  interventionAppliedBoundary?: ReadingInterventionCommitBoundary | null
  interventionWaitDurationMs?: number | null
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
      reason: string | null
    }
  | null

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
        reason:
          anchor.anchorSentenceId || anchor.anchorTokenId
            ? "Semantic anchors unavailable; restored block anchor instead."
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
  interventionAppliedAtUnixMs = null,
  interventionAppliedBoundary = null,
  interventionWaitDurationMs = null,
  currentPageIndex = 0,
  pageWidthPx,
  setActivePageIndex,
  onContextPreservationChange,
}: UsePreserveReadingContextParams) {
  const latestAnchorRef = useRef<AnchorSnapshot | null>(null)
  const latestInterventionKeyRef = useRef(interventionKey)
  const latestAppliedAtRef = useRef<number | null>(interventionAppliedAtUnixMs)
  const highlightCleanupRef = useRef<(() => void) | null>(null)
  const lastHandledSignatureRef = useRef<string | null>(null)

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
    latestAnchorRef.current = null
    highlightCleanupRef.current?.()
    highlightCleanupRef.current = null
    lastHandledSignatureRef.current = null
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
      latestInterventionKeyRef.current = interventionKey
      latestAppliedAtRef.current = interventionAppliedAtUnixMs
      return
    }

    const keyChanged = latestInterventionKeyRef.current !== interventionKey
    const appliedAtChanged = latestAppliedAtRef.current !== interventionAppliedAtUnixMs

    latestInterventionKeyRef.current = interventionKey
    latestAppliedAtRef.current = interventionAppliedAtUnixMs

    if (!keyChanged && !appliedAtChanged) {
      return
    }

    const signature = `${interventionKey}:${interventionAppliedAtUnixMs ?? "none"}`
    if (lastHandledSignatureRef.current === signature) {
      return
    }

    const anchor = latestAnchorRef.current
    const container = containerRef.current
    const content = contentRef?.current ?? container?.querySelector<HTMLElement>("[data-reader-content='true']") ?? null
    if (!container || !content) {
      return
    }

    lastHandledSignatureRef.current = signature

    const effectiveBoundary = interventionAppliedBoundary ?? "immediate"
    const effectiveAppliedAt = interventionAppliedAtUnixMs ?? Date.now()

    const commitFailure = (reason: string) => {
      onContextPreservationChange?.({
        status: "failed",
        anchorSource: "scroll-only",
        anchorSentenceId: anchor?.anchorSentenceId ?? null,
        anchorTokenId: anchor?.anchorTokenId ?? null,
        anchorBlockId: anchor?.anchorBlockId ?? null,
        anchorErrorPx: null,
        viewportDeltaPx: null,
        commitBoundary: effectiveBoundary,
        waitDurationMs: interventionWaitDurationMs,
        interventionAppliedAtUnixMs: effectiveAppliedAt,
        measuredAtUnixMs: Date.now(),
        reason,
      })
    }

    if (!anchor || Date.now() - anchor.capturedAtUnixMs > ANCHOR_STALE_AFTER_MS) {
      commitFailure("Anchor snapshot was unavailable or stale.")
      return
    }

    let cancelled = false
    let frameId = 0

    const restore = () => {
      if (cancelled) {
        return
      }

      const located = locateAnchor(content, anchor)
      if (!located) {
        container.scrollTop = anchor.scrollTopPx
        onContextPreservationChange?.({
          status: "degraded",
          anchorSource: "scroll-only",
          anchorSentenceId: anchor.anchorSentenceId,
          anchorTokenId: anchor.anchorTokenId,
          anchorBlockId: anchor.anchorBlockId,
          anchorErrorPx: null,
          viewportDeltaPx: Math.abs(container.scrollTop - anchor.scrollTopPx),
          commitBoundary: effectiveBoundary,
          waitDurationMs: interventionWaitDurationMs,
          interventionAppliedAtUnixMs: effectiveAppliedAt,
          measuredAtUnixMs: Date.now(),
          reason: "Anchor elements were not found; restored scroll position only.",
        })
        return
      }

      const applyFinalAlignment = (viewportDeltaPx: number | null) => {
        const finalContainerRect = getContainerRect(container)
        const beforeScrollTop = container.scrollTop
        const currentTop = located.primaryElement.getBoundingClientRect().top - finalContainerRect.top
        container.scrollTop += currentTop - anchor.anchorViewportOffsetPx

        const finalTop = located.primaryElement.getBoundingClientRect().top - finalContainerRect.top
        const anchorErrorPx = Math.abs(finalTop - anchor.anchorViewportOffsetPx)
        const scrollDeltaPx = Math.abs(container.scrollTop - beforeScrollTop)
        const effectiveViewportDeltaPx =
          viewportDeltaPx === null ? scrollDeltaPx : Math.max(viewportDeltaPx, scrollDeltaPx)
        const status =
          located.anchorSource === "sentence-anchor" && anchorErrorPx <= 48
            ? "preserved"
            : anchorErrorPx > 120 || located.anchorSource === "block-anchor"
              ? "degraded"
              : "preserved"

        if (highlightContext) {
          highlightCleanupRef.current?.()
          highlightCleanupRef.current = highlightAnchor(located.anchorElements)
        }

        onContextPreservationChange?.({
          status,
          anchorSource: located.anchorSource,
          anchorSentenceId: anchor.anchorSentenceId,
          anchorTokenId: anchor.anchorTokenId,
          anchorBlockId: anchor.anchorBlockId,
          anchorErrorPx,
          viewportDeltaPx: effectiveViewportDeltaPx,
          commitBoundary: effectiveBoundary,
          waitDurationMs: interventionWaitDurationMs,
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
    interventionAppliedAtUnixMs,
    interventionAppliedBoundary,
    interventionKey,
    interventionWaitDurationMs,
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
