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
  notes: string[]
}

export type CalibrationSettingsSnapshot = {
  presetPointCount: number
  pattern: CalibrationPattern
  supportedPointCounts: number[]
  points: CalibrationPointDefinition[]
  isCalibrationRunning: boolean
}
