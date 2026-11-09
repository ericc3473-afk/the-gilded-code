#!/usr/bin/env python3
"""Add PDF bookmarks (outline) to the assembled book via pypdf.

Chromium's headless print in this Edge build emits no document outline even
with generateDocumentOutline, so we locate anchor pages by normalized text
search and write the outline ourselves. Idempotent: rewrite after every render.

Usage:  python book/build/add-bookmarks.py [pdf]
"""
import re
import sys
from pypdf import PdfReader, PdfWriter

PDF = sys.argv[1] if len(sys.argv) > 1 else "The-Gilded-Code.pdf"

CHAPTERS = [
    (1, "The Right to Be Rich"), (2, "Getting Rich Is Not Luck; It Is Law"),
    (3, "Opportunity Is Not Monopolized"), (4, "Think Like an Owner"),
    (5, "See It Before You Have It"), (6, "The Gratitude Switch"),
    (7, "Mind Your Own Mind"), (8, "Do All That Can Be Done Today"),
    (9, "Do Not Mistake Your Vocation"), (10, "Put Yourself Where the Demand Is"),
    (11, "Debt Bites Slow and Holds Hard"),
    (12, "Whatever Is Worth Doing, Take Your Whole Self"),
    (13, "Use the Best Tools, Including People"),
    (14, "Serve Your Trade, Not Your Vanity"), (15, "Hope Much, Bet Little"),
    (16, "A Time and a Place for Everything"), (17, "Side Bets Sink Ships"),
    (18, "Make the Public Look Your Way"), (19, "Leave Everyone a Little Better"),
    (20, "Get Into the Right Business"),
    (21, "Integrity Is the Fortune That Cannot Be Lost"),
    (22, "The Whole Code in One Hand"),
]

# (bookmark title, normalized search needle); first occurrence in page order wins
FRONT = [
    ("Title Page", "22TIMELESSLAWS"),
    ("How to Use This Book", "HOWTOUSETHISBOOK"),
    ("Introduction", "INTRODUCTION:TWOSHOWMEN"),
]
PARTS = [
    ("Part I - The Price of the Mind", "PARTITHEPRICEOFTHEMIND"),
    ("Part II - The Code in Practice", "PARTIITHECODEINPRACTICE"),
    ("Part III - Living the Code", "PARTIIILIVINGTHECODE"),
]
# needles unique to the back pages (body text of the sheet, not the title)
BACK = [
    ("The Growth Tracker", "ONEROWPERLAW"),
    ("The Thirty-Day Planner", "ONELAPTHIRTYROWS"),
    ("The Self-Audit Scorecard", "RATEYOURSELFTWICE"),
    ("The Code on One Look", "OPENERSONLY"),
    ("Back Cover", "KAELVARNOWWRITESTHEMISSING"),
]


def norm(s):
    return re.sub(r"[^A-Z0-9]+", "", s.upper())


def main():
    reader = PdfReader(PDF)
    texts = [norm(p.extract_text()) for p in reader.pages]

    def find(needle, start=0):
        n = norm(needle)
        for i in range(start, len(texts)):
            if n in texts[i]:
                return i
        return None

    writer = PdfWriter()
    writer.append(reader, import_outline=False)  # idempotent: drop any old outline
    missing = []

    def add(title, page):
        if page is None:
            missing.append(title)
            page = 0
        writer.add_outline_item(title, page)

    # front matter (skip page 0 = cover)
    for title, needle in FRONT:
        pg = find(needle)
        if pg == 0:
            pg = 1
        add(title, pg)

    # part divider pages: label + title on one page ("PART I" + "The Price...")
    for title, needle in PARTS:
        add(title, find(needle))

    # chapters: kicker "LAW n . PART x" (separator may extract oddly, allow junk)
    # sequential floor: chapter n must start at or after chapter n-1's page,
    # which kills false kicker matches in front matter (e.g. "law 22" prose)
    floor = 1
    for num, title in CHAPTERS:
        pat = re.compile(rf"LAW{num}.{0,2}PART")
        pg = next((i for i in range(floor, len(texts)) if pat.search(texts[i])), None)
        if pg is None:
            pg = find(title, floor)
        add(f"Law {num}: {title}", pg)
        if pg is not None:
            floor = pg

    for title, needle in BACK:
        add(title, find(needle))

    with open(PDF, "wb") as f:
        writer.write(f)
    print(f"bookmarks: {len(writer.outline) and sum(len(e) if isinstance(e, list) else 1 for e in writer.outline)}"
          f" entries; missing: {missing or 'none'} -> {PDF}")


if __name__ == "__main__":
    main()
