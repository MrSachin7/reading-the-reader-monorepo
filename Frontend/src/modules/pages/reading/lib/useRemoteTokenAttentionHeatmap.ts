"use client";

import { type RefObject, useEffect } from "react";
import type {
  ReadingAttentionSummarySnapshot,
  ReadingAttentionTokenStats,
} from "@/lib/reading-attention-summary";

export type RemoteTokenAttentionStats = ReadingAttentionTokenStats;
export type RemoteTokenAttentionSnapshot = ReadingAttentionSummarySnapshot;

type UseRemoteTokenAttentionHeatmapParams = {
  containerRef: RefObject<HTMLElement | null>;
  attention: RemoteTokenAttentionSnapshot | null;
  enabled?: boolean;
};

const MIN_FIXATION_HEAT_MS = 110;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clearStyles(element: HTMLElement) {
  element.style.removeProperty("background-color");
  element.style.removeProperty("background-image");
  element.style.removeProperty("outline");
  element.style.removeProperty("outline-offset");
  element.style.removeProperty("box-shadow");
  delete element.dataset.remoteAttention;
}

function applyHeatmapStyles(
  element: HTMLElement,
  stats: RemoteTokenAttentionStats,
  isCurrentToken: boolean
) {
  const fixationStrength = clamp((stats.maxFixationMs - 110) / 480, 0, 1);
  const easedFixationStrength = fixationStrength ** 0.8;
  const cumulativeHeat = clamp(stats.fixationMs / 1200, 0, 1);

  if (fixationStrength > 0) {
    const topAlpha = 0.1 + easedFixationStrength * 0.22;
    const midAlpha = 0.18 + easedFixationStrength * 0.26;
    const bottomAlpha = 0.3 + easedFixationStrength * 0.44 + cumulativeHeat * 0.1;
    const borderAlpha = 0.16 + easedFixationStrength * 0.28 + cumulativeHeat * 0.16;
    element.style.setProperty(
      "background-color",
      `rgba(255, 247, 237, ${0.08 + easedFixationStrength * 0.18 + cumulativeHeat * 0.12})`
    );
    element.style.setProperty(
      "background-image",
      `linear-gradient(180deg, rgba(254, 240, 138, ${topAlpha}) 0%, rgba(251, 191, 36, ${midAlpha}) 48%, rgba(234, 88, 12, ${bottomAlpha}) 100%)`
    );
    element.style.setProperty(
      "box-shadow",
      `inset 0 0 0 1px rgba(194, 65, 12, ${borderAlpha}), inset 0 -0.1em 0 rgba(154, 52, 18, ${0.18 + easedFixationStrength * 0.22 + cumulativeHeat * 0.18})`
    );
  }

  if (stats.skimCount > 0 && stats.fixationMs < MIN_FIXATION_HEAT_MS) {
    const skimAlpha = clamp(0.38 + stats.skimCount * 0.12, 0.38, 0.86);
    element.style.setProperty("background-color", `rgba(219, 234, 254, ${0.18 + stats.skimCount * 0.06})`);
    element.style.setProperty("background-image", "none");
    element.style.setProperty(
      "box-shadow",
      `inset 0 -0.24em 0 rgba(37, 99, 235, ${skimAlpha}), inset 0 0 0 1px rgba(96, 165, 250, ${Math.max(
        skimAlpha - 0.18,
        0.22
      )})`
    );
  }

  if (isCurrentToken) {
    element.style.setProperty("outline", "1px solid rgba(194, 65, 12, 0.48)");
    element.style.setProperty("outline-offset", "1px");
  }

  element.dataset.remoteAttention = "true";
}

export function useRemoteTokenAttentionHeatmap({
  containerRef,
  attention,
  enabled = true,
}: UseRemoteTokenAttentionHeatmapParams) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const previouslyStyled = Array.from(
      container.querySelectorAll<HTMLElement>("[data-remote-attention='true']")
    );
    for (const element of previouslyStyled) {
      clearStyles(element);
    }

    if (!enabled || !attention) {
      return;
    }

    for (const [tokenId, stats] of Object.entries(attention.tokenStats)) {
      const element = container.querySelector<HTMLElement>(`[data-token-id='${tokenId}']`);
      if (!element) {
        continue;
      }

      applyHeatmapStyles(element, stats, tokenId === attention.currentTokenId);
    }

    return () => {
      for (const element of previouslyStyled) {
        clearStyles(element);
      }
    };
  }, [attention, containerRef, enabled]);
}
