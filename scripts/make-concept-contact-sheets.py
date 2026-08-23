#!/usr/bin/env python3
"""Build deterministic contact sheets from exported concept page PNGs."""

from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PAGE_LABELS = [
    "Cover",
    "About Freedom Lab",
    "Community momentum",
    "Featured guests",
    "Event archive I",
    "Event archive II",
    "Sponsorship tiers",
]
SIGNAL_RING_PAGE_LABELS = [
    "Cover",
    "About Freedom Lab",
    "Community momentum",
    "Classes, events, and featured guests",
    "Sponsorship tiers",
]


def font(size: int, bold: bool = False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def build(slug: str, title: str) -> Path:
    source_dir = ROOT / "docs" / "concepts" / slug
    pages = sorted(source_dir.glob("page-*.png"))
    if not pages:
        raise FileNotFoundError(f"No page PNGs found under {source_dir}")
    labels = SIGNAL_RING_PAGE_LABELS if slug == "signal-rings" else DEFAULT_PAGE_LABELS
    if len(labels) != len(pages):
        raise ValueError(f"{slug}: {len(pages)} page images but {len(labels)} labels")

    cell_w, cell_h = 424, 575
    margin, gap = 34, 22
    header_h = 92
    width = margin * 2 + cell_w * 2 + gap
    row_count = (len(pages) + 1) // 2
    height = header_h + margin + cell_h * row_count + gap * (row_count - 1) + margin
    sheet = Image.new("RGB", (width, height), "#d4d7d4")
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 24), title, fill="#071109", font=font(27, bold=True))
    draw.text((margin, 58), f"Freedom Lab NYC sponsor package · {len(pages)} pages", fill="#526056", font=font(14))

    for index, path in enumerate(pages):
        image = Image.open(path).convert("RGB")
        image.thumbnail((392, 507), Image.Resampling.LANCZOS)
        col = index % 2
        row = index // 2
        x = margin + col * (cell_w + gap)
        y = header_h + row * (cell_h + gap)
        draw.rounded_rectangle((x, y, x + cell_w, y + cell_h), radius=9, fill="#eef1ee", outline="#aeb5ae", width=1)
        image_x = x + (cell_w - image.width) // 2
        image_y = y + 16
        sheet.paste(image, (image_x, image_y))
        draw.text((x + 16, y + 535), f"{index + 1:02d}", fill="#32d011", font=font(14, bold=True))
        draw.text((x + 49, y + 535), labels[index], fill="#071109", font=font(14, bold=True))

    out = ROOT / "docs" / "concepts" / f"{slug}-contact-sheet.png"
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, "PNG", optimize=True)
    preview = ROOT / "src" / "concepts" / "previews" / f"{slug}.png"
    preview.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(preview, "PNG", optimize=True)
    return out


if __name__ == "__main__":
    if len(sys.argv) != 3:
        raise SystemExit("usage: make-concept-contact-sheets.py <slug> <title>")
    print(build(sys.argv[1], sys.argv[2]))
