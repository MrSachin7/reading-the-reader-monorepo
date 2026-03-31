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
const READY_STATUS_MESSAGE =
  "The participant should look at the center of each point. Full screen is entered automatically when calibration starts."

export default function CalibrationPage() {
  const dispatch = useAppDispatch()
  const router = useRouter()
  const [phase, setPhase] = React.useState<CalibrationPhase>("ready")
  const [activePointIndex, setActivePointIndex] = React.useState(0)
  const [targetPhase, setTargetPhase] = React.useState<CalibrationTargetPhase>("move")
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [isVisible, setIsVisible] = React.useState(true)
  const [statusMessage, setStatusMessage] = React.useState(READY_STATUS_MESSAGE)
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

  const setFailureState = React.useCallback(
    ({
      errorMessage,
      lastStatus,
      nextStatusMessage = "Calibration did not finish. Return to setup or reset this route before trying again.",
    }: {
      errorMessage: string
      lastStatus: string
      nextStatusMessage?: string
    }) => {
      runTokenRef.current += 1
      dispatch(setStepThreeExternalCalibrationCompleted(false))
      dispatch(setStepThreeInternalCalibrationStatus("failed"))
      dispatch(setStepThreeUseLocalCalibration(false))
      dispatch(setStepThreeLastCalibrationStatus(lastStatus))
      setPhase("failure")
      setErrorMessage(errorMessage)
      setStatusMessage(nextStatusMessage)
    },
    [dispatch]
  )

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
      dispatch(setStepThreeLastCalibrationStatus("Full screen was blocked before calibration could start."))
      setStatusMessage("The browser blocked full screen. Start calibration again and allow full screen.")
      return false
    }
  }, [dispatch])

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
      void cancelCalibration()
      const interruptionMessage = !isFullscreen
        ? "Calibration was interrupted because full screen was left. Return to setup after you reset or rerun."
        : "Calibration was interrupted because the calibration page was hidden. Return to setup after you reset or rerun."
      const interruptionStatus = !isFullscreen
        ? "Interrupted after leaving full screen."
        : "Interrupted because the calibration page was hidden."
      setFailureState({
        errorMessage: interruptionMessage,
        lastStatus: interruptionStatus,
        nextStatusMessage: "Calibration was interrupted. Keep the page visible and in full screen during the full run.",
      })
    }
  }, [cancelCalibration, isFullscreen, isVisible, phase, setFailureState])

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
    setStatusMessage(READY_STATUS_MESSAGE)
    dispatch(setStepThreeExternalCalibrationCompleted(false))
    dispatch(setStepThreeCalibrationSkipped(false))
    dispatch(setStepThreeInternalCalibrationStatus("pending"))
    dispatch(setStepThreeUseLocalCalibration(false))
    dispatch(setStepThreeLastCalibrationSessionId(null))
    dispatch(setStepThreeLastQuality(null))
    dispatch(setStepThreeLastCalibrationStatus(null))
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
    dispatch(setStepThreeLastCalibrationStatus("Validation passed. Return to setup and continue with the next step."))
    dispatch(setStepThreeLastQuality(snapshot.validation.result.quality))
    router.push("/experiment")
  }, [dispatch, router, snapshot])

  const handleReturnToExperiment = React.useCallback(async () => {
    if (phase === "calibrating" || phase === "validating") {
      await cancelCalibration()
      setFailureState({
        errorMessage:
          "Calibration was interrupted because the researcher left the route before the run finished.",
        lastStatus: "Interrupted because the researcher left the calibration route.",
        nextStatusMessage: "Calibration stopped early. The experiment workflow will stay blocked until validation passes.",
      })
    }

    router.push("/experiment")
  }, [cancelCalibration, phase, router, setFailureState])

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
          setFailureState({
            errorMessage:
              updatedPoint?.notes[0] ?? `Validation failed while collecting ${point.label.toLowerCase()}.`,
            lastStatus: `Validation failed at ${point.label.toLowerCase()} target.`,
          })
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
      dispatch(setStepThreeLastAppliedAtUnixMs(finished.validation.completedAtUnixMs ?? Date.now()))
      dispatch(setStepThreeLastCalibrationSessionId(finished.sessionId))
      dispatch(setStepThreeLastQuality(finished.validation.result?.quality ?? null))
      dispatch(
        setStepThreeLastCalibrationStatus(
          finished.validation.result?.passed
            ? "Validation passed. Return to setup to continue the workflow."
            : finished.validation.notes[0] ??
                "Validation stayed below the required quality threshold. Rerun calibration before starting."
        )
      )
      dispatch(
        setStepThreeInternalCalibrationStatus(
          finished.validation.result?.passed ? "completed" : "failed"
        )
      )
      dispatch(setStepThreeExternalCalibrationCompleted(finished.validation.result?.passed === true))
      dispatch(setStepThreeUseLocalCalibration(false))
      setPhase("review")
      setStatusMessage("Validation complete. Review the quality metrics before starting the session.")
      setErrorMessage(
        finished.validation.result?.passed
          ? null
          : finished.validation.notes[0] ?? "Validation did not meet the required quality threshold."
      )
    },
    [collectValidationPoint, dispatch, finishValidation, setFailureState, startValidation]
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
          setFailureState({
            errorMessage:
              updatedPoint?.notes[0] ?? `Calibration failed while collecting ${point.label.toLowerCase()}.`,
            lastStatus: `Calibration failed at ${point.label.toLowerCase()} target.`,
          })
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
        setFailureState({
          errorMessage: finished.notes[0] ?? "The eye tracker rejected the calibration.",
          lastStatus: "The eye tracker rejected the calibration result.",
        })
        return
      }

      await runValidationSequence(runToken)
    } catch (error) {
      setFailureState({
        errorMessage: getErrorMessage(error, "Calibration failed. Please try again."),
        lastStatus: "Calibration failed before validation could begin.",
        nextStatusMessage: "Calibration failed. Return to setup or reset the route before trying again.",
      })
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
    setFailureState,
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
      setFailureState({
        errorMessage: getErrorMessage(error, "Validation failed. Please try again."),
        lastStatus: "Validation failed before the review step completed.",
        nextStatusMessage: "Validation failed. Return to setup or rerun this route before starting.",
      })
      await cancelCalibration()
    }
  }, [
    cancelCalibration,
    dispatch,
    isVisible,
    requestFullscreen,
    runValidationSequence,
    setFailureState,
    snapshot?.result?.applied,
  ])

  return (
    <main className="relative h-screen w-screen overflow-hidden bg-[#f7f2e8] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.12),transparent_38%),linear-gradient(180deg,#f7f2e8_0%,#efe6d7_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.78),rgba(255,255,255,0.18)_40%,transparent_72%)]" />

      <CalibrationStatusChrome
        statusMessage={statusMessage}
        errorMessage={errorMessage}
        onBack={() => void handleReturnToExperiment()}
      />

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
          onReturnToWorkflow={() => {
            if (validationResult?.passed) {
              handleAccept()
              return
            }

            void handleReturnToExperiment()
          }}
          onRerunValidation={() => void rerunValidation()}
          onStartRun={() => void startRun()}
        />
      ) : null}

      {phase === "failure" ? (
        <CalibrationFailurePanel
          errorMessage={errorMessage}
          onReset={() => void handleReset()}
          onReturnToWorkflow={() => void handleReturnToExperiment()}
        />
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
