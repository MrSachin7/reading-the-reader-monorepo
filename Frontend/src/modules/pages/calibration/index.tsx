"use client"

import * as React from "react"
import Link from "next/link"
import {
  AlertTriangle,
  ArrowLeft,
  LoaderCircle,
  RotateCcw,
  ScanEye,
  ShieldCheck,
  XCircle,
} from "lucide-react"
import { useRouter } from "next/navigation"

import type {
  CalibrationSessionSnapshot,
  CalibrationValidationPointResult,
  CalibrationValidationPointState,
} from "@/lib/calibration"
import { getErrorMessage } from "@/lib/error-utils"
import { stopGazeSocket, subscribeToCalibrationState } from "@/lib/gaze-socket"
import { Button } from "@/components/ui/button"
import { LiveGazeOverlay } from "@/modules/pages/gaze/components/LiveGazeOverlay"
import { useLiveGazeStream } from "@/modules/pages/gaze/lib/use-live-gaze-stream"
import {
  setStepThreeCalibrationSkipped,
  setStepThreeExternalCalibrationCompleted,
  setStepThreeInternalCalibrationStatus,
  setStepThreeLastAppliedAtUnixMs,
  setStepThreeLastCalibrationSessionId,
  setStepThreeLastCalibrationStatus,
  setStepThreeLastQuality,
  setStepThreeUseLocalCalibration,
  useAppDispatch,
  useCancelCalibrationMutation,
  useCollectCalibrationPointMutation,
  useCollectValidationPointMutation,
  useFinishCalibrationMutation,
  useFinishValidationMutation,
  useGetCalibrationStateQuery,
  useStartCalibrationMutation,
  useStartValidationMutation,
} from "@/redux"
import { CalibrationTarget, type CalibrationTargetPhase } from "./calibration-target"

const TARGET_MOVE_MS = 950
const TARGET_SETTLE_MS = 700
const TARGET_BURST_MS = 360
const GAZE_TEARDOWN_MS = 180

type CalibrationPhase = "ready" | "calibrating" | "validating" | "review" | "failure"

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function formatTime(unixMs: number | null) {
  if (!unixMs) {
    return "-"
  }

  return new Date(unixMs).toLocaleTimeString()
}

function formatDegrees(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "-"
  }

  return `${value.toFixed(2)}°`
}

function titleCase(value: string | null | undefined) {
  if (!value) {
    return "Unknown"
  }

  return value.charAt(0).toUpperCase() + value.slice(1)
}

function qualityStyles(quality: string | null | undefined) {
  if (quality === "good") {
    return {
      badge: "text-emerald-700",
      border: "border-emerald-400/30",
      background: "bg-emerald-500/5",
    }
  }

  if (quality === "fair") {
    return {
      badge: "text-amber-700",
      border: "border-amber-400/30",
      background: "bg-amber-500/5",
    }
  }

  return {
    badge: "text-rose-700",
    border: "border-rose-400/30",
    background: "bg-rose-500/5",
  }
}

function GazePreviewOverlay() {
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
      markerClassName="h-4 w-4 border-blue-400 bg-blue-500/60 shadow-[0_0_22px_rgba(96,165,250,0.68)]"
    />
  )
}

