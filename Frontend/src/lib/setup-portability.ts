import type { ComprehensionQuestion } from "@/lib/comprehension-quiz"
import type { FontTheme } from "@/hooks/use-font-theme"
import type {
  CreateExperimentSetupRequest,
  CreateExperimentSetupRequestItem,
  ExperimentSetup,
  ExperimentTemplateOrderMode,
  ExperimentTemplateStatus,
} from "@/redux/api/experiment-setup-api"
import type {
  CreateReadingMaterialSetupRequest,
  ReadingMaterialSetup,
} from "@/redux/api/reading-material-api"

const FONT_FALLBACK: FontTheme = "merriweather"
const FONT_VALUES = new Set<FontTheme>([
  "roboto-flex",
  "geist",
  "inter",
  "space-grotesk",
  "merriweather",
])

const STATUS_VALUES = new Set<ExperimentTemplateStatus>(["draft", "ready", "archived"])
const ORDER_MODE_VALUES = new Set<ExperimentTemplateOrderMode>(["fixed", "random"])

export const READING_MATERIAL_EXPORT_SCHEMA = "reading-the-reader.reading-material.v1"
export const EXPERIMENT_TEMPLATE_EXPORT_SCHEMA = "reading-the-reader.experiment-template.v1"

export type ReadingMaterialExportFile = {
  schema: typeof READING_MATERIAL_EXPORT_SCHEMA
  exportedAtUnixMs: number
  source: {
    originalId: string
    createdAtUnixMs: number
    updatedAtUnixMs: number
  }
  material: CreateReadingMaterialSetupRequest
}

export type ExperimentTemplateExportFile = {
  schema: typeof EXPERIMENT_TEMPLATE_EXPORT_SCHEMA
  exportedAtUnixMs: number
  source: {
    originalId: string
    createdAtUnixMs: number
    updatedAtUnixMs: number
  }
  template: CreateExperimentSetupRequest
}

