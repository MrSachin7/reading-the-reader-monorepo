"use client"

import { useMemo, useState } from "react"

import { ModeToggle } from "@/components/theme/mode-toggle"
import { PaletteToggle } from "@/components/theme/palette-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ExperimentCompletionActions } from "@/components/experiment/experiment-completion-actions"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import type {
  PendingInterventionSnapshot,
  ReadingInterventionCommitBoundary,
  ReadingInterventionPolicySnapshot,
} from "@/lib/experiment-session"
import type {
  InterventionModuleDescriptor,
  InterventionParameterValues,
} from "@/lib/intervention-modules"
import type { ReaderAppearanceSettings } from "@/lib/reader-appearance"
import { cn } from "@/lib/utils"
import {
  normalizeFontTheme,
  type ReadingPresentationSettings,
} from "@/modules/pages/reading/lib/readingPresentation"
import { groupInterventionModules } from "@/modules/pages/researcher/current-live/lib/group-intervention-modules"
import {
  formatBoundaryCue,
  formatBoundaryLabel,
  formatParameterHint,
  formatPendingBoundaryCue,
  getOptionLabel,
} from "@/modules/pages/researcher/current-live/lib/intervention-helpers"
import type { ActiveLiveExperimentSession } from "@/modules/pages/researcher/current-live/types"

type LiveInterventionsColumnProps = {
  session: ActiveLiveExperimentSession
  interventionModules: InterventionModuleDescriptor[]
  appearance: ReaderAppearanceSettings
  presentation: ReadingPresentationSettings
  interventionPolicy: ReadingInterventionPolicySnapshot
  pendingIntervention: PendingInterventionSnapshot | null
  onCommitIntervention: (
    next: {
      moduleId: string
      parameters: InterventionParameterValues
      presentation?: Partial<ReadingPresentationSettings>
      appearance?: Partial<ReaderAppearanceSettings>
    },
    reason: string
  ) => void
  onInterventionPolicyChange: (patch: {
    layoutCommitBoundary?: ReadingInterventionCommitBoundary
    layoutFallbackBoundary?: ReadingInterventionCommitBoundary
    layoutFallbackAfterMs?: number
  }) => void | Promise<void>
  onApplyPendingInterventionNow: () => void | Promise<void>
}

