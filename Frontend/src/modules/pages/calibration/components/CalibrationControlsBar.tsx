"use client"

import { LoaderCircle, RotateCcw, ScanEye } from "lucide-react"

import { Button } from "@/components/ui/button"
import type { CalibrationPhase } from "@/modules/pages/calibration/lib/calibration-page-utils"

export function CalibrationControlsBar({
  phase,
  pointProgress,
  isStartingCalibration,
  isFinishingCalibration,
  isFinishingValidation,
  onStart,
  onReset,
}: {
  phase: CalibrationPhase
  pointProgress: string
  isStartingCalibration: boolean
  isFinishingCalibration: boolean
  isFinishingValidation: boolean
  onStart: () => void
  onReset: () => void
}) {
  return (
    <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-full border border-slate-900/10 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
      <p className="px-2 text-sm text-slate-600">
        {phase === "ready"
          ? "Start when the participant is ready."
          : phase === "calibrating"
            ? `Calibration ${pointProgress}`
            : `Validation ${pointProgress}`}
      </p>
      {phase === "ready" ? (
        <Button disabled={isStartingCalibration} onClick={onStart}>
          {isStartingCalibration ? (
            <>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Starting
            </>
          ) : (
            <>
              <ScanEye className="h-4 w-4" />
              Start calibration
            </>
          )}
        </Button>
      ) : (
        <Button variant="outline" disabled={isFinishingCalibration || isFinishingValidation}>
          <LoaderCircle className="h-4 w-4 animate-spin" />
          {phase === "calibrating" ? "Calibrating" : "Validating"}
        </Button>
      )}
      <Button variant="outline" onClick={onReset}>
        <RotateCcw className="h-4 w-4" />
        Reset
      </Button>
    </div>
  )
}
