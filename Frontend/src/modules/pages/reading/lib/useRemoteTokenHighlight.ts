"use client";

import { type RefObject, useEffect } from "react";

type UseRemoteTokenHighlightParams = {
  containerRef: RefObject<HTMLElement | null>;
  activeTokenId: string | null;
  enabled?: boolean;
};

const PRIMARY_TOKEN_STYLES: ReadonlyArray<readonly [string, string]> = [
  ["background-color", "rgba(96, 165, 250, 0.28)"],
  ["box-shadow", "0 0 0 1px rgba(96, 165, 250, 0.38)"],
];
const SECONDARY_TOKEN_STYLES: ReadonlyArray<readonly [string, string]> = [
  ["background-color", "rgba(147, 197, 253, 0.16)"],
];

function clearStyles(element: HTMLElement) {
  for (const [property] of PRIMARY_TOKEN_STYLES) {
    element.style.removeProperty(property);
  }

  for (const [property] of SECONDARY_TOKEN_STYLES) {
    element.style.removeProperty(property);
  }

  delete element.dataset.gazeActive;
  delete element.dataset.gazePhrase;
}

function applyStyles(
  element: HTMLElement,
  variant: "primary" | "secondary"
) {
  const styles = variant === "primary" ? PRIMARY_TOKEN_STYLES : SECONDARY_TOKEN_STYLES;

  for (const [property, value] of styles) {
    element.style.setProperty(property, value);
  }

  element.dataset.gazePhrase = variant;
  if (variant === "primary") {
    element.dataset.gazeActive = "true";
  }
}

export function useRemoteTokenHighlight({
  containerRef,
  activeTokenId,
  enabled = true,
}: UseRemoteTokenHighlightParams) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const allHighlighted = Array.from(
      container.querySelectorAll<HTMLElement>("[data-gaze-active], [data-gaze-phrase]")
    );
    for (const element of allHighlighted) {
      clearStyles(element);
    }

    if (!enabled || !activeTokenId) {
      return;
    }

    const tokens = Array.from(
      container.querySelectorAll<HTMLElement>("[data-token-id][data-token-kind='word']")
    );
    const activeIndex = tokens.findIndex((token) => token.dataset.tokenId === activeTokenId);
    if (activeIndex < 0) {
      return;
    }

    const activeToken = tokens[activeIndex];
    if (!activeToken) {
      return;
    }

    const activeTop = activeToken.getBoundingClientRect().top;
    const neighbours = [activeIndex - 1, activeIndex + 1]
      .map((index) => tokens[index] ?? null)
      .filter((token): token is HTMLElement => {
        if (!token) {
          return false;
        }

        return Math.abs(token.getBoundingClientRect().top - activeTop) < 14;
      });

    applyStyles(activeToken, "primary");
    for (const neighbour of neighbours) {
      applyStyles(neighbour, "secondary");
    }

    return () => {
      clearStyles(activeToken);
      for (const neighbour of neighbours) {
        clearStyles(neighbour);
      }
    };
  }, [activeTokenId, containerRef, enabled]);
}
