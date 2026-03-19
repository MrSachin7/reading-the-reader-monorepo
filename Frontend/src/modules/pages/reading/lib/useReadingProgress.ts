"use client";

import { RefObject, useCallback, useEffect, useRef, useState } from "react";

type UseReadingProgressParams = {
  containerRef: RefObject<HTMLDivElement | null>;
  docId: string;
};

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

export function useReadingProgress({ containerRef, docId }: UseReadingProgressParams) {
  const [progress01, setProgress01] = useState(0);
  const rafRef = useRef<number | null>(null);
  const storageKey = `reading:lastScroll:${docId}`;

  const updateProgress = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const maxScroll = Math.max(container.scrollHeight - container.clientHeight, 0);
    const nextProgress = maxScroll === 0 ? 0 : clamp01(container.scrollTop / maxScroll);

    setProgress01(nextProgress);
    window.localStorage.setItem(storageKey, String(container.scrollTop));
  }, [containerRef, storageKey]);

  const restoreIfPossible = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      updateProgress();
      return;
    }

    const lastScrollTop = Number(raw);
    if (!Number.isFinite(lastScrollTop)) {
      updateProgress();
      return;
    }

    container.scrollTop = Math.max(lastScrollTop, 0);
    window.requestAnimationFrame(updateProgress);
  }, [containerRef, storageKey, updateProgress]);

  const resetToTop = useCallback(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    container.scrollTop = 0;
    window.localStorage.setItem(storageKey, "0");
    updateProgress();
  }, [containerRef, storageKey, updateProgress]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const onScroll = () => {
      if (rafRef.current !== null) {
        return;
      }

      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = null;
        updateProgress();
      });
    };

    container.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", onScroll);
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [containerRef, updateProgress]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      restoreIfPossible();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [restoreIfPossible]);

  return {
    progress01,
    progressPct: Math.round(progress01 * 100),
    resetToTop,
    restoreIfPossible,
  };
}
