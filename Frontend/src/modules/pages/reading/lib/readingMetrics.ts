function normalizeMarkdownText(md: string): string {
  return md
    .replace(/\r\n/g, "\n")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^-\s+/gm, "")
    .replace(/\*\*/g, "")
    .replace(/\*/g, "");
}

function extractWords(text: string): string[] {
  return text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
}

function countLetters(word: string): number {
  return word.replace(/[^\p{L}]/gu, "").length;
}

export function countWords(md: string): number {
  return extractWords(normalizeMarkdownText(md)).length;
}

export function calculateLix(text: string): number | null {
  const normalized = normalizeMarkdownText(text);
  const words = extractWords(normalized);
  const wordCount = words.length;

  if (wordCount === 0) {
    return null;
  }

  const sentenceMatches = normalized.match(/[.!?:]+/g);
  const sentenceCount = Math.max(1, sentenceMatches?.length ?? 0);
  const longWordCount = words.filter((word) => countLetters(word) > 6).length;

  return wordCount / sentenceCount + (longWordCount * 100) / wordCount;
}

export function estimateMinutes(words: number, wpm = 200): number {
  if (wpm <= 0) {
    return 0;
  }

  return Math.max(1, Math.ceil(words / wpm));
}

export function formatEstimatedMinutes(words: number, wpm = 200): string {
  return `~${estimateMinutes(words, wpm)} min`;
}
