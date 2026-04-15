import type {
  InterventionEventSnapshot,
  ReadingPresentationSnapshot,
} from "@/lib/experiment-session"
import type { TokenizedBlock } from "@/modules/pages/reading/lib/tokenize"

export type ReadingSegment = {
  id: string
  presentation: ReadingPresentationSnapshot
  startBlockIndex: number
  blocks: TokenizedBlock[]
  /** Intervention event that created this segment, or null for the very first segment. */
  sourceInterventionId: string | null
}

function cloneBlocks(blocks: TokenizedBlock[]): TokenizedBlock[] {
  // Blocks are treated as immutable downstream; a shallow copy is sufficient.
  return blocks.slice()
}

/**
 * Locate the block index that owns a given `blockId`. Returns -1 if not found.
 * Block ids are stable and computed at tokenize time as `${docId}:${blockIndex}`,
 * but we avoid relying on the string format and scan instead so the helper stays
 * robust to future id-shape changes.
 */
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

/**
 * Derive segment list from the intervention event history.
 *
 * Segmentation rules:
 * - The first segment always starts at block 0 with `initialPresentation`.
 * - For each intervention event in chronological order:
 *     - `immediate` boundary: the current live segment's presentation is replaced
 *       in place (no new segment). The existing anchor-restore hook keeps the
 *       participant's position stable.
 *     - Any non-immediate boundary: the live segment is split AFTER the block
 *       that was active at commit time (`committedActiveBlockId`). A new live
 *       segment begins at the next block with the event's applied presentation.
 *       If the committed block id is missing, unresolvable, or already the last
 *       block, the event is treated as an in-place presentation swap.
 *
 * The rationale for always splitting on block boundaries (even for sentence-end
 * / page-turn): CSS multicolumn honors block boundaries cleanly, the participant
 * never sees their current block restyled, and downstream rendering stays simple.
 */
export function deriveReadingSegments({
  tokenizedBlocks,
  initialPresentation,
  livePresentation,
  interventionEvents,
}: {
  tokenizedBlocks: TokenizedBlock[]
  initialPresentation: ReadingPresentationSnapshot
  livePresentation: ReadingPresentationSnapshot
  interventionEvents: InterventionEventSnapshot[]
}): ReadingSegment[] {
  if (tokenizedBlocks.length === 0) {
    return []
  }

  type DraftSegment = {
    id: string
    presentation: ReadingPresentationSnapshot
    startBlockIndex: number
    sourceInterventionId: string | null
  }

  const drafts: DraftSegment[] = [
    {
      id: "segment:initial",
      presentation: initialPresentation,
      startBlockIndex: 0,
      sourceInterventionId: null,
    },
  ]

  const sortedEvents = interventionEvents
    .slice()
    .sort((a, b) => a.appliedAtUnixMs - b.appliedAtUnixMs)

  for (const event of sortedEvents) {
    const liveDraft = drafts[drafts.length - 1]
    const isImmediate = event.appliedBoundary === "immediate"
    const committedBlockIndex = findBlockIndex(tokenizedBlocks, event.committedActiveBlockId)

    if (isImmediate || committedBlockIndex < 0) {
      // Replace the live segment's presentation in place.
      liveDraft.presentation = event.appliedPresentation
      liveDraft.sourceInterventionId = event.id
      continue
    }

    // Split AFTER the committed block: new segment starts at the next block.
    const nextStartBlockIndex = committedBlockIndex + 1

    // Guard: if split would be at or before the current live segment start, or
    // at the end of the document, fall back to in-place replacement.
    if (
      nextStartBlockIndex <= liveDraft.startBlockIndex ||
      nextStartBlockIndex >= tokenizedBlocks.length
    ) {
      liveDraft.presentation = event.appliedPresentation
      liveDraft.sourceInterventionId = event.id
      continue
    }

    drafts.push({
      id: `segment:${event.id}`,
      presentation: event.appliedPresentation,
      startBlockIndex: nextStartBlockIndex,
      sourceInterventionId: event.id,
    })
  }

  // The live segment should reflect `livePresentation` (in case the backend's
  // current presentation has drifted from the last event's applied presentation,
  // e.g. during initial hydration before events have caught up).
  drafts[drafts.length - 1].presentation = livePresentation

  // Materialize block slices.
  const segments: ReadingSegment[] = []
  for (let index = 0; index < drafts.length; index += 1) {
    const draft = drafts[index]
    const endExclusive =
      index + 1 < drafts.length ? drafts[index + 1].startBlockIndex : tokenizedBlocks.length
    const blockSlice = tokenizedBlocks.slice(draft.startBlockIndex, endExclusive)
    if (blockSlice.length === 0) {
      continue
    }

    segments.push({
      id: draft.id,
      presentation: draft.presentation,
      startBlockIndex: draft.startBlockIndex,
      blocks: cloneBlocks(blockSlice),
      sourceInterventionId: draft.sourceInterventionId,
    })
  }

  return segments
}
