"use client";

import { type RefObject, useCallback, useLayoutEffect, useRef } from "react";

type UsePreserveReadingContextParams = {
  containerRef: RefObject<HTMLElement | null>;
  contentRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  highlightContext: boolean;
  interventionKey: string;
};

type TokenAnchor = {
  tokenId: string;
  centerY: number;
};

type ContextSnapshot = {
  primaryAnchor: TokenAnchor;
  fallbackAnchors: TokenAnchor[];
};

const PRIMARY_ANCHOR_MAX_ERROR_PX = 8;
const FALLBACK_ANCHOR_MAX_ERROR_PX = 16;
const CONTEXT_HIGHLIGHT_DURATION_MS = 4000;
const CONTEXT_HIGHLIGHT_MIN_VISIBLE_MS = 900;

function getTokenCenterY(token: HTMLElement) {
  const rect = token.getBoundingClientRect();
  return rect.top + rect.height / 2;
}

function getTokenSelector(tokenId: string) {
  return `[data-token-id="${tokenId.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"]`;
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

function captureSnapshot(container: HTMLElement): ContextSnapshot | null {
  const orderedTokens = Array.from(
    container.querySelectorAll<HTMLElement>('[data-token-kind="word"]')
  );

  if (orderedTokens.length === 0) {
    return null;
  }

  const activeToken =
    container.querySelector<HTMLElement>('[data-gaze-active="true"]') ?? null;

  if (!activeToken) {
    return null;
  }

  const activeTokenId = activeToken.dataset.tokenId;
  if (!activeTokenId) {
    return null;
  }

  const activeIndex = orderedTokens.findIndex(
    (token) => token.dataset.tokenId === activeTokenId
  );

  if (activeIndex < 0) {
    return null;
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
            centerY: getTokenCenterY(token),
          }
        : null;
    })
    .filter((anchor): anchor is TokenAnchor => anchor !== null);

  if (anchors.length === 0) {
    return null;
  }

  return {
    primaryAnchor: anchors[0],
    fallbackAnchors: anchors.slice(1),
  };
}

function alignAnchor(
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

function restoreSnapshot(
  container: HTMLElement,
  content: HTMLElement,
  snapshot: ContextSnapshot
) {
  const primaryError = alignAnchor(container, content, snapshot.primaryAnchor);
  if (
    primaryError !== null &&
    primaryError <= PRIMARY_ANCHOR_MAX_ERROR_PX
  ) {
    return true;
  }

  let bestFallback: { anchor: TokenAnchor; error: number } | null = null;

  for (const anchor of snapshot.fallbackAnchors) {
    const error = alignAnchor(container, content, anchor);
    if (error === null) {
      continue;
    }

    if (!bestFallback || error < bestFallback.error) {
      bestFallback = { anchor, error };
    }
  }

  if (bestFallback && bestFallback.error <= FALLBACK_ANCHOR_MAX_ERROR_PX) {
    alignAnchor(container, content, bestFallback.anchor);
    return true;
  }

  if (primaryError !== null) {
    alignAnchor(container, content, snapshot.primaryAnchor);
    return true;
  }

  clearVerticalCompensation(content);
  return false;
}

export function usePreserveReadingContext({
  containerRef,
  contentRef,
  enabled,
  highlightContext,
  interventionKey,
}: UsePreserveReadingContextParams) {
  const shouldTrackContext = enabled || highlightContext;
  const latestSnapshotRef = useRef<ContextSnapshot | null>(null);
  const previousInterventionKeyRef = useRef<string | null>(null);
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
      previousInterventionKeyRef.current = interventionKey;
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
      if (enabled) {
        restoreSnapshot(container, content, snapshot);
      }
      frameB = window.requestAnimationFrame(() => {
        if (enabled) {
          restoreSnapshot(container, content, snapshot);
        }
        frameC = window.requestAnimationFrame(() => {
          if (enabled) {
            restoreSnapshot(container, content, snapshot);
          }

          if (highlightContext) {
            startContextHighlight(container, snapshot.primaryAnchor.tokenId);
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
    contentRef,
    enabled,
    highlightContext,
    interventionKey,
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