export default function CalibrationPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [phase, setPhase] = React.useState<CalibrationPhase>("ready")
  const [activePointIndex, setActivePointIndex] = React.useState(0)
  const [targetPhase, setTargetPhase] = React.useState<CalibrationTargetPhase>("move")
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(true)
  const [statusMessage, setStatusMessage] = React.useState(
    "The participant should look at the center of each point. Full screen is entered automatically when calibration starts."
  )
  const [snapshot, setSnapshot] = React.useState<CalibrationSessionSnapshot | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)
  const [showPreviewOverlay, setShowPreviewOverlay] = React.useState(true)
  const runTokenRef = React.useRef(0)
  const phaseRef = React.useRef<CalibrationPhase>("ready")

  const { data: currentCalibration } = useGetCalibrationStateQuery()
  const [startCalibration, { isLoading: isStartingCalibration }] = useStartCalibrationMutation()
  const [collectCalibrationPoint] = useCollectCalibrationPointMutation()
  const [finishCalibration, { isLoading: isFinishingCalibration }] = useFinishCalibrationMutation()
  const [startValidation] = useStartValidationMutation()
  const [collectValidationPoint] = useCollectValidationPointMutation()
  const [finishValidation, { isLoading: isFinishingValidation }] = useFinishValidationMutation()
  const [cancelCalibration] = useCancelCalibrationMutation()

  const calibrationPoints = snapshot?.points ?? currentCalibration?.points ?? []
  const validationPoints = snapshot?.validation.points ?? currentCalibration?.validation.points ?? []
  const activePoints =
    phase === "validating"
      ? validationPoints
      : calibrationPoints
  const activeTarget = activePoints[activePointIndex] ?? null
  const pointProgress = activePoints.length
    ? `${activePoints.filter((point) => point.status === "collected").length} / ${activePoints.length}`
    : "0 / 0"
  const validationResult = snapshot?.validation.result ?? null
  const validationQuality = validationResult?.quality ?? null
  const validationQualityStyles = qualityStyles(validationQuality)

  const requestFullscreen = React.useCallback(async () => {
    if (document.fullscreenElement) {
      setIsFullscreen(true)
      return true
    }

    try {
      await document.documentElement.requestFullscreen()
      setIsFullscreen(true)
      return true
    } catch {
      setStatusMessage("The browser blocked full screen. Start calibration again and allow full screen.")
      return false
    }
  }, [])

  React.useEffect(() => {
    setIsFullscreen(Boolean(document.fullscreenElement))
    setIsVisible(document.visibilityState === "visible")
    void requestFullscreen()

    const handleVisibilityChange = () => {
      setIsVisible(document.visibilityState === "visible")
    }

    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement))
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)
    document.addEventListener("fullscreenchange", handleFullscreenChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      document.removeEventListener("fullscreenchange", handleFullscreenChange)
    }
  }, [requestFullscreen])

  React.useEffect(() => {
    const unsubscribeCalibration = subscribeToCalibrationState((nextSnapshot) => {
      setSnapshot(nextSnapshot)
    })

    return () => {
      unsubscribeCalibration()
    }
  }, [])

  React.useEffect(() => {
    if (!currentCalibration || phase !== "ready") {
      return
    }

    if (currentCalibration.status === "running" || currentCalibration.validation.status === "running") {
      void cancelCalibration()
    }
  }, [cancelCalibration, currentCalibration, phase])

  React.useEffect(() => {
    if (phase !== "calibrating" && phase !== "validating") {
      return
    }

    if (!isFullscreen || !isVisible) {
      runTokenRef.current += 1
      void cancelCalibration()
      dispatch(setStepThreeInternalCalibrationStatus("failed"))
      setPhase("failure")
      setErrorMessage("Calibration was interrupted. Keep the calibration page visible and in full screen.")
      setStatusMessage("Calibration was interrupted.")
    }
  }, [cancelCalibration, dispatch, isFullscreen, isVisible, phase])

  React.useEffect(() => {
    phaseRef.current = phase
  }, [phase])

  React.useEffect(() => {
    return () => {
      if (phaseRef.current === "calibrating" || phaseRef.current === "validating") {
        void cancelCalibration()
      }
    }
  }, [cancelCalibration])

  const handleReset = React.useCallback(async () => {
    runTokenRef.current += 1
    setPhase("ready")
    setSnapshot(null)
    setErrorMessage(null)
    setActivePointIndex(0)
    setTargetPhase("move")
    setShowPreviewOverlay(true)
    setStatusMessage(
      "The participant should look at the center of each point. Full screen is entered automatically when calibration starts."
    )
    dispatch(setStepThreeExternalCalibrationCompleted(false))
    dispatch(setStepThreeCalibrationSkipped(false))
    dispatch(setStepThreeInternalCalibrationStatus("pending"))
    dispatch(setStepThreeUseLocalCalibration(false))
    dispatch(setStepThreeLastCalibrationSessionId(null))
    dispatch(setStepThreeLastQuality(null))
    await cancelCalibration()
  }, [cancelCalibration, dispatch])

  const handleAccept = React.useCallback(() => {
    if (!snapshot || snapshot.validation.result?.passed !== true) {
      return
    }

    dispatch(setStepThreeExternalCalibrationCompleted(true))
    dispatch(setStepThreeInternalCalibrationStatus("completed"))
    dispatch(setStepThreeUseLocalCalibration(false))
    dispatch(setStepThreeLastAppliedAtUnixMs(snapshot.validation.completedAtUnixMs ?? Date.now()))
    dispatch(setStepThreeLastCalibrationSessionId(snapshot.sessionId))
    dispatch(setStepThreeLastCalibrationStatus("Validation passed"))
    dispatch(setStepThreeLastQuality(snapshot.validation.result.quality))
    router.push("/experiment")
  }, [dispatch, router, snapshot])

  const runValidationSequence = React.useCallback(
    async (runToken: number) => {
      setPhase("validating")
      setActivePointIndex(0)
      setTargetPhase("move")
      setErrorMessage(null)
      setStatusMessage("Starting validation to estimate calibration accuracy and precision.")

      const started = await startValidation().unwrap()
      setSnapshot(started)

      for (let pointIndex = 0; pointIndex < started.validation.points.length; pointIndex += 1) {
        const point = started.validation.points[pointIndex] as CalibrationValidationPointState
        setActivePointIndex(pointIndex)
        setTargetPhase("move")
        setStatusMessage(`Move to ${point.label.toLowerCase()} validation target.`)
        await wait(TARGET_MOVE_MS)

        if (runTokenRef.current !== runToken) {
          return
        }

        setTargetPhase("settle")
        setStatusMessage(`Hold on ${point.label.toLowerCase()} validation target.`)
        await wait(TARGET_SETTLE_MS)

        if (runTokenRef.current !== runToken) {
          return
        }

        setTargetPhase("hold")
        setStatusMessage(`Collecting validation data for ${point.label.toLowerCase()}.`)
        const collected = await collectValidationPoint({ pointId: point.pointId }).unwrap()
        setSnapshot(collected)

        const updatedPoint = collected.validation.points.find((item) => item.pointId === point.pointId)
        if (!updatedPoint || updatedPoint.status !== "collected") {
          dispatch(setStepThreeInternalCalibrationStatus("failed"))
          setPhase("failure")
          setErrorMessage(
            updatedPoint?.notes[0] ?? `Validation failed while collecting ${point.label.toLowerCase()}.`
          )
          return
        }

        setTargetPhase("burst")
        setStatusMessage(`Locked ${point.label.toLowerCase()} validation target.`)
        await wait(TARGET_BURST_MS)
      }

      if (runTokenRef.current !== runToken) {
        return
      }

      setStatusMessage("Computing validation metrics.")
      const finished = await finishValidation().unwrap()
      setSnapshot(finished)
      setPhase("review")
      setStatusMessage("Validation complete. Review the quality metrics before starting the session.")
      setErrorMessage(
        finished.validation.result?.passed
          ? null
          : finished.validation.notes[0] ?? "Validation did not meet the required quality threshold."
      )
    },
    [collectValidationPoint, dispatch, finishValidation, startValidation]
  )

  const startRun = React.useCallback(async () => {
    const enteredFullscreen = await requestFullscreen()
    if (!enteredFullscreen) {
      return
    }

    if (!isVisible) {
      setStatusMessage("Bring the calibration page back to the front before starting.")
      return
    }

    setShowPreviewOverlay(false)
    stopGazeSocket()
    await wait(GAZE_TEARDOWN_MS)

    const runToken = runTokenRef.current + 1
    runTokenRef.current = runToken
    setPhase("calibrating")
    setErrorMessage(null)
    setTargetPhase("move")
    setStatusMessage("Stopping gaze streaming and entering Tobii calibration mode.")
    dispatch(setStepThreeExternalCalibrationCompleted(false))
    dispatch(setStepThreeInternalCalibrationStatus("running"))
    dispatch(setStepThreeUseLocalCalibration(false))

    try {
      const started = await startCalibration().unwrap()
      setSnapshot(started)

      for (let pointIndex = 0; pointIndex < started.points.length; pointIndex += 1) {
        const point = started.points[pointIndex]
        setActivePointIndex(pointIndex)
        setTargetPhase("move")
        setStatusMessage(`Move to ${point.label.toLowerCase()}.`)
        await wait(TARGET_MOVE_MS)

        if (runTokenRef.current !== runToken) {
          return
        }

        setTargetPhase("settle")
        setStatusMessage(`Hold on ${point.label.toLowerCase()}.`)
        await wait(TARGET_SETTLE_MS)

        if (runTokenRef.current !== runToken) {
          return
        }

        setTargetPhase("hold")
        setStatusMessage(`Collecting ${point.label.toLowerCase()} on the eye tracker.`)
        const collected = await collectCalibrationPoint({ pointId: point.pointId }).unwrap()
        setSnapshot(collected)

        const updatedPoint = collected.points.find((item) => item.pointId === point.pointId)
        if (!updatedPoint || updatedPoint.status !== "collected") {
          dispatch(setStepThreeInternalCalibrationStatus("failed"))
          setPhase("failure")
          setErrorMessage(
            updatedPoint?.notes[0] ?? `Calibration failed while collecting ${point.label.toLowerCase()}.`
          )
          return
        }

        setTargetPhase("burst")
        setStatusMessage(`Locked ${point.label.toLowerCase()}.`)
        await wait(TARGET_BURST_MS)
      }

      if (runTokenRef.current !== runToken) {
        return
      }

      setStatusMessage("Computing and applying calibration.")
      const finished = await finishCalibration().unwrap()
      setSnapshot(finished)

      if (finished.status !== "completed" || !finished.result?.applied) {
        dispatch(setStepThreeInternalCalibrationStatus("failed"))
        setPhase("failure")
        setErrorMessage(finished.notes[0] ?? "The eye tracker rejected the calibration.")
        return
      }

      await runValidationSequence(runToken)
    } catch (error) {
      dispatch(setStepThreeInternalCalibrationStatus("failed"))
      setPhase("failure")
      setErrorMessage(getErrorMessage(error, "Calibration failed. Please try again."))
      setStatusMessage("Calibration failed.")
      await cancelCalibration()
    }
  }, [
    cancelCalibration,
    collectCalibrationPoint,
    dispatch,
    finishCalibration,
    isVisible,
    requestFullscreen,
    runValidationSequence,
    startCalibration,
  ])

  const rerunValidation = React.useCallback(async () => {
    const enteredFullscreen = await requestFullscreen()
    if (!enteredFullscreen) {
      return
    }

    if (!snapshot?.result?.applied) {
      return
    }

    if (!isVisible) {
      setStatusMessage("Bring the calibration page back to the front before starting validation.")
      return
    }

    setShowPreviewOverlay(false)
    stopGazeSocket()
    await wait(GAZE_TEARDOWN_MS)

    const runToken = runTokenRef.current + 1
    runTokenRef.current = runToken
    dispatch(setStepThreeExternalCalibrationCompleted(false))
    dispatch(setStepThreeInternalCalibrationStatus("running"))
    dispatch(setStepThreeUseLocalCalibration(false))

    try {
      await runValidationSequence(runToken)
    } catch (error) {
      dispatch(setStepThreeInternalCalibrationStatus("failed"))
      setPhase("failure")
      setErrorMessage(getErrorMessage(error, "Validation failed. Please try again."))
      setStatusMessage("Validation failed.")
      await cancelCalibration()
    }
  }, [cancelCalibration, dispatch, isVisible, requestFullscreen, runValidationSequence, snapshot?.result?.applied])

  const renderMetricCard = (label: string, value: string, helper?: string) => (
    <div className="rounded-[1.25rem] border bg-slate-50 p-4">
      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-slate-500">{helper}</p> : null}
    </div>
  )

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f7f2e8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_38%),linear-gradient(180deg,#f7f2e8_0%,#efe6d7_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.78),rgba(255,255,255,0.18)_40%,transparent_72%)]" />

      <div className="pointer-events-none absolute top-5 left-1/2 z-20 w-[min(92vw,880px)] -translate-x-1/2 rounded-full border border-slate-900/10 bg-white/84 px-5 py-3 text-center shadow-sm backdrop-blur">
        <p className="text-xs uppercase tracking-[0.22em] text-slate-500">Calibration</p>
        <p className="mt-2 text-sm leading-6 text-slate-700">{statusMessage}</p>
        {errorMessage ? (
          <p className="mt-2 text-sm leading-6 text-amber-700">{errorMessage}</p>
        ) : null}
      </div>

      <div className="absolute top-5 left-5 z-20">
        <Button asChild variant="outline" className="bg-white/88 backdrop-blur">
          <Link href="/experiment">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Link>
        </Button>
      </div>

      {activeTarget && (phase === "calibrating" || phase === "validating") ? (
        <CalibrationTarget x={activeTarget.x} y={activeTarget.y} phase={targetPhase} />
      ) : null}

      {(phase === "calibrating" || phase === "validating") ? (
        <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 gap-2">
          {activePoints.map((point, index) => (
            <span
              key={point.pointId}
              className={`h-2.5 rounded-full transition-all ${
                point.status === "collected"
                  ? "w-10 bg-emerald-500"
                  : index === activePointIndex
                    ? "w-14 bg-slate-950"
                    : "w-10 bg-slate-300"
              }`}
            />
          ))}
        </div>
      ) : null}

      {phase === "ready" ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center">
          <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Ready</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight">Follow the target.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            A live gaze preview is shown before calibration starts. Once the backend enters Tobii
            calibration mode, the preview is disabled so the hardware flow can run without streaming
            conflicts. Validation runs immediately after calibration to estimate accuracy and precision.
          </p>
        </div>
      ) : null}

      {phase === "review" ? (
        <div
          className={`absolute top-1/2 left-1/2 z-20 w-[min(94vw,980px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)] ${validationQualityStyles.border}`}
        >
          <div className="flex items-start gap-4">
            {validationResult?.passed ? (
              <ShieldCheck className="mt-1 h-8 w-8 shrink-0 text-emerald-600" />
            ) : (
              <AlertTriangle className="mt-1 h-8 w-8 shrink-0 text-rose-600" />
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
            {renderMetricCard("Quality", titleCase(validationResult?.quality), "Derived from overall accuracy and precision")}
            {renderMetricCard("Accuracy", formatDegrees(validationResult?.averageAccuracyDegrees), "Lower is better")}
            {renderMetricCard("Precision", formatDegrees(validationResult?.averagePrecisionDegrees), "Lower is better")}
            {renderMetricCard("Completed", formatTime(snapshot?.validation.completedAtUnixMs ?? null), "Validation timestamp")}
          </div>

          <div className="mt-6 rounded-[1.5rem] border bg-slate-50/80 p-5">
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
              {(validationResult?.points ?? []).map((point: CalibrationValidationPointResult) => {
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
            {validationResult?.passed ? (
              <Button onClick={handleAccept}>Return to experiment</Button>
            ) : (
              <Button onClick={() => void rerunValidation()}>Run validation again</Button>
            )}
            <Button variant="outline" onClick={() => void startRun()}>
              Run full calibration again
            </Button>
            {validationResult?.passed ? (
              <Button variant="outline" onClick={() => void rerunValidation()}>
                Run validation again
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {phase === "failure" ? (
        <div className="absolute top-1/2 left-1/2 z-20 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-amber-400/30 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <div className="flex items-start gap-4">
            <XCircle className="mt-1 h-8 w-8 shrink-0 text-amber-600" />
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.22em] text-amber-700">Retry needed</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                The calibration flow did not complete.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Restart the flow, keep the participant steady, and repeat the calibration and validation targets.
              </p>
              {errorMessage ? (
                <p className="mt-3 text-sm leading-7 text-amber-700">{errorMessage}</p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => void handleReset()}>Reset calibration</Button>
            <Button asChild variant="outline">
              <Link href="/experiment">Back to experiment</Link>
            </Button>
          </div>
        </div>
      ) : null}

      {(phase === "ready" || phase === "calibrating" || phase === "validating") ? (
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-full border border-slate-900/10 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
          <p className="px-2 text-sm text-slate-600">
            {phase === "ready"
              ? "Start when the participant is ready."
              : phase === "calibrating"
                ? `Calibration ${pointProgress}`
                : `Validation ${pointProgress}`}
          </p>
          {phase === "ready" ? (
            <Button disabled={isStartingCalibration} onClick={() => void startRun()}>
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
          <Button variant="outline" onClick={() => void handleReset()}>
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>
      ) : null}

      {showPreviewOverlay && phase === "ready" ? <GazePreviewOverlay /> : null}
    </main>
  )
}
