"use client"

import * as React from "react"
import { CheckCircle2, RotateCcw, Save, SlidersHorizontal } from "lucide-react"

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
import { Switch } from "@/components/ui/switch"
import {
  useGetReaderShellSettingsQuery,
  useUpdateReaderShellSettingsMutation,
} from "@/redux"

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

export function ReaderShellSettingsSection() {
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
