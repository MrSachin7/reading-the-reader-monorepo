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
  contentRef?: RefObject<HTMLElement | null>;
  attention: RemoteTokenAttentionSnapshot | null;
  /** Tokens the reader regressed back to; marked as likely trouble spots. */
  regressionTargetTokenIds?: ReadonlySet<string> | null;
  enabled?: boolean;
  /** Changes when the rendered token set or layout changes, forcing a re-apply. */
  applyKey?: string;
};

const MIN_FIXATION_HEAT_MS = 110;

// A typical reading fixation is ~180-250 ms; dwell only becomes a struggle
// signal relative to how this particular reader normally moves through text.
const BASELINE_FLOOR_MS = 260;
const ELEVATED_DWELL_RATIO = 1.6;
const STRUGGLE_DWELL_RATIO = 3;
const STRUGGLE_SINGLE_FIXATION_MS = 700;

type AttentionTier = "skim" | "read" | "elevated" | "struggle";

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function clearStyles(element: HTMLElement) {
  element.style.removeProperty("background-color");
  element.style.removeProperty("background-image");
  element.style.removeProperty("outline");
  element.style.removeProperty("outline-offset");
  element.style.removeProperty("box-shadow");
  element.style.removeProperty("text-decoration");
  element.style.removeProperty("text-decoration-thickness");
  element.style.removeProperty("text-underline-offset");
  element.style.removeProperty("border-radius");
  delete element.dataset.remoteAttention;
}

function classifyTier(stats: RemoteTokenAttentionStats, baselineMs: number): AttentionTier | null {
  if (stats.fixationMs >= MIN_FIXATION_HEAT_MS) {
    const dwellRatio = stats.fixationMs / baselineMs;
    if (
      dwellRatio >= STRUGGLE_DWELL_RATIO ||
      stats.fixationCount >= 3 ||
      stats.maxFixationMs >= STRUGGLE_SINGLE_FIXATION_MS
    ) {
      return "struggle";
    }

    if (dwellRatio >= ELEVATED_DWELL_RATIO || stats.fixationCount === 2) {
      return "elevated";
    }

    return "read";
  }

  return stats.skimCount > 0 ? "skim" : null;
}

function applyHeatmapStyles(
  element: HTMLElement,
  stats: RemoteTokenAttentionStats,
  tier: AttentionTier,
  baselineMs: number,
  isCurrentToken: boolean,
  isRegressionTarget: boolean
) {
  const dwellRatio = stats.fixationMs / baselineMs;

  if (tier === "skim") {
    // Glanced at but never settled on: a faint cool underline.
    element.style.setProperty(
      "box-shadow",
      `inset 0 -0.18em 0 rgba(96, 165, 250, ${clamp(0.3 + stats.skimCount * 0.08, 0.3, 0.55)})`
    );
  } else if (tier === "read") {
    // Read at a normal pace: stay quiet so struggle can stand out.
    element.style.setProperty("box-shadow", "inset 0 -0.16em 0 rgba(251, 191, 36, 0.4)");
  } else if (tier === "elevated") {
    const t = clamp((dwellRatio - ELEVATED_DWELL_RATIO) / (STRUGGLE_DWELL_RATIO - ELEVATED_DWELL_RATIO), 0, 1);
    element.style.setProperty("background-color", `rgba(253, 186, 116, ${0.3 + t * 0.18})`);
    element.style.setProperty("border-radius", "0.3em");
    element.style.setProperty(
      "box-shadow",
      `inset 0 0 0 1px rgba(234, 88, 12, ${0.22 + t * 0.16}), inset 0 -0.16em 0 rgba(234, 88, 12, ${0.3 + t * 0.2})`
    );
  } else {
    const s = clamp((dwellRatio - STRUGGLE_DWELL_RATIO) / STRUGGLE_DWELL_RATIO, 0, 1);
    element.style.setProperty(
      "background-image",
      `linear-gradient(180deg, rgba(251, 146, 60, ${0.4 + s * 0.18}) 0%, rgba(239, 68, 68, ${0.42 + s * 0.26}) 100%)`
    );
    element.style.setProperty("border-radius", "0.3em");
    element.style.setProperty(
      "box-shadow",
      `inset 0 0 0 1px rgba(185, 28, 28, ${0.4 + s * 0.25}), inset 0 -0.18em 0 rgba(153, 27, 27, ${0.45 + s * 0.25})`
    );
  }

  if (isRegressionTarget) {
    element.style.setProperty("text-decoration", "underline wavy rgba(225, 29, 72, 0.8)");
    element.style.setProperty("text-decoration-thickness", "1.5px");
    element.style.setProperty("text-underline-offset", "0.22em");
  }

  if (isCurrentToken) {
    element.style.setProperty("outline", "1px solid rgba(194, 65, 12, 0.48)");
    element.style.setProperty("outline-offset", "1px");
  }

  element.dataset.remoteAttention = "true";
}

function computeBaselineDwellMs(attention: RemoteTokenAttentionSnapshot) {
  const dwells = Object.values(attention.tokenStats)
    .map((stats) => stats.fixationMs)
    .filter((ms) => ms >= MIN_FIXATION_HEAT_MS)
    .sort((a, b) => a - b);

  if (dwells.length === 0) {
    return BASELINE_FLOOR_MS;
  }

  const median = dwells[Math.floor(dwells.length / 2)]!;
  return Math.max(median, BASELINE_FLOOR_MS);
}

export function useRemoteTokenAttentionHeatmap({
  containerRef,
  contentRef,
  attention,
  regressionTargetTokenIds = null,
  enabled = true,
  applyKey,
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

    const contentRoot =
      contentRef?.current ??
      container.querySelector<HTMLElement>("[data-reader-content='true']") ??
      container;

    const baselineMs = computeBaselineDwellMs(attention);
    const styledTokenIds = new Set<string>();

    for (const [tokenId, stats] of Object.entries(attention.tokenStats)) {
      const tier = classifyTier(stats, baselineMs);
      if (!tier) {
        continue;
      }

      const element = contentRoot.querySelector<HTMLElement>(`[data-token-id='${tokenId}']`);
      if (!element) {
        continue;
      }

      applyHeatmapStyles(
        element,
        stats,
        tier,
        baselineMs,
        tokenId === attention.currentTokenId,
        regressionTargetTokenIds?.has(tokenId) ?? false
      );
      styledTokenIds.add(tokenId);
    }

    // Regression targets that have no dwell stats yet still deserve the marker.
    if (regressionTargetTokenIds) {
      for (const tokenId of regressionTargetTokenIds) {
        if (styledTokenIds.has(tokenId)) {
          continue;
        }

        const element = contentRoot.querySelector<HTMLElement>(`[data-token-id='${tokenId}']`);
        if (!element) {
          continue;
        }

        element.style.setProperty("text-decoration", "underline wavy rgba(225, 29, 72, 0.8)");
        element.style.setProperty("text-decoration-thickness", "1.5px");
        element.style.setProperty("text-underline-offset", "0.22em");
        element.dataset.remoteAttention = "true";
      }
    }

    return () => {
      const styled = Array.from(
        container.querySelectorAll<HTMLElement>("[data-remote-attention='true']")
      );
      for (const element of styled) {
        clearStyles(element);
      }
    };
  }, [attention, containerRef, contentRef, enabled, applyKey, regressionTargetTokenIds]);
}
