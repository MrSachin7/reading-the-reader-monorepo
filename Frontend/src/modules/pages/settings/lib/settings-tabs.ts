"use client"

export type SettingsTabValue = "calibration" | "readershell"

export const DEFAULT_SETTINGS_TAB: SettingsTabValue = "calibration"

export const SETTINGS_SECTIONS: Array<{
  value: SettingsTabValue
  label: string
  description: string
}> = [
  {
    value: "calibration",
    label: "Calibration",
    description: "Choose the calibration point count.",
  },
  {
    value: "readershell",
    label: "ReaderShell",
    description: "View-specific reading defaults.",
  },
]

export function normalizeSettingsTab(value: string | null | undefined): SettingsTabValue {
  if (value === "calibration") {
    return "calibration"
  }

  if (value === "readershell" || value === "reader-shell") {
    return "readershell"
  }

  return DEFAULT_SETTINGS_TAB
}
