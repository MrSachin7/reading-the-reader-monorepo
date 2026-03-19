"use client"

import * as React from "react"
import Link from "next/link"
import { ArrowLeft, CheckCircle2, LoaderCircle, RotateCcw, ScanEye, XCircle } from "lucide-react"
import { useRouter } from "next/navigation"

import type { CalibrationSessionSnapshot } from "@/lib/calibration"
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
  useFinishCalibrationMutation,
  useGetCalibrationStateQuery,
  useStartCalibrationMutation,
} from "@/redux"
import { CalibrationTarget, type CalibrationTargetPhase } from "./calibration-target"

const TARGET_MOVE_MS = 950
const TARGET_SETTLE_MS = 700
const TARGET_BURST_MS = 360
const GAZE_TEARDOWN_MS = 180

type CalibrationPhase = "ready" | "running" | "success" | "failure"

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function formatTime(unixMs: number | null) {
  if (!unixMs) {
    return "-"
  }

  return new Date(unixMs).toLocaleTimeString()
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
  const [startCalibration, { isLoading: isStarting }] = useStartCalibrationMutation()
  const [collectCalibrationPoint] = useCollectCalibrationPointMutation()
  const [finishCalibration, { isLoading: isFinishing }] = useFinishCalibrationMutation()
  const [cancelCalibration] = useCancelCalibrationMutation()

  const activeTarget = snapshot?.points[activePointIndex] ?? currentCalibration?.points[0] ?? null
  const totalPoints = snapshot?.points.length ?? currentCalibration?.points.length ?? 0
  const pointProgress = snapshot?.points.length
    ? `${snapshot.points.filter((point) => point.status === "collected").length} / ${snapshot.points.length}`
    : `0 / ${totalPoints}`
  const collectedPointCount = snapshot?.points.length ?? 0

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

    if (currentCalibration.status === "running") {
      void cancelCalibration()
    }
  }, [cancelCalibration, currentCalibration, phase])

  React.useEffect(() => {
    if (phase !== "running") {
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
      if (phaseRef.current === "running") {
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
    await cancelCalibration()
  }, [cancelCalibration, dispatch])

  const handleAccept = React.useCallback(() => {
    if (!snapshot || snapshot.status !== "completed") {
      return
    }

    dispatch(setStepThreeExternalCalibrationCompleted(true))
    dispatch(setStepThreeInternalCalibrationStatus("completed"))
    dispatch(setStepThreeUseLocalCalibration(false))
    dispatch(setStepThreeLastAppliedAtUnixMs(snapshot.completedAtUnixMs ?? Date.now()))
    dispatch(setStepThreeLastCalibrationSessionId(snapshot.sessionId))
    dispatch(setStepThreeLastCalibrationStatus(snapshot.result?.status ?? "Success"))
    dispatch(setStepThreeLastQuality("unknown"))
    router.push("/experiment")
  }, [dispatch, router, snapshot])

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
    setPhase("running")
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

      if (finished.status === "completed" && finished.result?.applied) {
        setPhase("success")
        setStatusMessage("Calibration was applied on the eye tracker.")
        return
      }

      dispatch(setStepThreeInternalCalibrationStatus("failed"))
      setPhase("failure")
      setErrorMessage(finished.notes[0] ?? "The eye tracker rejected the calibration.")
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
    startCalibration,
  ])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f7f2e8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_38%),linear-gradient(180deg,#f7f2e8_0%,#efe6d7_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.78),rgba(255,255,255,0.18)_40%,transparent_72%)]" />

      <div className="pointer-events-none absolute top-5 left-1/2 z-20 w-[min(92vw,820px)] -translate-x-1/2 rounded-full border border-slate-900/10 bg-white/84 px-5 py-3 text-center shadow-sm backdrop-blur">
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

      {activeTarget ? (
        <CalibrationTarget x={activeTarget.x} y={activeTarget.y} phase={targetPhase} />
      ) : null}

      <div className="pointer-events-none absolute bottom-28 left-1/2 z-20 flex -translate-x-1/2 gap-2">
        {(snapshot?.points ?? currentCalibration?.points ?? []).map((point, index) => (
          <span
            key={point.pointId}
            className={`h-2.5 rounded-full transition-all ${
              point.status === "collected"
                ? "w-10 bg-emerald-500"
                : index === activePointIndex && phase === "running"
                  ? "w-14 bg-slate-950"
                  : "w-10 bg-slate-300"
            }`}
          />
        ))}
      </div>

      {phase === "ready" ? (
        <div className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2 text-center">
          <p className="text-sm uppercase tracking-[0.26em] text-slate-500">Ready</p>
          <h1 className="mt-4 text-5xl font-semibold tracking-tight">Follow the target.</h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600">
            A live gaze preview is shown before calibration starts. Once the backend enters Tobii
            calibration mode, the preview is disabled so hardware calibration can run without
            streaming conflicts.
          </p>
        </div>
      ) : null}

      {phase === "success" ? (
        <div className="absolute top-1/2 left-1/2 z-20 w-[min(92vw,760px)] -translate-x-1/2 -translate-y-1/2 rounded-[2rem] border border-emerald-400/30 bg-white/92 p-8 shadow-[0_24px_80px_rgba(15,23,42,0.12)]">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-1 h-8 w-8 shrink-0 text-emerald-600" />
            <div className="min-w-0">
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-700">Applied</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">
                Calibration is active on the eye tracker.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Tobii accepted the collected data and the backend applied it directly on the
                selected device.
              </p>
            </div>
          </div>

          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Status</p>
              <p className="mt-2 text-lg font-semibold">{snapshot?.result?.status ?? "Success"}</p>
            </div>
            <div className="rounded-[1.25rem] border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Points</p>
              <p className="mt-2 text-lg font-semibold">{collectedPointCount}</p>
            </div>
            <div className="rounded-[1.25rem] border bg-slate-50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Applied at</p>
              <p className="mt-2 text-lg font-semibold">{formatTime(snapshot?.completedAtUnixMs ?? null)}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={handleAccept}>Return to experiment</Button>
            <Button variant="outline" onClick={() => void handleReset()}>
              Run again
            </Button>
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
                The eye tracker did not accept this run.
              </h2>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                Restart the flow, keep the participant steady, and repeat the full target pattern.
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

      {(phase === "ready" || phase === "running") ? (
        <div className="absolute bottom-8 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-3 rounded-full border border-slate-900/10 bg-white/88 px-4 py-3 shadow-sm backdrop-blur">
          <p className="px-2 text-sm text-slate-600">
            {phase === "running" ? `Progress ${pointProgress}` : "Start when the participant is ready."}
          </p>
          {phase === "ready" ? (
            <Button disabled={isStarting} onClick={() => void startRun()}>
              {isStarting ? (
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
            <Button variant="outline" disabled={isFinishing}>
              <LoaderCircle className="h-4 w-4 animate-spin" />
              Running
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
