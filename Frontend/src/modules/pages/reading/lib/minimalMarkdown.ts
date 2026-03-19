export type InlineNode =
  | { type: "text"; text: string }
  | { type: "bold"; text: string }
  | { type: "italic"; text: string };

export type MdHeading1Block = {
  type: "h1";
  raw: string;
  inlines: InlineNode[];
};

export type MdHeading2Block = {
  type: "h2";
  raw: string;
  inlines: InlineNode[];
};

export type MdParagraphBlock = {
  type: "paragraph";
  raw: string;
  inlines: InlineNode[];
};

export type MdBulletListItem = {
  raw: string;
  inlines: InlineNode[];
};

export type MdBulletListBlock = {
  type: "bullet_list";
  raw: string;
  items: MdBulletListItem[];
};

export type MdBlock =
  | MdHeading1Block
  | MdHeading2Block
  | MdParagraphBlock
  | MdBulletListBlock;

export type MdDoc = {
  title?: string;
  blocks: MdBlock[];
};

function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    if (text.startsWith("**", cursor)) {
      const close = text.indexOf("**", cursor + 2);
      if (close > cursor + 2) {
        nodes.push({ type: "bold", text: text.slice(cursor + 2, close) });
        cursor = close + 2;
        continue;
      }
    }

    if (text[cursor] === "*") {
      const close = text.indexOf("*", cursor + 1);
      if (close > cursor + 1) {
        nodes.push({ type: "italic", text: text.slice(cursor + 1, close) });
        cursor = close + 1;
        continue;
      }
    }

    const nextMarker = text.indexOf("*", cursor);
    const end = nextMarker === -1 ? text.length : nextMarker;
    const plain = text.slice(cursor, end);
    if (plain) {
      nodes.push({ type: "text", text: plain });
    }
    cursor = end;
  }

  return nodes;
}

export function parseMinimalMarkdown(markdown: string): MdDoc {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MdBlock[] = [];
  let title: string | undefined;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trimEnd();
    if (!line.trim()) {
      continue;
    }

    if (line.startsWith("# ")) {
      const raw = line.slice(2).trim();
      if (!title) {
        title = raw;
      }
      blocks.push({ type: "h1", raw, inlines: parseInline(raw) });
      continue;
    }

    if (line.startsWith("## ")) {
      const raw = line.slice(3).trim();
      blocks.push({ type: "h2", raw, inlines: parseInline(raw) });
      continue;
    }

    if (line.startsWith("- ")) {
      const items: MdBulletListItem[] = [];
      let j = i;

      while (j < lines.length) {
        const candidate = lines[j].trimEnd();
        if (!candidate.startsWith("- ")) {
          break;
        }

        const raw = candidate.slice(2).trim();
        items.push({ raw, inlines: parseInline(raw) });
        j += 1;
      }

      const raw = items.map((item) => `- ${item.raw}`).join("\n");
      blocks.push({ type: "bullet_list", raw, items });
      i = j - 1;
      continue;
    }

    const paragraphLines: string[] = [line.trim()];
    let j = i + 1;

    while (j < lines.length) {
      const candidate = lines[j].trim();
      if (!candidate || candidate.startsWith("# ") || candidate.startsWith("## ") || candidate.startsWith("- ")) {
        break;
      }

      paragraphLines.push(candidate);
      j += 1;
    }

    const raw = paragraphLines.join(" ");
    blocks.push({ type: "paragraph", raw, inlines: parseInline(raw) });
    i = j - 1;
  }

  return { title, blocks };
}
