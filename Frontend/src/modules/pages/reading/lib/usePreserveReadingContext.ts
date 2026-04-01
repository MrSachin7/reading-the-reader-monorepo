"use client";

import { type RefObject, useCallback, useLayoutEffect, useRef } from "react";

import type { ReadingContextPreservationSnapshot } from "@/lib/experiment-session";

type UsePreserveReadingContextParams = {
  containerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  highlightContext: boolean;
  contentKey: string;
  interventionKey: string;
  interventionAppliedAtUnixMs?: number | null;
  onContextPreservationChange?: (snapshot: ReadingContextPreservationSnapshot) => void;
};

type TokenAnchor = {
  tokenId: string;
  blockId: string | null;
  centerY: number;
};

type BlockAnchor = {
  blockId: string;
  centerY: number;
};

type ContextSnapshot = {
  primaryAnchor: TokenAnchor | null;
  fallbackAnchors: TokenAnchor[];
  blockAnchor: BlockAnchor | null;
  scrollTopPx: number;
};

type RestoreAttempt = {
  anchorSource: ReadingContextPreservationSnapshot["anchorSource"];
  anchorTokenId: string | null;
  anchorBlockId: string | null;
  anchorErrorPx: number | null;
  highlightTokenId: string | null;
  reason: string | null;
};

const PRIMARY_ANCHOR_MAX_ERROR_PX = 8;
const FALLBACK_ANCHOR_MAX_ERROR_PX = 16;
const TOKEN_ANCHOR_DEGRADED_MAX_ERROR_PX = 24;
const BLOCK_ANCHOR_MAX_ERROR_PX = 28;
const CONTEXT_HIGHLIGHT_DURATION_MS = 4000;
const CONTEXT_HIGHLIGHT_MIN_VISIBLE_MS = 900;

function getTokenCenterY(token: HTMLElement) {
  const rect = token.getBoundingClientRect();
  return rect.top + rect.height / 2;
}

function getBlockCenterY(block: HTMLElement) {
  const rect = block.getBoundingClientRect();
  return rect.top + rect.height / 2;
}