export function downloadJsonFile(fileName: string, value: unknown) {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export function buildReadingMaterialExport(setup: ReadingMaterialSetup): ReadingMaterialExportFile {
  return {
    schema: READING_MATERIAL_EXPORT_SCHEMA,
    exportedAtUnixMs: Date.now(),
    source: {
      originalId: setup.id,
      createdAtUnixMs: setup.createdAtUnixMs,
      updatedAtUnixMs: setup.updatedAtUnixMs,
    },
    material: {
      name: setup.name,
      title: setup.title,
      markdown: setup.markdown,
      comprehensionQuiz: setup.comprehensionQuiz ?? [],
      fontFamily: normalizeFont(setup.fontFamily),
      fontSizePx: setup.fontSizePx,
      lineWidthPx: setup.lineWidthPx,
      lineHeight: setup.lineHeight,
      letterSpacingEm: setup.letterSpacingEm,
      editableByExperimenter: setup.editableByExperimenter,
    },
  }
}

export function buildExperimentTemplateExport(setup: ExperimentSetup): ExperimentTemplateExportFile {
  return {
    schema: EXPERIMENT_TEMPLATE_EXPORT_SCHEMA,
    exportedAtUnixMs: Date.now(),
    source: {
      originalId: setup.id,
      createdAtUnixMs: setup.createdAtUnixMs,
      updatedAtUnixMs: setup.updatedAtUnixMs,
    },
    template: {
      name: setup.name,
      description: setup.description,
      status: setup.status,
      orderMode: setup.orderMode,
      defaultFontFamily: normalizeFont(setup.defaultFontFamily),
      defaultFontSizePx: setup.defaultFontSizePx,
      defaultLineWidthPx: setup.defaultLineWidthPx,
      defaultLineHeight: setup.defaultLineHeight,
      defaultLetterSpacingEm: setup.defaultLetterSpacingEm,
      defaultEditableByExperimenter: setup.defaultEditableByExperimenter,
      decisionProviderId: setup.decisionProviderId,
      decisionExecutionMode: setup.decisionExecutionMode,
      calibrationRequired: setup.calibrationRequired,
      items: setup.items.map((item) => ({
        sourceReadingMaterialSetupId: null,
        sourceReadingMaterialTitle: item.sourceReadingMaterialTitle || item.title,
        title: item.title,
        markdown: item.markdown,
        fontFamily: normalizeFont(item.fontFamily),
        fontSizePx: item.fontSizePx,
        lineWidthPx: item.lineWidthPx,
        lineHeight: item.lineHeight,
        letterSpacingEm: item.letterSpacingEm,
        editableByExperimenter: item.editableByExperimenter,
      })),
    },
  }
}

export function parseReadingMaterialImport(value: unknown): CreateReadingMaterialSetupRequest | null {
  const source = unwrapPortablePayload(value, "material")
  if (!isObject(source)) {
    return null
  }

  const title = getString(source.title)
  const markdown = getString(source.markdown)
  if (!title || !markdown) {
    return null
  }

  return {
    name: getString(source.name) || title,
    title,
    markdown,
    comprehensionQuiz: parseComprehensionQuiz(source.comprehensionQuiz),
    fontFamily: normalizeFont(source.fontFamily),
    fontSizePx: getNumber(source.fontSizePx, 18),
    lineWidthPx: getNumber(source.lineWidthPx, 680),
    lineHeight: getNumber(source.lineHeight, 1.7),
    letterSpacingEm: getNumber(source.letterSpacingEm, 0.02),
    editableByExperimenter: getBoolean(source.editableByExperimenter, true),
  }
}

export function parseExperimentTemplateImport(value: unknown): CreateExperimentSetupRequest | null {
  const source = unwrapPortablePayload(value, "template")
  if (!isObject(source)) {
    return null
  }

  const name = getString(source.name)
  if (!name) {
    return null
  }

  return {
    name,
    description: getString(source.description),
    status: normalizeStatus(source.status),
    orderMode: normalizeOrderMode(source.orderMode),
    defaultFontFamily: normalizeFont(source.defaultFontFamily),
    defaultFontSizePx: getNumber(source.defaultFontSizePx, 18),
    defaultLineWidthPx: getNumber(source.defaultLineWidthPx, 680),
    defaultLineHeight: getNumber(source.defaultLineHeight, 1.7),
    defaultLetterSpacingEm: getNumber(source.defaultLetterSpacingEm, 0.02),
    defaultEditableByExperimenter: getBoolean(source.defaultEditableByExperimenter, true),
    decisionProviderId: getString(source.decisionProviderId) || "manual",
    decisionExecutionMode: getString(source.decisionExecutionMode) || "advisory",
    calibrationRequired: getBoolean(source.calibrationRequired, true),
    items: parseTemplateItems(source.items),
  }
}

export function sanitizeExportFileName(name: string, fallback: string) {
  const sanitized = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")

  return sanitized || fallback
}

function parseTemplateItems(value: unknown): CreateExperimentSetupRequestItem[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((item): CreateExperimentSetupRequestItem[] => {
    if (!isObject(item)) {
      return []
    }

    const title = getString(item.title)
    const markdown = getString(item.markdown)
    if (!title || !markdown) {
      return []
    }

    return [
      {
        sourceReadingMaterialSetupId: null,
        sourceReadingMaterialTitle: getString(item.sourceReadingMaterialTitle) || title,
        title,
        markdown,
        fontFamily: normalizeFont(item.fontFamily),
        fontSizePx: getNumber(item.fontSizePx, 18),
        lineWidthPx: getNumber(item.lineWidthPx, 680),
        lineHeight: getNumber(item.lineHeight, 1.7),
        letterSpacingEm: getNumber(item.letterSpacingEm, 0.02),
        editableByExperimenter: getBoolean(item.editableByExperimenter, true),
      },
    ]
  })
}

function parseComprehensionQuiz(value: unknown): ComprehensionQuestion[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.flatMap((question, index): ComprehensionQuestion[] => {
    if (!isObject(question)) {
      return []
    }

    const id = getString(question.id)
    const prompt = getString(question.prompt)
    const correctOptionId = getString(question.correctOptionId)
    const options = Array.isArray(question.options)
      ? question.options.flatMap((option): ComprehensionQuestion["options"] => {
          if (!isObject(option)) {
            return []
          }

          const optionId = getString(option.id)
          const text = getString(option.text)
          return optionId && text ? [{ id: optionId, text }] : []
        })
      : []

    if (!id || !prompt || !correctOptionId || options.length < 2) {
      return []
    }

    return [
      {
        id,
        order: getNumber(question.order, index),
        prompt,
        options,
        correctOptionId,
      },
    ]
  })
}

function unwrapPortablePayload(value: unknown, key: "material" | "template") {
  if (isObject(value) && key in value) {
    return value[key]
  }

  return value
}

function normalizeFont(value: unknown): FontTheme {
  return typeof value === "string" && FONT_VALUES.has(value as FontTheme)
    ? (value as FontTheme)
    : FONT_FALLBACK
}

function normalizeStatus(value: unknown): ExperimentTemplateStatus {
  return typeof value === "string" && STATUS_VALUES.has(value as ExperimentTemplateStatus)
    ? (value as ExperimentTemplateStatus)
    : "draft"
}

function normalizeOrderMode(value: unknown): ExperimentTemplateOrderMode {
  return typeof value === "string" && ORDER_MODE_VALUES.has(value as ExperimentTemplateOrderMode)
    ? (value as ExperimentTemplateOrderMode)
    : "fixed"
}

function getString(value: unknown) {
  return typeof value === "string" ? value : ""
}

function getNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback
}

function getBoolean(value: unknown, fallback: boolean) {
  return typeof value === "boolean" ? value : fallback
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}
