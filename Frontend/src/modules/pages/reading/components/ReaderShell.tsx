"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LiveGazeOverlay } from "@/modules/pages/gaze/components/LiveGazeOverlay";
import type { GazePoint } from "@/modules/pages/gaze/lib/gaze-helpers";
import { MarkdownReader } from "@/modules/pages/reading/components/MarkdownReader";
import { ReadingToolbar } from "@/modules/pages/reading/components/ReadingToolbar";
import { countWords, formatEstimatedMinutes } from "@/modules/pages/reading/lib/readingMetrics";
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation";
import { applyReadingPresentationPatch } from "@/modules/pages/reading/lib/readingPresentation";
import type { InterventionEventSnapshot, ReadingPresentationSnapshot } from "@/lib/experiment-session";
import { useGazeTokenHighlight, type GazeFocusState } from "@/modules/pages/reading/lib/useGazeTokenHighlight";
import { usePreserveReadingContext } from "@/modules/pages/reading/lib/usePreserveReadingContext";
import { useRemoteFocusTokenAttention } from "@/modules/pages/reading/lib/useRemoteFocusTokenAttention";
import {
  useRemoteTokenAttentionHeatmap,
  type RemoteTokenAttentionSnapshot,
} from "@/modules/pages/reading/lib/useRemoteTokenAttentionHeatmap";
import { useRemoteTokenHighlight } from "@/modules/pages/reading/lib/useRemoteTokenHighlight";
import { parseMinimalMarkdown } from "@/modules/pages/reading/lib/minimalMarkdown";
import { tokenizeDocument } from "@/modules/pages/reading/lib/tokenize";
import type {
  ReadingContextPreservationSnapshot,
  ReadingGazeObservationSnapshot,
} from "@/lib/experiment-session";
import { cn } from "@/lib/utils";

type ReaderViewportMetrics = {
  scrollProgress: number;
  scrollTopPx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  contentHeightPx: number;
  contentWidthPx: number;
  activePageIndex: number;
  pageCount: number;
  lastPageTurnAtUnixMs: number | null;
};

type ReaderShellProps = {
  docId: string;
  markdown: string;
  presentation: ReadingPresentationSettings;
  experimentSetupName?: string | null;
  preserveContextOnIntervention?: boolean;
  highlightContext?: boolean;
  displayGazePosition?: boolean;
  enableLiveGazeTracking?: boolean;
  highlightTokensBeingLookedAt?: boolean;
  highlightRemoteTokensBeingLookedAt?: boolean;
  showToolbar?: boolean;
  showBackButton?: boolean;
  showLixScores?: boolean;
  useCompactLixOverlay?: boolean;
  onPresentationChange?: (next: ReadingPresentationSettings) => void;
  onViewportMetricsChange?: (metrics: ReaderViewportMetrics) => void;
  onFocusChange?: (focus: GazeFocusState) => void;
  onObservationChange?: (observation: ReadingGazeObservationSnapshot) => void;
  onContextPreservationChange?: (snapshot: ReadingContextPreservationSnapshot) => void;
  viewportActivePageIndex?: number | null;
  viewportPageCount?: number | null;
  viewportScrollTopPx?: number | null;
  viewportWidthPx?: number | null;
  viewportHeightPx?: number | null;
  remoteFocus?: {
    isInsideReadingArea: boolean;
    normalizedContentX: number | null;
    normalizedContentY: number | null;
    activeTokenId: string | null;
    activeSentenceId?: string | null;
    updatedAtUnixMs?: number | null;
  } | null;
  remoteTokenAttention?: RemoteTokenAttentionSnapshot | null;
  onRemoteTokenAttentionChange?: (snapshot: RemoteTokenAttentionSnapshot) => void;
  showRemoteFocusMarker?: boolean;
  gazeOverlayPoint?: GazePoint | null;
  gazeOverlayHasRecentPoint?: boolean;
  frameClassName?: string;
  frameStyle?: CSSProperties;
  embedded?: boolean;
  embeddedSurfaceStyle?: "card" | "bare";
  latestIntervention?: InterventionEventSnapshot | null;
  /**
   * Initial presentation snapshot (before any interventions were applied). Used
   * together with `interventionEvents` to derive the frozen-segment timeline.
   * When omitted, the reader treats `presentation` as both initial and current
   * (no segmentation — single segment spanning the whole document).
   */
  initialPresentation?: ReadingPresentationSnapshot | null;
  /**
   * Chronological intervention history used to derive reading segments. The
   * last segment in the derived list is the "live" segment whose presentation
   * is replaced by `presentation` (so the live segment always reflects the
   * current researcher-facing typography).
   */
};

