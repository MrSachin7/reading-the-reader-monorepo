"use client";

import { type RefObject, useEffect, useLayoutEffect, useRef } from "react";

import { subscribeToGaze, type GazeData } from "@/lib/gaze-socket";
import {
  calculateGazePoint,
  normalizeGazePoint,
  type GazePoint,
} from "@/modules/pages/gaze/lib/gaze-helpers";
import type { ReadingGazeObservationSnapshot } from "@/lib/experiment-session";

type UseGazeTokenHighlightParams = {
  containerRef: RefObject<HTMLElement | null>;
  contentRef?: RefObject<HTMLElement | null>;
  enabled?: boolean;
  highlightTokensBeingLookedAt?: boolean;
  onFocusChange?: (focus: GazeFocusState) => void;
  onEnrichedFocusSample?: (sample: GazeData, focus: GazeFocusState) => void;
  onObservationChange?: (observation: ReadingGazeObservationSnapshot) => void;
};

type WordLayout = {
  blockId: string | null;
  blockIndex: number;
  bottom: number;
  centerX: number;
  centerY: number;
  element: HTMLElement;
  height: number;
  index: number;
  left: number;
  line: number;
  right: number;
  top: number;
};

type LineRange = {
  centerY: number;
  end: number;
  height: number;
  line: number;
  start: number;
};

type HighlightVariant = "primary" | "secondary";

type FixationCandidate = {
  index: number;
  startedAt: number;
};

export type GazeFocusState = {
  isInsideReadingArea: boolean;
  normalizedContentX: number | null;
  normalizedContentY: number | null;
  activeTokenId: string | null;
  activeBlockId: string | null;
  activeSentenceId: string | null;
  activeTokenText: string | null;
  updatedAtUnixMs: number;
};

function normalizeObservationStaleReason(
  staleReason: string
): ReadingGazeObservationSnapshot["staleReason"] {
  return staleReason
}

const FIXATION_INITIAL_MS = 90;
const FIXATION_SAME_LINE_MS = 70;
const FIXATION_NEW_LINE_MS = 135;
const POINT_STALE_AFTER_MS = 650;
const CLEAR_HIGHLIGHT_AFTER_MS = 1500;
const PRIMARY_TOKEN_STYLES: ReadonlyArray<readonly [string, string]> = [
  ["background-color", "rgba(96, 165, 250, 0.28)"],
  ["box-shadow", "0 0 0 1px rgba(96, 165, 250, 0.38)"],
];
const SECONDARY_TOKEN_STYLES: ReadonlyArray<readonly [string, string]> = [
  ["background-color", "rgba(147, 197, 253, 0.16)"],
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAxisDistance(position: number, start: number, end: number) {
  if (position < start) {
    return start - position;
  }

  if (position > end) {
    return position - end;
  }

  return 0;
}

function intersectsViewport(rect: DOMRect, viewportRect: DOMRect) {
  return (
    rect.right >= viewportRect.left &&
    rect.left <= viewportRect.right &&
    rect.bottom >= viewportRect.top &&
    rect.top <= viewportRect.bottom
  );
}

// Bug 1 fix: query from contentRoot (the live text column) instead of the full
// container, which also contains the hidden measurement div with duplicate spans.
function buildWordLayouts(container: HTMLElement, contentRoot: HTMLElement) {
  const blockOrder = Array.from(contentRoot.querySelectorAll<HTMLElement>("[data-block-id]"))
    .map((block) => block.dataset.blockId)
    .filter((blockId): blockId is string => Boolean(blockId))

  const elements = Array.from(
    contentRoot.querySelectorAll<HTMLElement>("[data-token-id][data-token-kind='word']")
  );
  const viewportRect = container.getBoundingClientRect();

  const layouts: WordLayout[] = [];
  let currentLine = -1;
  let currentLineCenterY = 0;
  let currentLineHeight = 0;
  // Bug 5 fix: track running sums so the line center is a true mean rather than
  // a drifting 2-sample average that shifts toward the last word processed.
  let currentLineSumY = 0;
  let currentLineCount = 0;
  let currentLineSumHeight = 0;

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }

    if (!intersectsViewport(rect, viewportRect)) {
      continue;
    }

    const centerY = rect.top + rect.height / 2;
    const tolerance =
      currentLine < 0
        ? 0
        : Math.max(Math.min(currentLineHeight, rect.height) * 0.75, 12);

    if (currentLine < 0 || Math.abs(centerY - currentLineCenterY) > tolerance) {
      currentLine += 1;
      currentLineSumY = centerY;
      currentLineCount = 1;
      currentLineCenterY = centerY;
      currentLineSumHeight = rect.height;
      currentLineHeight = rect.height;
    } else {
      currentLineSumY += centerY;
      currentLineCount += 1;
      currentLineCenterY = currentLineSumY / currentLineCount;
      currentLineSumHeight += rect.height;
      currentLineHeight = currentLineSumHeight / currentLineCount;
    }

    const blockId = element.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ?? null

    layouts.push({
      blockId,
      blockIndex: blockId ? Math.max(blockOrder.indexOf(blockId), 0) : 0,
      bottom: rect.bottom,
      centerX: rect.left + rect.width / 2,
      centerY,
      element,
      height: rect.height,
      index: layouts.length,
      left: rect.left,
      line: currentLine,
      right: rect.right,
      top: rect.top,
    });
  }

  return layouts;
}

