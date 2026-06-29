// Build docs/USER_GUIDE.pdf from docs/USER_GUIDE.md
//
// Usage (from anywhere):
//   bun docs/build-user-guide-pdf.mjs
//   # or: node docs/build-user-guide-pdf.mjs
//
// Pipeline: Markdown -> LaTeX -> PDF via Pandoc + xelatex (MiKTeX). hyperref makes
// the table of contents, every "§" cross-reference, AND the bookmark sidebar
// clickable. Everything renders locally; nothing is uploaded.
//
// Requirements on this machine (already installed):
//   - Pandoc   (C:\Users\<you>\AppData\Local\Pandoc\pandoc.exe)
//   - MiKTeX   (xelatex on PATH; package auto-install enabled)
// If MiKTeX prompts for a repository, run once:
//   miktex repositories list                       # pick a URL
//   mpm --set-repository=<url> && mpm --update-db   # register + refresh

import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const mdPath = join(here, "USER_GUIDE.md");
const pdfPath = join(here, "USER_GUIDE.pdf");

function findExe(candidates, name) {
  for (const c of candidates) if (existsSync(c)) return c;
  return name; // fall back to PATH lookup
}

const PANDOC = findExe(
  [
    join(process.env.LOCALAPPDATA ?? "", "Pandoc", "pandoc.exe"),
    "C:/Program Files/Pandoc/pandoc.exe",
  ],
  "pandoc"
);

// xelatex must be reachable; add the common MiKTeX bin dir to PATH for this run.
const miktexBin = join(
  process.env.LOCALAPPDATA ?? "",
  "Programs/MiKTeX/miktex/bin/x64"
);
const env = { ...process.env };
if (existsSync(miktexBin)) env.PATH = `${env.PATH};${miktexBin}`;

// xelatex can't render the camera emoji; drop it but keep the caption text.
const src = readFileSync(mdPath, "utf8").replace(/📷 /g, "");
const work = mkdtempSync(join(tmpdir(), "userguide-"));
const tmpMd = join(work, "guide.md");
writeFileSync(tmpMd, src, "utf8");

try {
  execFileSync(
    PANDOC,
    [
      tmpMd,
      // markdown reader honours the pipe-table column widths (the dash proportions
      // in the separators) so wide cells wrap to full width instead of overflowing;
      // gfm_auto_identifiers keeps GitHub-style heading slugs so the in-doc links work.
      "-f", "markdown+gfm_auto_identifiers",
      "-o", pdfPath,
      "--pdf-engine=xelatex",
      // images live in docs/ (next to USER_GUIDE.md), but pandoc runs on a temp
      // copy — point it back at docs/ so relative image paths resolve.
      "--resource-path", here,
      // cap tall screenshots so they fit a float's height (no overfull warnings).
      "--include-in-header", join(here, "pandoc-header.tex"),
      "--toc", "--toc-depth=3",
      "-V", "geometry:margin=2cm",
      "-V", "mainfont=Segoe UI",
      "-V", "monofont=Consolas",
      "-V", "colorlinks=true",
      "-V", "linkcolor=RoyalBlue",
      "-V", "urlcolor=RoyalBlue",
      "-V", "toccolor=RoyalBlue",
      "-V", "fontsize=11pt",
    ],
    { stdio: "inherit", env }
  );
  console.log(`\nWrote ${pdfPath}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
