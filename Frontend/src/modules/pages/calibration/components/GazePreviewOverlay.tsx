"use client"

import { LiveGazeOverlay } from "@/modules/pages/gaze/components/LiveGazeOverlay"

export function GazePreviewOverlay() {
  return (
    <LiveGazeOverlay
      statusVariant="none"
      hideMarkerWhenNoPoint
      markerClassName="h-4 w-4 border-primary bg-primary/60 shadow-[0_0_22px_rgba(15,23,42,0.4)]"
    />
  )
}