function getFixationThreshold(
  candidateIndex: number,
  activeIndex: number | null,
  layouts: WordLayout[]
) {
  if (activeIndex === null) {
    return FIXATION_INITIAL_MS;
  }

  const activeLayout = layouts[activeIndex];
  const candidateLayout = layouts[candidateIndex];
  if (!activeLayout || !candidateLayout) {
    return FIXATION_INITIAL_MS;
  }

  return activeLayout.line === candidateLayout.line
    ? FIXATION_SAME_LINE_MS
    : FIXATION_NEW_LINE_MS;
}

function getPhraseIndices(activeIndex: number, layouts: WordLayout[]) {
  const activeLayout = layouts[activeIndex];
  if (!activeLayout) {
    return [];
  }

  const phraseIndices: number[] = [];
  const previousLayout = layouts[activeIndex - 1];
  const nextLayout = layouts[activeIndex + 1];

  if (previousLayout && previousLayout.line === activeLayout.line) {
    phraseIndices.push(previousLayout.index);
  }

  phraseIndices.push(activeLayout.index);

  if (nextLayout && nextLayout.line === activeLayout.line) {
    phraseIndices.push(nextLayout.index);
  }

  return phraseIndices;
}

function pickWordIndex(
  layouts: WordLayout[],
  x: number,
  y: number,
  activeIndex: number | null
) {
  if (layouts.length === 0) {
    return null;
  }

  const preferredLine = activeIndex === null ? null : layouts[activeIndex]?.line ?? null;
  const lineRanges = new Map<number, LineRange>();

  for (const layout of layouts) {
    const existing = lineRanges.get(layout.line);
    if (!existing) {
      lineRanges.set(layout.line, {
        centerY: layout.centerY,
        end: layout.bottom,
        height: layout.height,
        line: layout.line,
        start: layout.top,
      });
      continue;
    }

    existing.start = Math.min(existing.start, layout.top);
    existing.end = Math.max(existing.end, layout.bottom);
    existing.centerY = (existing.centerY + layout.centerY) / 2;
    existing.height = Math.max(existing.height, layout.height);
  }

  let bestLine: number | null = null;
  let bestLineScore = Number.POSITIVE_INFINITY;

  for (const range of lineRanges.values()) {
    const verticalDistance = getAxisDistance(y, range.start, range.end);
    let lineScore =
      verticalDistance * 14 +
      Math.abs(range.centerY - y) * 0.45;

    if (preferredLine !== null && range.line === preferredLine) {
      lineScore -= 24;
    }

    if (lineScore < bestLineScore) {
      bestLineScore = lineScore;
      bestLine = range.line;
    }
  }

  if (bestLine === null) {
    return null;
  }

  let bestIndex: number | null = null;
  let bestScore = Number.POSITIVE_INFINITY;

  for (const layout of layouts) {
    if (layout.line !== bestLine) {
      continue;
    }

    const horizontalDistance = getAxisDistance(x, layout.left, layout.right);
    const centerDistance = Math.abs(layout.centerX - x);
    const verticalDistance = Math.abs(layout.centerY - y);
    const score =
      horizontalDistance * 1.35 +
      centerDistance * 0.12 +
      verticalDistance * 0.08;

    if (score < bestScore) {
      bestScore = score;
      bestIndex = layout.index;
    }
  }

  return bestIndex;
}

