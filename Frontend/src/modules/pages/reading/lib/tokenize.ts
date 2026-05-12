import type { InlineNode, MdBlock, MdDoc } from "@/modules/pages/reading/lib/minimalMarkdown";
import { calculateLix } from "@/modules/pages/reading/lib/readingMetrics";

export type Token = {
  id: string;
  text: string;
  kind: "word" | "space";
  sentenceId: string | null;
};

export type TokenRun = {
  style: InlineNode["type"];
  tokens: Token[];
};

export type TokenizedBlock =
  | {
      type: "h1" | "h2";
      blockId: string;
      runs: TokenRun[];
    }
  | {
      type: "paragraph";
      blockId: string;
      runs: TokenRun[];
      lixScore: number | null;
    }
  | {
      type: "bullet_list";
      blockId: string;
      items: { runs: TokenRun[] }[];
    };

function inlineNodesToText(inlines: InlineNode[]): string {
  return inlines.map((inline) => inline.text).join("");
}

type SentenceTracker = {
  currentSentenceIndex: number;
  sentenceKey: string;
  currentWordIndex: number;
};

function buildSentenceId(docId: string, sentenceKey: string, sentenceIndex: number) {
  return `${docId}:${sentenceKey}:sentence:${sentenceIndex}`;
}

function buildWordTokenId(
  docId: string,
  sentenceKey: string,
  sentenceIndex: number,
  wordIndex: number
) {
  return `${buildSentenceId(docId, sentenceKey, sentenceIndex)}:word:${wordIndex}`
}

function tokenEndsSentence(part: string) {
  return /[.!?]["')\]]*$/.test(part.trim());
}

function tokenizeText(
  text: string,
  docId: string,
  sentenceKey: string,
  spaceIndexRef: { current: number },
  sentenceTracker: SentenceTracker,
  options?: {
    treatAsSingleSentence?: boolean
  }
): Token[] {
  const parts = text.split(/(\s+)/);
  const tokens: Token[] = [];
  const treatAsSingleSentence = options?.treatAsSingleSentence ?? false

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (/^\s+$/.test(part)) {
      tokens.push({
        id: `${docId}:${sentenceKey}:space:${spaceIndexRef.current}`,
        text: part,
        kind: "space",
        sentenceId: buildSentenceId(
          docId,
          sentenceKey,
          sentenceTracker.currentSentenceIndex
        ),
      });
      spaceIndexRef.current += 1;
      continue;
    }

    tokens.push({
      id: buildWordTokenId(
        docId,
        sentenceKey,
        sentenceTracker.currentSentenceIndex,
        sentenceTracker.currentWordIndex
      ),
      text: part,
      kind: "word",
      sentenceId: buildSentenceId(
        docId,
        sentenceKey,
        sentenceTracker.currentSentenceIndex
      ),
    });
    sentenceTracker.currentWordIndex += 1

    if (!treatAsSingleSentence && tokenEndsSentence(part)) {
      sentenceTracker.currentSentenceIndex += 1
      sentenceTracker.currentWordIndex = 1
    }
  }

  return tokens;
}

function inlineNodesToRuns(
  inlines: InlineNode[],
  docId: string,
  sentenceKey: string,
  spaceIndexRef: { current: number },
  options?: {
    treatAsSingleSentence?: boolean
    initialSentenceIndex?: number
  }
): TokenRun[] {
  const sentenceTracker: SentenceTracker = {
    currentSentenceIndex: options?.initialSentenceIndex ?? 1,
    sentenceKey,
    currentWordIndex: 1,
  };

  return inlines.map((inline) => ({
    style: inline.type,
    tokens: tokenizeText(
      inline.text,
      docId,
      sentenceKey,
      spaceIndexRef,
      sentenceTracker,
      options
    ),
  }));
}

function tokenizeBlock(block: MdBlock, docId: string, blockIndex: number): TokenizedBlock {
  const spaceIndexRef = { current: 0 };
  const blockNumber = blockIndex + 1
  const blockId = `${docId}:${blockNumber}`;

  if (block.type === "bullet_list") {
    return {
      type: "bullet_list",
      blockId,
      items: block.items.map((item, itemIndex) => ({
        runs: inlineNodesToRuns(
          item.inlines,
          docId,
          `${blockNumber}`,
          spaceIndexRef,
          {
            treatAsSingleSentence: true,
            initialSentenceIndex: itemIndex + 1,
          }
        ),
      })),
    };
  }

  if (block.type === "paragraph") {
    return {
      type: "paragraph",
      blockId,
      runs: inlineNodesToRuns(
        block.inlines,
        docId,
        `${blockNumber}`,
        spaceIndexRef
      ),
      lixScore: calculateLix(inlineNodesToText(block.inlines)),
    };
  }

  return {
    type: block.type,
    blockId,
    runs: inlineNodesToRuns(
      block.inlines,
      docId,
      `${blockNumber}`,
      spaceIndexRef
    ),
  };
}

export function tokenizeDocument(doc: MdDoc, docId: string): TokenizedBlock[] {
  return doc.blocks.map((block, blockIndex) => tokenizeBlock(block, docId, blockIndex));
}
