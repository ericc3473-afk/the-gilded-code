# The Gilded Code — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a ~150-page PDF book, *The Gilded Code* by Kael Varnow, condensing P.T. Barnum's *The Art of Money Getting* and Wallace Wattles' *The Science of Getting Rich* into 22 modern-voiced law chapters with per-chapter action/tracking prompts, tracker back matter, front cover, and back-cover blurb.

**Architecture:** Manuscript as Markdown files (one per chapter) with a small YAML-ish header; a Node build script converts them to a single HTML document and renders to PDF via headless Edge/Chromium with Paged.js for page numbers, running heads, and chapter openers. Cover is a high-res recreation of the user's screenshot, generated as HTML/CSS + a Python-rendered marble texture.

**Tech Stack:** Node (marked, paged.js, puppeteer-core driving installed msedge), Python 3.12 + Pillow for texture, Markdown manuscript.

**Spec:** `docs/2026-11-07-book-design.md` (read alongside this plan — it carries the why, the voice rules, and the user's decisions).

## Global Constraints

- Output: single PDF `The-Gilded-Code.pdf` at project root, 6×9in pages (152.4×228.6 mm), screen-first.
- Page target: **150 ± 5 pages**; content wins over exactness (design-valve rule).
- Word budget: chapters 1,300–1,500 words each; total manuscript 40,000–45,000 words.
- Voice: modern, conversational, second person. Humanizer checklist applied every batch (no AI tells: no stock phrases like "delve"/"unlock", no bolded closer lines, no forced triads, no dash confetti, no marketing inflation).
- Sources are public domain only; no third-party modern quotes or attributions.
- Wattles' metaphysics is rendered as belief/clarity discipline, never dressed up as magic ("Think in a certain way", never "the Universe will deliver").
- Every chapter carries the four elements: one-line principle opener, distilled body with surviving anecdote, **Do this now**, **Track it**.
- Manuscript file contract (all tasks rely on it):
  ```
  ---
  type: chapter | front | back
  title: <string>            # full chapter title
  law: <roman-or-number>     # omitted for front/back matter
  opener: <string>           # the principle in one line
  doNow: <string>            # single-sentence action
  trackIt: <string>          # what the reader logs
  part: I | II | III         # chapters only
  ---
  <body markdown>
  ```
- Build order is defined in `manuscript/toc.md` (simple list of file paths).
- Do not commit anything (folder is not a git repo and user has not asked).

## Review Focus

- **Page count drift** → after each manuscript batch, render + count pages; use the valves (trim planner grid, tighten openers) rather than padding. Verify: `node build/build.mjs --count` prints the number.
- **AI tells / voice drift** → the prose is written by an LLM and read cold by readers. Behavior expected: passes the humanizer checklist. Verify: grep lint in Task 13 (`pattern-lint.mjs`) returning zero hits per banned pattern.
- **Source coverage** → everything the two source TOCs teach must appear, nothing invented. Verify: outline task's coverage grid maps every source chapter to ≥1 law chapter; grep for modern third-party names returns zero.
- **Wattles mysticism reframe** → Part I must read as discipline, not magic. Verify: grep for "Universe/manifest/vibration" returns zero in manuscript.
- **Pagination furniture missing** → page numbers and running heads must actually render (Paged.js margin boxes). Verify: render check that page 30's footer contains its page number (extract text of page 30 via PDF and assert).

---

### Task 1: Build scaffolding that renders one paged PDF

**Files:**
- Create: `book/build/build.mjs`, `book/package.json`, `book/style/book.css`, `book/build/test.html`
- Test: page count + footer text of the rendered test PDF

**Interfaces:**
- Produces: `node book/build/build.mjs <htmlOrMd> --out <pdf>` renders paged PDF with page-number margin boxes; `--count` prints numbers of pages.
- Produces: npm packages installed in `book/`: `marked`, `paged.js`, `puppeteer-core` (config `executablePath` to msedge).

- [ ] **Step 1:** `npm init -y`, `npm i marked paged.js puppeteer-core`, copy/serve `paged.polyfill.js` from node_modules as a local asset.
- [ ] **Step 2:** Write `build.mjs`: opens Edge headless via puppeteer-core, loads HTML with `<script src="paged.polyfill.js">`, `page.pdf({ width:'152.4mm', height:'228.6mm', printBackground:true })`, prints page count from Paged.js layout.
- [ ] **Step 3:** Render `test.html` (two dummy pages, `@page` margin boxes with `counter(page) → counter(pages)` in `@bottom-center`).
- [ ] **Step 4:** Verify: PDF exists, is 2 pages, extracted footer text contains "1" and "2". If Paged.js margin boxes fail in headless print, fall back: displayHeaderFooter Chromium template — record which is used, in comments at top of `build.mjs`.

### Task 2: Extract source texts into the project

**Files:**
- Create: `sources/barnum/*.txt`, `sources/wattles/*.txt` (one file per chapter, `01-the-right-to-be-rich.txt` style)
- Reuse: existing extractions at `%TEMP%\opencode\book1`, `%TEMP%\opencode\book2`

**Interfaces:**
- Produces: plain UTF-8 text per chapter, headings stripped of Gutenberg boilerplate; file count = 20 (Barnum sections) + 17 (Wattles chapters).

- [ ] **Step 1:** Copy extracted EPUBs' OEBPS xhtml into `sources/`, convert each to cleaned text (strip tags, license blocks, TOC entries) with a throwaway Python script `sources/extract.py` (kept for provenance).
- [ ] **Step 2:** Verify: `Get-ChildItem sources/barnum | Measure-Object` shows 20; wattles 17; no file contains "Project Gutenberg license" (grep).

### Task 3: The 22-law outline (the book's skeleton)

**Files:**
- Create: `manuscript/outline.md` — per chapter: file name, title, part, source chapters used, anecdote(s) kept, opener line draft, page budget.

**Interfaces:**
- Produces: `manuscript/toc.md` (ordered list of manuscript files, front → 22 chapters → back) consumed by the build; the chapter-file contract above is the interface every writing task publishes into.
- Constraint: Wattles ≈ 8 laws (Part I), Barnum ≈ 10 (Part II), synthesis 4 (Part III).

- [ ] **Step 1:** Read all extracted source text; draft the 22 laws so every source TOC entry maps to exactly one law chapter (coverage grid embedded in `outline.md`).
- [ ] **Step 2:** Verify coverage: every entry of both TOCs appears in ≥1 row of the grid; no row cites anything beyond the two books; page budget rounds to ~150 sans valves.
- [ ] **Step 3:** Write `manuscript/toc.md`.

### Task 4: Front matter + introduction

**Files:**
- Create: `manuscript/front/00-title-page.md` (title, subtitle, "by Kael Varnow", public-domain credit note: condensed from Barnum 1880 and Wattles 1910), `manuscript/front/01-how-to-use.md` (the two-pass method: full read once, then the daily cycle of openers + Do this now), `manuscript/front/02-introduction.md` (~1,800 words: the two dead authors and one living idea framing)

**Interfaces:** follow the file contract (`type: front`, no `law`).

- [ ] **Step 1:** Write all three files; title page is sparse, intro and how-to-use to word budget.
- [ ] **Step 2:** Cold-read against the humanizer checklist; fix.
- [ ] **Step 3:** Verify as renderer-visible later; no build yet.

### Task 5: Part I — The Price of the Mind, chapters 1–4

**Files:** Create `manuscript/part1/ch01.md` … `ch04.md` (exact titles from the approved outline)

- [ ] **Step 1:** Write four chapters per the chapter contract, 1,300–1,500 words each, sourced from outline rows (Wattles mapped).
- [ ] **Step 2:** Humanizer cold-read pass over the batch.
- [ ] **Step 3:** Verify: word counts in range (a one-line `wc` equivalent per file); grep shows zero banned-phrase hits.

### Task 6: Part I — chapters 5–8

Same as Task 5 with `ch05.md` … `ch08.md`. Completion of Part I. Verify block identical, plus the mysticism gate: grep manuscript for "Universe", "manifest", "vibration" → zero hits.

### Task 7: Part II — The Code in Practice, chapters 9–13

Same machine, Barnum-sourced rows from the outline, `ch09.md` … `ch13.md`. Barnum's own anecdotes survive here (his showman stories, the debt war stories); modernized phrasing, Victorian padding cut.

### Task 8: Part II — chapters 14–18

`ch14.md` … `ch18.md`.

### Task 9: Part III — Living the Code, chapters 19–22 (synthesis)

`ch19.md` … `ch22.md`; each draws from both books per the outline's synthesis rows (e.g., growth from Wattles' *increasing life* woven with Barnum's *persevere*; *integrity* chapter pairs Wattles' *efficient action* with Barnum's *preserve your integrity*).

### Task 10: Back matter + back-cover blurb

**Files:** Create `manuscript/back/31-growth-tracker.md` (single printable log-page layout keyed to the 22 laws), `manuscript/back/32-thirty-day-planner.md`, `manuscript/back/33-self-audit.md` (pre/post scorecard), `manuscript/back/34-the-code-on-one-look.md` (all 22 laws, one line each), `manuscript/back/35-back-cover.md` (blurb: what the book is, for whom, the promise, ending with `— Kael Varnow`; no AI-tell closer)

- [ ] **Step 1:** Write all five; tracker/planner are poster-style pages (CSS grid rows, not prose).
- [ ] **Step 2:** Verify: the one-look sheet's 22 lines match the 22 chapter titles verbatim (scripted diff against `outline.md`).

### Task 11: Front + back cover art

**Files:** Create `book/assets/cover-texture.py` (Python/Pillow procedural black-marble with gold veining → `book/assets/cover.png`, ≥1536×2304), `manuscript/cover-front.md` (full-bleed cover page: layout per user's screenshot — "The Pattern Behind" / **THE GILDED CODE** / "Abundance by Design" / KAEL VARNOW), render of back-cover blurb page in matching style

- [ ] **Step 1:** Generate texture; verify file exists ≥ stated pixels and.mean-pixel check dark (script prints it).
- [ ] **Step 2:** Build the cover HTML/CSS; render a test PDF of just the cover pages.
- [ ] **Step 3:** Verify: side-by-side visual against the user's screenshot — same text order, same dominance hierarchy. Screenshot the render and show the user.

### Task 12: Full assembly + first complete render

**Files:** Modify `book/build/build.mjs` if anything surfaced; `manuscript/toc.md` final.

- [ ] **Step 1:** Ensure `manuscript/toc.md` lists: cover-front page → all front matter → 22 chapters → back matter (ending with back-cover blurb rendered in the cover style). Assemble all md → html → PDF at project root.
- [ ] **Step 2:** Verify: page count 145–155; if under/over, apply design valves and re-render; extract page 30 text and confirm footer "30" and running head present; confirm bookmarks exist for parts (Chromium outline from headings).

### Task 13: Whole-book humanize pass + final QA + deliver

**Files:** Modify: any manuscript files flagged; final PDF regenerated.

- [ ] **Step 1:** Load the `humanizer` skill; pass the entire assembled text through it chapter by chapter; fix every flag; re-run the pattern lint (`book/build/pattern-lint.mjs`, list of banned patterns from the humanizer checklist) — zero hits.
- [ ] **Step 2:** Read the full PDF once end to end (skim-level for furniture: openers, Do this now, Track it present on all 22; running heads correct per part).
- [ ] **Step 3:** Re-render; verify page count still 145–155 and PDF opens cleanly.
- [ ] **Step 4:** Deliver: report file path, page count, word count, and the cover render to the user.