const FONT_FAMILY_STYLES = {
  "roboto-flex": "var(--font-roboto-flex)",
  geist: "var(--font-geist-sans)",
  inter: "var(--font-inter)",
  "space-grotesk": "var(--font-space-grotesk)",
  merriweather: "var(--font-merriweather)",
} as const;

const PAGINATION_OVERLAY_HEIGHT_PX = 56;
const EMPTY_VISIBLE_SENTENCE_IDS = new Set<string>();
const SCROLLBAR_IDLE_HIDE_MS = 900;
const SCROLL_OVERFLOW_TOLERANCE_PX = 2;

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  return tagName === "input" || tagName === "textarea" || tagName === "select" || target.isContentEditable;
}

function getFontFamilyStyle(fontFamily: string) {
  return FONT_FAMILY_STYLES[
    (fontFamily in FONT_FAMILY_STYLES ? fontFamily : "merriweather") as keyof typeof FONT_FAMILY_STYLES
  ];
}

function clampPageIndex(nextPageIndex: number, pageCount: number) {
  if (!Number.isFinite(nextPageIndex)) {
    return 0;
  }

  return Math.max(0, Math.min(Math.round(nextPageIndex), Math.max(pageCount - 1, 0)));
}

function collectSentenceIdsFromBlocks(blocks: ReturnType<typeof tokenizeDocument>) {
  const sentenceIds = new Set<string>()

  for (const block of blocks) {
    switch (block.type) {
      case "paragraph":
      case "h1":
      case "h2":
        for (const run of block.runs) {
          for (const token of run.tokens) {
            if (token.sentenceId) {
              sentenceIds.add(token.sentenceId)
            }
          }
        }
        break
      case "bullet_list":
        for (const item of block.items) {
          for (const run of item.runs) {
            for (const token of run.tokens) {
              if (token.sentenceId) {
                sentenceIds.add(token.sentenceId)
              }
            }
          }
        }
        break
      default:
        break
    }
  }

  return sentenceIds
}

