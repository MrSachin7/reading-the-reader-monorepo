"use client"

import * as React from "react"
import { Provider } from "react-redux"

import {
  hydrateStepThreeCalibrationState,
  type PersistedStepThreeCalibrationState,
} from "@/redux/slices/experiment-slice"
import { makeStore } from "@/redux/store"

const STEP_THREE_STORAGE_KEY = "reading-the-reader:step-three-calibration"

export function ReduxProvider({ children }: { children: React.ReactNode }) {
  const [store] = React.useState(makeStore)

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    try {
      const raw = window.localStorage.getItem(STEP_THREE_STORAGE_KEY)
      if (!raw) {
      } else {
        const parsed = JSON.parse(raw) as PersistedStepThreeCalibrationState
        store.dispatch(hydrateStepThreeCalibrationState(parsed))
      }
    } catch {
      window.localStorage.removeItem(STEP_THREE_STORAGE_KEY)
    }

    const unsubscribe = store.subscribe(() => {
      const stepThree = store.getState().experiment.stepThree
      const persisted: PersistedStepThreeCalibrationState = {
        useLocalCalibration: stepThree.useLocalCalibration,
        calibrationSkipped: stepThree.calibrationSkipped,
        internalCalibrationStatus: stepThree.internalCalibrationStatus,
        lastAppliedAtUnixMs: stepThree.lastAppliedAtUnixMs,
        lastQuality: stepThree.lastQuality,
        lastCalibrationSessionId: stepThree.lastCalibrationSessionId,
        lastCalibrationStatus: stepThree.lastCalibrationStatus,
      }

      window.localStorage.setItem(STEP_THREE_STORAGE_KEY, JSON.stringify(persisted))
    })

    return unsubscribe
  }, [store])

  return <Provider store={store}>{children}</Provider>
}
