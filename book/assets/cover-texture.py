#!/usr/bin/env python3
"""Procedural black-marble cover texture with gold veining for The Gilded Code.

Generates book/assets/cover.png (1536x2304, deterministic seed) and prints a
check line: dimensions plus mean pixel brightness (must stay dark so the gold
text reads on top).

Usage:  python book/assets/cover-texture.py
"""
import random
from PIL import Image, ImageDraw, ImageFilter

W, H = 1536, 2304
SEED = 1140

GOLD_DARK = (122, 90, 30)
GOLD_MID = (184, 141, 55)
GOLD_BRIGHT = (224, 186, 96)


def marble_base():
    img = Image.new("RGB", (W, H), (9, 9, 11))
    d = ImageDraw.Draw(img)
    # broad mottling: large soft ellipses in slightly varied dark tones
    for _ in range(240):
        cx = random.randint(-150, W + 150)
        cy = random.randint(-150, H + 150)
        rx = random.randint(140, 520)
        ry = random.randint(140, 520)
        t = random.randint(13, 27)
        d.ellipse((cx - rx, cy - ry, cx + rx, cy + ry), fill=(t, t, t + 3))
    img = img.filter(ImageFilter.GaussianBlur(110))
    # medium tone patches for the cloudy marble look
    d2 = ImageDraw.Draw(img)
    for _ in range(1300):
        cx = random.randint(0, W)
        cy = random.randint(0, H)
        r = random.randint(4, 30)
        t = random.randint(16, 48)
        d2.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(t, t, t))
    img = img.filter(ImageFilter.GaussianBlur(22))
    # faint diagonal current, like compressed strata
    d3 = ImageDraw.Draw(img)
    for _ in range(90):
        x0 = random.randint(-400, W)
        y0 = random.randint(-H // 2, H)
        dx, dy = random.randint(500, 1400), random.randint(-350, 350)
        t = random.randint(20, 40)
        d3.line((x0, y0, x0 + dx, y0 + dy), fill=(t, t, t + 2), width=1)
    img = img.filter(ImageFilter.GaussianBlur(8))
    return img


def _walk(d, x, y, angle_deg, steps, width_range, alpha_range):
    """Random-walk a vein, mostly along angle_deg, with jitter."""
    import math
    for _ in range(steps):
        angle = math.radians(angle_deg + random.uniform(-24, 24))
        length = random.uniform(18, 70)
        nx = x + math.cos(angle) * length
        ny = y + math.sin(angle) * length
        w = random.randint(*width_range)
        a = random.randint(*alpha_range)
        tone = random.randint(0, 2)
        col = (GOLD_DARK, GOLD_MID, GOLD_BRIGHT)[tone] + (a,)
        d.line((x, y, nx, ny), fill=col, width=w)
        x, y = nx, ny
    return x, y


def gold_veins(img):
    layer = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(layer)
    for _ in range(11):
        # start near an edge, walk a long diagonal across the page
        edge = random.choice(["top", "bottom", "left", "right"])
        if edge == "top":
            x, y = random.uniform(0, W), -20
            angle = random.choice([35, 40, 55, 130, 140])
        elif edge == "bottom":
            x, y = random.uniform(0, W), H + 20
            angle = random.choice([-140, -35, -40, -55])
        elif edge == "left":
            x, y = -20, random.uniform(0, H)
            angle = random.choice([15, 25, -15, -25])
        else:
            x, y = W + 20, random.uniform(0, H)
            angle = random.choice([155, 165, 195, 205])
        x, y = _walk(d, x, y, angle, random.randint(28, 46),
                     (1, 5), (60, 170))
        # short branches off the main vein
        for _ in range(random.randint(2, 6)):
            bx, by = x + random.uniform(-260, 260), y + random.uniform(-260, 260)
            _walk(d, bx, by, random.uniform(0, 360), random.randint(6, 14),
                  (1, 2), (40, 120))
    layer = layer.filter(ImageFilter.GaussianBlur(3))
    img = Image.alpha_composite(img.convert("RGBA"), layer).convert("RGB")
    # sharp bright cores for a few of the veins
    layer2 = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(layer2)
    for _ in range(5):
        edge = random.choice(["top", "left"])
        if edge == "top":
            x, y = random.uniform(0, W), -20
            angle = random.choice([40, 55, 140])
        else:
            x, y = -20, random.uniform(0, H)
            angle = random.choice([20, -20])
        _walk(d2, x, y, angle, random.randint(22, 34), (1, 2), (150, 235))
    layer2 = layer2.filter(ImageFilter.GaussianBlur(1))
    img = Image.alpha_composite(img.convert("RGBA"), layer2).convert("RGB")
    # scattered gold flecks
    d3 = ImageDraw.Draw(img)
    for _ in range(90):
        x = random.randint(0, W - 2)
        y = random.randint(0, H - 2)
        r = random.choice([1, 1, 1, 2])
        d3.ellipse((x - r, y - r, x + r, y + r), fill=GOLD_MID)
    return img


def main():
    random.seed(SEED)
    img = marble_base()
    img = gold_veins(img)
    out = img.copy()
    import os
    here = os.path.dirname(os.path.abspath(__file__))
    path = os.path.join(here, "cover.png")
    out.save(path, "PNG")
    # deterministic check: size + mean brightness (must be dark)
    small = out.resize((1, 1))
    px = small.getpixel((0, 0))
    mean = sum(px[:3]) / 3
    print(f"cover.png {out.size[0]}x{out.size[1]} mean-brightness "
          f"{mean:.1f} (dark < 60): {'PASS' if mean < 60 else 'FAIL'}")


if __name__ == "__main__":
    main()
