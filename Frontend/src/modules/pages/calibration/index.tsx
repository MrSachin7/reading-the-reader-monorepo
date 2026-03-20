"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

import type {
  CalibrationSessionSnapshot,
  CalibrationValidationPointState,
} from "@/lib/calibration"
import { getErrorMessage } from "@/lib/error-utils"
import { stopGazeSocket, subscribeToCalibrationState } from "@/lib/gaze-socket"
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
import { CalibrationControlsBar } from "@/modules/pages/calibration/components/CalibrationControlsBar"
import { CalibrationFailurePanel } from "@/modules/pages/calibration/components/CalibrationFailurePanel"
import { CalibrationProgressDots } from "@/modules/pages/calibration/components/CalibrationProgressDots"
import { CalibrationReadyHero } from "@/modules/pages/calibration/components/CalibrationReadyHero"
import { CalibrationReviewPanel } from "@/modules/pages/calibration/components/CalibrationReviewPanel"
import { CalibrationStatusChrome } from "@/modules/pages/calibration/components/CalibrationStatusChrome"
import { GazePreviewOverlay } from "@/modules/pages/calibration/components/GazePreviewOverlay"
import {
  type CalibrationPhase,
  wait,
} from "@/modules/pages/calibration/lib/calibration-page-utils"
import { CalibrationTarget, type CalibrationTargetPhase } from "./calibration-target"

const TARGET_MOVE_MS = 950
const TARGET_SETTLE_MS = 700
const TARGET_BURST_MS = 360
const GAZE_TEARDOWN_MS = 180

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
  const activePoints = phase === "validating" ? validationPoints : calibrationPoints
  const activeTarget = activePoints[activePointIndex] ?? null
  const pointProgress = activePoints.length
    ? `${activePoints.filter((point) => point.status === "collected").length} / ${activePoints.length}`
    : "0 / 0"
  const validationResult = snapshot?.validation.result ?? null

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

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f7f2e8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_38%),linear-gradient(180deg,#f7f2e8_0%,#efe6d7_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.78),rgba(255,255,255,0.18)_40%,transparent_72%)]" />

      <CalibrationStatusChrome statusMessage={statusMessage} errorMessage={errorMessage} />

      {activeTarget && (phase === "calibrating" || phase === "validating") ? (
        <CalibrationTarget x={activeTarget.x} y={activeTarget.y} phase={targetPhase} />
      ) : null}

      {(phase === "calibrating" || phase === "validating") ? (
        <CalibrationProgressDots points={activePoints} activePointIndex={activePointIndex} />
      ) : null}

      {phase === "ready" ? <CalibrationReadyHero /> : null}

      {phase === "review" ? (
        <CalibrationReviewPanel
          validationResult={
            validationResult
              ? {
                  passed: validationResult.passed,
                  quality: validationResult.quality,
                  averageAccuracyDegrees: validationResult.averageAccuracyDegrees,
                  averagePrecisionDegrees: validationResult.averagePrecisionDegrees,
                  sampleCount: validationResult.sampleCount,
                  points: validationResult.points,
                }
              : null
          }
          completedAtUnixMs={snapshot?.validation.completedAtUnixMs ?? null}
          onAccept={handleAccept}
          onRerunValidation={() => void rerunValidation()}
          onStartRun={() => void startRun()}
        />
      ) : null}

      {phase === "failure" ? (
        <CalibrationFailurePanel errorMessage={errorMessage} onReset={() => void handleReset()} />
      ) : null}

      {(phase === "ready" || phase === "calibrating" || phase === "validating") ? (
        <CalibrationControlsBar
          phase={phase}
          pointProgress={pointProgress}
          isStartingCalibration={isStartingCalibration}
          isFinishingCalibration={isFinishingCalibration}
          isFinishingValidation={isFinishingValidation}
          onStart={() => void startRun()}
          onReset={() => void handleReset()}
        />
      ) : null}

      {showPreviewOverlay && phase === "ready" ? <GazePreviewOverlay /> : null}
    </main>
  )
}
