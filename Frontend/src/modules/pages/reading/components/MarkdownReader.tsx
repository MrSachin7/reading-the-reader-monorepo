"use client";

import { Fragment } from "react";

import type { Token, TokenRun, TokenizedBlock } from "@/modules/pages/reading/lib/tokenize";

type MarkdownReaderProps = {
  blocks: TokenizedBlock[];
  showLixScores?: boolean;
  lixDisplayMode?: "inline" | "overlay";
};

function formatLixScore(score: number) {
  return score.toFixed(1).replace(/\.0$/, "");
}

function renderToken(token: Token) {
  if (token.kind === "word") {
    return (
      <span
        key={token.id}
        data-token-id={token.id}
        data-token-kind={token.kind}
        data-sentence-id={token.sentenceId ?? undefined}
        className="rounded-[0.4rem] px-[0.08em] transition-[background-color,box-shadow] duration-150"
      >
        {token.text}
      </span>
    );
  }

  return (
    <span
      key={token.id}
      data-token-id={token.id}
      data-token-kind={token.kind}
      data-sentence-id={token.sentenceId ?? undefined}
      aria-hidden="true"
    >
      {token.text}
    </span>
  );
}

function renderRun(run: TokenRun, index: number) {
  const sentenceGroups = run.tokens.reduce<Array<{ sentenceId: string | null; tokens: Token[] }>>(
    (groups, token) => {
      const previousGroup = groups[groups.length - 1]
      if (!previousGroup || previousGroup.sentenceId !== token.sentenceId) {
        groups.push({
          sentenceId: token.sentenceId,
          tokens: [token],
        })
        return groups
      }

      previousGroup.tokens.push(token)
      return groups
    },
    []
  )

  const content = sentenceGroups.map((group, groupIndex) => {
    const tokens = group.tokens.map(renderToken)
    if (!group.sentenceId) {
      return <Fragment key={`run-${index}-group-${groupIndex}`}>{tokens}</Fragment>
    }

    return (
      <span
        key={`run-${index}-group-${groupIndex}`}
        data-sentence-id={group.sentenceId}
      >
        {tokens}
      </span>
    )
  })

  if (run.style === "bold") {
    return <strong key={`run-${index}`}>{content}</strong>;
  }

  if (run.style === "italic") {
    return <em key={`run-${index}`}>{content}</em>;
  }

  return <Fragment key={`run-${index}`}>{content}</Fragment>;
}

export function MarkdownReader({
  blocks,
  showLixScores = true,
  lixDisplayMode = "inline",
}: MarkdownReaderProps) {
  return (
    <article className="text-foreground">
      {blocks.map((block) => {
        switch (block.type) {
          case "h1":
            return (
              <h1
                key={block.blockId}
                data-block-id={block.blockId}
                className="mb-8 text-3xl leading-tight font-bold"
              >
                {block.runs.map(renderRun)}
              </h1>
            );
          case "h2":
            return (
              <h2
                key={block.blockId}
                data-block-id={block.blockId}
                className="mt-10 mb-4 text-2xl leading-tight font-semibold"
              >
                {block.runs.map(renderRun)}
              </h2>
            );
          case "paragraph":
            return (
              <p
                key={block.blockId}
                data-block-id={block.blockId}
                className="relative mb-5"
                style={{ lineHeight: "inherit" }}
              >
                {block.runs.map(renderRun)}
                {showLixScores && block.lixScore !== null ? (
                  lixDisplayMode === "overlay" ? (
                    <span className="pointer-events-none absolute right-0 bottom-0 z-10 inline-flex rounded-full border border-border/50 bg-background/72 px-1.5 py-0.5 text-[10px] leading-none font-medium tracking-[0.01em] text-muted-foreground shadow-[0_1px_4px_rgba(15,23,42,0.08)] backdrop-blur-[1px]">
                      {formatLixScore(block.lixScore)}
                    </span>
                  ) : (
                    <span className="ml-3 inline-flex rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-xs font-medium tracking-[0.02em] text-muted-foreground">
                      LIX {formatLixScore(block.lixScore)}
                    </span>
                  )
                ) : null}
              </p>
            );
          case "bullet_list":
            return (
              <ul
                key={block.blockId}
                data-block-id={block.blockId}
                className="mb-6 list-disc space-y-2 pl-8"
                style={{ lineHeight: "inherit" }}
              >
                {block.items.map((item, itemIndex) => (
                  <li key={`${block.blockId}:item:${itemIndex}`}>
                    {item.runs.map(renderRun)}
                  </li>
                ))}
              </ul>
            );
          default:
            return null;
        }
      })}
    </article>
  );
}