export function LiveInterventionsColumn({
  session,
  interventionModules,
  appearance,
  presentation,
  interventionPolicy,
  pendingIntervention,
  onCommitIntervention,
  onInterventionPolicyChange,
  onApplyPendingInterventionNow,
}: LiveInterventionsColumnProps) {
  const [moduleDrafts, setModuleDrafts] = useState<Record<string, InterventionParameterValues>>({})
  const groupedInterventionModules = useMemo(
    () => groupInterventionModules(interventionModules),
    [interventionModules]
  )

  const pendingBoundaryCue = pendingIntervention
    ? formatPendingBoundaryCue(pendingIntervention.requestedBoundary)
    : null

  function getCurrentParameterValue(
    module: InterventionModuleDescriptor,
    parameter: InterventionModuleDescriptor["parameters"][number]
  ) {
    switch (module.moduleId) {
      case "font-family":
        return presentation.fontFamily
      case "font-size":
        return String(presentation.fontSizePx)
      case "line-width":
        return String(presentation.lineWidthPx)
      case "line-height":
        return String(presentation.lineHeight)
      case "letter-spacing":
        return String(presentation.letterSpacingEm)
      case "theme-mode":
        return appearance.themeMode
      case "palette":
        return appearance.palette
      case "participant-edit-lock":
        return String(!presentation.editableByExperimenter)
      default:
        return (
          parameter.defaultValue ??
          parameter.options[0]?.value ??
          (parameter.valueKind === "boolean" ? "false" : "")
        )
    }
  }

  function getDraftParameters(module: InterventionModuleDescriptor) {
    const existingDraft = moduleDrafts[module.moduleId]
    if (existingDraft) {
      return existingDraft
    }

    return Object.fromEntries(
      module.parameters.map((parameter) => [
        parameter.key,
        getCurrentParameterValue(module, parameter),
      ])
    ) as InterventionParameterValues
  }

  function updateDraftParameter(
    module: InterventionModuleDescriptor,
    parameterKey: string,
    value: string
  ) {
    setModuleDrafts((previous) => ({
      ...previous,
      [module.moduleId]: {
        ...(previous[module.moduleId] ?? getDraftParameters(module)),
        [parameterKey]: value,
      },
    }))
  }

  function commitModule(
    module: InterventionModuleDescriptor,
    nextParameters: InterventionParameterValues,
    reasonOverride?: string
  ) {
    setModuleDrafts((previous) => ({
      ...previous,
      [module.moduleId]: { ...nextParameters },
    }))

    const parameter = module.parameters[0]
    const rawValue = parameter ? nextParameters[parameter.key] ?? "" : ""

    switch (module.moduleId) {
      case "font-family":
        onCommitIntervention(
          {
            moduleId: module.moduleId,
            parameters: nextParameters,
            presentation: { fontFamily: normalizeFontTheme(rawValue) },
          },
          `Changed ${module.displayName.toLowerCase()} to ${getOptionLabel(parameter!, rawValue)}`
        )
        return

      case "font-size":
        onCommitIntervention(
          {
            moduleId: module.moduleId,
            parameters: nextParameters,
            presentation: { fontSizePx: Number(rawValue) },
          },
          "Adjusted font size"
        )
        return

      case "line-width":
        onCommitIntervention(
          {
            moduleId: module.moduleId,
            parameters: nextParameters,
            presentation: { lineWidthPx: Number(rawValue) },
          },
          "Adjusted line width"
        )
        return

      case "line-height":
        onCommitIntervention(
          {
            moduleId: module.moduleId,
            parameters: nextParameters,
            presentation: { lineHeight: Number(rawValue) },
          },
          "Adjusted line height"
        )
        return

      case "letter-spacing":
        onCommitIntervention(
          {
            moduleId: module.moduleId,
            parameters: nextParameters,
            presentation: { letterSpacingEm: Number(rawValue) },
          },
          "Adjusted letter spacing"
        )
        return

      case "theme-mode":
        onCommitIntervention(
          {
            moduleId: module.moduleId,
            parameters: nextParameters,
            appearance: { themeMode: rawValue as ReaderAppearanceSettings["themeMode"] },
          },
          rawValue === "dark"
            ? "Switched reader theme to dark mode"
            : "Switched reader theme to light mode"
        )
        return

      case "palette":
        onCommitIntervention(
          {
            moduleId: module.moduleId,
            parameters: nextParameters,
            appearance: { palette: rawValue as ReaderAppearanceSettings["palette"] },
          },
          `Changed reader palette to ${getOptionLabel(parameter!, rawValue).toLowerCase()}`
        )
        return

      case "participant-edit-lock": {
        const locked = rawValue === "true"
        onCommitIntervention(
          {
            moduleId: module.moduleId,
            parameters: nextParameters,
            presentation: { editableByExperimenter: !locked },
          },
          locked
            ? "Locked participant-side presentation changes"
            : "Unlocked participant-side presentation changes"
        )
        return
      }

      default:
        onCommitIntervention(
          {
            moduleId: module.moduleId,
            parameters: nextParameters,
          },
          reasonOverride ?? `Applied ${module.displayName.toLowerCase()}`
        )
        return
    }
  }

  function getPendingSliderValue(moduleId: string, parameterKey: string) {
    if (
      !pendingIntervention ||
      pendingIntervention.status !== "queued" ||
      pendingIntervention.intervention.moduleId !== moduleId
    ) {
      return null
    }

    const pendingPresentation = pendingIntervention.intervention.presentation
    const explicitParameterValue = pendingIntervention.intervention.parameters?.[parameterKey]
    const parsedParameterValue =
      typeof explicitParameterValue === "string" && explicitParameterValue.trim().length > 0
        ? Number(explicitParameterValue)
        : null
    const fallbackParameterValue =
      typeof parsedParameterValue === "number" && Number.isFinite(parsedParameterValue)
        ? parsedParameterValue
        : null

    switch (moduleId) {
      case "font-size":
        return pendingPresentation.fontSizePx ?? fallbackParameterValue
      case "line-width":
        return pendingPresentation.lineWidthPx ?? fallbackParameterValue
      case "line-height":
        return pendingPresentation.lineHeight ?? fallbackParameterValue
      case "letter-spacing":
        return pendingPresentation.letterSpacingEm ?? fallbackParameterValue
      default:
        return fallbackParameterValue
    }
  }

  function renderSliderField(
    module: InterventionModuleDescriptor,
    parameter: InterventionModuleDescriptor["parameters"][number],
    currentValue: number,
    formattedValue: string,
    pendingValue: number | null,
    formatValue: (value: number) => string,
    onValueChange: (value: number) => void
  ) {
    const hasPendingValue = typeof pendingValue === "number" && Number.isFinite(pendingValue)
    const visibleValue = hasPendingValue ? pendingValue! : currentValue
    const min = parameter.minValue ?? currentValue
    const max = parameter.maxValue ?? currentValue
    const range = max - min
    const currentPercent = range > 0 ? ((currentValue - min) / range) * 100 : 0

    return (
      <Field key={module.moduleId}>
        <div className="flex items-center justify-between">
          <FieldLabel>{parameter.displayName}</FieldLabel>
          <span className="font-mono text-xs tabular-nums">
            {hasPendingValue ? (
              <>
                <span className="text-muted-foreground">{formattedValue}</span>
                <span className="mx-1 text-amber-600 dark:text-amber-400">→</span>
                <span className="font-semibold text-amber-700 dark:text-amber-300">
                  {formatValue(visibleValue)}
                </span>
              </>
            ) : (
              <span className="text-muted-foreground">{formattedValue}</span>
            )}
          </span>
        </div>
        <div className="relative mt-3 py-1.5">
          <Slider
            min={min}
            max={max}
            step={parameter.step ?? 1}
            value={[visibleValue]}
            onValueChange={(value) => onValueChange(value[0] ?? visibleValue)}
            className={cn(
              hasPendingValue &&
                "[&_[data-slot=slider-range]]:bg-amber-500 [&_[data-slot=slider-thumb]]:border-amber-500 [&_[data-slot=slider-thumb]]:ring-amber-500/30"
            )}
          />
          {hasPendingValue ? (
            <span
              aria-hidden
              title={`Current: ${formattedValue}`}
              className="pointer-events-none absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-muted-foreground/70 bg-background shadow-sm"
              style={{ left: `${currentPercent}%` }}
            />
          ) : null}
        </div>
      </Field>
    )
  }

  function renderModuleControl(module: InterventionModuleDescriptor) {
    const parameter = module.parameters[0]
    if (!parameter) {
      return renderGenericModuleControl(module)
    }

    switch (module.moduleId) {
      case "font-family":
        return (
          <Field key={module.moduleId}>
            <FieldLabel>{parameter.displayName}</FieldLabel>
            <Select
              value={presentation.fontFamily}
              onValueChange={(value) => commitModule(module, { [parameter.key]: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={module.displayName} />
              </SelectTrigger>
              <SelectContent>
                {parameter.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.displayName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )

      case "participant-edit-lock":
        return (
          <div
            key={module.moduleId}
            className="flex items-center justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{module.displayName}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Participant can edit</p>
            </div>
            <Switch
              checked={!presentation.editableByExperimenter}
              onCheckedChange={(checked) =>
                commitModule(module, { [parameter.key]: checked ? "true" : "false" })
              }
            />
          </div>
        )

      case "theme-mode":
        return (
          <Field key={module.moduleId}>
            <div className="flex items-center justify-between gap-3">
              <FieldLabel>{module.displayName}</FieldLabel>
              <ModeToggle
                className="shrink-0"
                value={appearance.themeMode}
                onValueChange={(value) => commitModule(module, { [parameter.key]: value })}
              />
            </div>
          </Field>
        )

      case "palette":
        return (
          <Field key={module.moduleId}>
            <FieldLabel>{module.displayName}</FieldLabel>
            <PaletteToggle
              value={appearance.palette}
              onValueChange={(value) => commitModule(module, { [parameter.key]: value })}
              appearance="flat"
              className="mt-2 grid w-full grid-cols-3 [&>[data-slot=toggle-group-item]]:w-full [&>[data-slot=toggle-group-item]]:shrink [&>[data-slot=toggle-group-item]]:justify-center [&>[data-slot=toggle-group-item]]:px-0"
            />
          </Field>
        )

      case "font-size":
        return renderSliderField(
          module,
          parameter,
          presentation.fontSizePx,
          `${presentation.fontSizePx}px`,
          getPendingSliderValue(module.moduleId, parameter.key),
          (value) => `${value}px`,
          (value) => commitModule(module, { [parameter.key]: String(value) })
        )

      case "line-width":
        return renderSliderField(
          module,
          parameter,
          presentation.lineWidthPx,
          `${presentation.lineWidthPx}px`,
          getPendingSliderValue(module.moduleId, parameter.key),
          (value) => `${value}px`,
          (value) => commitModule(module, { [parameter.key]: String(value) })
        )

      case "line-height":
        return renderSliderField(
          module,
          parameter,
          presentation.lineHeight,
          presentation.lineHeight.toFixed(2),
          getPendingSliderValue(module.moduleId, parameter.key),
          (value) => value.toFixed(2),
          (value) => commitModule(module, { [parameter.key]: value.toFixed(2) })
        )

      case "letter-spacing":
        return renderSliderField(
          module,
          parameter,
          presentation.letterSpacingEm,
          `${presentation.letterSpacingEm.toFixed(2)}em`,
          getPendingSliderValue(module.moduleId, parameter.key),
          (value) => `${value.toFixed(2)}em`,
          (value) => commitModule(module, { [parameter.key]: value.toFixed(2) })
        )

      default:
        return renderGenericModuleControl(module)
    }
  }

  function renderGenericModuleControl(module: InterventionModuleDescriptor) {
    const draftParameters = getDraftParameters(module)
    const canApply =
      module.parameters.length > 0 &&
      module.parameters.every((parameter) => {
        if (!parameter.required) {
          return true
        }

        const value = draftParameters[parameter.key]
        return typeof value === "string" && value.trim().length > 0
      })

    return (
      <div key={module.moduleId} className="rounded-lg border bg-background/50 p-3">
        <p className="text-sm font-medium">{module.displayName}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{module.description}</p>

        {module.parameters.length > 0 ? (
          <div className="mt-3 space-y-3">
            {module.parameters.map((parameter) => {
              const draftValue = draftParameters[parameter.key] ?? ""
              const hint = formatParameterHint(parameter)

              if (parameter.options.length > 0) {
                return (
                  <Field key={`${module.moduleId}:${parameter.key}`}>
                    <FieldLabel>{parameter.displayName}</FieldLabel>
                    <Select
                      value={draftValue}
                      onValueChange={(value) => updateDraftParameter(module, parameter.key, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder={parameter.displayName} />
                      </SelectTrigger>
                      <SelectContent>
                        {parameter.options.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )
              }

              if (parameter.valueKind === "boolean") {
                return (
                  <div
                    key={`${module.moduleId}:${parameter.key}`}
                    className="flex items-center justify-between rounded-md bg-muted/40 px-3 py-2"
                  >
                    <p className="text-sm font-medium">{parameter.displayName}</p>
                    <Switch
                      checked={draftValue === "true"}
                      onCheckedChange={(checked) =>
                        updateDraftParameter(module, parameter.key, checked ? "true" : "false")
                      }
                    />
                  </div>
                )
              }

              return (
                <Field key={`${module.moduleId}:${parameter.key}`}>
                  <FieldLabel>
                    {parameter.displayName}
                    {hint ? <span className="ml-2 text-muted-foreground">{hint}</span> : null}
                  </FieldLabel>
                  <Input
                    type={parameter.valueKind === "string" ? "text" : "number"}
                    value={draftValue}
                    min={parameter.minValue ?? undefined}
                    max={parameter.maxValue ?? undefined}
                    step={parameter.step ?? undefined}
                    placeholder={parameter.defaultValue ?? undefined}
                    onChange={(event) =>
                      updateDraftParameter(module, parameter.key, event.target.value)
                    }
                  />
                </Field>
              )
            })}
          </div>
        ) : null}

        <div className="mt-3 flex justify-end">
          <Button
            size="sm"
            variant="outline"
            disabled={!canApply}
            onClick={() => commitModule(module, draftParameters)}
          >
            Apply
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="order-3 flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden xl:order-3">
      <Card className="rounded-2xl bg-card/96 shadow-sm">
        <CardContent className="pt-6">
          <ExperimentCompletionActions
            session={session}
            source="researcher-live-view"
            className="w-full items-stretch [&>div:first-child]:w-full [&>div:first-child]:flex-col [&>div:first-child]:items-stretch [&_button]:w-full"
          />
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-1 flex-col rounded-2xl bg-card/96 shadow-sm">
        <CardContent className="flex min-h-0 flex-1 flex-col pt-6">
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-5 pr-4">
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold">Typography timing</h3>
                  <Badge variant="outline" className="font-mono text-[10px] uppercase tracking-wider">
                    {formatBoundaryLabel(interventionPolicy.layoutCommitBoundary)}
                  </Badge>
                </div>
                <Select
                  value={interventionPolicy.layoutCommitBoundary}
                  onValueChange={(value) =>
                    void onInterventionPolicyChange({
                      layoutCommitBoundary: value as ReadingInterventionCommitBoundary,
                      layoutFallbackBoundary: value as ReadingInterventionCommitBoundary,
                      layoutFallbackAfterMs: 0,
                    })
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Commit boundary" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="page-turn">Page turn</SelectItem>
                    <SelectItem value="sentence-end">Sentence end</SelectItem>
                    <SelectItem value="paragraph-end">Paragraph end</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs leading-5 text-muted-foreground">
                  New typography changes will{" "}
                  {formatBoundaryCue(interventionPolicy.layoutCommitBoundary).toLowerCase()}.
                </p>

                {pendingIntervention ? (
                  <div className="flex items-center gap-2 rounded-lg border border-amber-500/35 bg-amber-500/10 px-3 py-2">
                    <span className="size-1.5 shrink-0 animate-pulse rounded-full bg-amber-500" />
                    <p className="min-w-0 flex-1 truncate text-xs text-amber-950 dark:text-amber-100">
                      {pendingBoundaryCue}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 shrink-0 border-amber-500/50 bg-background px-2 text-xs"
                      disabled={pendingIntervention.status !== "queued"}
                      onClick={() => void onApplyPendingInterventionNow()}
                    >
                      Apply now
                    </Button>
                  </div>
                ) : null}
              </section>

              <div className="h-px bg-border/70" />

              <section className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold">Manual interventions</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Appearance changes apply immediately. Typography waits for the selected boundary.
                  </p>
                </div>

                {groupedInterventionModules.length > 0 ? (
                  groupedInterventionModules.map((group) => (
                    <div key={group.key} className="space-y-3">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                        {group.title}
                      </p>
                      <div className="space-y-3">
                        {group.modules.map((module) => renderModuleControl(module))}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
                    No intervention modules registered.
                  </p>
                )}
              </section>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}
