"use client"

import { useEffect, useRef, useState } from "react"

import { type ConnectionStats, subscribeToConnectionStats, subscribeToGaze } from "@/lib/gaze-socket"
import { calculateGazePoint, normalizeGazePoint, type GazePoint } from "./gaze-helpers"

type UseLiveGazeStreamResult = {
  rawPoint: GazePoint | null
  smoothedPoint: GazePoint | null
  connectionStats: ConnectionStats | null
  sampleRateHz: number
  hasRecentGaze: boolean
}

type UseLiveGazeStreamOptions = {
  applyLocalCalibration?: boolean
}

export function useLiveGazeStream(
  options: UseLiveGazeStreamOptions = {}
): UseLiveGazeStreamResult {
  const shouldApplyLocalCalibration = options.applyLocalCalibration ?? true
  const [rawPoint, setRawPoint] = useState<GazePoint | null>(null)
  const [smoothedPoint, setSmoothedPoint] = useState<GazePoint | null>(null)
  const [connectionStats, setConnectionStats] = useState<ConnectionStats | null>(null)
  const [sampleRateHz, setSampleRateHz] = useState(0)
  const [hasRecentGaze, setHasRecentGaze] = useState(false)

  const latestRawPointRef = useRef<GazePoint | null>(null)
  const latestSmoothedPointRef = useRef<GazePoint | null>(null)
  const latestStatsRef = useRef<ConnectionStats | null>(null)
  const sampleCounterRef = useRef(0)
  const lastValidPointAtRef = useRef(0)

  useEffect(() => {
    const unsubscribeGaze = subscribeToGaze((sample) => {
      const nextPoint = calculateGazePoint(sample)
      sampleCounterRef.current += 1

      if (!nextPoint) {
        return
      }

      lastValidPointAtRef.current = Date.now()
      latestRawPointRef.current = nextPoint
      latestSmoothedPointRef.current = normalizeGazePoint(latestSmoothedPointRef.current, nextPoint)
    })

    const unsubscribeStats = subscribeToConnectionStats((stats) => {
      latestStatsRef.current = stats
    })

    const sampleRateTimer = window.setInterval(() => {
      setSampleRateHz(sampleCounterRef.current)
      sampleCounterRef.current = 0
    }, 1000)

    const livenessTimer = window.setInterval(() => {
      setHasRecentGaze(Date.now() - lastValidPointAtRef.current < 700)
    }, 250)

    let frameId = 0

    const render = () => {
      setRawPoint(latestRawPointRef.current)
      setSmoothedPoint(latestSmoothedPointRef.current)
      setConnectionStats(latestStatsRef.current)
      frameId = window.requestAnimationFrame(render)
    }

    frameId = window.requestAnimationFrame(render)

    return () => {
      unsubscribeGaze()
      unsubscribeStats()
      window.clearInterval(sampleRateTimer)
      window.clearInterval(livenessTimer)
      window.cancelAnimationFrame(frameId)
    }
  }, [shouldApplyLocalCalibration])

  return {
    rawPoint,
    smoothedPoint,
    connectionStats,
    sampleRateHz,
    hasRecentGaze,
  }
}
