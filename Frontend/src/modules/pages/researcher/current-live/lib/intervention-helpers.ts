import type {
  ApplyInterventionCommandSnapshot,
  DecisionProposalSnapshot,
  ReadingInterventionCommitBoundary,
} from "@/lib/experiment-session"
import type { InterventionModuleDescriptor } from "@/lib/intervention-modules"
import type { ReaderAppearanceSettings } from "@/lib/reader-appearance"
import type { ReadingPresentationSettings } from "@/modules/pages/reading/lib/readingPresentation"

export function formatBoundaryLabel(boundary: ReadingInterventionCommitBoundary) {
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

export function formatBoundaryCue(boundary: ReadingInterventionCommitBoundary) {
  switch (boundary) {
    case "immediate":
      return "apply immediately"
    case "page-turn":
      return "apply on the next page"
    case "sentence-end":
      return "apply at the next sentence"
    case "paragraph-end":
      return "apply at the next paragraph"
    default:
      return "wait for the selected boundary"
  }
}

export function formatPendingBoundaryCue(boundary: ReadingInterventionCommitBoundary) {
  switch (boundary) {
    case "immediate":
      return "Applying now"
    case "page-turn":
      return "Pending for next page"
    case "sentence-end":
      return "Pending for next sentence"
    case "paragraph-end":
      return "Pending for next paragraph"
    default:
      return "Pending"
  }
}

export function formatExecutionModeLabel(executionMode: string) {
  return executionMode === "autonomous" ? "Autonomous" : "Advisory"
}

export function getOptionLabel(
  parameter: InterventionModuleDescriptor["parameters"][number],
  value: string
) {
  return parameter.options.find((option) => option.value === value)?.displayName ?? value
}

export function formatParameterHint(parameter: InterventionModuleDescriptor["parameters"][number]) {
  const parts = [
    parameter.unit ? `unit ${parameter.unit}` : null,
    parameter.minValue !== null ? `min ${parameter.minValue}` : null,
    parameter.maxValue !== null ? `max ${parameter.maxValue}` : null,
    parameter.step !== null ? `step ${parameter.step}` : null,
  ].filter(Boolean)

  return parts.join(" · ")
}

function formatNumericValue(value: number, unit: string) {
  const formatted = Number.isInteger(value) ? `${value}` : value.toFixed(2)
  return unit ? `${formatted} ${unit}` : formatted
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

export function summarizeInterventionChange(
  intervention: ApplyInterventionCommandSnapshot,
  presentation: ReadingPresentationSettings,
  appearance: ReaderAppearanceSettings
) {
  const changes: string[] = []
  const nextPresentation = intervention.presentation
  const nextAppearance = intervention.appearance

  pushNumericChange(changes, "Font size", presentation.fontSizePx, nextPresentation.fontSizePx, "px")
  pushNumericChange(changes, "Line width", presentation.lineWidthPx, nextPresentation.lineWidthPx, "px")
  pushNumericChange(changes, "Line height", presentation.lineHeight, nextPresentation.lineHeight, "")
  pushNumericChange(changes, "Letter spacing", presentation.letterSpacingEm, nextPresentation.letterSpacingEm, "em")

  if (nextPresentation.fontFamily && nextPresentation.fontFamily !== presentation.fontFamily) {
    changes.push(`Font family: ${presentation.fontFamily} -> ${nextPresentation.fontFamily}`)
  }

  if (
    typeof nextPresentation.editableByResearcher === "boolean" &&
    nextPresentation.editableByResearcher !== presentation.editableByExperimenter
  ) {
    changes.push(
      `Participant presentation controls: ${presentation.editableByExperimenter ? "enabled" : "locked"} -> ${nextPresentation.editableByResearcher ? "enabled" : "locked"}`
    )
  }

  if (nextAppearance.themeMode && nextAppearance.themeMode !== appearance.themeMode) {
    changes.push(`Theme mode: ${appearance.themeMode} -> ${nextAppearance.themeMode}`)
  }

  if (nextAppearance.palette && nextAppearance.palette !== appearance.palette) {
    changes.push(`Palette: ${appearance.palette} -> ${nextAppearance.palette}`)
  }

  if (nextAppearance.appFont && nextAppearance.appFont !== appearance.appFont) {
    changes.push(`App font: ${appearance.appFont} -> ${nextAppearance.appFont}`)
  }

  return changes[0] ?? intervention.reason
}

export function summarizeProposalChanges(
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
