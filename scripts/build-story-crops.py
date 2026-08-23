#!/usr/bin/env python3
"""Rebuild approved page-2 photo crops from immutable sources."""

from __future__ import annotations

import hashlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "src" / "concepts" / "source-assets"
OUTPUTS = ROOT / "src" / "concepts" / "assets"

CROPS = [
    {
        "source": SOURCES / "about-current-correct.jpg",
        "source_sha256": "91a95c431b30932bd0c724adff311f8323738f27313a3543f15f476e7417954f",
        "box": (0, 69, 1127, 890),
        "output": OUTPUTS / "about-current-chair-crop.jpg",
        "size": (1127, 821),
    },
    {
        "source": SOURCES / "about-future-building-large.png",
        "source_sha256": "338acee9a028a4b518a56da62edce2d1b08e0a7cf457a9a48c7ad30a67854737",
        "box": (407, 0, 1311, 941),
        "output": OUTPUTS / "about-future-building-full-height-crop.jpg",
        "size": (904, 941),
    },
]


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main() -> None:
    built = []
    for spec in CROPS:
        source = spec["source"]
        if digest(source) != spec["source_sha256"]:
            raise SystemExit(f"Source hash changed: {source}")
        with Image.open(source) as image:
            crop = image.convert("RGB").crop(spec["box"])
            if crop.size != spec["size"]:
                raise SystemExit(f"Unexpected crop size for {source}: {crop.size}")
            temporary = spec["output"].with_suffix(".tmp.jpg")
            crop.save(temporary, "JPEG", quality=95, optimize=True, subsampling=0)
            temporary.replace(spec["output"])
        built.append({
            "source": str(source.relative_to(ROOT)),
            "output": str(spec["output"].relative_to(ROOT)),
            "size": list(spec["size"]),
            "sha256": digest(spec["output"]),
        })
    import json
    print(json.dumps({"status": "pass", "crops": built}))


if __name__ == "__main__":
    main()
