# Design: "The Gilded Code" — a 150-page action workbook distilled from two classics

## The why

The user wants one new ebook that condenses, humanizes, and blends two
public-domain classics on getting rich:

1. **The Art of Money Getting** — P.T. Barnum (1880). Practical habits:
   avoid debt, don't mistake your vocation, be systematic, persevere,
   use the best tools, advertise, preserve integrity. Showman war stories.
2. **The Science of Getting Rich** — Wallace D. Wattles (1910). Mindset:
   thinking in the certain way, gratitude, visualisation, acting on
   faith, the will, efficient action.

Source EPUBs: `C:\Users\HP\Downloads\pg8581-images-3.epub` (Barnum),
`C:\Users\HP\Downloads\pg59844-images-3.epub` (Wattles). Both are
Project Gutenberg texts (public domain).

Output: **PDF, ~150 pages**. The reader should be able to *use* the book
to track growth, not just read it — so every chapter carries an action
step and tracking element (hybrid of "unified rules book" (#2) and
"learning journey" (#3) approaches offered in conversation; user chose
the mix).

## Title

**The Gilded Code** — taken from the user's own workspace folder name.
Subtitle proposal: *"22 timeless laws of getting rich, rewired for
today — from Barnum's habits and Wattles' science."*
Author name (user's decision): **Kael Varnow**.

## Goals

- One book, one voice — not two abridged texts stapled together.
- Every important idea from both source books survives the condensing.
- A modern, warm, direct voice (AI-tells stripped; see Humanizing below).
- Reader immersion: action step + tracking prompt per chapter; tracker
  section in back matter; a "first read vs. daily practice" mode.
- Exactly the kind of PDF you'd buy: chapter openers, pull quotes, page
  numbers, no clip-art filler.

## Non-goals / anti-goals

- No re-typing of Victorian padding; no verbatim 19th-century sermons.
- Not *The Secret*-style mysticism; Wattles' metaphysics (formless
  stuff, thinking stuff) is reframed as belief/clarity discipline — kept
  for his logic but not dressed up as magic.
- No modern counterfeits stretching the source (no crypto chapters).
- Anti-goal: padded page count via wide margins; 150 pages is real text.

## Structure

- **Front matter (~9 pp):** cover, title page, short copyright/credit
  note (public-domain sources), how to use this book, contents.
- **Part I — The Price of the Mind (mindset, from Wattles): ~8 chapters.**
- **Part II — The Code in Practice (habits, from Barnum): ~10 chapters.**
- **Part III — Living the Code (synthesis of both): ~4 chapters.**
- **Intro (~5 pp)** before Part I.
- Each chapter (target 1,300–1,500 words ≈ 4.5–5 pp):
  1. The principle, stated in one line (chapter opener).
  2. The distilled argument in the new voice, with the surviving
     anecdote(s) — Barnum's stories where they hit, Wattles' reasoning
     rendered clear.
  3. **Do this now** — one concrete action step.
  4. **Track it** — a one-line log prompt that feeds the tracker.
- **Back matter (~10 pp):** the Growth Tracker (a printable one-page
  log sheet keyed to the 22 laws), a 30-day pocket planner grid, a
  self-audit scorecard (rate yourself pre/post on all 22 laws), and a
  one-page "the whole code on one look" summary sheet.

Budget: 9 + 5 + 22×~4.8 + 12 ≈ 150 pages. Overflow valve: trim chapter
white space or the planner grid; underflow valve: widen chapter openers.

## Voice

Conversational, second person, concrete. Sentences short where the
originals were serpentine. Barnum's humour kept. Wattles' intensity
kept. Every chapter gets a cold read against AI tells — no "not-X-but-Y"
contrasts as a crutch, no bolded thought-leader closer lines, no forced
triads, no dash confetti, no "the truth is…" sales language.

## Constraints

- Public domain only — no third-party modern quotes (so no Stephen
  Covey, no Tesla anecdotes).
- Windows environment; PDF must render identically from one build step.
- Real page numbers and clickable-ish TOC (PDF bookmarks).

## The how the user decided

- Format: PDF. Shape: hybrid of unified-principles book + workbook
  elements (user's words: "so it becomes something the reader can use
  to track growth and be more immersed in it").
- Usage mode (user's decision): **static PDF, screen-first, no writable
  form fields.** Each chapter closes with a **Track it** prompt telling
  the reader what to log in their own notes app or journal — the book
  directs the tracking rather than being the tracker. The back-matter
  Growth Tracker becomes a printable one-page log sheet plus the
  summary/self-audit sheets (still usable by hand after printing a page).
- Edition: **digital only**; no print-trim constraints baked in.
- Author byline: Kael Varnow (user-provided pen name).
- Cover (user's decision): user supplied a cover design — dark
  black-and-gold marble, "The Pattern Behind" / "THE GILDED CODE" /
  "Abundance by Design" / "KAEL VARNOW". Their file is a 204×297 px
  screenshot, too small for a full page; the cover is recreated in
  high resolution to match (builder's call, disclosed). Back cover
  carries a blurb/summary (user's request).

## Left to the builder

- Exact list of the 22 laws and their part assignments (kept within the
  territory the two books cover; nothing invented).
- PDF build pipeline (default: styled HTML/CSS → headless print to PDF;
  verify tooling before drafting, so page math is real page math).
- Quota of which anecdote per chapter survives.
- Tracker table design details.
