import sys
from pypdf import PdfReader

r = PdfReader(sys.argv[1] if len(sys.argv) > 1 else "The-Gilded-Code.pdf")
n = [0]


def walk(o, d=0):
    for it in o:
        if isinstance(it, list):
            walk(it, d + 1)
        else:
            n[0] += 1
            pg = r.get_destination_page_number(it)
            print(f"{it.title!r} -> page {pg + 1}")


walk(r.outline)
print("total bookmarks:", n[0])
