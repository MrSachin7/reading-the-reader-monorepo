"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

import type {
  ReadingAttentionSummarySnapshot,
  ReadingAttentionTokenStats,
} from "@/lib/reading-attention-summary";
import { EMPTY_READING_ATTENTION_SUMMARY } from "@/lib/reading-attention-summary";

type RemoteFocusSnapshot = {
  isInsideReadingArea: boolean;
  normalizedContentX: number | null;
  normalizedContentY: number | null;
  activeTokenId: string | null;
  updatedAtUnixMs?: number | null;
} | null;

type UseRemoteFocusTokenAttentionParams = {
  containerRef: RefObject<HTMLElement | null>;
  contentRef?: RefObject<HTMLElement | null>;
  remoteFocus: RemoteFocusSnapshot;
  enabled?: boolean;
};

type WordLayout = {
  centerX: number;
  centerY: number;
  element: HTMLElement;
  height: number;
  index: number;
  left: number;
  line: number;
  right: number;
  top: number;
  bottom: number;
};

type LineRange = {
  centerY: number;
  end: number;
  height: number;
  line: number;
  start: number;
};

type ActiveTokenEpisode = {
  tokenId: string;
  startedAtUnixMs: number;
  lastUpdatedAtUnixMs: number;
};

type AttentionState = {
  activeEpisode: ActiveTokenEpisode | null;
  tokenStats: Map<string, ReadingAttentionTokenStats>;
};

const FIXATION_THRESHOLD_MS = 130;
const SKIM_THRESHOLD_MS = 45;
const PUBLISH_INTERVAL_MS = 100;

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

