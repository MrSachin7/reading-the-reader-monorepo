# Thesis Authoring Rules (Reading-the-Reader, DTU MSc)

This file governs every Claude session that writes or edits content in
this directory. **All rules in §1 are non-negotiable.** If a user
request conflicts with §1, refuse and explain why; do not comply.

The thesis is submitted to DTU under Danish academic regulations.
Plagiarism in Denmark is treated as exam cheating and can result in
**permanent expulsion** on a single offence in a final-exam context
(master's thesis qualifies). Treat every sentence accordingly.

---

## 1. Non-negotiable rules

### 1.1 Never fabricate sources, facts, numbers, or quotations

- **No invented citations.** Do not write a `\cite{key}` for a source
  that is not already present in [bibliography.bib](bibliography.bib),
  unless the user has explicitly given you the source.
- **No invented bibliography entries.** Do not add an entry to
  `bibliography.bib` from memory. Every field (author, title, venue,
  year, DOI, URL) must come from a verifiable source the user gave you
  or a page you fetched in this session.
- **No invented statistics, dataset sizes, benchmark numbers, study
  participant counts, model accuracies, or quotes.** If a number is
  needed and not in hand, write `\todo{cite}` or `\todo{verify N}` and
  stop — ask the user.
- **No "plausible" paraphrase of an unread source.** If you have not
  read the source, you cannot summarise its claims.
- **No author opinions attributed to real people** unless you can
  point to the exact source in this session.
- LLMs hallucinate references. Assume any citation you "remember" is
  wrong until verified against a fetched page or a `.bib` entry the
  user supplied.

### 1.2 Never copy text from any source without quotation + citation

- Quote verbatim only inside quotation marks (or a `quote` environment)
  with an immediate `\cite{}` to the exact source.
- Paraphrasing still requires `\cite{}`. Paraphrase = restating an
  idea in your own words; the **idea** is still owed to the source.
- This includes course slides, prior project reports, Wikipedia, blog
  posts, AI output, and the user's own earlier graded work
  (self-plagiarism is also exam cheating at DTU).

### 1.3 Never write claims as if they are established when they are not

- If a claim is the author's own argument: phrase it as such ("we
  argue", "this thesis proposes").
- If it's a result reported in literature: cite.
- If it's common knowledge in computer science (e.g. "a B-tree has
  logarithmic lookup"): no cite needed, but only if it really is
  textbook-level.
- Never write "studies show" or "it is well known" without a citation.

### 1.4 Generative AI must be declared

- Any AI-assisted writing must be disclosable. The thesis must include
  an explicit declaration of generative-AI use — recommended placement
  is an appendix titled _"Declaration of Use of Generative AI"_ with
  details of which tools, where, and how. A brief note in the
  introduction or methodology is also acceptable.
- The thesis has **two human co-authors**. Claude is **not** a
  co-author; never write the thesis as if AI contributed authorship.
- Preserve prompts and outputs the user may need to retain for
  documentation. Do not delete `*.prompt.md`-style logs without asking.

### 1.5 Stay inside the user's voice

- This is a **two-author thesis**. Use first-person plural ("we")
  throughout — never "I". Passive voice is acceptable for variation
  but be consistent across chapters.
- Do not introduce new technical claims, new system features, new
  acronyms, or new evaluation metrics that the user has not mentioned.

---

## 2. DTU-specific conventions (follow unless told otherwise)

### 2.1 Structure

- Follow IMRAD-extended skeleton already scaffolded:
  Introduction → Background & Related Work → Methodology →
  Requirements → System Design → Implementation → Evaluation →
  Discussion → Conclusion.
- Conclusion ≤ 1 page; introduces no new content.
- Target length: **~60 pages main content**, range 40–70, hard
  ceiling 100 (excluding front matter, bibliography, appendices).
- The Final Problem Statement (with measurable sub-questions) lives
  at the _end_ of Chapter 2, not in Chapter 1.

### 2.2 Tone & language

- English. Formal academic register. Avoid contractions ("don't" →
  "do not"), avoid colloquialisms, avoid hype words ("revolutionary",
  "cutting-edge", "leveraging synergies").
- Precision over flourish. One claim per sentence where possible.
- Define every acronym on first use: "Reading Resume Time (RRT)".
- British or American English — pick one and stay consistent.
- Spelling counts toward the grade. Run a spell-check before
  declaring a section done.

### 2.3 Citations & references

- Citation style: `biblatex` + `biber`, `numeric`, `sorting=none`
  (citation order). Already configured in
  [Setup/Preamble.tex](Setup/Preamble.tex:22).
- Combine multiple citations: `\cite{a, b, c}` — not
  `\cite{a}\cite{b}\cite{c}`.
- Prefer peer-reviewed sources (journals, conferences). Aim for
  **≥ 30 references** in the final thesis; mostly peer-reviewed.
- Cite figures and tables not produced by the author directly in the
  caption.
- Self-generated figures: reproduce from code where feasible; commit
  the code.

### 2.4 Figures, tables, equations

- Vector formats (PDF/SVG/EPS) only. No screenshots of plots.
- Every figure, table, equation **must be referenced and discussed**
  in the body text. If it is not referenced, delete it.
- Captions are full sentences and end with a period.
- Refer to elements with capitalised abbreviations: "Fig.\ 3",
  "Tab.\ 2", "Sec.\ 4.1", "Eq.\ 7", "App.\ A" (use `~` for
  non-breaking spaces: `Fig.~3`).
- In result tables, mark performance direction with ↑ / ↓ in headers.

### 2.5 LaTeX hygiene

- Use the existing template; do not change `Setup/` files without
  asking.
- One sentence per line in `.tex` source — makes diffs review-friendly.
- Use `\label{}` on every chapter, section, figure, table, equation
  you will reference. Convention: `ch:`, `sec:`, `fig:`, `tab:`,
  `eq:`, `app:`.
- Reference with `\ref{}` / `\cref{}`, never hard-code "Section 4".
- Avoid `\textbf` and `\emph` for emphasis in body text; reserve them
  for term-introduction.

---

## 3. Working protocol for Claude sessions

### 3.1 Before writing prose

1. Check what is already in the chapter — do not rewrite work without
   permission.
2. Check whether the claim needs a citation. If yes and no source is
   on hand: stop, ask the user.
3. If asked to "expand" or "flesh out" a section, ask which sources
   to draw on. Do **not** invent supporting literature to fill space.

### 3.2 When inserting `\cite{}`

- Only use keys that already exist in
  [bibliography.bib](bibliography.bib). Verify by reading the file.
- If a needed citation has no key: tell the user, ask for the source,
  add the entry from the user-supplied metadata.
- Never silently coin a new key like `\cite{smith2024}` hoping it
  exists.

### 3.3 When adding `.bib` entries

- Required fields per type:
  - `@article`: author, title, journal, year, volume, pages.
  - `@inproceedings`: author, title, booktitle, year, pages (if known).
  - `@book`: author, title, publisher, year.
  - `@online`: author/organisation, title, year, url, urldate.
- Keys: prefer stable `firstauthorYEARkeyword` (e.g. `rayner1998eye`)
  over `refN`. Do not rename existing keys without updating every
  `\cite{}` that uses them.
- Wrap proper nouns in `{}` to preserve case: `title = {The {DTU} thesis}`.

### 3.4 Build verification

- After non-trivial edits, run `latexmk -xelatex main.tex` from the
  report directory and report unresolved citation/reference warnings.
- Do not declare a section "done" if the build emits new warnings you
  introduced.

### 3.5 What to flag, never silently do

- Removing references — flag.
- Removing or shortening evaluation/limitations content — flag.
- Changing the problem statement or research questions — flag.
- Editing chapter 2 (already contains user-written content) — flag
  the planned diff before applying.

---

## 4. Plagiarism guard checklist

Before sending a response that contains thesis prose, mentally answer:

1. Does every factual claim either (a) cite a source in
   `bibliography.bib`, (b) carry a `\todo{cite}` marker, or (c) state
   a piece of the author's own work/argument?
2. Are any sentences a near-copy of an external source? If yes, are
   they in quotation marks and cited?
3. Have I introduced any author/title/venue/DOI/number/quote that I
   did not see in this session?
4. Is the writing in the user's voice and consistent with the
   surrounding chapters?

If any answer is "no" or "uncertain", revise before sending.

---

## 5. References (rules sourced from)

These are DTU's actual rules, not internal guidance:

- DTU rules for the master's thesis — student.dtu.dk/en/rules/afsluttende-projekter/kandidatspeciale
- DTU cheating & plagiarism rules — student.dtu.dk/en/rules/exam/cheating-at-exams-and-other-forms-of-assessment
- DTU AI rules — ai.dtu.dk/rules
- DTU library guide on declaring AI use — bibliotek.dtu.dk/en/publishing/reference-management/kunstig-intelligens
- DTU Compute thesis guide — skaftenicki.github.io/dtu_cs_thesis/writing
- Bardram supervision guidance — bardram.net/msc-thesis

If a rule above conflicts with a current page on those domains, the
DTU page wins. Re-fetch and update this file.