function getTokenSelector(tokenId: string) {
  return `[data-token-id="${tokenId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
}

function getBlockSelector(blockId: string) {
  return `[data-block-id="${blockId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
}

function setVerticalCompensation(content: HTMLElement, offsetY: number) {
  if (Math.abs(offsetY) < 0.5) {
    content.style.transform = "";
    content.style.transformOrigin = "";
    content.style.willChange = "";
    return;
  }

  content.style.transform = `translateY(${offsetY}px)`;
  content.style.transformOrigin = "center top";
  content.style.willChange = "transform";
}

function clearVerticalCompensation(content: HTMLElement | null) {
  if (!content) {
    return;
  }

  content.style.transform = "";
  content.style.transformOrigin = "";
  content.style.willChange = "";
}

function applyContextHighlight(element: HTMLElement) {
  element.dataset.contextAnchor = "true";
  element.style.setProperty("outline", "2px solid rgba(245, 158, 11, 0.7)");
  element.style.setProperty("outline-offset", "0.12em");
}

function clearContextHighlightFromElement(element: HTMLElement | null) {
  if (!element) {
    return;
  }

  delete element.dataset.contextAnchor;
  element.style.removeProperty("outline");
  element.style.removeProperty("outline-offset");
}

function captureBlockAnchor(
  container: HTMLElement,
  activeToken: HTMLElement | null
) {
  const activeBlock = activeToken?.closest<HTMLElement>("[data-block-id]") ?? null;
  if (activeBlock?.dataset.blockId) {
    return {
      blockId: activeBlock.dataset.blockId,
      centerY: getBlockCenterY(activeBlock),
    } satisfies BlockAnchor;
  }

  const viewportCenterY = container.getBoundingClientRect().top + container.clientHeight / 2;
  let closestBlock: BlockAnchor | null = null;

  for (const block of container.querySelectorAll<HTMLElement>("[data-block-id]")) {
    const blockId = block.dataset.blockId;
    if (!blockId) {
      continue;
    }

    const centerY = getBlockCenterY(block);
    if (
      closestBlock === null ||
      Math.abs(centerY - viewportCenterY) < Math.abs(closestBlock.centerY - viewportCenterY)
    ) {
      closestBlock = { blockId, centerY };
    }
  }

  return closestBlock;
}

function captureSnapshot(container: HTMLElement): ContextSnapshot {
  const orderedTokens = Array.from(
    container.querySelectorAll<HTMLElement>('[data-token-kind="word"]')
  );
  const activeToken =
    container.querySelector<HTMLElement>('[data-gaze-active="true"]') ?? null;
  const blockAnchor = captureBlockAnchor(container, activeToken);

  if (orderedTokens.length === 0 || !activeToken) {
    return {
      primaryAnchor: null,
      fallbackAnchors: [],
      blockAnchor,
      scrollTopPx: container.scrollTop,
    };
  }

  const activeTokenId = activeToken.dataset.tokenId;
  if (!activeTokenId) {
    return {
      primaryAnchor: null,
      fallbackAnchors: [],
      blockAnchor,
      scrollTopPx: container.scrollTop,
    };
  }

  const activeIndex = orderedTokens.findIndex(
    (token) => token.dataset.tokenId === activeTokenId
  );

  if (activeIndex < 0) {
    return {
      primaryAnchor: null,
      fallbackAnchors: [],
      blockAnchor,
      scrollTopPx: container.scrollTop,
    };
  }

  const candidateIndexes = [
    activeIndex,
    activeIndex - 1,
    activeIndex + 1,
    activeIndex - 2,
    activeIndex + 2,
  ].filter((index, position, array) => {
    return index >= 0 && index < orderedTokens.length && array.indexOf(index) === position;
  });

  const anchors = candidateIndexes
    .map((index) => orderedTokens[index])
    .map((token) => {
      const tokenId = token.dataset.tokenId;
      return tokenId
        ? {
            tokenId,
            blockId: token.closest<HTMLElement>("[data-block-id]")?.dataset.blockId ?? null,
            centerY: getTokenCenterY(token),
          }
        : null;
    })
    .filter((anchor): anchor is TokenAnchor => anchor !== null);

  return {
    primaryAnchor: anchors[0] ?? null,
    fallbackAnchors: anchors.slice(1),
    blockAnchor,
    scrollTopPx: container.scrollTop,
  };
}

function alignTokenAnchor(
  container: HTMLElement,
  content: HTMLElement,
  anchor: TokenAnchor
) {
  const token = container.querySelector<HTMLElement>(getTokenSelector(anchor.tokenId));
  if (!token) {
    return null;
  }

  clearVerticalCompensation(content);

  const beforeCenterY = getTokenCenterY(token);
  const beforeDeltaY = beforeCenterY - anchor.centerY;
  const nextScrollTop = container.scrollTop + beforeDeltaY;
  const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
  container.scrollTop = Math.min(Math.max(nextScrollTop, 0), maxScrollTop);

  const afterCenterY = getTokenCenterY(token);
  const residualOffsetY = anchor.centerY - afterCenterY;
  setVerticalCompensation(content, residualOffsetY);

  const finalCenterY = getTokenCenterY(token);
  return Math.abs(finalCenterY - anchor.centerY);
}

function alignBlockAnchor(
  container: HTMLElement,
  content: HTMLElement,
  anchor: BlockAnchor
) {
  const block = container.querySelector<HTMLElement>(getBlockSelector(anchor.blockId));
  if (!block) {
    return null;
  }

  clearVerticalCompensation(content);

  const beforeCenterY = getBlockCenterY(block);
  const beforeDeltaY = beforeCenterY - anchor.centerY;
  const nextScrollTop = container.scrollTop + beforeDeltaY;
  const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
  container.scrollTop = Math.min(Math.max(nextScrollTop, 0), maxScrollTop);

  const afterCenterY = getBlockCenterY(block);
  const residualOffsetY = anchor.centerY - afterCenterY;
  setVerticalCompensation(content, residualOffsetY);

  const finalCenterY = getBlockCenterY(block);
  return Math.abs(finalCenterY - anchor.centerY);
}

function restoreScrollOnly(container: HTMLElement, content: HTMLElement, snapshot: ContextSnapshot) {
  clearVerticalCompensation(content);
  const maxScrollTop = Math.max(container.scrollHeight - container.clientHeight, 0);
  container.scrollTop = Math.min(Math.max(snapshot.scrollTopPx, 0), maxScrollTop);
}

function measureViewportDelta(container: HTMLElement, snapshot: ContextSnapshot) {
  return Math.abs(container.scrollTop - snapshot.scrollTopPx);
}

function classifyRestoreAttempt(
  snapshot: ContextSnapshot,
  attempt: RestoreAttempt | null
): Pick<ReadingContextPreservationSnapshot, "status" | "reason"> {
  if (!attempt) {
    return {
      status: "failed",
      reason: snapshot.primaryAnchor || snapshot.blockAnchor
        ? "anchor-error-exceeded-threshold"
        : "no-anchor-captured",
    };
  }

  if (attempt.anchorSource === "active-token" && (attempt.anchorErrorPx ?? Infinity) <= PRIMARY_ANCHOR_MAX_ERROR_PX) {
    return { status: "preserved", reason: null };
  }

  if (
    attempt.anchorSource === "active-token" &&
    (attempt.anchorErrorPx ?? Infinity) <= TOKEN_ANCHOR_DEGRADED_MAX_ERROR_PX
  ) {
    return { status: "degraded", reason: "anchor-error-above-preserved-threshold" };
  }

  if (
    attempt.anchorSource === "fallback-token" &&
    (attempt.anchorErrorPx ?? Infinity) <= TOKEN_ANCHOR_DEGRADED_MAX_ERROR_PX
  ) {
    return { status: "degraded", reason: attempt.reason ?? "fallback-token-used" };
  }

  if (
    attempt.anchorSource === "block-anchor" &&
    (attempt.anchorErrorPx ?? Infinity) <= BLOCK_ANCHOR_MAX_ERROR_PX
  ) {
    return { status: "degraded", reason: attempt.reason ?? "block-anchor-used" };
  }

  if (attempt.anchorSource === "scroll-only") {
    return { status: "degraded", reason: attempt.reason ?? "scroll-only-fallback" };
  }

  return {
    status: "failed",
    reason: attempt.reason ?? "anchor-error-exceeded-threshold",
  };
}

function restoreSnapshot(
  container: HTMLElement,
  content: HTMLElement,
  snapshot: ContextSnapshot
) {
  const primaryAnchor = snapshot.primaryAnchor;
  if (primaryAnchor) {
    const primaryError = alignTokenAnchor(container, content, primaryAnchor);
    if (
      primaryError !== null &&
      primaryError <= TOKEN_ANCHOR_DEGRADED_MAX_ERROR_PX
    ) {
      return {
        anchorSource: "active-token",
        anchorTokenId: primaryAnchor.tokenId,
        anchorBlockId: primaryAnchor.blockId,
        anchorErrorPx: primaryError,
        highlightTokenId: primaryAnchor.tokenId,
        reason:
          primaryError <= PRIMARY_ANCHOR_MAX_ERROR_PX
            ? null
            : "anchor-error-above-preserved-threshold",
      } satisfies RestoreAttempt;
    }

    let bestFallback: { anchor: TokenAnchor; error: number } | null = null;

    for (const anchor of snapshot.fallbackAnchors) {
      const error = alignTokenAnchor(container, content, anchor);
      if (error === null) {
        continue;
      }

      if (!bestFallback || error < bestFallback.error) {
        bestFallback = { anchor, error };
      }
    }

    if (bestFallback && bestFallback.error <= TOKEN_ANCHOR_DEGRADED_MAX_ERROR_PX) {
      alignTokenAnchor(container, content, bestFallback.anchor);
      return {
        anchorSource: "fallback-token",
        anchorTokenId: bestFallback.anchor.tokenId,
        anchorBlockId: bestFallback.anchor.blockId,
        anchorErrorPx: bestFallback.error,
        highlightTokenId: bestFallback.anchor.tokenId,
        reason:
          bestFallback.error <= FALLBACK_ANCHOR_MAX_ERROR_PX
            ? "fallback-token-used"
            : "fallback-token-error-high",
      } satisfies RestoreAttempt;
    }
  }

  if (snapshot.blockAnchor) {
    const blockError = alignBlockAnchor(container, content, snapshot.blockAnchor);
    if (blockError !== null && blockError <= BLOCK_ANCHOR_MAX_ERROR_PX) {
      return {
        anchorSource: "block-anchor",
        anchorTokenId: null,
        anchorBlockId: snapshot.blockAnchor.blockId,
        anchorErrorPx: blockError,
        highlightTokenId: null,
        reason: "block-anchor-used",
      } satisfies RestoreAttempt;
    }
  }

  if (!snapshot.primaryAnchor) {
    restoreScrollOnly(container, content, snapshot);
    return {
      anchorSource: "scroll-only",
      anchorTokenId: null,
      anchorBlockId: snapshot.blockAnchor?.blockId ?? null,
      anchorErrorPx: null,
      highlightTokenId: null,
      reason: "scroll-only-fallback",
    } satisfies RestoreAttempt;
  }

  clearVerticalCompensation(content);
  return null;
}

export function usePreserveReadingContext({
  containerRef,
  contentRef,
  enabled,
  highlightContext,
  contentKey,
  interventionKey,
  interventionAppliedAtUnixMs = null,
  onContextPreservationChange,
}: UsePreserveReadingContextParams) {
  const shouldTrackContext = enabled || highlightContext;
  const latestSnapshotRef = useRef<ContextSnapshot | null>(null);
  const previousInterventionKeyRef = useRef<string | null>(null);
  const previousContentKeyRef = useRef<string | null>(null);
  const highlightedTokenIdRef = useRef<string | null>(null);
  const highlightTimeoutRef = useRef<number | null>(null);
  const highlightFrameRef = useRef<number | null>(null);

  const clearContextHighlight = useCallback((container: HTMLElement | null) => {
    if (highlightTimeoutRef.current !== null) {
      window.clearTimeout(highlightTimeoutRef.current);
      highlightTimeoutRef.current = null;
    }

    if (highlightFrameRef.current !== null) {
      window.cancelAnimationFrame(highlightFrameRef.current);
      highlightFrameRef.current = null;
    }

    if (container && highlightedTokenIdRef.current) {
      clearContextHighlightFromElement(
        container.querySelector<HTMLElement>(getTokenSelector(highlightedTokenIdRef.current))
      );
    }

    highlightedTokenIdRef.current = null;
  }, []);

  const startContextHighlight = useCallback(
    (container: HTMLElement, tokenId: string) => {
      clearContextHighlight(container);

      const token = container.querySelector<HTMLElement>(getTokenSelector(tokenId));
      if (!token) {
        return;
      }

      highlightedTokenIdRef.current = tokenId;
      applyContextHighlight(token);

      const startedAt = performance.now();

      const checkForReacquire = () => {
        const currentTokenId = highlightedTokenIdRef.current;
        if (!currentTokenId) {
          return;
        }

        const currentToken = container.querySelector<HTMLElement>(getTokenSelector(currentTokenId));
        if (currentToken) {
          applyContextHighlight(currentToken);
        }

        const activeToken = container.querySelector<HTMLElement>('[data-gaze-active="true"]');
        const activeTokenId = activeToken?.dataset.tokenId;
        if (
          activeTokenId === currentTokenId &&
          performance.now() - startedAt >= CONTEXT_HIGHLIGHT_MIN_VISIBLE_MS
        ) {
          clearContextHighlight(container);
          return;
        }

        highlightFrameRef.current = window.requestAnimationFrame(checkForReacquire);
      };

      highlightTimeoutRef.current = window.setTimeout(() => {
        clearContextHighlight(container);
      }, CONTEXT_HIGHLIGHT_DURATION_MS);

      highlightFrameRef.current = window.requestAnimationFrame(checkForReacquire);
    },
    [clearContextHighlight]
  );

  const captureContextAnchor = useCallback(() => {
    const container = containerRef.current;
    if (!shouldTrackContext || !container) {
      return;
    }

    latestSnapshotRef.current = captureSnapshot(container);
  }, [containerRef, shouldTrackContext]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;

    if (!shouldTrackContext || !container || !content) {
      clearContextHighlight(container ?? null);
      clearVerticalCompensation(content ?? null);
      previousContentKeyRef.current = contentKey;
      previousInterventionKeyRef.current = interventionKey;
      return;
    }

    if (previousContentKeyRef.current === null || previousContentKeyRef.current !== contentKey) {
      previousContentKeyRef.current = contentKey;
      previousInterventionKeyRef.current = interventionKey;
      latestSnapshotRef.current = captureSnapshot(container);
      clearVerticalCompensation(content);
      return;
    }

    if (previousInterventionKeyRef.current === null) {
      previousInterventionKeyRef.current = interventionKey;
      latestSnapshotRef.current = captureSnapshot(container);
      return;
    }

    if (previousInterventionKeyRef.current === interventionKey) {
      latestSnapshotRef.current = captureSnapshot(container);
      return;
    }

    previousInterventionKeyRef.current = interventionKey;
    const snapshot = latestSnapshotRef.current;

    if (!snapshot) {
      latestSnapshotRef.current = captureSnapshot(container);
      return;
    }

    let frameA = 0;
    let frameB = 0;
    let frameC = 0;

    frameA = window.requestAnimationFrame(() => {
      let restoreAttempt: RestoreAttempt | null = null;
      if (enabled) {
        restoreAttempt = restoreSnapshot(container, content, snapshot);
      }
      frameB = window.requestAnimationFrame(() => {
        if (enabled) {
          restoreAttempt = restoreSnapshot(container, content, snapshot) ?? restoreAttempt;
        }
        frameC = window.requestAnimationFrame(() => {
          if (enabled) {
            restoreAttempt = restoreSnapshot(container, content, snapshot) ?? restoreAttempt;
          }

          if (highlightContext && restoreAttempt?.highlightTokenId) {
            startContextHighlight(container, restoreAttempt.highlightTokenId);
          }

          if (enabled && onContextPreservationChange) {
            const classification = classifyRestoreAttempt(snapshot, restoreAttempt);
            onContextPreservationChange({
              status: classification.status,
              anchorSource: restoreAttempt?.anchorSource ?? (snapshot.blockAnchor ? "block-anchor" : "scroll-only"),
              anchorTokenId: restoreAttempt?.anchorTokenId ?? snapshot.primaryAnchor?.tokenId ?? null,
              anchorBlockId:
                restoreAttempt?.anchorBlockId ??
                snapshot.primaryAnchor?.blockId ??
                snapshot.blockAnchor?.blockId ??
                null,
              anchorErrorPx: restoreAttempt?.anchorErrorPx ?? null,
              viewportDeltaPx: measureViewportDelta(container, snapshot),
              interventionAppliedAtUnixMs: interventionAppliedAtUnixMs ?? 0,
              measuredAtUnixMs: Date.now(),
              reason: classification.reason,
            });
          }

          latestSnapshotRef.current = captureSnapshot(container);
        });
      });
    });

    return () => {
      window.cancelAnimationFrame(frameA);
      window.cancelAnimationFrame(frameB);
      window.cancelAnimationFrame(frameC);
    };
  }, [
    clearContextHighlight,
    containerRef,
    contentKey,
    contentRef,
    enabled,
    highlightContext,
    interventionAppliedAtUnixMs,
    interventionKey,
    onContextPreservationChange,
    shouldTrackContext,
    startContextHighlight,
  ]);

  useLayoutEffect(() => {
    const container = containerRef.current;

    return () => {
      clearContextHighlight(container);
    };
  }, [clearContextHighlight, containerRef]);

  return {
    captureContextAnchor,
  };
}
