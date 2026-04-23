"use client"

import * as React from "react"
import Link from "next/link"
import { AlertCircle, CheckCircle2, ScanEye } from "lucide-react"

import type { CalibrationSessionSnapshot } from "@/lib/calibration"
import type { CalibrationSetupReadinessSnapshot, SensingMode } from "@/lib/experiment-session"
import {
  setStepThreeInternalCalibrationStatus,
  setStepThreeUseLocalCalibration,
  useAppDispatch,
  useAppSelector,
} from "@/redux"
import type { RootState } from "@/redux"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  formatCalibrationMetric,
  formatCalibrationQualityLabel,
  type CalibrationStepProps,
} from "./utils"

type AuthoritativeCalibrationStepProps = CalibrationStepProps & {
  setup: CalibrationSetupReadinessSnapshot
  calibration?: CalibrationSessionSnapshot
  sensingMode?: SensingMode
  returnToPath?: string
  isReadOnly?: boolean
}

const PARTICIPANT_CALIBRATION_RERUN_REQUEST_KEY = "participant-calibration-rerun-request"

export function CalibrationStep({
  setup,
  calibration,
  sensingMode = "eyeTracker",
  returnToPath = "/researcher/experiment",
  isReadOnly = false,
  onCompletionChange,
  onSubmitRequestChange,
  onSubmittingChange,
}: AuthoritativeCalibrationStepProps) {
  const dispatch = useAppDispatch()
  const stepThree = useAppSelector((state: RootState) => state.experiment.stepThree)

  const validationResult = calibration?.validation.result ?? null
  const validationCompletedAtUnixMs = calibration?.validation.completedAtUnixMs ?? null
  const overallQuality = validationResult?.quality ?? setup.validationQuality
  const overallSampleCount = validationResult?.sampleCount ?? setup.sampleCount
  const overallAccuracyDegrees =
    validationResult?.averageAccuracyDegrees ?? setup.averageAccuracyDegrees
  const overallPrecisionDegrees =
    validationResult?.averagePrecisionDegrees ?? setup.averagePrecisionDegrees
  const hasValidationPassed = validationResult?.passed !== false

  const isComplete = setup.isReady
  const isRunning =
    stepThree.internalCalibrationStatus === "running" ||
    setup.status === "running" ||
    setup.validationStatus === "running" ||
    calibration?.status === "running" ||
    calibration?.validation.status === "running"
  const hasFailed =
    stepThree.internalCalibrationStatus === "failed" ||
    (setup.hasCalibrationSession &&
      !setup.isReady &&
      setup.validationStatus === "completed" &&
      setup.isValidationPassed === false)
  const isStepComplete = isComplete
  const failureMessage =
    stepThree.lastCalibrationStatus ??
    calibration?.validation.result?.notes?.[0] ??
    setup.blockReason ??
    "The last attempt did not complete with acceptable validation quality."

  const isMouseMode = sensingMode === "mouse"
  const [requestMessage, setRequestMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    onCompletionChange?.(isStepComplete)
  }, [isStepComplete, onCompletionChange])

  React.useEffect(() => {
    onSubmitRequestChange?.(null)
    return () => onSubmitRequestChange?.(null)
  }, [onSubmitRequestChange])

  React.useEffect(() => {
    onSubmittingChange?.(false)
    return () => onSubmittingChange?.(false)
  }, [onSubmittingChange])

  const handleReset = () => {
    dispatch(setStepThreeInternalCalibrationStatus("pending"))
    dispatch(setStepThreeUseLocalCalibration(false))
  }

  const requestParticipantCalibrationRerun = React.useCallback(
    (kind: "validation" | "full") => {
      if (typeof window === "undefined") {
        return
      }

      const token = `${Date.now()}:${kind}`
      window.localStorage.setItem(PARTICIPANT_CALIBRATION_RERUN_REQUEST_KEY, token)
      setRequestMessage(
        kind === "validation"
          ? "Validation rerun requested. Participant view has been notified."
          : "Full calibration rerun requested. Participant view has been notified."
      )
    },
    []
  )

  if (isMouseMode) {
    return (
      <Card className="overflow-hidden rounded-[2rem] border bg-card shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <CardHeader className="border-b pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Step 4</Badge>
            <Badge variant="outline">Participant</Badge>
            <Badge variant="outline">Mouse mode</Badge>
          </div>
          <CardTitle className="mt-3 text-3xl tracking-tight">
            Calibration is skipped in mouse mode.
          </CardTitle>
          <CardDescription className="max-w-3xl text-base leading-7">
            The participant mouse position will be used as the gaze source for this demo session.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-8">
          <div className="flex items-start gap-3 rounded-[1.5rem] border bg-muted/20 p-4">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Ready for mouse input</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                No Tobii calibration or validation is required while mouse mode is active.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden rounded-[2rem] border-slate-200/80 bg-card shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
      <CardHeader className="border-b pb-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">Step 4</Badge>
          <Badge variant="outline">Participant</Badge>
          <Badge variant="outline">Calibration</Badge>
          {isReadOnly ? <Badge variant="outline">Read only</Badge> : null}
        </div>
        <CardTitle className="mt-3 text-3xl tracking-tight">
          Run the Tobii calibration and validation.
        </CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">
          {isReadOnly
            ? "Calibration can only be completed from the participant view."
            : "Open the calibration page, complete the calibration, and come back here when it is done."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-8">
        {isReadOnly ? (
          <div className="rounded-[1.75rem] border bg-muted/20 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-base font-semibold">Participant-owned step</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  The participant completes calibration from the participant view. Status updates
                  will appear here automatically.
                </p>
              </div>
            </div>
            {requestMessage ? (
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{requestMessage}</p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-[1.75rem] border bg-muted/20 p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-base font-semibold">Launch the calibration screen.</p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Guide the participant through the calibration and return when it has passed.
                </p>
              </div>
              <Button asChild>
                <Link href={`/calibration?returnTo=${encodeURIComponent(returnToPath)}`}>
                  <ScanEye className="h-4 w-4" />
                  {isComplete ? "Run again" : "Open calibration"}
                </Link>
              </Button>
            </div>
          </div>
        )}

        {setup.isReady ? (
          <div className="rounded-[1.5rem] border border-emerald-400/30 bg-emerald-500/5 p-5 text-emerald-900 dark:text-emerald-100">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold">Calibration applied</p>
                  {isReadOnly ? (
                    <Badge variant={hasValidationPassed ? "secondary" : "destructive"}>
                      {hasValidationPassed ? "Validation passed" : "Validation failed"}
                    </Badge>
                  ) : null}
                </div>
                {isReadOnly ? (
                  <p className="mt-2 text-sm leading-6 opacity-80">
                    The selected eye tracker has an active validated calibration with{" "}
                    {formatCalibrationQualityLabel(overallQuality).toLowerCase()} and{" "}
                    {overallSampleCount} validation samples.
                  </p>
                ) : (
                  <p className="mt-1 text-sm leading-6 opacity-80">
                    Calibration and validation are complete. Please return control to the researcher.
                  </p>
                )}
              </div>
            </div>

            {isReadOnly ? (
              <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-xl border border-emerald-500/30 bg-white/70 px-4 py-3 text-emerald-950">
                  <p className="text-[11px] uppercase tracking-[0.14em] opacity-70">
                    Average accuracy
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {formatCalibrationMetric(overallAccuracyDegrees)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-white/70 px-4 py-3 text-emerald-950">
                  <p className="text-[11px] uppercase tracking-[0.14em] opacity-70">
                    Average precision
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {formatCalibrationMetric(overallPrecisionDegrees)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-white/70 px-4 py-3 text-emerald-950">
                  <p className="text-[11px] uppercase tracking-[0.14em] opacity-70">Completed</p>
                  <p className="mt-1 text-base font-semibold">
                    {validationCompletedAtUnixMs
                      ? new Date(validationCompletedAtUnixMs).toLocaleString()
                      : "Not available"}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-500/30 bg-white/70 px-4 py-3 text-emerald-950">
                  <p className="text-[11px] uppercase tracking-[0.14em] opacity-70">
                    Validation quality
                  </p>
                  <p className="mt-1 text-base font-semibold">
                    {formatCalibrationQualityLabel(overallQuality)}
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {isReadOnly && validationResult?.points?.length ? (
          <div className="rounded-[1.5rem] border border-emerald-400/30 bg-emerald-500/5 p-5 text-emerald-900 dark:text-emerald-100">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-base font-semibold">Point-by-point review</p>
                <p className="mt-1 text-sm leading-6 opacity-80">
                  Review each calibration point before deciding if a rerun is needed.
                </p>
              </div>
              <Badge variant="outline" className="bg-white/70 text-emerald-950">
                Samples: {overallSampleCount ?? validationResult.sampleCount}
              </Badge>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {validationResult.points.map((point) => (
                <div
                  key={point.pointId}
                  className="rounded-xl border border-emerald-500/30 bg-white/80 px-4 py-3 text-emerald-950"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold">{point.label}</p>
                    <Badge variant="outline" className="bg-emerald-100/70 text-emerald-900">
                      {formatCalibrationQualityLabel(point.quality)}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs opacity-75">
                    ({point.x.toFixed(2)}, {point.y.toFixed(2)}) · {point.sampleCount} samples
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] opacity-70">Accuracy</p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatCalibrationMetric(point.averageAccuracyDegrees)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.12em] opacity-70">Precision</p>
                      <p className="mt-1 text-sm font-semibold">
                        {formatCalibrationMetric(point.averagePrecisionDegrees)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => requestParticipantCalibrationRerun("validation")}
              >
                Run validation again
              </Button>
              <Button
                variant="outline"
                onClick={() => requestParticipantCalibrationRerun("full")}
              >
                Run full calibration again
              </Button>
            </div>

            {requestMessage ? (
              <p className="mt-3 text-sm leading-6 opacity-80">{requestMessage}</p>
            ) : null}
          </div>
        ) : null}

        {isRunning ? (
          <div className="flex items-start gap-3 rounded-[1.5rem] border border-sky-400/30 bg-sky-500/5 p-4 text-sky-950">
            <ScanEye className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Calibration in progress</p>
              <p className="mt-1 text-sm leading-6 opacity-80">
                Keep the participant on the calibration screen until both calibration and validation
                finish.
              </p>
            </div>
          </div>
        ) : null}

        {!setup.isReady ? (
          <div className="flex items-start gap-3 rounded-[1.5rem] border border-slate-300/70 bg-slate-50 p-4 text-slate-900">
            <ScanEye className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Calibration required</p>
              <p className="mt-1 text-sm leading-6 opacity-80">
                {setup.blockReason ??
                  "Run calibration and validation once before the backend will allow the session to start."}
              </p>
            </div>
          </div>
        ) : null}

        {hasFailed ? (
          <div className="flex items-start gap-3 rounded-[1.5rem] border border-amber-400/30 bg-amber-500/5 p-4 text-amber-950">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Calibration needs to be rerun</p>
              <p className="mt-1 text-sm leading-6 opacity-80">{failureMessage}</p>
            </div>
            {!isReadOnly ? (
              <Button variant="outline" onClick={handleReset}>
                Clear state
              </Button>
            ) : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
