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
  formatCalibrationQualityLabel,
  type CalibrationStepProps,
} from "./utils"

type AuthoritativeCalibrationStepProps = CalibrationStepProps & {
  setup: CalibrationSetupReadinessSnapshot
  calibration?: CalibrationSessionSnapshot
  sensingMode?: SensingMode
}

export function CalibrationStep({
  setup,
  calibration,
  sensingMode = "eyeTracker",
  onCompletionChange,
  onSubmitRequestChange,
  onSubmittingChange,
}: AuthoritativeCalibrationStepProps) {
  const dispatch = useAppDispatch()
  const stepThree = useAppSelector((state: RootState) => state.experiment.stepThree)

  const isComplete = setup.isReady
  const isRunning = stepThree.internalCalibrationStatus === "running"
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

  if (isMouseMode) {
    return (
      <Card className="overflow-hidden rounded-[2rem] border bg-card shadow-[0_24px_80px_rgba(15,23,42,0.08)]">
        <CardHeader className="border-b pb-8">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Step 3</Badge>
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
          <Badge variant="secondary">Step 3</Badge>
          <Badge variant="outline">Calibration</Badge>
        </div>
        <CardTitle className="mt-3 text-3xl tracking-tight">
          Run the Tobii calibration and validation.
        </CardTitle>
        <CardDescription className="max-w-3xl text-base leading-7">
          Open the calibration page, complete the calibration, and come back here when it is done.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6 pt-8">
        <div className="rounded-[1.75rem] border bg-muted/20 p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-base font-semibold">Launch the calibration screen.</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Guide the participant through the calibration and return when it has passed.
              </p>
            </div>
            <Button asChild>
              <Link href="/calibration">
                <ScanEye className="h-4 w-4" />
                {isComplete ? "Run again" : "Open calibration"}
              </Link>
            </Button>
          </div>
        </div>

        {setup.isReady ? (
          <div className="flex items-start gap-3 rounded-[1.5rem] border border-emerald-400/30 bg-emerald-500/5 p-4 text-emerald-900 dark:text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-semibold">Calibration applied</p>
              <p className="mt-1 text-sm leading-6 opacity-80">
                The selected eye tracker has an active validated calibration with{" "}
                {formatCalibrationQualityLabel(setup.validationQuality).toLowerCase()} and{" "}
                {setup.sampleCount} validation samples.
              </p>
            </div>
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
              <p className="mt-1 text-sm leading-6 opacity-80">
                {failureMessage}
              </p>
            </div>
            <Button variant="outline" onClick={handleReset}>
              Clear state
            </Button>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
