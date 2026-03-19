"use client";

import { useEffect, useRef } from "react";

import { type ConnectionStats } from "@/lib/gaze-socket";
import { cn } from "@/lib/utils";
import { formatGazeTime, type GazePoint } from "@/modules/pages/gaze/lib/gaze-helpers";
import { useLiveGazeStream } from "@/modules/pages/gaze/lib/use-live-gaze-stream";

type StatusVariant = "none" | "compact" | "panel";

type LiveGazeOverlayProps = {
  statusVariant?: StatusVariant;
  hideMarkerWhenNoPoint?: boolean;
  markerClassName?: string;
  point?: GazePoint | null;
  connectionStats?: ConnectionStats | null;
  sampleRateHz?: number;
  hasRecentGaze?: boolean;
};

export function LiveGazeOverlay({
  statusVariant = "none",
  hideMarkerWhenNoPoint = false,
  markerClassName,
  point,
  connectionStats,
  sampleRateHz,
  hasRecentGaze,
}: LiveGazeOverlayProps) {
  const markerRef = useRef<HTMLDivElement>(null);
  const statusRef = useRef<HTMLSpanElement>(null);
  const rateRef = useRef<HTMLSpanElement>(null);
  const rttRef = useRef<HTMLSpanElement>(null);
  const serverTimeRef = useRef<HTMLSpanElement>(null);
  const lastPongRef = useRef<HTMLSpanElement>(null);

  const stream = useLiveGazeStream();
  const resolvedPoint = point === undefined ? stream.smoothedPoint : point;
  const resolvedStats = connectionStats === undefined ? stream.connectionStats : connectionStats;
  const resolvedSampleRateHz = sampleRateHz === undefined ? stream.sampleRateHz : sampleRateHz;
  const resolvedHasRecentGaze = hasRecentGaze === undefined ? stream.hasRecentGaze : hasRecentGaze;

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) {
      return;
    }

    if (resolvedPoint && resolvedHasRecentGaze) {
      marker.style.opacity = "1";
      marker.style.transform = `translate(-50%, -50%) translate(${resolvedPoint.x * 100}vw, ${resolvedPoint.y * 100}vh)`;
      return;
    }

    marker.style.opacity = hideMarkerWhenNoPoint ? "0" : "0.2";
  }, [hideMarkerWhenNoPoint, resolvedHasRecentGaze, resolvedPoint]);

  useEffect(() => {
    if (statusVariant === "none") {
      return;
    }

    if (statusRef.current) {
      statusRef.current.textContent = resolvedStats?.status ?? "connecting";
    }
    if (rttRef.current) {
      rttRef.current.textContent =
        resolvedStats?.lastRttMs === null || resolvedStats?.lastRttMs === undefined
          ? "-"
          : `${resolvedStats.lastRttMs} ms`;
    }
    if (serverTimeRef.current) {
      serverTimeRef.current.textContent = formatGazeTime(resolvedStats?.lastServerTimeUnixMs ?? null);
    }
    if (lastPongRef.current) {
      lastPongRef.current.textContent = formatGazeTime(resolvedStats?.lastPongAtUnixMs ?? null);
    }
    if (rateRef.current) {
      rateRef.current.textContent = `${resolvedSampleRateHz} Hz`;
    }
  }, [resolvedSampleRateHz, resolvedStats, statusVariant]);


  return (
    <>
      <div
        ref={markerRef}
        className={cn(
          "pointer-events-none fixed top-0 left-0 z-40 h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-cyan-300 bg-cyan-500/55 shadow-[0_0_32px_rgba(0,220,255,0.95)] transition-opacity",
          markerClassName
        )}
        aria-hidden="true"
      />

      {statusVariant === "compact" ? (
        <div className="pointer-events-none fixed top-4 right-4 z-30 rounded-full border border-cyan-400/30 bg-background/85 px-4 py-2 text-xs shadow-lg backdrop-blur">
          <div className="flex items-center gap-3 whitespace-nowrap">
            <p>
              eye <span ref={statusRef}>connecting</span>
            </p>
            <p>
              stream <span ref={rateRef}>0 Hz</span>
            </p>
            <p>
              RTT <span ref={rttRef}>-</span>
            </p>
          </div>
        </div>
      ) : null}

      {statusVariant === "panel" ? (
        <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 border-t border-white/15 bg-black/70 px-4 py-3 font-mono text-xs text-white backdrop-blur">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-5">
            <p>
              status: <span ref={statusRef}>connecting</span>
            </p>
            <p>
              stream: <span ref={rateRef}>0 Hz</span>
            </p>
            <p>
              last RTT: <span ref={rttRef}>-</span>
            </p>
            <p>
              server time: <span ref={serverTimeRef}>-</span>
            </p>
            <p>
              last pong: <span ref={lastPongRef}>-</span>
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
