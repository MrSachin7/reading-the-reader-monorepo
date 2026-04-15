"use client"

import { useEffect, useMemo, useState, type ReactNode } from "react"

import { ModeToggle } from "@/components/theme/mode-toggle"
import { PaletteToggle } from "@/components/theme/palette-toggle"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Kbd, KbdGroup } from "@/components/ui/kbd"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import type { InterventionModuleDescriptor, InterventionParameterValues } from "@/lib/intervention-modules"
import type {
  DecisionConfiguration,
  DecisionProposalSnapshot,
  DecisionState,
  ExternalProviderStatusSnapshot,
  ExperimentLiveMonitoringSnapshot,
  LayoutInterventionGuardrailSnapshot,
  PendingInterventionSnapshot,
  ReadingInterventionCommitBoundary,
  ReadingInterventionPolicySnapshot,
} from "@/lib/experiment-session"
import type { ReaderAppearanceSettings } from "@/lib/reader-appearance"
import { cn } from "@/lib/utils"
import { normalizeFontTheme, type ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"
import { groupInterventionModules } from "@/modules/pages/researcher/current-live/lib/group-intervention-modules"
import type { LiveMirrorTrustState, LiveReaderOptions } from "@/modules/pages/researcher/current-live/types"
import {
  formatDurationMs,
  formatPercent,
  getLatencyBars,
  getLiveHealthState,
  getLatencyTone,
} from "@/modules/pages/researcher/current-live/utils"

function ControlRow({
  label,
  description,
  checked,
  disabled = false,
  onCheckedChange,
}: {
  label: string
  description: string
  checked: boolean
  disabled?: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 rounded-[1.1rem] border bg-background/80 px-4 py-3",
        disabled && "opacity-55"
      )}
    >
      <div className="min-w-0">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{description}</p>
      </div>
      <Switch
        checked={checked}
        disabled={disabled}
        onCheckedChange={onCheckedChange}
        className="mt-0.5"
      />
    </div>
  )
}

function MetricItem({
  label,
  value,
  className,
}: {
  label: string
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <div className="mt-2 min-w-0 text-sm leading-5 font-semibold break-words text-foreground">
        {value}
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
      {children}
    </p>
  )
}

function ThemePalette({
  value,
  onValueChange,
}: {
  value?: ReaderAppearanceSettings["palette"]
  onValueChange: (palette: ReaderAppearanceSettings["palette"]) => void
}) {
  return (
    <PaletteToggle
      value={value}
      onValueChange={onValueChange}
      appearance="flat"
      className="grid w-full grid-cols-3 [&>[data-slot=toggle-group-item]]:w-full [&>[data-slot=toggle-group-item]]:shrink [&>[data-slot=toggle-group-item]]:justify-center [&>[data-slot=toggle-group-item]]:px-0"
    />
  )
}

function isInteractiveTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return Boolean(
    target.closest(
      "button, input, textarea, select, [contenteditable='true'], [role='combobox'], [role='switch']"
    )
  )
}

function FollowParticipantRow({
  checked,
  onCheckedChange,
}: {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-4">
      <div className="min-w-0">
        <p className="text-base font-semibold">Follow participant</p>
        <span
          className={cn(
            "mt-2 inline-flex rounded-full px-0 py-0 text-[10px] font-medium uppercase tracking-[0.18em]",
            checked ? "text-foreground" : "text-muted-foreground"
          )}
        >
          {checked ? "Synced live" : "Manual view"}
        </span>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  )
}

function LatencyValue({ latencyMs }: { latencyMs: number | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="min-w-0 break-words">{latencyMs === null ? "-" : `${latencyMs} ms`}</span>
      <LatencySignal latencyMs={latencyMs} />
    </div>
  )
}

function ControlSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <SectionLabel>{title}</SectionLabel>
      <div className="space-y-2.5">{children}</div>
    </div>
  )
}