function clearStyles(element: HTMLElement) {
  for (const [property] of PRIMARY_TOKEN_STYLES) {
    element.style.removeProperty(property);
  }

  for (const [property] of SECONDARY_TOKEN_STYLES) {
    element.style.removeProperty(property);
  }
}

function applyStyles(element: HTMLElement, variant: HighlightVariant) {
  const styles = variant === "primary" ? PRIMARY_TOKEN_STYLES : SECONDARY_TOKEN_STYLES;

  for (const [property, value] of styles) {
    element.style.setProperty(property, value);
  }
}

function getTokenObservationFields(layout: WordLayout | null) {
  return {
    tokenId: layout?.element.dataset.tokenId ?? null,
    tokenText: layout?.element.textContent ?? null,
    tokenKind: layout?.element.dataset.tokenKind ?? null,
    blockId: layout?.blockId ?? null,
    tokenIndex: layout?.index ?? null,
    lineIndex: layout?.line ?? null,
    blockIndex: layout?.blockIndex ?? null,
  }
}

export function useGazeTokenHighlight({
  containerRef,
  contentRef,
  enabled = true,
  highlightTokensBeingLookedAt = true,
  onFocusChange,
  onEnrichedFocusSample,
  onObservationChange,
}: UseGazeTokenHighlightParams) {
  const wordLayoutsRef = useRef<WordLayout[]>([]);
  const activeWordIndexRef = useRef<number | null>(null);
  const activeTokenIdRef = useRef<string | null>(null);
  const highlightedElementsRef = useRef<Map<HTMLElement, HighlightVariant>>(new Map());
  const fixationCandidateRef = useRef<FixationCandidate | null>(null);
  const latestSampleRef = useRef<GazeData | null>(null);
  const latestPointRef = useRef<GazePoint | null>(null);
  const normalizedPointRef = useRef<GazePoint | null>(null);
  const lastValidPointAtRef = useRef(0);
  const lastFocusSignatureRef = useRef<string | null>(null);
  const lastFocusReportedAtRef = useRef(0);
  const lastEnrichedSampleKeyRef = useRef<string | null>(null);
  const lastObservationSignatureRef = useRef<string | null>(null);
  const lastObservationReportedAtRef = useRef(0);

  // Bug 2 fix: store callbacks in refs so the effect never needs to re-run when
  // the parent passes new function references on each render.
  const onFocusChangeRef = useRef(onFocusChange);
  const onEnrichedFocusSampleRef = useRef(onEnrichedFocusSample);
  const onObservationChangeRef = useRef(onObservationChange);

  useLayoutEffect(() => {
    onFocusChangeRef.current = onFocusChange;
    onEnrichedFocusSampleRef.current = onEnrichedFocusSample;
    onObservationChangeRef.current = onObservationChange;
  });

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    let refreshFrameId = 0;
    let renderFrameId = 0;

    const reportFocus = (
      partial: Omit<GazeFocusState, "updatedAtUnixMs">
    ) => {
      const now = Date.now();
      const focus = {
        ...partial,
        updatedAtUnixMs: now,
      };
      const latestSample = latestSampleRef.current;
      if (onEnrichedFocusSampleRef.current && latestSample) {
        const sampleKey = `${latestSample.deviceTimeStamp}:${latestSample.systemTimeStamp ?? ""}`;
        if (sampleKey !== lastEnrichedSampleKeyRef.current) {
          lastEnrichedSampleKeyRef.current = sampleKey;
          onEnrichedFocusSampleRef.current(latestSample, focus);
        }
      }

      if (!onFocusChangeRef.current) {
        return;
      }
      const signature = JSON.stringify([
        partial.isInsideReadingArea,
        partial.normalizedContentX?.toFixed(4) ?? null,
        partial.normalizedContentY?.toFixed(4) ?? null,
        partial.activeTokenId,
        partial.activeBlockId,
        partial.activeSentenceId,
        partial.activeTokenText,
      ]);

      if (
        signature === lastFocusSignatureRef.current &&
        now - lastFocusReportedAtRef.current < 100
      ) {
        return;
      }

      lastFocusSignatureRef.current = signature;
      lastFocusReportedAtRef.current = now;
      onFocusChangeRef.current(focus);
    };

    const reportObservation = (
      partial: Omit<ReadingGazeObservationSnapshot, "observedAtUnixMs">
    ) => {
      if (!onObservationChangeRef.current) {
        return
      }

      const signature = JSON.stringify([
        partial.isInsideReadingArea,
        partial.normalizedContentX?.toFixed(4) ?? null,
        partial.normalizedContentY?.toFixed(4) ?? null,
        partial.tokenId,
        partial.tokenText,
        partial.tokenKind,
        partial.blockId,
        partial.tokenIndex,
        partial.lineIndex,
        partial.blockIndex,
        partial.isStale,
        partial.staleReason,
      ])
      const nowUnixMs = Date.now()

      if (
        signature === lastObservationSignatureRef.current &&
        nowUnixMs - lastObservationReportedAtRef.current < 100
      ) {
        return
      }

      lastObservationSignatureRef.current = signature
      lastObservationReportedAtRef.current = nowUnixMs
      onObservationChangeRef.current({
        ...partial,
        observedAtUnixMs: nowUnixMs,
      })
    }

    const setActiveWord = (nextIndex: number | null, force = false) => {
      if (!force && activeWordIndexRef.current === nextIndex) {
        return;
      }

      const nextHighlights = new Map<HTMLElement, HighlightVariant>();

      if (nextIndex !== null) {
        for (const phraseIndex of getPhraseIndices(nextIndex, wordLayoutsRef.current)) {
          const layout = wordLayoutsRef.current[phraseIndex];
          if (!layout) {
            continue;
          }

          nextHighlights.set(
            layout.element,
            phraseIndex === nextIndex ? "primary" : "secondary"
          );
        }
      }

      for (const [element, previousVariant] of highlightedElementsRef.current) {
        const nextVariant = nextHighlights.get(element);
        if (!nextVariant || nextVariant !== previousVariant) {
          clearStyles(element);
          delete element.dataset.gazeActive;
          delete element.dataset.gazePhrase;
        }
      }

      for (const [element, variant] of nextHighlights) {
        const previousVariant = highlightedElementsRef.current.get(element);
        if (
          highlightTokensBeingLookedAt &&
          (!previousVariant || previousVariant !== variant)
        ) {
          clearStyles(element);
          applyStyles(element, variant);
        }

        element.dataset.gazePhrase = variant;
        if (variant === "primary") {
          element.dataset.gazeActive = "true";
        } else {
          delete element.dataset.gazeActive;
        }
      }

      highlightedElementsRef.current = nextHighlights;
      activeWordIndexRef.current = nextIndex;
      activeTokenIdRef.current =
        nextIndex === null
          ? null
          : wordLayoutsRef.current[nextIndex]?.element.dataset.tokenId ?? null;
    };

    // Bug 1 fix: resolve the live content root so buildWordLayouts only queries
    // the visible text column, not the hidden measurement div inside the container.
    const resolveContentRoot = (): HTMLElement =>
      contentRef?.current ??
      container.querySelector<HTMLElement>("[data-reader-content='true']") ??
      container;

    const refreshLayouts = () => {
      wordLayoutsRef.current = buildWordLayouts(container, resolveContentRoot());

      if (activeTokenIdRef.current) {
        const nextIndex = wordLayoutsRef.current.findIndex(
          (layout) => layout.element.dataset.tokenId === activeTokenIdRef.current
        );

        if (nextIndex >= 0) {
          setActiveWord(nextIndex, true);
        } else {
          fixationCandidateRef.current = null;
          setActiveWord(null, true);
        }
      }
    };

    const scheduleRefresh = () => {
      if (refreshFrameId !== 0) {
        return;
      }

      refreshFrameId = window.requestAnimationFrame(() => {
        refreshFrameId = 0;
        refreshLayouts();
      });
    };

    refreshLayouts();

    const mutationObserver = new MutationObserver(scheduleRefresh);
    mutationObserver.observe(container, {
      childList: true,
      subtree: true,
    });

    const resizeObserver = new ResizeObserver(scheduleRefresh);
    resizeObserver.observe(container);
    // Bug 4 fix: observe the content element directly instead of
    // container.firstElementChild, which points to the remote focus marker when
    // it is rendered and causes content resize events to be missed.
    const contentEl = contentRef?.current ?? container.querySelector<HTMLElement>("[data-reader-content='true']");
    if (contentEl instanceof HTMLElement) {
      resizeObserver.observe(contentEl);
    }

    // Bug 6 fix: refresh layouts synchronously on scroll so that word rects are
    // current before the next render RAF fires, eliminating the 1-frame stale window.
    const onScroll = () => {
      refreshLayouts();
    };

    const onResize = () => {
      scheduleRefresh();
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);

    const unsubscribeGaze = subscribeToGaze((sample) => {
      latestSampleRef.current = sample;
      const nextPoint = calculateGazePoint(sample);
      if (!nextPoint) {
        return;
      }

      latestPointRef.current = nextPoint;
      lastValidPointAtRef.current = performance.now();
    });

    const render = (now: number) => {
      const latestPoint = latestPointRef.current;
      if (!latestPoint) {
        setActiveWord(null);
        reportObservation({
          isInsideReadingArea: false,
          normalizedContentX: null,
          normalizedContentY: null,
          ...getTokenObservationFields(null),
          isStale: true,
          staleReason: normalizeObservationStaleReason("no-point"),
        })
        reportFocus({
          isInsideReadingArea: false,
          normalizedContentX: null,
          normalizedContentY: null,
          activeTokenId: null,
          activeBlockId: null,
          activeSentenceId: null,
          activeTokenText: null,
        });
        renderFrameId = window.requestAnimationFrame(render);
        return;
      }

      const pointAgeMs = now - lastValidPointAtRef.current;
      if (pointAgeMs > CLEAR_HIGHLIGHT_AFTER_MS) {
        normalizedPointRef.current = null;
        fixationCandidateRef.current = null;
        setActiveWord(null);
        reportObservation({
          isInsideReadingArea: false,
          normalizedContentX: null,
          normalizedContentY: null,
          ...getTokenObservationFields(null),
          isStale: true,
          staleReason: normalizeObservationStaleReason("point-stale"),
        })
        reportFocus({
          isInsideReadingArea: false,
          normalizedContentX: null,
          normalizedContentY: null,
          activeTokenId: null,
          activeBlockId: null,
          activeSentenceId: null,
          activeTokenText: null,
        });
        renderFrameId = window.requestAnimationFrame(render);
        return;
      }

      if (pointAgeMs > POINT_STALE_AFTER_MS) {
        reportObservation({
          isInsideReadingArea: false,
          normalizedContentX: null,
          normalizedContentY: null,
          ...getTokenObservationFields(null),
          isStale: true,
          staleReason: normalizeObservationStaleReason("point-stale"),
        })
        renderFrameId = window.requestAnimationFrame(render);
        return;
      }

      const normalizedPoint = normalizeGazePoint(normalizedPointRef.current, latestPoint);
      normalizedPointRef.current = normalizedPoint;

      const x = clamp(normalizedPoint.x * window.innerWidth, 0, window.innerWidth);
      const y = clamp(normalizedPoint.y * window.innerHeight, 0, window.innerHeight);

      // Bug 3 fix: use the content element's bounds (the actual text column) as
      // the reading area, not the full scroll container which includes side padding.
      // This prevents gaze in the padding from reaching pickWordIndex with no nearby
      // words, and makes normalizedContentX/Y semantically correct (fraction of the
      // text column, not the container).
      const contentElement = resolveContentRoot();
      if (contentElement === container) {
        // contentRef not yet attached — skip this frame
        renderFrameId = window.requestAnimationFrame(render);
        return;
      }

      const readingAreaRect = contentElement.getBoundingClientRect();
      const isInsideReadingArea =
        x >= readingAreaRect.left &&
        x <= readingAreaRect.right &&
        y >= readingAreaRect.top &&
        y <= readingAreaRect.bottom &&
        readingAreaRect.width > 0 &&
        readingAreaRect.height > 0;

      if (!isInsideReadingArea) {
        setActiveWord(null);
        fixationCandidateRef.current = null;
        reportObservation({
          isInsideReadingArea: false,
          normalizedContentX: null,
          normalizedContentY: null,
          ...getTokenObservationFields(null),
          isStale: true,
          staleReason: normalizeObservationStaleReason("outside-reading-area"),
        })
        reportFocus({
          isInsideReadingArea: false,
          normalizedContentX: null,
          normalizedContentY: null,
          activeTokenId: null,
          activeBlockId: null,
          activeSentenceId: null,
          activeTokenText: null,
        });
        renderFrameId = window.requestAnimationFrame(render);
        return;
      }

      const normalizedContentX = clamp((x - readingAreaRect.left) / readingAreaRect.width, 0, 1);
      const normalizedContentY = clamp((y - readingAreaRect.top) / readingAreaRect.height, 0, 1);

      const candidateIndex = pickWordIndex(
        wordLayoutsRef.current,
        x,
        y,
        activeWordIndexRef.current
      );

      if (candidateIndex === null) {
        reportObservation({
          isInsideReadingArea: true,
          normalizedContentX,
          normalizedContentY,
          ...getTokenObservationFields(null),
          isStale: true,
          staleReason: normalizeObservationStaleReason("no-token-hit"),
        })
        reportFocus({
          isInsideReadingArea: true,
          normalizedContentX,
          normalizedContentY,
          activeTokenId: null,
          activeBlockId: null,
          activeSentenceId: null,
          activeTokenText: null,
        });
        renderFrameId = window.requestAnimationFrame(render);
        return;
      }

      if (candidateIndex === activeWordIndexRef.current) {
        fixationCandidateRef.current = null;
        const activeLayout =
          activeWordIndexRef.current === null
            ? null
            : wordLayoutsRef.current[activeWordIndexRef.current] ?? null;
        reportObservation({
          isInsideReadingArea: true,
          normalizedContentX,
          normalizedContentY,
          ...getTokenObservationFields(activeLayout),
          isStale: false,
          staleReason: normalizeObservationStaleReason("none"),
        })
        reportFocus({
          isInsideReadingArea: true,
          normalizedContentX,
          normalizedContentY,
          activeTokenId: activeLayout?.element.dataset.tokenId ?? null,
          activeBlockId: activeLayout?.blockId ?? null,
          activeSentenceId: activeLayout?.element.dataset.sentenceId ?? null,
          activeTokenText: activeLayout?.element.textContent?.trim() ?? null,
        });
        renderFrameId = window.requestAnimationFrame(render);
        return;
      }

      const fixationCandidate = fixationCandidateRef.current;
      if (!fixationCandidate || fixationCandidate.index !== candidateIndex) {
        fixationCandidateRef.current = {
          index: candidateIndex,
          startedAt: now,
        };
        const candidateLayout = wordLayoutsRef.current[candidateIndex] ?? null
        reportObservation({
          isInsideReadingArea: true,
          normalizedContentX,
          normalizedContentY,
          ...getTokenObservationFields(candidateLayout),
          isStale: false,
          staleReason: normalizeObservationStaleReason("none"),
        })
        const activeLayout =
          activeWordIndexRef.current === null
            ? null
            : wordLayoutsRef.current[activeWordIndexRef.current] ?? null;
        reportFocus({
          isInsideReadingArea: true,
          normalizedContentX,
          normalizedContentY,
          activeTokenId: activeLayout?.element.dataset.tokenId ?? null,
          activeBlockId: activeLayout?.blockId ?? null,
          activeSentenceId: activeLayout?.element.dataset.sentenceId ?? null,
          activeTokenText: activeLayout?.element.textContent?.trim() ?? null,
        });
        renderFrameId = window.requestAnimationFrame(render);
        return;
      }

      const fixationThreshold = getFixationThreshold(
        candidateIndex,
        activeWordIndexRef.current,
        wordLayoutsRef.current
      );

      if (now - fixationCandidate.startedAt >= fixationThreshold) {
        fixationCandidateRef.current = null;
        setActiveWord(candidateIndex);
      }

      const candidateLayout = wordLayoutsRef.current[candidateIndex] ?? null
      reportObservation({
        isInsideReadingArea: true,
        normalizedContentX,
        normalizedContentY,
        ...getTokenObservationFields(candidateLayout),
        isStale: false,
        staleReason: normalizeObservationStaleReason("none"),
      })
      const activeLayout =
        activeWordIndexRef.current === null
          ? null
          : wordLayoutsRef.current[activeWordIndexRef.current] ?? null;
      reportFocus({
        isInsideReadingArea: true,
        normalizedContentX,
        normalizedContentY,
        activeTokenId: activeLayout?.element.dataset.tokenId ?? null,
        activeBlockId: activeLayout?.blockId ?? null,
        activeSentenceId: activeLayout?.element.dataset.sentenceId ?? null,
        activeTokenText: activeLayout?.element.textContent?.trim() ?? null,
      });

      renderFrameId = window.requestAnimationFrame(render);
    };

    renderFrameId = window.requestAnimationFrame(render);

    return () => {
      if (refreshFrameId !== 0) {
        window.cancelAnimationFrame(refreshFrameId);
      }

      window.cancelAnimationFrame(renderFrameId);
      unsubscribeGaze();
      mutationObserver.disconnect();
      resizeObserver.disconnect();
      container.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      fixationCandidateRef.current = null;
      latestSampleRef.current = null;
      normalizedPointRef.current = null;
      activeTokenIdRef.current = null;
      lastFocusSignatureRef.current = null;
      lastFocusReportedAtRef.current = 0;
      lastEnrichedSampleKeyRef.current = null;
      lastObservationSignatureRef.current = null;
      lastObservationReportedAtRef.current = 0;
      setActiveWord(null, true);
      wordLayoutsRef.current = [];
    };
  // Bug 2 fix: callbacks are accessed through refs (kept in sync via useLayoutEffect)
  // so they are intentionally excluded from this dependency array. The effect only
  // needs to re-run when the structural parameters that drive setup change.
  }, [containerRef, contentRef, enabled, highlightTokensBeingLookedAt]);
}
