export type CalibrationPattern = string

export type CalibrationPointDefinition = {
  pointId: string
  label: string
  x: number
  y: number
}

export type CalibrationPointState = CalibrationPointDefinition & {
  status: "pending" | "collecting" | "collected" | "failed"
  attempts: number
  collectedAtUnixMs: number | null
  hardwareStatus: string | null
  notes: string[]
}

export type CalibrationRunResult = {
  status: string
  applied: boolean
  calibrationPointCount: number
  acceptedPoints: CalibrationPointDefinition[]
  validation: CalibrationValidationResult | null
  notes: string[]
}

export type CalibrationValidationPointState = CalibrationPointDefinition & {
  status: "pending" | "collecting" | "collected" | "failed"
  sampleCount: number
  collectedAtUnixMs: number | null
  notes: string[]
}

export type CalibrationValidationPointResult = CalibrationPointDefinition & {
  averageAccuracyDegrees: number | null
  averagePrecisionDegrees: number | null
  sampleCount: number
  quality: "good" | "fair" | "poor"
  notes: string[]
}

export type CalibrationValidationResult = {
  passed: boolean
  quality: "good" | "fair" | "poor"
  averageAccuracyDegrees: number | null
  averagePrecisionDegrees: number | null
  sampleCount: number
  points: CalibrationValidationPointResult[]
  notes: string[]
}

export type CalibrationValidationSnapshot = {
  status: "idle" | "running" | "completed" | "failed" | "cancelled"
  startedAtUnixMs: number | null
  updatedAtUnixMs: number | null
  completedAtUnixMs: number | null
  points: CalibrationValidationPointState[]
  result: CalibrationValidationResult | null
  notes: string[]
}

export type CalibrationSessionStatus =
  | "idle"
  | "running"
  | "completed"
  | "failed"
  | "cancelled"

export type CalibrationSessionSnapshot = {
  sessionId: string | null
  status: CalibrationSessionStatus
  pattern: CalibrationPattern
  startedAtUnixMs: number | null
  updatedAtUnixMs: number | null
  completedAtUnixMs: number | null
  points: CalibrationPointState[]
  result: CalibrationRunResult | null
  validation: CalibrationValidationSnapshot
  notes: string[]
}

export type CalibrationSettingsSnapshot = {
  presetPointCount: number
  pattern: CalibrationPattern
  supportedPointCounts: number[]
  points: CalibrationPointDefinition[]
  isCalibrationRunning: boolean
}