function LatencySignal({ latencyMs }: { latencyMs: number | null | undefined }) {
  const bars = getLatencyBars(latencyMs)
  const tone = getLatencyTone(latencyMs)

  return (
    <div className={`flex items-end gap-0.5 ${tone}`} aria-hidden="true">
      {[0, 1, 2, 3].map((index) => (
        <span
          key={index}
          className={`w-1 rounded-full bg-current transition-opacity ${
            index < bars ? "opacity-100" : "opacity-20"
          }`}
          style={{ height: `${6 + index * 3}px` }}
        />
      ))}
    </div>
  )
}

type LiveControlsColumnProps = {
  interventionModules: InterventionModuleDescriptor[]
  followParticipant: boolean
  liveMonitoring: ExperimentLiveMonitoringSnapshot
  mirrorTrustState: LiveMirrorTrustState
  layoutGuardrail: LayoutInterventionGuardrailSnapshot | null
  decisionConfiguration: DecisionConfiguration
  decisionState: DecisionState
  externalProviderStatus: ExternalProviderStatusSnapshot
  activeWord: string | null
  participantName: string | null
  sampleRateHz: number
  validityRate: number
  latencyMs: number | null
  readingDynamicsEnabled: boolean
  currentFixationDurationMs: number | null
  fixatedTokenCount: number
  skimmedTokenCount: number
  appearance: ReaderAppearanceSettings
  presentation: ReadingPresentationSettings
  interventionPolicy: ReadingInterventionPolicySnapshot
  pendingIntervention: PendingInterventionSnapshot | null
  readerOptions: LiveReaderOptions
  onFollowParticipantChange: (checked: boolean) => void
  onReaderOptionChange: (key: keyof LiveReaderOptions, value: boolean) => void
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
  onApproveProposal: (proposalId: string) => void
  onRejectProposal: (proposalId: string) => void
  onPauseAutomation: () => void
  onResumeAutomation: () => void
  onExecutionModeChange: (executionMode: string) => void
}

