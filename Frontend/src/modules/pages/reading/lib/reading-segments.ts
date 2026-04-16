import type {
  InterventionEventSnapshot,
  ReadingPresentationSnapshot,
} from "@/lib/experiment-session"
import type { TokenRun, TokenizedBlock } from "@/modules/pages/reading/lib/tokenize"

export type ReadingPresentationOverrides = {
  blockPresentations: Map<string, ReadingPresentationSnapshot>
  sentencePresentations: Map<string, ReadingPresentationSnapshot>
}

function isLayoutAffectingIntervention(event: InterventionEventSnapshot) {
  return (event.affectedPresentationProperties?.length ?? 0) > 0
}

function findBlockIndex(blocks: TokenizedBlock[], blockId: string | null): number {
  if (!blockId) {
    return -1
  }

  for (let index = 0; index < blocks.length; index += 1) {
    if (blocks[index].blockId === blockId) {
      return index
    }
  }

  return -1
}

function arePresentationsEqual(
  left: ReadingPresentationSnapshot,
  right: ReadingPresentationSnapshot
) {
  return (
    left.fontFamily === right.fontFamily &&
    left.fontSizePx === right.fontSizePx &&
    left.lineWidthPx === right.lineWidthPx &&
    left.lineHeight === right.lineHeight &&
    left.letterSpacingEm === right.letterSpacingEm &&
    left.editableByResearcher === right.editableByResearcher
  )
}

function collectSentenceIdsFromRuns(runs: TokenRun[]) {
  const sentenceIds: string[] = []
  const seen = new Set<string>()

  for (const run of runs) {
    for (const token of run.tokens) {
      if (!token.sentenceId || seen.has(token.sentenceId)) {
        continue
      }

      seen.add(token.sentenceId)
      sentenceIds.push(token.sentenceId)
    }
  }

  return sentenceIds
}

function collectSentenceIdsByBlock(tokenizedBlocks: TokenizedBlock[]) {
  return tokenizedBlocks.map((block) => {
    switch (block.type) {
      case "paragraph":
      case "h1":
      case "h2":
        return collectSentenceIdsFromRuns(block.runs)
      case "bullet_list":
        return block.items.flatMap((item) => collectSentenceIdsFromRuns(item.runs))
      default:
        return []
    }
  })
}

function clearSentenceOverridesForBlock(
  sentencePresentations: Map<string, ReadingPresentationSnapshot>,
  sentenceIds: string[]
) {
  for (const sentenceId of sentenceIds) {
    sentencePresentations.delete(sentenceId)
  }
}

function setSentenceOverridesFromAnchor(
  sentencePresentations: Map<string, ReadingPresentationSnapshot>,
  sentenceIds: string[],
  anchorSentenceId: string,
  presentation: ReadingPresentationSnapshot
) {
  let shouldOverride = false

  for (const sentenceId of sentenceIds) {
    if (sentenceId === anchorSentenceId) {
      shouldOverride = true
    }

    if (shouldOverride) {
      sentencePresentations.set(sentenceId, presentation)
    }
  }
}

/**
 * Replays layout interventions into explicit block/sentence presentation
 * overrides. Earlier content keeps its previous typography while the anchor
 * sentence/paragraph and everything after it adopts the new presentation.
 */
export function deriveReadingPresentationOverrides({
  tokenizedBlocks,
  initialPresentation,
  livePresentation,
  interventionEvents,
}: {
  tokenizedBlocks: TokenizedBlock[]
  initialPresentation: ReadingPresentationSnapshot
  livePresentation: ReadingPresentationSnapshot
  interventionEvents: InterventionEventSnapshot[]
}): ReadingPresentationOverrides {
  const blockPresentations = new Map<string, ReadingPresentationSnapshot>()
  const sentencePresentations = new Map<string, ReadingPresentationSnapshot>()

  if (tokenizedBlocks.length === 0) {
    return {
      blockPresentations,
      sentencePresentations,
    }
  }

  const sentenceIdsByBlock = collectSentenceIdsByBlock(tokenizedBlocks)
  const layoutEvents = interventionEvents
    .filter(isLayoutAffectingIntervention)
    .slice()
    .sort((left, right) => left.appliedAtUnixMs - right.appliedAtUnixMs)

  const latestLayoutEventId = layoutEvents[layoutEvents.length - 1]?.id ?? null
  const currentBlockPresentations = tokenizedBlocks.map(() => initialPresentation)

  for (const event of layoutEvents) {
    const nextPresentation =
      event.id === latestLayoutEventId ? livePresentation : event.appliedPresentation
    const committedBlockIndex = findBlockIndex(tokenizedBlocks, event.committedActiveBlockId)

    if (committedBlockIndex < 0) {
      for (let blockIndex = 0; blockIndex < tokenizedBlocks.length; blockIndex += 1) {
        currentBlockPresentations[blockIndex] = nextPresentation
        clearSentenceOverridesForBlock(sentencePresentations, sentenceIdsByBlock[blockIndex] ?? [])
      }
      continue
    }

    const anchorSentenceId = event.committedActiveSentenceId
    const sentenceIds = sentenceIdsByBlock[committedBlockIndex] ?? []
    const hasSentenceAnchor =
      Boolean(anchorSentenceId) && sentenceIds.includes(anchorSentenceId!)

    if (hasSentenceAnchor) {
      for (let blockIndex = committedBlockIndex + 1; blockIndex < tokenizedBlocks.length; blockIndex += 1) {
        currentBlockPresentations[blockIndex] = nextPresentation
        clearSentenceOverridesForBlock(sentencePresentations, sentenceIdsByBlock[blockIndex] ?? [])
      }

      setSentenceOverridesFromAnchor(
        sentencePresentations,
        sentenceIds,
        anchorSentenceId!,
        nextPresentation
      )
      continue
    }

    for (let blockIndex = committedBlockIndex; blockIndex < tokenizedBlocks.length; blockIndex += 1) {
      currentBlockPresentations[blockIndex] = nextPresentation
      clearSentenceOverridesForBlock(sentencePresentations, sentenceIdsByBlock[blockIndex] ?? [])
    }
  }

  for (let blockIndex = 0; blockIndex < tokenizedBlocks.length; blockIndex += 1) {
    const block = tokenizedBlocks[blockIndex]!
    const blockPresentation = currentBlockPresentations[blockIndex] ?? initialPresentation
    if (!arePresentationsEqual(blockPresentation, livePresentation)) {
      blockPresentations.set(block.blockId, blockPresentation)
    }

    for (const sentenceId of sentenceIdsByBlock[blockIndex] ?? []) {
      const sentencePresentation = sentencePresentations.get(sentenceId)
      if (!sentencePresentation) {
        continue
      }

      if (arePresentationsEqual(sentencePresentation, blockPresentation)) {
        sentencePresentations.delete(sentenceId)
      }
    }
  }

  return {
    blockPresentations,
    sentencePresentations,
  }
}
