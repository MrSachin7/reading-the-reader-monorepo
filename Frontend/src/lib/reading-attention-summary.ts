"use client";

export type ReadingAttentionTokenStats = {
  fixationMs: number;
  fixationCount: number;
  skimCount: number;
  maxFixationMs: number;
  lastFixationMs: number;
  text?: string | null;
};

export type ReadingAttentionSummarySnapshot = {
  updatedAtUnixMs: number;
  tokenStats: Record<string, ReadingAttentionTokenStats>;
  currentTokenId: string | null;
  currentTokenDurationMs: number | null;
  fixatedTokenCount: number;
  skimmedTokenCount: number;
};

export const EMPTY_READING_ATTENTION_SUMMARY: ReadingAttentionSummarySnapshot = {
  updatedAtUnixMs: 0,
  tokenStats: {},
  currentTokenId: null,
  currentTokenDurationMs: null,
  fixatedTokenCount: 0,
  skimmedTokenCount: 0,
};
