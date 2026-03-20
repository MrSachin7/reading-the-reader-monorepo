"use client"

import * as React from "react"

import { getCalibrationPreset, SUPPORTED_CALIBRATION_POINT_COUNTS } from "@/lib/calibration-presets"
import { getErrorMessage } from "@/lib/error-utils"
import { CalibrationIncludedPointsCard } from "@/modules/pages/settings/sections/calibration/CalibrationIncludedPointsCard"
import { CalibrationOverviewCard } from "@/modules/pages/settings/sections/calibration/CalibrationOverviewCard"
import { CalibrationPresetCard } from "@/modules/pages/settings/sections/calibration/CalibrationPresetCard"
import { CalibrationPreviewCard } from "@/modules/pages/settings/sections/calibration/CalibrationPreviewCard"
import { useGetCalibrationSettingsQuery, useUpdateCalibrationSettingsMutation } from "@/redux"

const PRESET_DESCRIPTIONS: Record<number, string> = {
  9: "Balanced outer-frame calibration with corners, edge midpoints, and center.",
  13: "Builds on the 9-point base and adds four inner anchors for reading-area coverage.",
  16: "Builds on the 13-point set and adds three more anchors for denser sampling.",
}

export function CalibrationSettingsSection() {
  const { data, isLoading } = useGetCalibrationSettingsQuery()
  const [updateCalibrationSettings, { isLoading: isSaving }] = useUpdateCalibrationSettingsMutation()
  const [draftPreset, setDraftPreset] = React.useState<string>("")
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!data) {
      return
    }

    setDraftPreset(String(data.presetPointCount))
  }, [data])

  const supportedPointCounts = data?.supportedPointCounts ?? SUPPORTED_CALIBRATION_POINT_COUNTS
  const selectedPresetCount = Number(draftPreset || data?.presetPointCount || supportedPointCounts[0] || 9)
  const selectedPreset = getCalibrationPreset(selectedPresetCount)
  const savedPreset = getCalibrationPreset(data?.presetPointCount ?? supportedPointCounts[0] ?? 9)
  const previewPoints = selectedPreset?.points ?? data?.points ?? []
  const previewPattern = selectedPreset?.pattern ?? data?.pattern ?? "-"
  const isDirty = data ? selectedPresetCount !== data.presetPointCount : false

  const handleReset = () => {
    if (!data) {
      return
    }

    setDraftPreset(String(data.presetPointCount))
    setStatusMessage(null)
    setErrorMessage(null)
  }

  const handleSave = async () => {
    if (!draftPreset || !isDirty) {
      return
    }

    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const updated = await updateCalibrationSettings({
        presetPointCount: Number(draftPreset),
      }).unwrap()
      setDraftPreset(String(updated.presetPointCount))
      setStatusMessage(
        `Calibration preset saved. The next calibration run will use ${updated.presetPointCount} points.`
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Calibration settings could not be updated."))
    }
  }

  return (
    <div className="grid gap-6">
      <CalibrationOverviewCard
        selectedPresetCount={selectedPresetCount}
        savedPresetCount={data?.presetPointCount}
        previewPointCount={previewPoints.length}
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <CalibrationPresetCard
          draftPreset={draftPreset}
          supportedPointCounts={supportedPointCounts}
          presetDescription={
            PRESET_DESCRIPTIONS[selectedPresetCount] ?? "Select a preset to review its layout."
          }
          savedPresetCount={data?.presetPointCount}
          isDirty={isDirty}
          isLoading={isLoading}
          isSaving={isSaving}
          isCalibrationRunning={Boolean(data?.isCalibrationRunning)}
          statusMessage={statusMessage}
          errorMessage={errorMessage}
          onDraftPresetChange={setDraftPreset}
          onSave={() => void handleSave()}
          onReset={handleReset}
        />

        <CalibrationPreviewCard
          previewPoints={previewPoints}
          previewPattern={previewPattern}
          showSavedDifferenceHint={Boolean(
            savedPreset && data && selectedPresetCount !== data.presetPointCount
          )}
        />
      </div>

      <CalibrationIncludedPointsCard previewPoints={previewPoints} />
    </div>
  )
}
