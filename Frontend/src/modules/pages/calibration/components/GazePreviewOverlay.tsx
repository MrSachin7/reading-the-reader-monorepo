"use client"

import { LiveGazeOverlay } from "@/modules/pages/gaze/components/LiveGazeOverlay"
import { useLiveGazeStream } from "@/modules/pages/gaze/lib/use-live-gaze-stream"

export function GazePreviewOverlay() {
  const { smoothedPoint, connectionStats, sampleRateHz, hasRecentGaze } = useLiveGazeStream({
    applyLocalCalibration: false,
  })

  return (
    <LiveGazeOverlay
      statusVariant="none"
      hideMarkerWhenNoPoint
      point={smoothedPoint}
      connectionStats={connectionStats}
      sampleRateHz={sampleRateHz}
      hasRecentGaze={hasRecentGaze}
      markerClassName="h-4 w-4 border-primary bg-primary/60 shadow-[0_0_22px_rgba(15,23,42,0.4)]"
    />
  )
}