export function ReaderShell({
  docId,
  markdown,
  presentation,
  experimentSetupName = null,
  preserveContextOnIntervention = false,
  highlightContext = false,
  displayGazePosition = false,
  enableLiveGazeTracking = true,
  highlightTokensBeingLookedAt = true,
  highlightRemoteTokensBeingLookedAt = true,
  showToolbar = false,
  showBackButton = true,
  showLixScores = true,
  useCompactLixOverlay = false,
  onPresentationChange,
  onViewportMetricsChange,
  onFocusChange,
  onObservationChange,
  onContextPreservationChange,
  viewportActivePageIndex = null,
  viewportPageCount = null,
  viewportScrollTopPx = null,
  viewportWidthPx = null,
  viewportHeightPx = null,
  remoteFocus = null,
  remoteTokenAttention = null,
  onRemoteTokenAttentionChange,
  showRemoteFocusMarker = true,
  gazeOverlayPoint,
  gazeOverlayHasRecentPoint,
  frameClassName,
  frameStyle,
  embedded = false,
  embeddedSurfaceStyle = "card",
  latestIntervention = null,
  initialPresentation = null,
}: ReaderShellProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const escHoldTimerRef = useRef<number | null>(null);
  const scrollbarHideTimerRef = useRef<number | null>(null);
  const lastPageTurnAtRef = useRef<number | null>(null);
  const pageScrollTopByIndexRef = useRef(new Map<number, number>());
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [isScrollbarVisible, setIsScrollbarVisible] = useState(false);
  const [hasVerticalOverflow, setHasVerticalOverflow] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [measuredPageCount, setMeasuredPageCount] = useState(1);
  const [pageWidthPx, setPageWidthPx] = useState(Math.max(presentation.lineWidthPx, 1));
  const [pageHeightPx, setPageHeightPx] = useState(0);
  const [currentPageScrollTop, setCurrentPageScrollTop] = useState(0);
  const [sentencePageAssignments, setSentencePageAssignments] = useState<Map<string, number>>(new Map());
  const isControlledPage = viewportActivePageIndex !== null;
  const hasControlledViewportSize =
    (viewportWidthPx ?? 0) > 0 && (viewportHeightPx ?? 0) > 0;
  const displayPageCount =
    isControlledPage && viewportPageCount !== null
      ? Math.max(viewportPageCount, 1)
      : Math.max(measuredPageCount, 1);

  useGazeTokenHighlight({
    containerRef,
    contentRef,
    enabled: enableLiveGazeTracking,
    highlightTokensBeingLookedAt,
    onFocusChange,
    onObservationChange,
  });

  useRemoteTokenHighlight({
    containerRef,
    activeTokenId: remoteFocus?.activeTokenId ?? null,
    enabled: Boolean(remoteFocus?.isInsideReadingArea) && highlightRemoteTokensBeingLookedAt,
  });

  const derivedRemoteTokenAttention = useRemoteFocusTokenAttention({
    containerRef,
    contentRef,
    remoteFocus,
    enabled: Boolean(remoteFocus),
  });

  useRemoteTokenAttentionHeatmap({
    containerRef,
    attention: remoteTokenAttention,
    enabled: Boolean(remoteTokenAttention),
  });

  useEffect(() => {
    if (!onRemoteTokenAttentionChange) {
      return;
    }

    onRemoteTokenAttentionChange(derivedRemoteTokenAttention);
  }, [derivedRemoteTokenAttention, onRemoteTokenAttentionChange]);

  const parsedDoc = useMemo(() => parseMinimalMarkdown(markdown), [markdown]);
  const tokenizedBlocks = useMemo(() => tokenizeDocument(parsedDoc, docId), [docId, parsedDoc]);

  const livePresentationSnapshot = useMemo<ReadingPresentationSnapshot>(
    () => ({
      fontFamily: presentation.fontFamily,
      fontSizePx: presentation.fontSizePx,
      lineWidthPx: presentation.lineWidthPx,
      lineHeight: presentation.lineHeight,
      letterSpacingEm: presentation.letterSpacingEm,
      editableByResearcher: presentation.editableByExperimenter,
    }),
    [
      presentation.fontFamily,
      presentation.fontSizePx,
      presentation.lineWidthPx,
      presentation.lineHeight,
      presentation.letterSpacingEm,
      presentation.editableByExperimenter,
    ]
  );
  const baselinePresentationSnapshot = initialPresentation ?? livePresentationSnapshot;
  const liveBlockStyleOverrides = useMemo(() => {
    const map = new Map<string, CSSProperties>();
    const style: CSSProperties = {
      fontFamily: getFontFamilyStyle(presentation.fontFamily),
      fontSize: `${presentation.fontSizePx}px`,
      lineHeight: presentation.lineHeight,
      letterSpacing: `${presentation.letterSpacingEm}em`,
    };

    for (const block of tokenizedBlocks) {
      map.set(block.blockId, style);
    }

    return map;
  }, [
    presentation.fontFamily,
    presentation.fontSizePx,
    presentation.lineHeight,
    presentation.letterSpacingEm,
    tokenizedBlocks,
  ]);
  const baselineBlockStyleOverrides = useMemo(() => {
    const map = new Map<string, CSSProperties>();
    const style: CSSProperties = {
      fontFamily: getFontFamilyStyle(baselinePresentationSnapshot.fontFamily),
      fontSize: `${baselinePresentationSnapshot.fontSizePx}px`,
      lineHeight: baselinePresentationSnapshot.lineHeight,
      letterSpacing: `${baselinePresentationSnapshot.letterSpacingEm}em`,
    };

    for (const block of tokenizedBlocks) {
      map.set(block.blockId, style);
    }

    return map;
  }, [
    baselinePresentationSnapshot.fontFamily,
    baselinePresentationSnapshot.fontSizePx,
    baselinePresentationSnapshot.lineHeight,
    baselinePresentationSnapshot.letterSpacingEm,
    tokenizedBlocks,
  ]);
  const effectivePageIndex = clampPageIndex(
    isControlledPage ? viewportActivePageIndex : pageIndex,
    displayPageCount
  );
  const arePageAssignmentsReady = sentencePageAssignments.size > 0;
  const visibleSentenceIds = useMemo(() => {
    if (!arePageAssignmentsReady) {
      return EMPTY_VISIBLE_SENTENCE_IDS;
    }

    const sentenceIds = new Set<string>();
    for (const [sentenceId, assignedPageIndex] of sentencePageAssignments) {
      if (assignedPageIndex === effectivePageIndex) {
        sentenceIds.add(sentenceId);
      }
    }

    return sentenceIds;
  }, [arePageAssignmentsReady, effectivePageIndex, sentencePageAssignments]);

  const words = useMemo(() => countWords(markdown), [markdown]);
  const estimatedTimeLabel = useMemo(() => formatEstimatedMinutes(words), [words]);

  const setActivePageIndex = useCallback(
    (nextPageIndex: number, options?: { persist?: boolean; markTurn?: boolean }) => {
      const next = clampPageIndex(nextPageIndex, displayPageCount);
      const markTurn = options?.markTurn ?? !isControlledPage;

      if (!isControlledPage) {
        setPageIndex((current) => (current === next ? current : next));
      }

      if (markTurn && next !== effectivePageIndex) {
        lastPageTurnAtRef.current = Date.now();
      }
    },
    [displayPageCount, effectivePageIndex, isControlledPage]
  );

  const resetToTop = useCallback(() => {
    setActivePageIndex(0, { persist: true, markTurn: false });
  }, [setActivePageIndex]);

  const { captureContextAnchor } = usePreserveReadingContext({
    containerRef,
    contentRef,
    enabled: preserveContextOnIntervention,
    highlightContext,
    contentKey: `${docId}:${markdown}`,
    interventionKey: `${presentation.fontSizePx}:${presentation.lineWidthPx}:${presentation.lineHeight}:${presentation.letterSpacingEm}:${presentation.fontFamily}`,
    latestIntervention,
    onContextPreservationChange,
  });

  useEffect(() => {
    if (!preserveContextOnIntervention) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      captureContextAnchor();
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [captureContextAnchor, effectivePageIndex, preserveContextOnIntervention]);

  useEffect(() => {
    if (isControlledPage) {
      return;
    }

    const frameId = window.requestAnimationFrame(() => {
      setPageIndex(0);
      setCurrentPageScrollTop(0);
      setSentencePageAssignments(new Map());
      setMeasuredPageCount(1);
    });
    pageScrollTopByIndexRef.current.clear();
    lastPageTurnAtRef.current = null;

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [docId, isControlledPage, markdown]);

  const updatePresentation = useCallback(
    (patch: Partial<ReadingPresentationSettings>) => {
      if (!onPresentationChange) {
        return;
      }

      captureContextAnchor();
      onPresentationChange(applyReadingPresentationPatch(presentation, patch));
    },
    [captureContextAnchor, onPresentationChange, presentation]
  );

  const canAdjustPresentation = Boolean(onPresentationChange) && presentation.editableByExperimenter;

  useEffect(() => {
    const host = hostRef.current;
    if (!host) {
      return;
    }

    let frameId = 0;

    const measure = () => {
      const nextWidth = hasControlledViewportSize
        ? Math.max(1, Math.round(viewportWidthPx ?? 0))
        : Math.max(1, Math.min(host.clientWidth, Math.round(presentation.lineWidthPx)));
      const nextHeight = hasControlledViewportSize
        ? Math.max(1, Math.round(viewportHeightPx ?? 0))
        : Math.max(host.clientHeight, 1);

      setPageWidthPx((current) => (current === nextWidth ? current : nextWidth));
      setPageHeightPx((current) => (current === nextHeight ? current : nextHeight));
    };

    const scheduleMeasure = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        measure();
      });
    };

    measure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(host);
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [
    hasControlledViewportSize,
    presentation.lineWidthPx,
    viewportHeightPx,
    viewportWidthPx,
  ]);

  useEffect(() => {
    const measurement = measurementRef.current;
    if (!measurement || pageWidthPx <= 0 || pageHeightPx <= 0) {
      return;
    }

    let frameId = 0;

    const measureAssignments = () => {
      const sentenceElements = Array.from(
        measurement.querySelectorAll<HTMLElement>("[data-sentence-id]:not([data-token-id])")
      );
      const nextAssignments = new Map<string, number>();
      const measurementRect = measurement.getBoundingClientRect();
      let highestPageIndex = 0;

      for (const element of sentenceElements) {
        const sentenceId = element.dataset.sentenceId;
        if (!sentenceId) {
          continue;
        }

        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const rawPageIndex = Math.floor((centerX - measurementRect.left) / Math.max(pageWidthPx, 1));
        const pageAssignment = Math.max(rawPageIndex, 0);
        nextAssignments.set(sentenceId, pageAssignment);
        highestPageIndex = Math.max(highestPageIndex, pageAssignment);
      }

      if (nextAssignments.size === 0) {
        const fallbackSentenceIds = collectSentenceIdsFromBlocks(tokenizedBlocks);
        for (const sentenceId of fallbackSentenceIds) {
          nextAssignments.set(sentenceId, 0);
        }
      }

      setSentencePageAssignments(nextAssignments);
      setMeasuredPageCount(Math.max(highestPageIndex + 1, 1));
    };

    frameId = window.requestAnimationFrame(() => {
      frameId = window.requestAnimationFrame(measureAssignments);
    });

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [
    baselinePresentationSnapshot.fontFamily,
    baselinePresentationSnapshot.fontSizePx,
    baselinePresentationSnapshot.lineHeight,
    baselinePresentationSnapshot.letterSpacingEm,
    docId,
    markdown,
    pageHeightPx,
    pageWidthPx,
    tokenizedBlocks,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const restoreScrollTop =
      isControlledPage && viewportScrollTopPx !== null
        ? Math.max(viewportScrollTopPx, 0)
        : pageScrollTopByIndexRef.current.get(effectivePageIndex) ?? 0;

    const frameId = window.requestAnimationFrame(() => {
      container.scrollTop = restoreScrollTop;
      setCurrentPageScrollTop(container.scrollTop);
      container.dispatchEvent(new Event("scroll"));
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [effectivePageIndex, isControlledPage, viewportScrollTopPx]);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) {
      return;
    }

    let frameId = 0;

    const measureOverflow = () => {
      const nextHasOverflow =
        container.scrollHeight - container.clientHeight > SCROLL_OVERFLOW_TOLERANCE_PX;
      setHasVerticalOverflow((current) => (current === nextHasOverflow ? current : nextHasOverflow));
      if (!nextHasOverflow) {
        setIsScrollbarVisible(false);
      }
    };

    const scheduleMeasure = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        measureOverflow();
      });
    };

    measureOverflow();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(container);
    resizeObserver.observe(content);
    container.addEventListener("scroll", scheduleMeasure, { passive: true });
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      resizeObserver.disconnect();
      container.removeEventListener("scroll", scheduleMeasure);
      window.removeEventListener("resize", scheduleMeasure);
    };
  }, [
    effectivePageIndex,
    pageHeightPx,
    pageWidthPx,
    presentation.fontSizePx,
    presentation.lineHeight,
    presentation.letterSpacingEm,
    visibleSentenceIds,
  ]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    let frameId = 0;

    const handleScroll = () => {
      const nextScrollTop = Math.max(container.scrollTop, 0);
      pageScrollTopByIndexRef.current.set(effectivePageIndex, nextScrollTop);
      setCurrentPageScrollTop(nextScrollTop);
    };

    const scheduleScroll = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        handleScroll();
      });
    };

    handleScroll();
    container.addEventListener("scroll", scheduleScroll, { passive: true });

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }
      container.removeEventListener("scroll", scheduleScroll);
    };
  }, [effectivePageIndex]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !onViewportMetricsChange) {
      return;
    }

    let frameId = 0;

    const emitMetrics = () => {
      const normalizedPageIndex = clampPageIndex(effectivePageIndex, displayPageCount);
      onViewportMetricsChange({
        scrollProgress:
          displayPageCount <= 1
            ? 0
            : (normalizedPageIndex +
                (container.scrollHeight > container.clientHeight
                  ? container.scrollTop / Math.max(container.scrollHeight - container.clientHeight, 1)
                  : 0)) /
              Math.max(displayPageCount - 1, 1),
        scrollTopPx: Math.max(container.scrollTop, 0),
        viewportWidthPx: Math.max(pageWidthPx, 0),
        viewportHeightPx: Math.max(pageHeightPx, 0),
        contentHeightPx: Math.max(container.scrollHeight, pageHeightPx),
        contentWidthPx: Math.max(pageWidthPx, 0),
        activePageIndex: normalizedPageIndex,
        pageCount: displayPageCount,
        lastPageTurnAtUnixMs: lastPageTurnAtRef.current,
      });
    };

    const scheduleMetrics = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
        emitMetrics();
      });
    };

    emitMetrics();

    const resizeObserver = new ResizeObserver(scheduleMetrics);
    resizeObserver.observe(container);
    if (contentRef.current) {
      resizeObserver.observe(contentRef.current);
    }
    container.addEventListener("scroll", scheduleMetrics, { passive: true });
    window.addEventListener("resize", scheduleMetrics);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver.disconnect();
      container.removeEventListener("scroll", scheduleMetrics);
      window.removeEventListener("resize", scheduleMetrics);
    };
  }, [displayPageCount, effectivePageIndex, onViewportMetricsChange, pageHeightPx, pageWidthPx, currentPageScrollTop]);

  const moveByPages = useCallback(
    (delta: number, options?: { persist?: boolean; markTurn?: boolean }) => {
      setActivePageIndex(effectivePageIndex + delta, options);
    },
    [effectivePageIndex, setActivePageIndex]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isFocusMode && event.key === "Escape") {
        if (escHoldTimerRef.current !== null) {
          return;
        }

        escHoldTimerRef.current = window.setTimeout(() => {
          setIsFocusMode(false);
          escHoldTimerRef.current = null;
        }, 550);
        return;
      }

      if (isEditableTarget(event.target)) {
        return;
      }

      if (event.key === "PageDown" || event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        moveByPages(1);
        return;
      }

      if (event.key === "PageUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        moveByPages(-1);
        return;
      }

      if (event.key === "Home") {
        event.preventDefault();
        setActivePageIndex(0);
        return;
      }

      if (event.key === "End") {
        event.preventDefault();
        setActivePageIndex(displayPageCount - 1);
        return;
      }

      if (!canAdjustPresentation) {
        if (event.key.toLowerCase() === "r") {
          event.preventDefault();
          resetToTop();
        }

        return;
      }

      if (event.key === "+" || event.key === "=") {
        event.preventDefault();
        updatePresentation({ fontSizePx: presentation.fontSizePx + 2 });
        return;
      }

      if (event.key === "-") {
        event.preventDefault();
        updatePresentation({ fontSizePx: presentation.fontSizePx - 2 });
        return;
      }

      if (event.key === "[") {
        event.preventDefault();
        updatePresentation({ lineWidthPx: presentation.lineWidthPx - 20 });
        return;
      }

      if (event.key === "]") {
        event.preventDefault();
        updatePresentation({ lineWidthPx: presentation.lineWidthPx + 20 });
        return;
      }

      if (event.key.toLowerCase() === "r") {
        event.preventDefault();
        resetToTop();
      }
    },
    [
      canAdjustPresentation,
      isFocusMode,
      moveByPages,
      displayPageCount,
      presentation.fontSizePx,
      presentation.lineWidthPx,
      resetToTop,
      setActivePageIndex,
      updatePresentation,
    ]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onKeyDown]);

  const revealScrollbarTemporarily = useCallback(() => {
    if (!hasVerticalOverflow) {
      setIsScrollbarVisible(false);
      return;
    }

    setIsScrollbarVisible(true);

    if (scrollbarHideTimerRef.current !== null) {
      window.clearTimeout(scrollbarHideTimerRef.current);
    }

    scrollbarHideTimerRef.current = window.setTimeout(() => {
      setIsScrollbarVisible(false);
      scrollbarHideTimerRef.current = null;
    }, SCROLLBAR_IDLE_HIDE_MS);
  }, [hasVerticalOverflow]);

  useEffect(() => {
    const onKeyUp = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      if (escHoldTimerRef.current !== null) {
        window.clearTimeout(escHoldTimerRef.current);
        escHoldTimerRef.current = null;
      }
    };

    window.addEventListener("keyup", onKeyUp);

    return () => {
      window.removeEventListener("keyup", onKeyUp);
      if (escHoldTimerRef.current !== null) {
        window.clearTimeout(escHoldTimerRef.current);
        escHoldTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (scrollbarHideTimerRef.current !== null) {
        window.clearTimeout(scrollbarHideTimerRef.current);
        scrollbarHideTimerRef.current = null;
      }
    };
  }, []);

  const canGoPreviousPage = !isControlledPage && effectivePageIndex > 0;
  const canGoNextPage = !isControlledPage && effectivePageIndex < displayPageCount - 1;
  const useMeasuredViewportSurface = embedded && isControlledPage;

  const paginationFooter = (
    <div
      className="flex items-center justify-between gap-3 px-4 py-3 md:px-6"
      style={{ minHeight: `${PAGINATION_OVERLAY_HEIGHT_PX}px` }}
    >
      <p className="text-xs font-medium tabular-nums text-muted-foreground">
        Page {effectivePageIndex + 1} / {displayPageCount}
      </p>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-border/40 bg-background/20 backdrop-blur-[1px]"
          disabled={!canGoPreviousPage}
          onClick={() => moveByPages(-1)}
        >
          <ChevronLeft className="size-4" />
          <span className="sr-only">Previous page</span>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="rounded-full border-border/40 bg-background/20 backdrop-blur-[1px]"
          disabled={!canGoNextPage}
          onClick={() => moveByPages(1)}
        >
          <ChevronRight className="size-4" />
          <span className="sr-only">Next page</span>
        </Button>
      </div>
    </div>
  );

  const remoteFocusMarker =
    showRemoteFocusMarker &&
    remoteFocus?.isInsideReadingArea &&
    remoteFocus.normalizedContentX !== null &&
    remoteFocus.normalizedContentY !== null ? (
      <div
        className="pointer-events-none absolute z-20 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-sky-300 bg-sky-500/55 shadow-[0_0_22px_rgba(14,165,233,0.55)]"
        style={{
          left: `${remoteFocus.normalizedContentX * 100}%`,
          top: `${remoteFocus.normalizedContentY * 100}%`,
        }}
        aria-hidden="true"
      />
    ) : null;

  return (
    <div
      className={
        embedded
          ? "h-full"
          : isFocusMode
            ? "min-h-screen bg-background"
            : "min-h-screen bg-background px-4 py-5 md:px-8 md:py-8"
      }
    >
      {displayGazePosition ? (
        <LiveGazeOverlay
          statusVariant="compact"
          hideMarkerWhenNoPoint
          markerClassName="h-4 w-4 border-blue-400 bg-blue-500/60 shadow-[0_0_22px_rgba(96,165,250,0.68)]"
          point={gazeOverlayPoint}
          hasRecentGaze={gazeOverlayHasRecentPoint}
        />
      ) : null}

      <section
        className={cn(
          isFocusMode
            ? "mx-auto flex h-screen w-full max-w-6xl flex-col overflow-hidden bg-background"
            : embedded
              ? embeddedSurfaceStyle === "bare"
                ? "flex h-full w-full flex-col overflow-hidden bg-transparent"
                : "flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
              : "mx-auto flex h-[calc(100vh-2.5rem)] w-full max-w-6xl flex-col overflow-hidden rounded-xl border bg-card shadow-sm md:h-[calc(100vh-4rem)]",
          frameClassName
        )}
        style={frameStyle}
      >
        {showToolbar ? (
          <ReadingToolbar
            estimatedTimeLabel={estimatedTimeLabel}
            experimentSetupName={experimentSetupName}
            fontSizePx={presentation.fontSizePx}
            lineWidthPx={presentation.lineWidthPx}
            allowPresentationAdjustments={canAdjustPresentation}
            showBackButton={showBackButton}
            onIncreaseFont={() => updatePresentation({ fontSizePx: presentation.fontSizePx + 2 })}
            onDecreaseFont={() => updatePresentation({ fontSizePx: presentation.fontSizePx - 2 })}
            onIncreaseWidth={() => updatePresentation({ lineWidthPx: presentation.lineWidthPx + 20 })}
            onDecreaseWidth={() => updatePresentation({ lineWidthPx: presentation.lineWidthPx - 20 })}
            onReset={() => {
              captureContextAnchor();
              onPresentationChange?.(applyReadingPresentationPatch(presentation, {
                fontFamily: "merriweather",
                fontSizePx: 18,
                lineWidthPx: 680,
                lineHeight: 1.8,
                letterSpacingEm: 0,
                editableByExperimenter: presentation.editableByExperimenter,
              }));
              resetToTop();
            }}
            onEnterFocus={() => setIsFocusMode(true)}
          />
        ) : null}

        <div
          ref={hostRef}
          className={
            isFocusMode
              ? "flex flex-1 items-stretch justify-center overflow-hidden px-5 py-8 md:px-10 md:py-10"
              : useMeasuredViewportSurface
                ? "flex flex-1 items-stretch justify-center overflow-hidden"
                : "flex flex-1 items-stretch justify-center overflow-hidden px-4 pt-6 md:px-8 md:pt-8"
          }
        >
          <div
            ref={containerRef}
            className={cn(
              "reader-scrollbar relative h-full w-full overflow-y-auto overflow-x-hidden",
              embeddedSurfaceStyle === "bare" ? "bg-transparent" : "bg-background/40"
            )}
            data-scrollbar-enabled={hasVerticalOverflow ? "true" : "false"}
            data-scrollbar-visible={hasVerticalOverflow && isScrollbarVisible ? "true" : "false"}
            style={{
              width: "100%",
              maxWidth: "100%",
            }}
            onPointerEnter={revealScrollbarTemporarily}
            onScroll={revealScrollbarTemporarily}
          >
            {remoteFocusMarker}

            <div
              ref={contentRef}
              data-reader-content="true"
              className="relative min-h-full"
              style={{
                width: `${pageWidthPx}px`,
                maxWidth: "100%",
                marginInline: "auto",
                minHeight: `${Math.max(pageHeightPx, 1)}px`,
                paddingBottom: "1.5rem",
                visibility: arePageAssignmentsReady ? "visible" : "hidden",
                fontFamily: getFontFamilyStyle(presentation.fontFamily),
                fontSize: `${presentation.fontSizePx}px`,
                lineHeight: presentation.lineHeight,
                letterSpacing: `${presentation.letterSpacingEm}em`,
              }}
            >
              <MarkdownReader
                blocks={tokenizedBlocks}
                showLixScores={showLixScores}
                lixDisplayMode={useCompactLixOverlay ? "overlay" : "inline"}
                visibleSentenceIds={visibleSentenceIds}
                blockStyleOverrides={liveBlockStyleOverrides}
              />
            </div>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-0 top-0 -z-10 opacity-0"
              style={{
                width: `${pageWidthPx}px`,
                height: `${Math.max(pageHeightPx, 1)}px`,
                overflow: "hidden",
              }}
            >
              <div
                ref={measurementRef}
                className="relative h-full"
                style={{
                  width: `${pageWidthPx}px`,
                  height: `${Math.max(pageHeightPx, 1)}px`,
                  columnWidth: `${pageWidthPx}px`,
                  columnGap: "0px",
                  columnFill: "auto",
                  fontFamily: getFontFamilyStyle(baselinePresentationSnapshot.fontFamily),
                  fontSize: `${baselinePresentationSnapshot.fontSizePx}px`,
                  lineHeight: baselinePresentationSnapshot.lineHeight,
                  letterSpacing: `${baselinePresentationSnapshot.letterSpacingEm}em`,
                }}
              >
                <MarkdownReader
                  blocks={tokenizedBlocks}
                  showLixScores={false}
                  blockStyleOverrides={baselineBlockStyleOverrides}
                />
              </div>
            </div>
          </div>
        </div>
        <div
          className={cn(
            "shrink-0",
            embeddedSurfaceStyle === "bare" ? "bg-transparent" : "border-t border-border/50 bg-background/80"
          )}
        >
          {paginationFooter}
        </div>
      </section>
    </div>
  );
}

export type { ReaderViewportMetrics };
