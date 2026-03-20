"use client"

import * as React from "react"
import { CheckCircle2, CircleDot, RotateCcw, Save, Settings2, SlidersHorizontal } from "lucide-react"

import { getCalibrationPreset, SUPPORTED_CALIBRATION_POINT_COUNTS } from "@/lib/calibration-presets"
import type { CalibrationPointDefinition } from "@/lib/calibration"
import { getErrorMessage } from "@/lib/error-utils"
import {
  READER_SHELL_SETTINGS_DEFAULTS,
  READER_SHELL_SETTINGS_VIEW_KEYS,
  cloneReaderShellSettingsSnapshot,
  type ReaderShellOptionKey,
  type ReaderShellSettingsSnapshot,
  type ReaderShellSettingsViewKey,
  type ReaderShellViewSettings,
} from "@/lib/reader-shell-settings"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  useGetCalibrationSettingsQuery,
  useGetReaderShellSettingsQuery,
  useUpdateCalibrationSettingsMutation,
  useUpdateReaderShellSettingsMutation,
} from "@/redux"

const PRESET_DESCRIPTIONS: Record<number, string> = {
  9: "Balanced outer-frame calibration with corners, edge midpoints, and center.",
  13: "Builds on the 9-point base and adds four inner anchors for reading-area coverage.",
  16: "Builds on the 13-point set and adds three more anchors for denser sampling.",
}

const SETTINGS_SECTIONS = [
  {
    value: "calibration",
    label: "Calibration",
    description: "Choose the calibration point count.",
  },
  {
    value: "reader-shell",
    label: "ReaderShell",
    description: "View-specific reading defaults.",
  },
] as const

const READER_SHELL_VIEW_SECTIONS: Array<{
  key: ReaderShellSettingsViewKey
  label: string
}> = [
  {
    key: "reading",
    label: "Reading",
  },
  {
    key: "researcherMirror",
    label: "Researcher mirror",
  },
  {
    key: "replay",
    label: "Replay",
  },
]

const READER_SHELL_OPTIONS: Array<{
  key: ReaderShellOptionKey
  label: string
  description: string
}> = [
  {
    key: "preserveContextOnIntervention",
    label: "Preserve context on intervention",
    description: "Keep the reading position anchored when the presentation changes.",
  },
  {
    key: "highlightContext",
    label: "Highlight context",
    description: "Reveal the preserved anchor briefly after an intervention.",
  },
  {
    key: "displayGazePosition",
    label: "Display gaze position",
    description: "Show the gaze marker overlay in the view.",
  },
  {
    key: "highlightTokensBeingLookedAt",
    label: "Highlight focused token",
    description: "Highlight the token the participant is focused on.",
  },
  {
    key: "showFixationHeatmap",
    label: "Show fixation heat map",
    description: "Color tokens by fixation dwell and mark quick skims when remote focus data is available.",
  },
  {
    key: "showLixScores",
    label: "Show LIX scores",
    description: "Display readability badges inside the reading view.",
  },
  {
    key: "showToolbar",
    label: "Show toolbar",
    description: "Reveal the reader toolbar when the view loads.",
  },
  {
    key: "showBackButton",
    label: "Show back button",
    description: "Only takes effect while the toolbar is visible.",
  },
]

function areReaderShellViewSettingsEqual(
  left: ReaderShellViewSettings,
  right: ReaderShellViewSettings
) {
  return READER_SHELL_OPTIONS.every((option) => left[option.key] === right[option.key])
}

function areReaderShellSettingsEqual(
  left: ReaderShellSettingsSnapshot,
  right: ReaderShellSettingsSnapshot
) {
  return READER_SHELL_SETTINGS_VIEW_KEYS.every((view) =>
    areReaderShellViewSettingsEqual(left[view], right[view])
  )
}

function getEnabledViewLabels(
  settings: ReaderShellSettingsSnapshot,
  option: ReaderShellOptionKey
) {
  return READER_SHELL_VIEW_SECTIONS
    .filter((view) => settings[view.key][option])
    .map((view) => view.label)
}

function CalibrationPointPreview({ points }: { points: CalibrationPointDefinition[] }) {
  return (
    <div className="relative aspect-[16/10] overflow-hidden rounded-[1.75rem] border bg-card shadow-sm">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.92),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(15,23,42,0.04),transparent_30%)]" />
      <div className="absolute inset-6 rounded-[1.25rem] border border-dashed border-border" />
      <div className="absolute inset-[18%_26%] rounded-[1rem] border bg-muted/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]" />
      {points.map((point) => (
        <div
          key={point.pointId}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
        >
          <div className="flex h-4 w-4 items-center justify-center rounded-full border bg-background shadow-[0_0_0_4px_rgba(255,255,255,0.82)]">
            <div className="h-1.5 w-1.5 rounded-full bg-slate-950" />
          </div>
        </div>
      ))}
    </div>
  )
}

