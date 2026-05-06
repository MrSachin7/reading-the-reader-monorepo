"use client"

import { AlertTriangle, ShieldCheck } from "lucide-react"

import type { CalibrationValidationPointResult } from "@/lib/calibration"
import { Button } from "@/components/ui/button"
import {
  formatDegrees,
  formatTime,
  qualityStyles,
  titleCase,
} from "@/modules/pages/calibration/lib/calibration-page-utils"

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string
  value: string
  helper?: string
}) {
  return (
    <div className="rounded-[1.25rem] border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  )
}

type ReviewResult = {
  passed: boolean
  quality: string | null
  averageAccuracyDegrees: number | null
  averagePrecisionDegrees: number | null
  sampleCount: number
  points: CalibrationValidationPointResult[]
}

export function CalibrationReviewPanel({
  validationResult,
  completedAtUnixMs,
  onReturnToWorkflow,
  onRerunValidation,
  onStartRun,
}: {
  validationResult: ReviewResult | null
  completedAtUnixMs: number | null
  onReturnToWorkflow: () => void
  onRerunValidation: () => void
  onStartRun: () => void
}) {
  const validationQualityStyles = qualityStyles(validationResult?.quality)

  return (
    <div
      className={`absolute top-1/2 left-1/2 z-20 w-[min(94vw,980px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] ${validationQualityStyles.border}`}
    >
      <div className="flex items-start gap-4">
        {validationResult?.passed ? (
          <ShieldCheck className="mt-1 h-8 w-8 shrink-0 text-primary" />
        ) : (
          <AlertTriangle className="mt-1 h-8 w-8 shrink-0 text-destructive" />
        )}
        <div className="min-w-0">
          <p className={`text-sm uppercase tracking-[0.22em] ${validationQualityStyles.badge}`}>
            {validationResult?.passed ? "Validation passed" : "Validation review needed"}
          </p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">
            {validationResult?.passed
              ? "Calibration is ready for session start."
              : "Validation shows unreliable gaze mapping."}
          </h2>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {validationResult?.passed
              ? "The calibration was applied on the eye tracker and the validation metrics are within the accepted range."
              : "The calibration was applied on the eye tracker, but the validation metrics are below the threshold required to continue."}
          </p>
        </div>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Quality"
          value={titleCase(validationResult?.quality)}
          helper="Derived from overall accuracy and precision"
        />
        <MetricCard
          label="Accuracy"
          value={formatDegrees(validationResult?.averageAccuracyDegrees)}
          helper="Lower is better"
        />
        <MetricCard
          label="Precision"
          value={formatDegrees(validationResult?.averagePrecisionDegrees)}
          helper="Lower is better"
        />
        <MetricCard
          label="Completed"
          value={formatTime(completedAtUnixMs)}
          helper="Validation timestamp"
        />
      </div>

      <div className="mt-6 rounded-[1.5rem] border bg-slate-50/80 p-5">
        <div className="mb-4 rounded-[1.25rem] border border-slate-200 bg-white/80 p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Next in setup workflow</p>
          <p className="mt-2 text-sm font-semibold text-slate-950">
            {validationResult?.passed
              ? "Return to the experiment setup to confirm calibration is ready and finish the remaining steps."
              : "Return to the experiment setup or rerun this step. Session start stays blocked until validation passes."}
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold">Point-by-point review</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Each point summarizes the captured eye samples used to estimate gaze accuracy and precision.
            </p>
          </div>
          <p className="text-sm text-slate-500">
            Samples: <span className="font-semibold text-slate-900">{validationResult?.sampleCount ?? 0}</span>
          </p>
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(validationResult?.points ?? []).map((point) => {
            const pointQuality = qualityStyles(point.quality)
            return (
              <div
                key={point.pointId}
                className={`rounded-[1.25rem] border p-4 ${pointQuality.border} ${pointQuality.background}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{point.label}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {point.x.toFixed(2)}, {point.y.toFixed(2)}
                    </p>
                  </div>
                  <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${pointQuality.badge}`}>
                    {titleCase(point.quality)}
                  </p>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Accuracy</p>
                    <p className="mt-1 font-semibold">{formatDegrees(point.averageAccuracyDegrees)}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Precision</p>
                    <p className="mt-1 font-semibold">{formatDegrees(point.averagePrecisionDegrees)}</p>
                  </div>
                </div>
                <p className="mt-3 text-xs text-slate-500">Samples: {point.sampleCount}</p>
                {point.notes.length > 0 ? (
                  <p className="mt-2 text-xs leading-5 text-slate-500">{point.notes[0]}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={onReturnToWorkflow}>
          {validationResult?.passed ? "Return to setup workflow" : "Return with blocker"}
        </Button>
        {!validationResult?.passed ? (
          <Button variant="outline" onClick={onRerunValidation}>
            Run validation again
          </Button>
        ) : null}
        <Button variant="outline" onClick={onStartRun}>
          Run full calibration again
        </Button>
        {validationResult?.passed ? (
          <Button variant="outline" onClick={onRerunValidation}>
            Run validation again
          </Button>
        ) : null}
      </div>
    </div>
  )
}
