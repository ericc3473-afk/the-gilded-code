#!/usr/bin/env python3
"""Extract per-chapter plain text from the two Gutenberg EPUB extractions.

Sources (both long out of copyright):
  book1 = Barnum, "The Art of Money Getting" (1880)  -> sources/barnum/
  book2 = Wattles, "The Science of Getting Rich" (1910) -> sources/wattles/
Strips Gutenberg boilerplate (headers/footers/license), keeps chapter text.
"""
import os
import re
import sys
from bs4 import BeautifulSoup

TMP = os.path.join(os.environ["TEMP"], "opencode")
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)))


def clean_text(soup, drop_ids=(r"pg-header-heading", r"pg-footer-heading", r"pg-header", r"pg-footer")):
    for el in soup.find_all(id=True):
        ident = el.attrs.get("id", "") if el.attrs else ""
        if any(re.match(p, ident) for p in drop_ids):
            el.decompose()
    text = soup.get_text("\n")
    # normalize whitespace per line, drop empties
    lines = [re.sub(r"\s+", " ", ln).strip() for ln in text.splitlines()]
    lines = [ln for ln in lines if ln]
    body = []
    skip = False
    for ln in lines:
        if re.match(r"The Project Gutenberg eBook", ln, re.I):
            skip = True
            continue
        if re.match(r"End of (this|the) Project Gutenberg", ln, re.I):
            skip = False
            continue
        if skip:
            continue
        if re.match(r"\[?(Footnote|Transcriber)?", ln) and re.match(r"^\[?Transcriber", ln):
            continue
        body.append(ln)
    return body


def slug(t, n):
    return re.sub(r"[^a-z0-9]+", "-", t.lower()).strip("-")[:60]


def extract_barnum():
    src = os.path.join(TMP, "book1", "OEBPS", "6830277939805398330_8581-h-0.htm.xhtml")
    soup = BeautifulSoup(open(src, encoding="utf-8").read(), "html.parser")
    outdir = os.path.join(OUT, "barnum")
    os.makedirs(outdir, exist_ok=True)
    heads = [h for h in soup.find_all("h2") if h.get("id", "").startswith("pgepubid") or h.get("id", "")]
    heads = [h for h in heads if h.get("id") not in (None,) and h.get("id") not in ("pg-header-heading", "pg-footer-heading")]
    # chapters: those with known titles from TOC
    toc_titles = [
        "DON'T MISTAKE YOUR VOCATION", "SELECT THE RIGHT LOCATION", "AVOID DEBT",
        "PERSEVERE", "WHATEVER YOU DO, DO IT WITH ALL YOUR MIGHT", "USE THE BEST TOOLS",
        "DON'T GET ABOVE YOUR BUSINESS", "LEARN SOMETHING USEFUL",
        "LET HOPE PREDOMINATE, BUT BE NOT TOO VISIONARY", "DO NOT SCATTER YOUR POWERS",
        "BE SYSTEMATIC", "READ THE NEWSPAPERS", "BEWARE OF \"OUTSIDE OPERATIONS\"",
        "DON'T INDORSE WITHOUT SECURITY", "ADVERTISE YOUR BUSINESS",
        "\"DON'T READ THE OTHER SIDE\"", "BE POLITE AND KIND TO YOUR CUSTOMERS",
        "BE CHARITABLE", "DON'T BLAB", "PRESERVE YOUR INTEGRITY",
    ]
    count = 0
    for h in heads:
        title = re.sub(r"\s+", " ", h.get_text(" ")).strip().rstrip(".").upper()
        if title not in toc_titles:
            continue
        # collect text until next numbered heading
        parts = []
        for sib in h.find_next_siblings():
            if sib.name == "h2":
                break
            parts.append(sib.get_text(" "))
        text = re.sub(r"\s+", " ", " ".join(parts)).strip()
        text = re.sub(r"\[Pg \d+\]|\[\d+\]", "", text)  # page refs
        fn = os.path.join(outdir, "%02d-%s.txt" % (count + 1, slug(title, count + 1)))
        with open(fn, "w", encoding="utf-8") as f:
            f.write(title + "\n\n" + text)
        count += 1
    print("barnum chapters:", count)


def extract_wattles():
    """Chapters cross file boundaries (files split mid-sentence), so merge all
    content files in order and split the stream on CHAPTER/PREFACE markers."""
    srcdir = os.path.join(TMP, "book2", "OEBPS")
    outdir = os.path.join(OUT, "wattles")
    os.makedirs(outdir, exist_ok=True)
    files = sorted(
        (f for f in os.listdir(srcdir) if re.match(r"\S+_59844-h-\d+\.htm\.xhtml$", f)),
        key=lambda f: int(re.search(r"-(\d+)\.htm", f).group(1)),
    )
    stream = []
    for f in files:
        n = int(re.search(r"-(\d+)\.htm", f).group(1))
        if n in (0, 1):  # cover/title pages
            continue
        soup = BeautifulSoup(open(os.path.join(srcdir, f), encoding="utf-8").read(), "html.parser")
        lines = clean_text(soup)
        if not lines:
            continue
        head_blob = " ".join(lines[:6]).lower()
        if "transcriber" in head_blob or "license" in head_blob or "terms of use" in head_blob:
            continue
        if lines[0].rstrip(".").upper() == "CONTENTS":
            continue  # the book's own TOC page
        stream.append((f, lines))

    # flatten, remembering nothing about origin: one continuous stream
    flat = []
    for f, lines in stream:
        flat.extend(lines)
    # drop trailing transcriber notes / license that leaked in
    end = len(flat)
    for i, ln in enumerate(flat):
        if re.match(r"^(TRANSCRIBER|THE FULL PROJECT GUTENBERG|End of the Project)", ln, re.I):
            end = i
            break
    flat = flat[:end]

    # split
    chapters = []
    for i, ln in enumerate(flat):
        if re.match(r"^(CHAPTER\s+[IVXLC]+\.?|PREFACE)\.?$", ln.strip(), re.I):
            first = ln.strip().rstrip(".")
            if i + 1 < len(flat):
                title = first + ". " + flat[i + 1].strip()
                body_start = i + 2
            else:
                title = first
                body_start = i + 1
            stop = len(flat)
            chapters.append({"title": re.sub(r"\s+", " ", title).strip(), "body": flat[body_start:stop]})
    if not chapters:
        print("wattles: no chapter markers found!")
        return
    # consecutive duplicates (marker matched twice per chapter) get merged
    merged = []
    for entry in chapters:
        if merged and entry["title"] == merged[-1]["title"]:
            merged[-1]["body"].extend(entry["body"])
        else:
            merged.append(entry)
    # drop doubly-marked fragments: "PREFACE. PREFACE." broke into a junk chunk
    merged = [e for e in merged if not re.match(r"^(PREFACE\.|CHAPTER\s+[IVXLC]+\.?)\s+(PREFACE\.|CHAPTER\s+[IVXLC]+\.?)", e["title"])]
    chapters = merged
    count = 0
    for k, entry in enumerate(chapters):
        title = entry["title"]
        body = entry["body"]
        count += 1
        key = slug(re.sub(r"^(CHAPTER\s+[IVXLC]+\.?|PREFACE\.?)\s*", "", title), count) or "untitled"
        fn = os.path.join(outdir, "ch%02d-%s.txt" % (count, key))
        with open(fn, "w", encoding="utf-8") as out:
            out.write(title + "\n\n" + "\n\n".join(t for t in body if t))
    print("wattles chapters:", count)


if __name__ == "__main__":
    extract_barnum()
    extract_wattles()