export function LiveControlsColumn({
  interventionModules,
  followParticipant,
  liveMonitoring,
  mirrorTrustState,
  layoutGuardrail,
  decisionConfiguration,
  decisionState,
  externalProviderStatus,
  activeWord,
  participantName,
  sampleRateHz,
  validityRate,
  latencyMs,
  readingDynamicsEnabled,
  currentFixationDurationMs,
  fixatedTokenCount,
  skimmedTokenCount,
  appearance,
  presentation,
  interventionPolicy,
  pendingIntervention,
  readerOptions,
  onFollowParticipantChange,
  onReaderOptionChange,
  onCommitIntervention,
  onInterventionPolicyChange,
  onApplyPendingInterventionNow,
  onApproveProposal,
  onRejectProposal,
  onPauseAutomation,
  onResumeAutomation,
  onExecutionModeChange,
}: LiveControlsColumnProps) {
  const [isReaderControlsOpen, setIsReaderControlsOpen] = useState(false)
  const [moduleDrafts, setModuleDrafts] = useState<Record<string, InterventionParameterValues>>({})
  const groupedInterventionModules = useMemo(
    () => groupInterventionModules(interventionModules),
    [interventionModules]
  )
  const liveHealth = getLiveHealthState({
    sampleRateHz,
    validityRate,
    latencyMs,
    hasParticipantViewConnection: liveMonitoring.hasParticipantViewConnection,
    hasParticipantViewportData: liveMonitoring.hasParticipantViewportData,
  })
  const isExternalDecisionMode = decisionConfiguration.providerId === "external"
  const isExternalDecisionUnavailable =
    isExternalDecisionMode && !externalProviderStatus.isConnected
  const activeProposalChangeSummary = decisionState.activeProposal
    ? summarizeProposalChanges(
        decisionState.activeProposal,
        presentation,
        appearance,
        interventionModules
      )
    : []

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsReaderControlsOpen(false)
        return
      }

      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (event.key.toLowerCase() === "v") {
        if (!isReaderControlsOpen && isInteractiveTarget(event.target)) {
          return
        }

        event.preventDefault()
        setIsReaderControlsOpen((previous) => !previous)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [isReaderControlsOpen])

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
        return parameter.defaultValue ?? parameter.options[0]?.value ?? (parameter.valueKind === "boolean" ? "false" : "")
    }
  }

  function getDraftParameters(module: InterventionModuleDescriptor) {
    const existingDraft = moduleDrafts[module.moduleId]
    if (existingDraft) {
      return existingDraft
    }

    return Object.fromEntries(
      module.parameters.map((parameter) => [parameter.key, getCurrentParameterValue(module, parameter)])
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
            className="flex items-center justify-between rounded-[1.1rem] border bg-muted/20 px-4 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium">{module.displayName}</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{module.description}</p>
            </div>
            <Switch
              checked={!presentation.editableByExperimenter}
              onCheckedChange={(checked) => commitModule(module, { [parameter.key]: checked ? "true" : "false" })}
            />
          </div>
        )

      case "theme-mode":
        return (
          <Field key={module.moduleId}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <FieldLabel>{module.displayName}</FieldLabel>
              <ModeToggle
                className="shrink-0"
                value={appearance.themeMode}
                onValueChange={(value) => commitModule(module, { [parameter.key]: value })}
              />
            </div>
            <p className="text-xs leading-5 text-muted-foreground">{module.description}</p>
          </Field>
        )

      case "palette":
        return (
          <Field key={module.moduleId}>
            <FieldLabel>{module.displayName}</FieldLabel>
            <div className="mt-2">
              <ThemePalette
                value={appearance.palette}
                onValueChange={(value) => commitModule(module, { [parameter.key]: value })}
              />
            </div>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{module.description}</p>
          </Field>
        )

      case "font-size":
        return renderSliderField(
          module,
          parameter,
          presentation.fontSizePx,
          `${presentation.fontSizePx}px`,
          (value) => commitModule(module, { [parameter.key]: String(value) })
        )

      case "line-width":
        return renderSliderField(
          module,
          parameter,
          presentation.lineWidthPx,
          `${presentation.lineWidthPx}px`,
          (value) => commitModule(module, { [parameter.key]: String(value) })
        )

      case "line-height":
        return renderSliderField(
          module,
          parameter,
          presentation.lineHeight,
          presentation.lineHeight.toFixed(2),
          (value) => commitModule(module, { [parameter.key]: value.toFixed(2) })
        )

      case "letter-spacing":
        return renderSliderField(
          module,
          parameter,
          presentation.letterSpacingEm,
          `${presentation.letterSpacingEm.toFixed(2)}em`,
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
      <div key={module.moduleId} className="rounded-[1.1rem] border bg-background/80 px-4 py-4">
        <div className="space-y-1">
          <p className="text-sm font-medium">{module.displayName}</p>
          <p className="text-xs leading-5 text-muted-foreground">{module.description}</p>
        </div>

        {module.parameters.length > 0 ? (
          <div className="mt-4 space-y-3">
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
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">
                      {parameter.description}
                      {hint ? ` · ${hint}` : ""}
                    </p>
                  </Field>
                )
              }

              if (parameter.valueKind === "boolean") {
                return (
                  <div
                    key={`${module.moduleId}:${parameter.key}`}
                    className="flex items-center justify-between rounded-[1rem] border bg-muted/20 px-3 py-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{parameter.displayName}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {parameter.description}
                      </p>
                    </div>
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
                  <FieldLabel>{parameter.displayName}</FieldLabel>
                  <Input
                    type={parameter.valueKind === "string" ? "text" : "number"}
                    value={draftValue}
                    min={parameter.minValue ?? undefined}
                    max={parameter.maxValue ?? undefined}
                    step={parameter.step ?? undefined}
                    placeholder={parameter.defaultValue ?? undefined}
                    onChange={(event) => updateDraftParameter(module, parameter.key, event.target.value)}
                  />
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {parameter.description}
                    {hint ? ` · ${hint}` : ""}
                  </p>
                </Field>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 rounded-[1rem] border border-dashed bg-muted/10 px-3 py-3 text-xs leading-5 text-muted-foreground">
            This module is registered without researcher-editable parameters.
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {module.parameters.length > 1
              ? "Apply all parameter values together."
              : "Metadata-driven manual intervention."}
          </p>
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
    <Sheet open={isReaderControlsOpen} onOpenChange={setIsReaderControlsOpen}>
      <div className="order-2 flex min-h-0 min-w-0 flex-col gap-4 overflow-hidden xl:order-1">
        <Card className="rounded-[1.6rem] bg-card/96 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <SectionLabel>Session operations</SectionLabel>

              <div className="rounded-[1.1rem] border bg-background/80 px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium">Live health</p>
                  <span
                    className={cn(
                      "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]",
                      liveHealth.tone === "positive"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                        : liveHealth.tone === "warning"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                          : "border-rose-500/30 bg-rose-500/10 text-rose-700"
                    )}
                  >
                    {liveHealth.label}
                  </span>
                </div>
                <p className="mt-2 text-sm text-foreground">{mirrorTrustState.headline}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {liveHealth.detail}
                </p>
              </div>

              {layoutGuardrail ? (
                <div className="rounded-[1.1rem] border bg-background/80 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-medium">Layout guardrail</p>
                    <span
                      className={cn(
                        "inline-flex rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.18em]",
                        layoutGuardrail.status === "suppressed"
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-700"
                          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                      )}
                    >
                      {layoutGuardrail.status === "suppressed" ? "Holding changes" : "Layout applied"}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-foreground">
                    {layoutGuardrail.reason
                      ? `Latest reason: ${layoutGuardrail.reason}`
                      : "The latest layout-affecting change was accepted."}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {layoutGuardrail.affectedProperties.length > 0
                      ? `Fields: ${layoutGuardrail.affectedProperties.join(", ")}`
                      : "No layout fields recorded."}
                    {layoutGuardrail.cooldownUntilUnixMs
                      ? ` • cooldown until ${new Date(layoutGuardrail.cooldownUntilUnixMs).toLocaleTimeString()}`
                      : ""}
                  </p>
                </div>
              ) : null}

              <div className="rounded-[1.1rem] border bg-background/80 px-4 py-3">
                <p className="text-sm font-medium">{decisionConfiguration.conditionLabel}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {decisionConfiguration.providerId} · {decisionConfiguration.executionMode}
                  {decisionState.automationPaused ? " · paused" : ""}
                </p>
              </div>

              <div className="rounded-[1.2rem] border bg-background/80 px-4 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Decision mode</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {decisionConfiguration.conditionLabel}
                    </p>
                  </div>
                  <Badge
                    className={cn(
                      "border px-3 py-1 text-[10px] uppercase tracking-[0.18em]",
                      decisionConfiguration.executionMode === "autonomous"
                        ? "border-rose-600/30 bg-rose-600 text-white"
                        : "border-sky-600/30 bg-sky-600 text-white"
                    )}
                  >
                    {formatExecutionModeLabel(decisionConfiguration.executionMode)}
                  </Badge>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3">
                  {(["advisory", "autonomous"] as const).map((mode) => {
                    const isActive = decisionConfiguration.executionMode === mode
                    return (
                      <div
                        key={mode}
                        className={cn(
                          "rounded-xl border px-3 py-3",
                          isActive && mode === "advisory" && "border-sky-500/60 bg-sky-500/10",
                          isActive && mode === "autonomous" && "border-rose-500/60 bg-rose-500/10",
                          !isActive && "border-border/70 bg-muted/20 opacity-70"
                        )}
                      >
                        <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {mode}
                        </p>
                        <p className="mt-2 text-sm font-semibold">
                          {isActive ? "Currently running" : "Inactive"}
                        </p>
                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                          {mode === "advisory"
                            ? "Requires researcher approval before applying a proposal."
                            : "Allows validated decisions to apply automatically."}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {isExternalDecisionMode ? (
                <div
                  className={cn(
                    "rounded-[1.1rem] border px-4 py-3",
                    isExternalDecisionUnavailable
                      ? "border-amber-500/30 bg-amber-500/10"
                      : "border-emerald-500/30 bg-emerald-500/10"
                  )}
                >
                  <p className="text-sm font-medium">
                    {isExternalDecisionUnavailable ? "External provider unavailable" : "External provider connected"}
                  </p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {isExternalDecisionUnavailable
                      ? "The external condition stays selected, but no decision-maker service is connected. External execution is blocked until it reconnects."
                      : `${externalProviderStatus.displayName ?? externalProviderStatus.providerId ?? "External provider"} is connected for this condition.`}
                  </p>
                </div>
              ) : null}

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  onClick={() =>
                    decisionState.automationPaused
                      ? onResumeAutomation()
                      : onPauseAutomation()
                  }
                >
                  {decisionState.automationPaused ? "Resume automation" : "Pause automation"}
                </Button>
                <Button
                  variant="outline"
                  disabled={isExternalDecisionUnavailable}
                  onClick={() =>
                    onExecutionModeChange(
                      decisionConfiguration.executionMode === "autonomous"
                        ? "advisory"
                        : "autonomous"
                    )
                  }
                >
                  Switch to {decisionConfiguration.executionMode === "autonomous" ? "Advisory" : "Autonomous"}
                </Button>
              </div>

              {decisionState.activeProposal ? (
                <div className="rounded-[1.2rem] border-2 border-primary/35 bg-primary/5 px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Active proposal</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        Pending researcher decision
                      </p>
                    </div>
                    <Badge className="border-emerald-600/30 bg-emerald-600 text-white">
                      Awaiting action
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-foreground">
                    {decisionState.activeProposal.rationale}
                  </p>

                  {activeProposalChangeSummary.length > 0 ? (
                    <div className="mt-4 rounded-xl border bg-background/80 px-3 py-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Proposed change
                      </p>
                      <div className="mt-2 space-y-2">
                        {activeProposalChangeSummary.map((change) => (
                          <p key={change} className="text-sm font-medium text-foreground">
                            {change}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <Button
                      className="bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => onApproveProposal(decisionState.activeProposal!.proposalId)}
                    >
                      Accept and apply
                    </Button>
                    <Button
                      className="border-rose-500/40 bg-rose-500/10 text-rose-700 hover:bg-rose-500/15 hover:text-rose-800"
                      variant="outline"
                      onClick={() => onRejectProposal(decisionState.activeProposal!.proposalId)}
                    >
                      Reject proposal
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="rounded-[1.1rem] border border-dashed bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  No active proposal. Manual intervention remains available below.
                </div>
              )}

              <div className="rounded-[1.2rem] border bg-background/80 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">Timing policy</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Queue layout changes until a safer reading boundary, then fall back if the wait gets too long.
                    </p>
                  </div>
                  <Badge variant="outline">
                    {formatBoundaryLabel(interventionPolicy.layoutCommitBoundary)}
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  <Field>
                    <FieldLabel>Commit boundary</FieldLabel>
                    <Select
                      value={interventionPolicy.layoutCommitBoundary}
                      onValueChange={(value) =>
                        void onInterventionPolicyChange({
                          layoutCommitBoundary: value as ReadingInterventionCommitBoundary,
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
                  </Field>

                  <Field>
                    <FieldLabel>Fallback boundary</FieldLabel>
                    <Select
                      value={interventionPolicy.layoutFallbackBoundary}
                      onValueChange={(value) =>
                        void onInterventionPolicyChange({
                          layoutFallbackBoundary: value as ReadingInterventionCommitBoundary,
                        })
                      }
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Fallback boundary" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="immediate">Immediate</SelectItem>
                        <SelectItem value="page-turn">Page turn</SelectItem>
                        <SelectItem value="sentence-end">Sentence end</SelectItem>
                        <SelectItem value="paragraph-end">Paragraph end</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>

                  <Field>
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <FieldLabel>Fallback wait</FieldLabel>
                      <span className="text-xs text-muted-foreground">
                        {interventionPolicy.layoutFallbackAfterMs} ms
                      </span>
                    </div>
                    <Slider
                      min={1000}
                      max={12000}
                      step={500}
                      value={[interventionPolicy.layoutFallbackAfterMs]}
                      onValueChange={(value) =>
                        void onInterventionPolicyChange({
                          layoutFallbackAfterMs: value[0] ?? interventionPolicy.layoutFallbackAfterMs,
                        })
                      }
                    />
                  </Field>
                </div>

                <div className="mt-4 rounded-xl border bg-muted/20 px-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium">Pending intervention</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">
                        {pendingIntervention
                          ? pendingIntervention.intervention.reason
                          : "No queued typography change right now."}
                      </p>
                    </div>
                    <Badge variant={pendingIntervention ? "secondary" : "outline"}>
                      {pendingIntervention?.status ?? "idle"}
                    </Badge>
                  </div>

                  {pendingIntervention ? (
                    <>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">
                        {formatBoundaryLabel(pendingIntervention.requestedBoundary)}
                        {pendingIntervention.fallbackBoundary
                          ? ` · fallback ${formatBoundaryLabel(pendingIntervention.fallbackBoundary)}`
                          : ""}
                        {pendingIntervention.waitDurationMs !== null
                          ? ` · waited ${pendingIntervention.waitDurationMs} ms`
                          : ""}
                        {pendingIntervention.resolutionReason
                          ? ` · ${pendingIntervention.resolutionReason}`
                          : ""}
                      </p>
                      <Button
                        className="mt-3 w-full"
                        variant="outline"
                        disabled={pendingIntervention.status !== "queued"}
                        onClick={() => void onApplyPendingInterventionNow()}
                      >
                        Apply now
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>

              <FollowParticipantRow
                checked={followParticipant}
                onCheckedChange={onFollowParticipantChange}
              />

              <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                <MetricItem
                  label="Current word"
                  value={activeWord ?? "No fixation"}
                  className="col-span-2"
                />
                <MetricItem label="Sample rate" value={`${sampleRateHz} Hz`} />
                <MetricItem label="Validity" value={formatPercent(validityRate)} />
                <MetricItem label="Latency" value={<LatencyValue latencyMs={latencyMs} />} />
                <MetricItem label="Participant" value={participantName ?? "Not registered"} />
                <MetricItem label="Mirror" value={mirrorTrustState.label} />
                <MetricItem
                  label="Viewport"
                  value={
                    liveMonitoring.hasParticipantViewportData
                      ? "Measured"
                      : liveMonitoring.hasParticipantViewConnection
                        ? "Pending"
                        : "Offline"
                  }
                />
                <MetricItem label="Heat map" value={readingDynamicsEnabled ? "Live" : "Off"} />
                <MetricItem
                  label="Current dwell"
                  value={
                    readingDynamicsEnabled ? formatDurationMs(currentFixationDurationMs) : "Off"
                  }
                />
                <MetricItem
                  label="Fixated"
                  value={readingDynamicsEnabled ? fixatedTokenCount : "-"}
                />
                <MetricItem
                  label="Skimmed"
                  value={readingDynamicsEnabled ? skimmedTokenCount : "-"}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] bg-card/96 shadow-sm">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="rounded-[1.1rem] border bg-background/80 px-4 py-3">
                <p className="text-sm font-medium">Test interventions from here</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  Use the controls below to queue a manual intervention. Appearance changes apply
                  immediately. Typography changes follow the timing policy above, so with{" "}
                  <span className="font-medium text-foreground">Page turn</span> selected you can
                  either turn the page in the participant view or press <span className="font-medium text-foreground">Apply now</span> in the pending card to force the change.
                </p>
              </div>
              {groupedInterventionModules.length > 0 ? (
                groupedInterventionModules.map((group) => (
                  <div key={group.key} className="space-y-4">
                    <SectionLabel>{group.title}</SectionLabel>
                    {group.modules.map((module) => renderModuleControl(module))}
                  </div>
                ))
              ) : (
                <div className="rounded-[1.1rem] border border-dashed bg-background/60 px-4 py-3 text-sm text-muted-foreground">
                  No intervention modules are registered for this session.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.6rem] bg-card/96 shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <SectionLabel>ReaderShell controls</SectionLabel>
                <p className="mt-2 text-sm font-medium">Press V to open</p>
              </div>
              <KbdGroup className="text-muted-foreground">
                <Kbd>V</Kbd>
                <span className="text-[10px] uppercase tracking-[0.18em]">open</span>
                <Kbd>Esc</Kbd>
                <span className="text-[10px] uppercase tracking-[0.18em]">hide</span>
              </KbdGroup>
            </div>
          </CardContent>
        </Card>

        <SheetContent side="left" className="w-[22rem] sm:max-w-[22rem]">
          <SheetHeader className="border-b">
            <SheetTitle>Reader view controls</SheetTitle>
            <SheetDescription>Press Esc to close.</SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-4">
              <ControlSection title="Context">
                <ControlRow
                  label="Preserve context"
                  description="Keep the reading position anchored when presentation changes."
                  checked={readerOptions.preserveContextOnIntervention}
                  onCheckedChange={(checked) => onReaderOptionChange("preserveContextOnIntervention", checked)}
                />
                <ControlRow
                  label="Highlight context"
                  description="Reveal the preserved anchor briefly after an intervention."
                  checked={readerOptions.highlightContext}
                  disabled={!readerOptions.preserveContextOnIntervention}
                  onCheckedChange={(checked) => onReaderOptionChange("highlightContext", checked)}
                />
              </ControlSection>

              <ControlSection title="Gaze and text">
                <ControlRow
                  label="Show fixation heat map"
                  description="Color tokens by accumulated fixation time and mark brief skims directly in the mirrored text."
                  checked={readingDynamicsEnabled}
                  onCheckedChange={(checked) =>
                    onReaderOptionChange("showFixationHeatmap", checked)
                  }
                />
                <ControlRow
                  label="Display gaze position"
                  description="Show the participant gaze marker inside the mirrored page."
                  checked={readerOptions.displayGazePosition}
                  onCheckedChange={(checked) => onReaderOptionChange("displayGazePosition", checked)}
                />
                <ControlRow
                  label="Highlight focused token"
                  description="Highlight the token the participant is currently focused on."
                  checked={readerOptions.highlightTokensBeingLookedAt}
                  onCheckedChange={(checked) => onReaderOptionChange("highlightTokensBeingLookedAt", checked)}
                />
                <ControlRow
                  label="Show LIX scores"
                  description="Display readability badges inside the mirrored page."
                  checked={readerOptions.showLixScores}
                  onCheckedChange={(checked) => onReaderOptionChange("showLixScores", checked)}
                />
                {readingDynamicsEnabled ? (
                  <div className="rounded-[1.1rem] border border-amber-500/20 bg-amber-500/8 px-4 py-3 text-xs leading-5 text-amber-900">
                    Light amber means a shorter fixation. Darker orange means a longer fixation. Blue underlines mark
                    quick passes that were likely skimmed.
                  </div>
                ) : null}
              </ControlSection>

              <ControlSection title="Reader chrome">
                <ControlRow
                  label="Show toolbar"
                  description="Reveal the reader toolbar in the mirrored page."
                  checked={readerOptions.showToolbar}
                  onCheckedChange={(checked) => onReaderOptionChange("showToolbar", checked)}
                />
                <ControlRow
                  label="Show back button"
                  description="Only applies while the mirrored toolbar is visible."
                  checked={readerOptions.showBackButton}
                  disabled={!readerOptions.showToolbar}
                  onCheckedChange={(checked) => onReaderOptionChange("showBackButton", checked)}
                />
              </ControlSection>
            </div>
          </div>
        </SheetContent>
      </div>
    </Sheet>
  )
}

function formatExecutionModeLabel(executionMode: string) {
  return executionMode === "autonomous" ? "Autonomous" : "Advisory"
}

function formatBoundaryLabel(boundary: ReadingInterventionCommitBoundary) {
  switch (boundary) {
    case "immediate":
      return "Immediate"
    case "sentence-end":
      return "Sentence end"
    case "paragraph-end":
      return "Paragraph end"
    case "page-turn":
      return "Page turn"
    default:
      return boundary
  }
}

function summarizeProposalChanges(
  proposal: DecisionProposalSnapshot,
  presentation: ReadingPresentationSettings,
  appearance: ReaderAppearanceSettings,
  interventionModules: InterventionModuleDescriptor[]
) {
  const changes: string[] = []
  const proposed = proposal.proposedIntervention
  const proposedPresentation = proposed.presentation
  const proposedAppearance = proposed.appearance

  pushNumericChange(changes, "Font size", presentation.fontSizePx, proposedPresentation.fontSizePx, "px")
  pushNumericChange(changes, "Line width", presentation.lineWidthPx, proposedPresentation.lineWidthPx, "px")
  pushNumericChange(changes, "Line height", presentation.lineHeight, proposedPresentation.lineHeight, "")
  pushNumericChange(changes, "Letter spacing", presentation.letterSpacingEm, proposedPresentation.letterSpacingEm, "em")

  if (proposedPresentation.fontFamily && proposedPresentation.fontFamily !== presentation.fontFamily) {
    changes.push(`Font family: ${presentation.fontFamily} -> ${proposedPresentation.fontFamily}`)
  }

  if (
    typeof proposedPresentation.editableByResearcher === "boolean" &&
    proposedPresentation.editableByResearcher !== presentation.editableByExperimenter
  ) {
    changes.push(
      `Participant presentation controls: ${presentation.editableByExperimenter ? "enabled" : "locked"} -> ${proposedPresentation.editableByResearcher ? "enabled" : "locked"}`
    )
  }

  if (proposedAppearance.themeMode && proposedAppearance.themeMode !== appearance.themeMode) {
    changes.push(`Theme mode: ${appearance.themeMode} -> ${proposedAppearance.themeMode}`)
  }

  if (proposedAppearance.palette && proposedAppearance.palette !== appearance.palette) {
    changes.push(`Palette: ${appearance.palette} -> ${proposedAppearance.palette}`)
  }

  if (proposedAppearance.appFont && proposedAppearance.appFont !== appearance.appFont) {
    changes.push(`App font: ${appearance.appFont} -> ${proposedAppearance.appFont}`)
  }

  if (changes.length > 0) {
    return changes
  }

  if (proposed.moduleId) {
    const moduleDescriptor = interventionModules.find((candidate) => candidate.moduleId === proposed.moduleId)
    if (moduleDescriptor) {
      return [`${moduleDescriptor.displayName}: ${proposed.reason}`]
    }
  }

  return [proposed.reason]
}

function pushNumericChange(
  changes: string[],
  label: string,
  currentValue: number,
  proposedValue: number | null,
  unit: string
) {
  if (proposedValue === null || proposedValue === currentValue) {
    return
  }

  changes.push(
    `${label}: ${formatNumericValue(currentValue, unit)} -> ${formatNumericValue(proposedValue, unit)}`
  )
}

function formatNumericValue(value: number, unit: string) {
  const formatted = Number.isInteger(value) ? `${value}` : value.toFixed(2)
  return unit ? `${formatted} ${unit}` : formatted
}

function getOptionLabel(
  parameter: InterventionModuleDescriptor["parameters"][number],
  value: string
) {
  return parameter.options.find((option) => option.value === value)?.displayName ?? value
}

function formatParameterHint(parameter: InterventionModuleDescriptor["parameters"][number]) {
  const parts = [
    parameter.unit ? `unit ${parameter.unit}` : null,
    parameter.minValue !== null ? `min ${parameter.minValue}` : null,
    parameter.maxValue !== null ? `max ${parameter.maxValue}` : null,
    parameter.step !== null ? `step ${parameter.step}` : null,
  ].filter(Boolean)

  return parts.join(" · ")
}

function renderSliderField(
  module: InterventionModuleDescriptor,
  parameter: InterventionModuleDescriptor["parameters"][number],
  currentValue: number,
  formattedValue: string,
  onValueChange: (value: number) => void
) {
  return (
    <Field key={module.moduleId}>
      <div className="mb-2 flex items-center justify-between">
        <FieldLabel>{parameter.displayName}</FieldLabel>
        <span className="text-xs text-muted-foreground">{formattedValue}</span>
      </div>
      <Slider
        min={parameter.minValue ?? currentValue}
        max={parameter.maxValue ?? currentValue}
        step={parameter.step ?? 1}
        value={[currentValue]}
        onValueChange={(value) => onValueChange(value[0] ?? currentValue)}
      />
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{module.description}</p>
    </Field>
  )
}
