"use client"

import type {
  ExperimentSequenceItemSnapshot,
  ReadingContentSnapshot,
  ReaderAppearanceSnapshot,
} from "@/lib/experiment-session"
import type { ReaderAppearanceSettings } from "@/lib/reader-appearance"
import type { ExperimentSetupItem } from "@/redux/api/experiment-setup-api"
import type { ReadingMaterialSetup } from "@/redux/api/reading-material-api"
import type { UpsertReadingSessionPayload } from "@/redux/api/experiment-session-api"

export type ExperimentSequencePosition = {
  currentIndex: number
  currentItem: ExperimentSequenceItemSnapshot
  previousItem: ExperimentSequenceItemSnapshot | null
  nextItem: ExperimentSequenceItemSnapshot | null
}

export function mapExperimentSetupItemsToSequenceItems(
  items: ExperimentSetupItem[],
  readingMaterialSetups: ReadingMaterialSetup[] = []
): ExperimentSequenceItemSnapshot[] {
  const quizByMaterialId = new Map<string, ReadingMaterialSetup["comprehensionQuiz"]>()
  for (const setup of readingMaterialSetups) {
    quizByMaterialId.set(setup.id, setup.comprehensionQuiz ?? [])
  }
  return items.map((item, index) => ({
    id: item.id,
    order: item.order ?? index,
    title: item.title,
    markdown: item.markdown,
    sourceSetupId: item.sourceReadingMaterialSetupId,
    fontFamily: item.fontFamily,
    fontSizePx: item.fontSizePx,
    lineWidthPx: item.lineWidthPx,
    lineHeight: item.lineHeight,
    letterSpacingEm: item.letterSpacingEm,
    editableByResearcher: item.editableByExperimenter,
    materialRunId: item.id,
    comprehensionQuiz: item.sourceReadingMaterialSetupId
      ? quizByMaterialId.get(item.sourceReadingMaterialSetupId) ?? []
      : [],
    quizStatus: "not-started",
  }))
}

export function getExperimentSequencePositionFromSession(
  experimentItems: ExperimentSequenceItemSnapshot[] | null | undefined,
  currentExperimentItemIndex: number | null | undefined,
  content: Pick<ReadingContentSnapshot, "experimentSetupItemId">
): ExperimentSequencePosition | null {
  if (!experimentItems || experimentItems.length === 0) {
    return null
  }

  const currentIndex =
    typeof currentExperimentItemIndex === "number" &&
    currentExperimentItemIndex >= 0 &&
    currentExperimentItemIndex < experimentItems.length
      ? currentExperimentItemIndex
      : content.experimentSetupItemId
        ? experimentItems.findIndex((item) => item.id === content.experimentSetupItemId)
        : -1

  if (currentIndex < 0) {
    return null
  }

  return {
    currentIndex,
    currentItem: experimentItems[currentIndex],
    previousItem: experimentItems[currentIndex - 1] ?? null,
    nextItem: experimentItems[currentIndex + 1] ?? null,
  }
}

export function buildExperimentItemReadingSessionPayload({
  item,
  appearance,
  experimentSetupId,
  experimentItems,
  currentExperimentItemIndex,
}: {
  item: ExperimentSequenceItemSnapshot
  appearance: ReaderAppearanceSettings | ReaderAppearanceSnapshot
  experimentSetupId: string
  experimentItems: ExperimentSequenceItemSnapshot[]
  currentExperimentItemIndex: number
}): UpsertReadingSessionPayload {
  return {
    documentId: `${experimentSetupId}:${item.id}`,
    title: item.title,
    markdown: item.markdown,
    sourceSetupId: item.sourceSetupId,
    experimentSetupId,
    experimentSetupName: undefined,
    experimentSetupItemId: item.id,
    fontFamily: item.fontFamily,
    fontSizePx: item.fontSizePx,
    lineWidthPx: item.lineWidthPx,
    lineHeight: item.lineHeight,
    letterSpacingEm: item.letterSpacingEm,
    editableByResearcher: item.editableByResearcher,
    themeMode: appearance.themeMode,
    palette: appearance.palette,
    appFont: appearance.appFont,
    experimentItems,
    currentExperimentItemIndex,
    orderMode: "fixed",
    isOneOff: false,
  }
}
