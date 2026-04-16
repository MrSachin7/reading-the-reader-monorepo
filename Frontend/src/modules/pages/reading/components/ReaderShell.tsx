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
import { deriveReadingPresentationOverrides } from "@/modules/pages/reading/lib/reading-segments";
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
  interventionEvents?: InterventionEventSnapshot[];
};

const FONT_FAMILY_STYLES = {
  geist: "var(--font-geist-sans)",
  inter: "var(--font-inter)",
  "space-grotesk": "var(--font-space-grotesk)",
  merriweather: "var(--font-merriweather)",
} as const;

const PAGINATION_OVERLAY_HEIGHT_PX = 56;

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
  latestIntervention = null,
  initialPresentation = null,
  interventionEvents,
}: ReaderShellProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const escHoldTimerRef = useRef<number | null>(null);
  const lastPageTurnAtRef = useRef<number | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [pageWidthPx, setPageWidthPx] = useState(Math.max(presentation.lineWidthPx, 1));
  const [pageHeightPx, setPageHeightPx] = useState(0);
  const isControlledPage = viewportActivePageIndex !== null;
  const hasControlledViewportSize =
    (viewportWidthPx ?? 0) > 0 && (viewportHeightPx ?? 0) > 0;
  const displayPageCount =
    isControlledPage && viewportPageCount !== null
      ? Math.max(viewportPageCount, 1)
      : Math.max(pageCount, 1);

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

  const presentationOverrides = useMemo(
    () =>
      deriveReadingPresentationOverrides({
        tokenizedBlocks,
        initialPresentation: initialPresentation ?? livePresentationSnapshot,
        livePresentation: livePresentationSnapshot,
        interventionEvents: interventionEvents ?? [],
      }),
    [tokenizedBlocks, initialPresentation, livePresentationSnapshot, interventionEvents]
  );

  const blockStyleOverrides = useMemo(() => {
    const map = new Map<string, CSSProperties>();
    for (const [blockId, override] of presentationOverrides.blockPresentations) {
      map.set(blockId, {
        fontFamily: getFontFamilyStyle(override.fontFamily),
        fontSize: `${override.fontSizePx}px`,
        lineHeight: override.lineHeight,
        letterSpacing: `${override.letterSpacingEm}em`,
      });
    }
    return map;
  }, [presentationOverrides.blockPresentations]);

  const sentenceStyleOverrides = useMemo(() => {
    const map = new Map<string, CSSProperties>();
    for (const [sentenceId, override] of presentationOverrides.sentencePresentations) {
      map.set(sentenceId, {
        fontFamily: getFontFamilyStyle(override.fontFamily),
        fontSize: `${override.fontSizePx}px`,
        lineHeight: override.lineHeight,
        letterSpacing: `${override.letterSpacingEm}em`,
      });
    }
    return map;
  }, [presentationOverrides.sentencePresentations]);

  const words = useMemo(() => countWords(markdown), [markdown]);
  const estimatedTimeLabel = useMemo(() => formatEstimatedMinutes(words), [words]);
  const effectivePageIndex = clampPageIndex(
    isControlledPage ? viewportActivePageIndex : pageIndex,
    displayPageCount
  );

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
    currentPageIndex: effectivePageIndex,
    pageWidthPx,
    setActivePageIndex,
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
    });
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
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.dispatchEvent(new Event("scroll"));
  }, [effectivePageIndex, pageWidthPx, pageHeightPx]);

  useEffect(() => {
    const host = hostRef.current;
    const container = containerRef.current;
    const content = contentRef.current;
    if (!host || !container || !content) {
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
      const rawPageCount = nextWidth <= 0 ? 1 : Math.ceil(content.scrollWidth / nextWidth);
      const normalizedPageCount =
        isControlledPage && viewportPageCount !== null
          ? Math.max(viewportPageCount, 1)
          : Math.max(rawPageCount, 1);

      setPageWidthPx((current) => (current === nextWidth ? current : nextWidth));
      setPageHeightPx((current) => (current === nextHeight ? current : nextHeight));
      setPageCount((current) => (current === normalizedPageCount ? current : normalizedPageCount));

      const clampedPageIndex = clampPageIndex(
        isControlledPage ? viewportActivePageIndex : pageIndex,
        normalizedPageCount
      );

      if (isControlledPage) {
        setPageIndex(clampedPageIndex);
      } else {
        setPageIndex((current) => clampPageIndex(current, normalizedPageCount));
      }
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
    resizeObserver.observe(container);
    resizeObserver.observe(content);
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
    isControlledPage,
    pageCount,
    pageIndex,
    presentation.lineWidthPx,
    viewportActivePageIndex,
    viewportHeightPx,
    viewportPageCount,
    viewportWidthPx,
  ]);

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
          displayPageCount <= 1 ? 0 : normalizedPageIndex / Math.max(displayPageCount - 1, 1),
        scrollTopPx: normalizedPageIndex * Math.max(pageHeightPx, 0),
        viewportWidthPx: Math.max(pageWidthPx, 0),
        viewportHeightPx: Math.max(pageHeightPx, 0),
        contentHeightPx: Math.max(displayPageCount * pageHeightPx, pageHeightPx),
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
    window.addEventListener("resize", scheduleMetrics);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      resizeObserver.disconnect();
      window.removeEventListener("resize", scheduleMetrics);
    };
  }, [displayPageCount, effectivePageIndex, onViewportMetricsChange, pageHeightPx, pageWidthPx]);

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
              ? "flex h-full w-full flex-col overflow-hidden rounded-xl border bg-card shadow-sm"
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
            className="relative h-full w-full overflow-hidden rounded-[1.5rem] bg-background/40"
            style={{
              width: `${pageWidthPx}px`,
              maxWidth: "100%",
            }}
          >
            {isControlledPage ? (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
                <div className="pointer-events-auto">{paginationFooter}</div>
              </div>
            ) : null}

            {remoteFocusMarker}

            <div
              ref={contentRef}
              data-reader-content="true"
              className="relative h-full will-change-transform"
              style={{
                width: `${pageWidthPx}px`,
                height: `${Math.max(pageHeightPx, 1)}px`,
                paddingBottom: `${PAGINATION_OVERLAY_HEIGHT_PX}px`,
                columnWidth: `${pageWidthPx}px`,
                columnGap: "0px",
                columnFill: "auto",
                fontFamily: getFontFamilyStyle(presentation.fontFamily),
                fontSize: `${presentation.fontSizePx}px`,
                lineHeight: presentation.lineHeight,
                letterSpacing: `${presentation.letterSpacingEm}em`,
                transform: `translate3d(-${effectivePageIndex * pageWidthPx}px, 0, 0)`,
                transition: isControlledPage ? "none" : "transform 220ms ease-out",
              }}
            >
              <MarkdownReader
                blocks={tokenizedBlocks}
                showLixScores={showLixScores}
                lixDisplayMode={useCompactLixOverlay ? "overlay" : "inline"}
                blockStyleOverrides={blockStyleOverrides}
                sentenceStyleOverrides={sentenceStyleOverrides}
              />
            </div>
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30">
              <div className="pointer-events-auto">{paginationFooter}</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export type { ReaderViewportMetrics };
