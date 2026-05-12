"use client"

import * as React from "react"
import { CheckCircle2, Info, MousePointer2, Save, ScanEye } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { getErrorMessage } from "@/lib/error-utils"
import type { SensingMode } from "@/lib/experiment-session"
import {
  useGetSensingModeSettingsQuery,
  useUpdateSensingModeSettingsMutation,
} from "@/redux"

const MODE_OPTIONS: Array<{
  value: SensingMode
  label: string
  badge: string
  description: string
}> = [
  {
    value: "eyeTracker",
    label: "Use eyetracker",
    badge: "Tobii",
    description: "Require tracker selection, licence handling, calibration, and validation.",
  },
  {
    value: "eyeTrackerPlusFace",
    label: "Use eyetracker + face",
    badge: "Hybrid",
    description: "Keep Tobii as gaze source while adding webcam-based facial strain and expression signals.",
  },
  {
    value: "mouse",
    label: "Use mouse mode",
    badge: "Demo",
    description: "Use participant mouse position as synthetic gaze for demos without hardware.",
  },
]

function getModeSavedMessage(mode: SensingMode) {
  if (mode === "mouse") {
    return "Mouse mode saved. The setup flow will skip Tobii-specific steps."
  }

  if (mode === "webcam") {
    return "Webcam mode saved. Sessions will use webcam gaze plus webcam facial signals."
  }

  if (mode === "eyeTrackerPlusFace") {
    return "Eyetracker + face mode saved. Tobii stays authoritative for gaze while webcam facial signals are added."
  }

  return "Eyetracker mode saved. The setup flow will require tracker selection and calibration."
}

function getActiveModeBadge(mode: SensingMode) {
  if (mode === "mouse") {
    return "Mouse mode active"
  }

  if (mode === "webcam") {
    return "Webcam mode active"
  }

  if (mode === "eyeTrackerPlusFace") {
    return "Eyetracker + face active"
  }

  return "Eyetracker mode active"
}

export function InputModeSettingsSection() {
  const { data, isLoading } = useGetSensingModeSettingsQuery()
  const [updateSensingModeSettings, { isLoading: isSaving }] =
    useUpdateSensingModeSettingsMutation()
  const [draftMode, setDraftMode] = React.useState<SensingMode>("eyeTracker")
  const [statusMessage, setStatusMessage] = React.useState<string | null>(null)
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (!data) {
      return
    }

    setDraftMode(data.mode)
  }, [data])

  const savedMode = data?.mode ?? "eyeTracker"
  const canChangeMode = data?.canChangeMode ?? true
  const isDirty = draftMode !== savedMode
  const isDisabled = isLoading || isSaving || !canChangeMode

  const handleSave = async () => {
    if (!isDirty || !canChangeMode) {
      return
    }

    setStatusMessage(null)
    setErrorMessage(null)

    try {
      const updated = await updateSensingModeSettings({ mode: draftMode }).unwrap()
      setDraftMode(updated.mode)
      setStatusMessage(getModeSavedMessage(updated.mode))
    } catch (error) {
      setErrorMessage(getErrorMessage(error, "Input mode could not be updated."))
    }
  }

  return (
    <div className="grid gap-6">
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Input Mode</CardTitle>
              <CardDescription>
                Choose the sensing source the experiment runtime should trust.
              </CardDescription>
            </div>
            <Badge variant={savedMode === "mouse" || savedMode === "webcam" ? "secondary" : "outline"}>
              {getActiveModeBadge(savedMode)}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-5">
          {!canChangeMode ? (
            <Alert>
              <Info />
              <AlertTitle>Input mode is locked</AlertTitle>
              <AlertDescription>
                {data?.blockReason ?? "Finish the active session before changing input mode."}
              </AlertDescription>
            </Alert>
          ) : null}

          <ToggleGroup
            type="single"
            value={draftMode}
            onValueChange={(value) => {
              if (
                value === "eyeTracker" ||
                value === "eyeTrackerPlusFace" ||
                value === "mouse"
              ) {
                setDraftMode(value)
                setStatusMessage(null)
                setErrorMessage(null)
              }
            }}
            disabled={isDisabled}
            variant="outline"
            className="grid w-full gap-3 md:grid-cols-2"
          >
            {MODE_OPTIONS.map((option) => {
              const Icon =
                option.value === "mouse"
                  ? MousePointer2
                  : ScanEye

              return (
                <ToggleGroupItem
                  key={option.value}
                  value={option.value}
                  className="h-auto w-full justify-start rounded-lg px-4 py-4 text-left"
                >
                  <div className="flex items-start gap-3">
                    <Icon data-icon="inline-start" />
                    <div className="grid gap-1">
                      <span className="font-medium">{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                      <span className="pt-1">
                        <Badge variant="outline">{option.badge}</Badge>
                      </span>
                    </div>
                  </div>
                </ToggleGroupItem>
              )
            })}
          </ToggleGroup>

          {statusMessage ? (
            <Alert>
              <CheckCircle2 />
              <AlertTitle>Input mode saved</AlertTitle>
              <AlertDescription>{statusMessage}</AlertDescription>
            </Alert>
          ) : null}

          {errorMessage ? (
            <Alert variant="destructive">
              <Info />
              <AlertTitle>Could not save input mode</AlertTitle>
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap justify-end gap-3">
            <Button
              variant="outline"
              disabled={!isDirty || isSaving}
              onClick={() => {
                setDraftMode(savedMode)
                setStatusMessage(null)
                setErrorMessage(null)
              }}
            >
              Reset
            </Button>
            <Button disabled={!isDirty || isSaving || !canChangeMode} onClick={() => void handleSave()}>
              <Save data-icon="inline-start" />
              Save input mode
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