function buildWordLayouts(container: HTMLElement) {
  const elements = Array.from(
    container.querySelectorAll<HTMLElement>("[data-token-id][data-token-kind='word']")
  );

  const layouts: WordLayout[] = [];
  let currentLine = -1;
  let currentLineCenterY = 0;
  let currentLineHeight = 0;

  for (const element of elements) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      continue;
    }

    const centerY = rect.top + rect.height / 2;
    const tolerance =
      currentLine < 0
        ? 0
        : Math.max(Math.min(currentLineHeight, rect.height) * 0.75, 12);

    if (currentLine < 0 || Math.abs(centerY - currentLineCenterY) > tolerance) {
      currentLine += 1;
      currentLineCenterY = centerY;
      currentLineHeight = rect.height;
    } else {
      currentLineCenterY = (currentLineCenterY + centerY) / 2;
      currentLineHeight = (currentLineHeight + rect.height) / 2;
    }

    layouts.push({
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

function pickWordIndex(layouts: WordLayout[], x: number, y: number) {
  if (layouts.length === 0) {
    return null;
  }

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
    const lineScore = verticalDistance * 14 + Math.abs(range.centerY - y) * 0.45;

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

function createAttentionState(): AttentionState {
  return {
    activeEpisode: null,
    tokenStats: new Map(),
  };
}

function finalizeEpisode(state: AttentionState, endedAtUnixMs: number) {
  const episode = state.activeEpisode;
  if (!episode) {
    return;
  }

  const durationMs = Math.max(endedAtUnixMs - episode.startedAtUnixMs, 0);
  if (durationMs < SKIM_THRESHOLD_MS) {
    state.activeEpisode = null;
    return;
  }

  const previous = state.tokenStats.get(episode.tokenId) ?? {
    fixationMs: 0,
    fixationCount: 0,
    skimCount: 0,
    maxFixationMs: 0,
    lastFixationMs: 0,
  };

  state.tokenStats.set(episode.tokenId, {
    fixationMs: previous.fixationMs + (durationMs >= FIXATION_THRESHOLD_MS ? durationMs : 0),
    fixationCount: previous.fixationCount + (durationMs >= FIXATION_THRESHOLD_MS ? 1 : 0),
    skimCount: previous.skimCount + (durationMs >= FIXATION_THRESHOLD_MS ? 0 : 1),
    maxFixationMs:
      durationMs >= FIXATION_THRESHOLD_MS
        ? Math.max(previous.maxFixationMs, durationMs)
        : previous.maxFixationMs,
    lastFixationMs: durationMs >= FIXATION_THRESHOLD_MS ? durationMs : previous.lastFixationMs,
  });
  state.activeEpisode = null;
}

function buildSnapshot(state: AttentionState): ReadingAttentionSummarySnapshot {
  const now = Date.now();
  const tokenStats = Object.fromEntries(
    Array.from(state.tokenStats.entries()).map(([tokenId, stats]) => [tokenId, { ...stats }])
  ) as Record<string, ReadingAttentionTokenStats>;

  let currentTokenId: string | null = null;
  let currentTokenDurationMs: number | null = null;

  if (state.activeEpisode) {
    currentTokenId = state.activeEpisode.tokenId;
    currentTokenDurationMs = Math.max(now - state.activeEpisode.startedAtUnixMs, 0);

    if (currentTokenDurationMs >= SKIM_THRESHOLD_MS) {
      const previous = tokenStats[currentTokenId] ?? {
        fixationMs: 0,
        fixationCount: 0,
        skimCount: 0,
        maxFixationMs: 0,
        lastFixationMs: 0,
      };

      const isFixation = currentTokenDurationMs >= FIXATION_THRESHOLD_MS;
      tokenStats[currentTokenId] = {
        fixationMs:
          previous.fixationMs +
          (isFixation ? currentTokenDurationMs : 0),
        fixationCount: previous.fixationCount,
        skimCount:
          previous.skimCount +
          (isFixation ? 0 : 1),
        maxFixationMs: isFixation
          ? Math.max(previous.maxFixationMs, currentTokenDurationMs)
          : previous.maxFixationMs,
        lastFixationMs: isFixation ? currentTokenDurationMs : previous.lastFixationMs,
      };
    }
  }

  const statsList = Object.values(tokenStats);

  return {
    updatedAtUnixMs: now,
    tokenStats,
    currentTokenId,
    currentTokenDurationMs,
    fixatedTokenCount: statsList.filter((stats) => stats.fixationMs >= FIXATION_THRESHOLD_MS).length,
    skimmedTokenCount: statsList.filter((stats) => stats.skimCount > 0 && stats.fixationMs < FIXATION_THRESHOLD_MS).length,
  };
}

export function useRemoteFocusTokenAttention({
  containerRef,
  contentRef,
  remoteFocus,
  enabled = true,
}: UseRemoteFocusTokenAttentionParams): ReadingAttentionSummarySnapshot {
  const [snapshot, setSnapshot] = useState<ReadingAttentionSummarySnapshot>(EMPTY_READING_ATTENTION_SUMMARY);
  const attentionRef = useRef<AttentionState>(createAttentionState());
  const wordLayoutsRef = useRef<WordLayout[]>([]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const container = containerRef.current;
    if (!container) {
      return;
    }

    let frameId = 0;

    const refreshLayouts = () => {
      wordLayoutsRef.current = buildWordLayouts(container);
    };

    const scheduleRefresh = () => {
      if (frameId !== 0) {
        return;
      }

      frameId = window.requestAnimationFrame(() => {
        frameId = 0;
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
    if (container.firstElementChild instanceof HTMLElement) {
      resizeObserver.observe(container.firstElementChild);
    }

    container.addEventListener("scroll", scheduleRefresh, { passive: true });
    window.addEventListener("resize", scheduleRefresh);

    return () => {
      if (frameId !== 0) {
        window.cancelAnimationFrame(frameId);
      }

      mutationObserver.disconnect();
      resizeObserver.disconnect();
      container.removeEventListener("scroll", scheduleRefresh);
      window.removeEventListener("resize", scheduleRefresh);
    };
  }, [containerRef, enabled]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const timestamp = remoteFocus?.updatedAtUnixMs ?? Date.now();
    const state = attentionRef.current;

    if (
      !remoteFocus?.isInsideReadingArea ||
      remoteFocus.normalizedContentX === null ||
      remoteFocus.normalizedContentY === null
    ) {
      finalizeEpisode(state, timestamp);
      return;
    }

    const contentElement =
      contentRef?.current ?? containerRef.current?.querySelector<HTMLElement>("[data-reader-content='true']");

    if (!contentElement) {
      return;
    }

    const contentRect = contentElement.getBoundingClientRect();
    if (contentRect.width <= 0 || contentRect.height <= 0) {
      return;
    }

    const x = clamp(
      contentRect.left + remoteFocus.normalizedContentX * contentRect.width,
      contentRect.left,
      contentRect.right
    );
    const y = clamp(
      contentRect.top + remoteFocus.normalizedContentY * contentRect.height,
      contentRect.top,
      contentRect.bottom
    );

    const candidateIndex = pickWordIndex(wordLayoutsRef.current, x, y);
    const candidateTokenId =
      candidateIndex !== null
        ? wordLayoutsRef.current[candidateIndex]?.element.dataset.tokenId ?? null
        : remoteFocus.activeTokenId;

    if (!candidateTokenId) {
      finalizeEpisode(state, timestamp);
      return;
    }

    const activeEpisode = state.activeEpisode;

    if (activeEpisode?.tokenId === candidateTokenId) {
      activeEpisode.lastUpdatedAtUnixMs = timestamp;
      return;
    }

    finalizeEpisode(state, timestamp);
    state.activeEpisode = {
      tokenId: candidateTokenId,
      startedAtUnixMs: timestamp,
      lastUpdatedAtUnixMs: timestamp,
    };
  }, [
    containerRef,
    contentRef,
    enabled,
    remoteFocus?.activeTokenId,
    remoteFocus?.isInsideReadingArea,
    remoteFocus?.normalizedContentX,
    remoteFocus?.normalizedContentY,
    remoteFocus?.updatedAtUnixMs,
  ]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const publishTimer = window.setInterval(() => {
      setSnapshot(buildSnapshot(attentionRef.current));
    }, PUBLISH_INTERVAL_MS);

    return () => {
      window.clearInterval(publishTimer);
    };
  }, [enabled]);

  return enabled ? snapshot : EMPTY_READING_ATTENTION_SUMMARY;
}
