import type { InlineNode, MdBlock, MdDoc } from "@/modules/pages/reading/lib/minimalMarkdown";
import { calculateLix } from "@/modules/pages/reading/lib/readingMetrics";

export type Token = {
  id: string;
  text: string;
  kind: "word" | "space";
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

function tokenizeText(
  text: string,
  docId: string,
  blockIndex: number,
  wordIndexRef: { current: number },
  spaceIndexRef: { current: number }
): Token[] {
  const parts = text.split(/(\s+)/);
  const tokens: Token[] = [];

  for (const part of parts) {
    if (!part) {
      continue;
    }

    if (/^\s+$/.test(part)) {
      tokens.push({
        id: `${docId}:${blockIndex}:space:${spaceIndexRef.current}`,
        text: part,
        kind: "space",
      });
      spaceIndexRef.current += 1;
      continue;
    }

    tokens.push({
      id: `${docId}:${blockIndex}:${wordIndexRef.current}`,
      text: part,
      kind: "word",
    });
    wordIndexRef.current += 1;
  }

  return tokens;
}

function inlineNodesToRuns(
  inlines: InlineNode[],
  docId: string,
  blockIndex: number,
  wordIndexRef: { current: number },
  spaceIndexRef: { current: number }
): TokenRun[] {
  return inlines.map((inline) => ({
    style: inline.type,
    tokens: tokenizeText(
      inline.text,
      docId,
      blockIndex,
      wordIndexRef,
      spaceIndexRef
    ),
  }));
}

function tokenizeBlock(block: MdBlock, docId: string, blockIndex: number): TokenizedBlock {
  const wordIndexRef = { current: 0 };
  const spaceIndexRef = { current: 0 };
  const blockId = `${docId}:${blockIndex}`;

  if (block.type === "bullet_list") {
    return {
      type: "bullet_list",
      blockId,
      items: block.items.map((item) => ({
        runs: inlineNodesToRuns(
          item.inlines,
          docId,
          blockIndex,
          wordIndexRef,
          spaceIndexRef
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
        blockIndex,
        wordIndexRef,
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
      blockIndex,
      wordIndexRef,
      spaceIndexRef
    ),
  };
}

export function tokenizeDocument(doc: MdDoc, docId: string): TokenizedBlock[] {
  return doc.blocks.map((block, blockIndex) => tokenizeBlock(block, docId, blockIndex));
}
