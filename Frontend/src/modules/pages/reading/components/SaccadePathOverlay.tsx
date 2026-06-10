"use client";

import { useEffect, useId, useRef, useState } from "react";

export type SaccadeOverlaySegment = {
  id: string;
  fromTokenId: string | null;
  toTokenId: string | null;
  isRegression: boolean;
};

type MeasuredPath = {
  id: string;
  d: string;
  isRegression: boolean;
  /** 1 = most recent segment, fades towards 0 for older ones. */
  recency: number;
};

type SaccadePathOverlayProps = {
  /** Segments ordered newest first; only the most recent ones are drawn. */
  segments: SaccadeOverlaySegment[];
  /** Changes when pagination or typography shifts token positions. */
  remeasureKey?: string;
  maxPaths?: number;
};

const DEFAULT_MAX_PATHS = 10;

export function toSaccadeOverlaySegments(
  saccades: ReadonlyArray<{
    fromTokenId: string | null;
    toTokenId: string | null;
    isRegression: boolean;
    endedAtUnixMs: number;
  }>
): SaccadeOverlaySegment[] {
  return saccades.map((saccade) => ({
    id: `${saccade.fromTokenId ?? "?"}->${saccade.toTokenId ?? "?"}@${saccade.endedAtUnixMs}`,
    fromTokenId: saccade.fromTokenId,
    toTokenId: saccade.toTokenId,
    isRegression: saccade.isRegression,
  }));
}

function escapeAttributeValue(value: string) {
  if (typeof CSS !== "undefined" && typeof CSS.escape === "function") {
    return CSS.escape(value);
  }
  return value.replace(/"/g, '\\"');
}

function buildCurve(x1: number, y1: number, x2: number, y2: number) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  if (distance < 1) {
    return null;
  }

  // Bow the curve away from the text line so the path stays readable.
  const bow = Math.min(Math.max(distance * 0.18, 10), 34);
  let normalX = dy / distance;
  let normalY = -dx / distance;
  if (normalY > 0) {
    normalX = -normalX;
    normalY = -normalY;
  }

  const controlX = (x1 + x2) / 2 + normalX * bow;
  const controlY = (y1 + y2) / 2 + normalY * bow;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

export function SaccadePathOverlay({
  segments,
  remeasureKey,
  maxPaths = DEFAULT_MAX_PATHS,
}: SaccadePathOverlayProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const markerScope = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const [paths, setPaths] = useState<MeasuredPath[]>([]);
  const [canvasSize, setCanvasSize] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    const content = host?.parentElement;
    if (!host || !content) {
      return;
    }

    let frame = 0;

    const measure = () => {
      frame = 0;
      const contentRect = content.getBoundingClientRect();
      if (contentRect.width <= 0 || contentRect.height <= 0) {
        setPaths([]);
        return;
      }

      // The mirror renders the reader inside a CSS scale transform; convert
      // viewport rects back into the content's local coordinate space.
      const scale = contentRect.width / Math.max(content.offsetWidth, 1);
      const visible = segments.slice(0, maxPaths);
      const measured: MeasuredPath[] = [];

      for (let index = 0; index < visible.length; index += 1) {
        const segment = visible[index]!;
        if (!segment.fromTokenId || !segment.toTokenId) {
          continue;
        }

        const fromElement = content.querySelector<HTMLElement>(
          `[data-token-id="${escapeAttributeValue(segment.fromTokenId)}"]`
        );
        const toElement = content.querySelector<HTMLElement>(
          `[data-token-id="${escapeAttributeValue(segment.toTokenId)}"]`
        );
        if (!fromElement || !toElement) {
          continue;
        }

        const fromRect = fromElement.getBoundingClientRect();
        const toRect = toElement.getBoundingClientRect();
        if (fromRect.width <= 0 || fromRect.height <= 0 || toRect.width <= 0 || toRect.height <= 0) {
          continue;
        }

        const d = buildCurve(
          (fromRect.left + fromRect.width / 2 - contentRect.left) / scale,
          (fromRect.top + fromRect.height / 2 - contentRect.top) / scale,
          (toRect.left + toRect.width / 2 - contentRect.left) / scale,
          (toRect.top + toRect.height / 2 - contentRect.top) / scale
        );
        if (!d) {
          continue;
        }

        measured.push({
          id: segment.id,
          d,
          isRegression: segment.isRegression,
          recency: visible.length <= 1 ? 1 : 1 - index / (visible.length - 1) * 0.75,
        });
      }

      setCanvasSize({
        width: Math.max(content.offsetWidth, 1),
        height: Math.max(content.scrollHeight, content.offsetHeight, 1),
      });
      setPaths(measured);
    };

    const scheduleMeasure = () => {
      if (frame) {
        return;
      }
      frame = window.requestAnimationFrame(measure);
    };

    scheduleMeasure();

    const resizeObserver = new ResizeObserver(scheduleMeasure);
    resizeObserver.observe(content);

    return () => {
      resizeObserver.disconnect();
      if (frame) {
        window.cancelAnimationFrame(frame);
      }
    };
  }, [segments, remeasureKey, maxPaths]);

  const forwardMarkerId = `saccade-arrow-${markerScope}`;
  const regressionMarkerId = `regression-arrow-${markerScope}`;

  return (
    <div ref={hostRef} aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      {paths.length > 0 && canvasSize ? (
        <svg
          width={canvasSize.width}
          height={canvasSize.height}
          viewBox={`0 0 ${canvasSize.width} ${canvasSize.height}`}
          className="absolute left-0 top-0 overflow-visible"
        >
          <defs>
            <marker
              id={forwardMarkerId}
              viewBox="0 0 8 8"
              refX="6.5"
              refY="4"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0.6 L 7.4 4 L 0 7.4 Z" fill="rgb(14, 165, 233)" />
            </marker>
            <marker
              id={regressionMarkerId}
              viewBox="0 0 8 8"
              refX="6.5"
              refY="4"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0.6 L 7.4 4 L 0 7.4 Z" fill="rgb(225, 29, 72)" />
            </marker>
          </defs>
          {[...paths].reverse().map((path) => (
            <path
              key={path.id}
              d={path.d}
              fill="none"
              stroke={path.isRegression ? "rgb(225, 29, 72)" : "rgb(14, 165, 233)"}
              strokeWidth={path.isRegression ? 2.1 : 1.5}
              strokeLinecap="round"
              opacity={0.25 + path.recency * 0.6}
              markerEnd={`url(#${path.isRegression ? regressionMarkerId : forwardMarkerId})`}
            />
          ))}
        </svg>
      ) : null}
    </div>
  );
}
