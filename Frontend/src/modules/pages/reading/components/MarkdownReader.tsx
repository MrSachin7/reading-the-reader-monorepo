"use client";

import { Fragment } from "react";

import type { Token, TokenRun, TokenizedBlock } from "@/modules/pages/reading/lib/tokenize";

type MarkdownReaderProps = {
  blocks: TokenizedBlock[];
  showLixScores?: boolean;
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
        className="rounded-[0.4rem] px-[0.08em] transition-[background-color,box-shadow] duration-150"
      >
        {token.text}
      </span>
    );
  }

  return (
    <span key={token.id} data-token-id={token.id} data-token-kind={token.kind} aria-hidden="true">
      {token.text}
    </span>
  );
}

function renderRun(run: TokenRun, index: number) {
  const content = run.tokens.map(renderToken);

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
                className="mb-5"
                style={{ lineHeight: "inherit" }}
              >
                {block.runs.map(renderRun)}
                {showLixScores && block.lixScore !== null ? (
                  <span className="ml-3 inline-flex rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-xs font-medium tracking-[0.02em] text-muted-foreground">
                    LIX {formatLixScore(block.lixScore)}
                  </span>
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
