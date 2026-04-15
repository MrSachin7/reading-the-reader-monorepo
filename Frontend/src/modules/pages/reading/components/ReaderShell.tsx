"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";

import { LiveGazeOverlay } from "@/modules/pages/gaze/components/LiveGazeOverlay";
import type { GazePoint } from "@/modules/pages/gaze/lib/gaze-helpers";
import { MarkdownReader } from "@/modules/pages/reading/components/MarkdownReader";
import { ReadingToolbar } from "@/modules/pages/reading/components/ReadingToolbar";
import { countWords, formatEstimatedMinutes } from "@/modules/pages/reading/lib/readingMetrics";
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation";
import { applyReadingPresentationPatch } from "@/modules/pages/reading/lib/readingPresentation";
import { useGazeTokenHighlight, type GazeFocusState } from "@/modules/pages/reading/lib/useGazeTokenHighlight";
import { usePreserveReadingContext } from "@/modules/pages/reading/lib/usePreserveReadingContext";
import { useReadingProgress } from "@/modules/pages/reading/lib/useReadingProgress";
import { useRemoteFocusTokenAttention } from "@/modules/pages/reading/lib/useRemoteFocusTokenAttention";
import {
  useRemoteTokenAttentionHeatmap,
  type RemoteTokenAttentionSnapshot,
} from "@/modules/pages/reading/lib/useRemoteTokenAttentionHeatmap";
import { useRemoteTokenHighlight } from "@/modules/pages/reading/lib/useRemoteTokenHighlight";
import { parseMinimalMarkdown } from "@/modules/pages/reading/lib/minimalMarkdown";
import { tokenizeDocument } from "@/modules/pages/reading/lib/tokenize";
import type { ReadingContextPreservationSnapshot } from "@/lib/experiment-session";
import type { ReadingGazeObservationSnapshot } from "@/lib/experiment-session";
import { cn } from "@/lib/utils";

type ReaderViewportMetrics = {
  scrollProgress: number;
  scrollTopPx: number;
  viewportWidthPx: number;
  viewportHeightPx: number;
  contentHeightPx: number;
  contentWidthPx: number;
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
  onPresentationChange?: (next: ReadingPresentationSettings) => void;
  onViewportMetricsChange?: (metrics: ReaderViewportMetrics) => void;
  onFocusChange?: (focus: GazeFocusState) => void;
  onObservationChange?: (observation: ReadingGazeObservationSnapshot) => void;
  onContextPreservationChange?: (snapshot: ReadingContextPreservationSnapshot) => void;
  viewportScrollProgress?: number | null;
  viewportScrollTopPx?: number | null;
  remoteFocus?: {
    isInsideReadingArea: boolean;
    normalizedContentX: number | null;
    normalizedContentY: number | null;
    activeTokenId: string | null;
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
  interventionAppliedAtUnixMs?: number | null;
};

const FONT_FAMILY_STYLES = {
  geist: "var(--font-geist-sans)",
  inter: "var(--font-inter)",
  "space-grotesk": "var(--font-space-grotesk)",
  merriweather: "var(--font-merriweather)",
} as const;

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

function buildScrollProgress(container: HTMLElement) {
  const scrollableHeight = Math.max(container.scrollHeight - container.clientHeight, 0);
  if (scrollableHeight === 0) {
    return 0;
  }

  return Math.min(1, Math.max(0, container.scrollTop / scrollableHeight));
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
  onPresentationChange,
  onViewportMetricsChange,
  onFocusChange,
  onObservationChange,
  onContextPreservationChange,
  viewportScrollProgress = null,
  viewportScrollTopPx = null,
  remoteFocus = null,
  remoteTokenAttention = null,
  onRemoteTokenAttentionChange,
  showRemoteFocusMarker = true,
  gazeOverlayPoint,
  gazeOverlayHasRecentPoint,
  frameClassName,
  frameStyle,
  embedded = false,
  interventionAppliedAtUnixMs = null,
}: ReaderShellProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const escHoldTimerRef = useRef<number | null>(null);
  const [isFocusMode, setIsFocusMode] = useState(false);
  const { resetToTop } = useReadingProgress({ containerRef, docId });

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
    attention: remoteTokenAttention ?? derivedRemoteTokenAttention,
    enabled: Boolean(remoteTokenAttention ?? derivedRemoteTokenAttention),
  });

  useEffect(() => {
    if (!onRemoteTokenAttentionChange) {
      return;
    }

    onRemoteTokenAttentionChange(derivedRemoteTokenAttention);
  }, [derivedRemoteTokenAttention, onRemoteTokenAttentionChange]);

  const parsedDoc = useMemo(() => parseMinimalMarkdown(markdown), [markdown]);
  const tokenizedBlocks = useMemo(() => tokenizeDocument(parsedDoc, docId), [docId, parsedDoc]);

  const words = useMemo(() => countWords(markdown), [markdown]);
  const estimatedTimeLabel = useMemo(() => formatEstimatedMinutes(words), [words]);
  const { captureContextAnchor } = usePreserveReadingContext({
    containerRef,
    contentRef,
    enabled: preserveContextOnIntervention,
    highlightContext,
    contentKey: `${docId}:${markdown}`,
    interventionKey: `${presentation.fontSizePx}:${presentation.lineWidthPx}:${presentation.lineHeight}:${presentation.letterSpacingEm}:${presentation.fontFamily}`,
    interventionAppliedAtUnixMs,
    onContextPreservationChange,
  });

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
    [canAdjustPresentation, isFocusMode, presentation.fontSizePx, presentation.lineWidthPx, resetToTop, updatePresentation]
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

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!container || !content || !onViewportMetricsChange) {
      return;
    }

    let frameId = 0;

    const emitMetrics = () => {
      onViewportMetricsChange({
        scrollProgress: buildScrollProgress(container),
        scrollTopPx: container.scrollTop,
        viewportWidthPx: container.clientWidth,
        viewportHeightPx: container.clientHeight,
        contentHeightPx: content.scrollHeight,
        contentWidthPx: content.clientWidth,
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
    resizeObserver.observe(content);
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
  }, [onViewportMetricsChange]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const scrollableHeight = Math.max(container.scrollHeight - container.clientHeight, 0);
    if (scrollableHeight <= 0) {
      return;
    }

    if (viewportScrollTopPx !== null) {
      container.scrollTop = Math.min(scrollableHeight, Math.max(0, viewportScrollTopPx));
      return;
    }

    if (viewportScrollProgress === null) {
      return;
    }

    container.scrollTop = scrollableHeight * Math.min(1, Math.max(0, viewportScrollProgress));
  }, [viewportScrollProgress, viewportScrollTopPx]);

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
          ref={containerRef}
          className={
            isFocusMode
              ? "flex-1 overflow-y-auto px-5 py-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-10 md:py-10"
              : "flex-1 overflow-y-auto px-4 py-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:px-8 md:py-8"
          }
          style={{ msOverflowStyle: "none" }}
        >
          <div
            ref={contentRef}
            data-reader-content="true"
            className="relative mx-auto w-full"
            style={{
              maxWidth: `${presentation.lineWidthPx}px`,
              fontSize: `${presentation.fontSizePx}px`,
              lineHeight: presentation.lineHeight,
              letterSpacing: `${presentation.letterSpacingEm}em`,
              fontFamily: getFontFamilyStyle(presentation.fontFamily),
            }}
          >
            {remoteFocusMarker}
            <MarkdownReader blocks={tokenizedBlocks} showLixScores={showLixScores} />
          </div>
        </div>
      </section>
    </div>
  );
}

export type { ReaderViewportMetrics };