function CalibrationSettingsSection() {
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
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="gap-4 pb-5">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted text-foreground">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-2xl">Calibration Preset</CardTitle>
              <CardDescription className="mt-1 text-sm leading-6">
                Choose the calibration point count for the next run.
              </CardDescription>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-[1.25rem] border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Draft preset</p>
              <p className="mt-2 text-lg font-semibold">{selectedPresetCount} points</p>
            </div>
            <div className="rounded-[1.25rem] border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Saved preset</p>
              <p className="mt-2 text-lg font-semibold">{data?.presetPointCount ?? "-"}</p>
            </div>
            <div className="rounded-[1.25rem] border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preview points</p>
              <p className="mt-2 text-lg font-semibold">{previewPoints.length}</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Preset</CardTitle>
            <CardDescription>
              Changes apply to the next calibration session. Editing is blocked while a calibration run is active.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-6">
            <div className="grid gap-3">
              <label className="text-sm font-medium">Calibration points</label>
              <Select
                value={draftPreset}
                onValueChange={setDraftPreset}
                disabled={isLoading || isSaving || data?.isCalibrationRunning}
              >
                <SelectTrigger className="w-full max-w-sm">
                  <SelectValue placeholder="Choose a preset" />
                </SelectTrigger>
                <SelectContent>
                  {supportedPointCounts.map((count) => (
                    <SelectItem key={count} value={String(count)}>
                      {count} points
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm leading-6 text-muted-foreground">
                {PRESET_DESCRIPTIONS[selectedPresetCount] ?? "Select a preset to review its layout."}
              </p>
              {data ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
                    Saved: {data.presetPointCount} points
                  </span>
                  {isDirty ? (
                    <span className="rounded-full border bg-background px-3 py-1 text-xs text-foreground">
                      Unsaved change
                    </span>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => void handleSave()}
                disabled={!isDirty || isSaving || !draftPreset || Boolean(data?.isCalibrationRunning)}
              >
                <Save className="h-4 w-4" />
                Save preset
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={!isDirty || isSaving}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>

            {statusMessage ? (
              <div className="rounded-xl border bg-muted px-4 py-3 text-sm">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <p>{statusMessage}</p>
                </div>
              </div>
            ) : null}

            {errorMessage ? (
              <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            ) : null}

            {data?.isCalibrationRunning ? (
              <div className="rounded-xl border bg-muted px-4 py-3 text-sm text-foreground">
                A calibration run is active. Wait until it finishes or cancel it before changing the preset.
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>
              Preview updates immediately when you change the draft preset, before saving.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <CalibrationPointPreview points={previewPoints} />
            <div className="rounded-[1.25rem] border bg-muted/20 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preview pattern</p>
              <p className="mt-2 text-lg font-semibold">{previewPattern}</p>
              <p className="mt-2 text-sm text-muted-foreground">
                {previewPoints.length} points are included in this preset.
              </p>
              {savedPreset && data && selectedPresetCount !== data.presetPointCount ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  Draft differs from the saved backend preset and will take effect after saving.
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle>Included Points</CardTitle>
          <CardDescription>
            Use this to verify which anchors belong to the current draft preset before saving.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {previewPoints.map((point) => (
              <div key={point.pointId} className="rounded-[1.25rem] border bg-muted/20 p-4">
                <div className="flex items-center gap-2">
                  <CircleDot className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium">{point.label}</p>
                </div>
                <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">{point.pointId}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  x={point.x.toFixed(2)} y={point.y.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function ReaderShellSettingsSection() {
  const { data } = useGetReaderShellSettingsQuery()
  const [updateReaderShellSettings, { isLoading: isSaving }] =
    useUpdateReaderShellSettingsMutation()
  const [draftSettings, setDraftSettings] = React.useState<ReaderShellSettingsSnapshot>(() =>
    cloneReaderShellSettingsSnapshot(READER_SHELL_SETTINGS_DEFAULTS)
  )
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!data) {
      return
    }

    setDraftSettings(cloneReaderShellSettingsSnapshot(data))
  }, [data])

  const savedSettings = data ?? READER_SHELL_SETTINGS_DEFAULTS
  const isDirty = !areReaderShellSettingsEqual(draftSettings, savedSettings)

  const handleToggle = (
    view: ReaderShellSettingsViewKey,
    option: ReaderShellOptionKey,
    checked: boolean
  ) => {
    setDraftSettings((previous) => ({
      ...previous,
      [view]: {
        ...previous[view],
        [option]: checked,
      },
    }))
  }

  const handleReset = () => {
    setDraftSettings(cloneReaderShellSettingsSnapshot(savedSettings))
    setStatusMessage(null)
    setErrorMessage(null)
  }

  const handleSave = async () => {
    if (!isDirty) {
      return
    }

    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const updated = await updateReaderShellSettings(draftSettings).unwrap()
      setDraftSettings(cloneReaderShellSettingsSnapshot(updated))
      setStatusMessage(
        "ReaderShell defaults saved. New reading, mirror, and replay views will start with these defaults."
      )
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "ReaderShell settings could not be updated."))
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl border bg-muted text-foreground">
              <SlidersHorizontal className="h-5 w-5" />
            </div>
            <div>
              <CardTitle>Default View Settings</CardTitle>
              <CardDescription>
                Each row appears once. Use the columns to decide which views should start with that
                setting enabled by default.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {READER_SHELL_VIEW_SECTIONS.map((view) => (
                <span
                  key={view.key}
                  className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground"
                >
                  {view.label}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => void handleSave()} disabled={!isDirty || isSaving}>
                <Save className="h-4 w-4" />
                Save defaults
              </Button>
              <Button variant="outline" onClick={handleReset} disabled={!isDirty || isSaving}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
          </div>

          {statusMessage ? (
            <div className="rounded-xl border bg-muted px-4 py-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <p>{statusMessage}</p>
              </div>
            </div>
          ) : null}

          {errorMessage ? (
            <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <div className="rounded-[1.4rem] border bg-muted/10">
            <div className="hidden grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(5rem,1fr))] gap-3 border-b px-4 py-3 text-[11px] uppercase tracking-[0.18em] text-muted-foreground md:grid">
              <span>Setting</span>
              {READER_SHELL_VIEW_SECTIONS.map((view) => (
                <span key={view.key} className="text-center">
                  {view.label}
                </span>
              ))}
            </div>
            <div className="grid gap-3 p-3">
              {READER_SHELL_OPTIONS.map((option) => {
                const enabledViews = getEnabledViewLabels(savedSettings, option.key)

                return (
                  <div
                    key={option.key}
                    className="grid gap-3 rounded-[1.1rem] border bg-background/80 px-4 py-4 md:grid-cols-[minmax(0,1.7fr)_repeat(3,minmax(5rem,1fr))] md:items-center"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{option.label}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {option.description}
                      </p>
                      <p className="mt-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
                        {enabledViews.length > 0
                          ? `Saved on: ${enabledViews.join(", ")}`
                          : "Saved off in all views"}
                      </p>
                    </div>

                    {READER_SHELL_VIEW_SECTIONS.map((view) => (
                      <div
                        key={`${option.key}-${view.key}`}
                        className="flex items-center justify-between rounded-xl border bg-muted/20 px-3 py-2 md:justify-center md:border-0 md:bg-transparent md:px-0 md:py-0"
                      >
                        <span className="text-xs font-medium text-muted-foreground md:hidden">
                          {view.label}
                        </span>
                        <Switch
                          size="sm"
                          checked={draftSettings[view.key][option.key]}
                          disabled={isSaving}
                          onCheckedChange={(checked) => handleToggle(view.key, option.key, checked)}
                        />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SettingsPage() {
  return (
    <Tabs defaultValue="calibration" orientation="vertical" className="gap-6 xl:grid xl:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <Settings2 className="h-5 w-5 text-foreground" />
            Settings
          </CardTitle>
          <CardDescription>
            Central place for configurable researcher-side options. New settings sections can be added here later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TabsList variant="line" className="w-full items-stretch justify-start bg-transparent p-0" aria-label="Settings sections">
            {SETTINGS_SECTIONS.map((section) => (
              <TabsTrigger key={section.value} value={section.value} className="w-full justify-start rounded-xl border bg-background px-4 py-3 text-left transition-colors data-[state=active]:border-border data-[state=active]:bg-accent data-[state=active]:text-foreground">
                <div className="grid min-w-0 gap-1">
                  <span className="font-medium">{section.label}</span>
                  <span className="text-xs leading-5 text-muted-foreground">
                    {section.description}
                  </span>
                </div>
              </TabsTrigger>
            ))}
          </TabsList>
        </CardContent>
      </Card>

      <TabsContent value="calibration">
        <CalibrationSettingsSection />
      </TabsContent>

      <TabsContent value="reader-shell">
        <ReaderShellSettingsSection />
      </TabsContent>
    </Tabs>
  )
}
