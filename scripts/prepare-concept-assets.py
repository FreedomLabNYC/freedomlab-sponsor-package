#!/usr/bin/env python3
"""Fetch and normalize deterministic assets for the deck concepts."""

from __future__ import annotations

import base64
import io
import json
import shutil
import urllib.parse
import urllib.request
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "src" / "concepts"
ASSETS = OUT / "assets"
EVENT_ASSETS = ASSETS / "events"
DATA = OUT / "data"
EVENT_COVER_OVERRIDES = {
    "https://lu.ma/7imd7ias": ROOT / "src" / "concepts" / "source-assets" / "bitcoin-secure-wallet-2025-04-15.png",
    "https://lu.ma/wphbb1r0": ROOT / "src" / "concepts" / "source-assets" / "bitcoin-node-2025-07-29-green.png",
}
EVENT_COVER_URL_OVERRIDES = {
    "https://lu.ma/ise6allq": "https://images.lumacdn.com/uploads/zr/81507ee8-7f32-4583-b006-67b28636de2f.png",
}
EVENT_COVER_OVERRIDES_BY_NAME = {
    "Workshop: How to Run a Bitcoin Lightning Node for Beginners": ROOT / "src" / "concepts" / "source-assets" / "bitcoin-lightning-node-2024-11-24.png",
}
GUEST_IMAGE_OVERRIDES = {
    "free-software-foundation": ROOT / "src" / "concepts" / "source-assets" / "fsf-giving-guide-v10.png",
}
USER_IMAGES = {
    "about-future-building.jpg": Path("/Users/harrison/.hermes/images/upload_20260822_144207_1.png"),
    "about-start-workshop.jpg": Path("/Users/harrison/.hermes/images/upload_20260822_144208_2.webp"),
}
PAST_URL = "https://freedomlab.nyc/classes-events/events.json"
FUTURE_URL = (
    "https://api.lu.ma/calendar/get-items?calendar_api_id="
    "cal-ZGCxlwslp1K0wqD&pagination_limit=100&period=future"
)
DASHBOARD_EVENTS = Path(
    "/Users/harrison/Hermes-Folder/Freedom-Lab/event-metrics-staging/"
    "dashboard-events.generated.json"
)
PUBLIC_EVENT_TITLES = {
    "Workshop: How to Run a Bitcoin Lightning Node for Beginners": "How to Run a Bitcoin Lightning Node",
    "Beginner's Workshop: How to Run a Bitcoin Node": "Workshop: How to Run a Bitcoin Node",
    "Beginner's Workshop: How to Set up a Bitcoin Hardware Wallet": "The Basics: Bitcoin Hardware Wallets",
    "Beginner’s Workshop: Secure Your Bitcoin Wallet": "Workshop: Secure Your Bitcoin Wallet",
    "Beginner’s Workshop: How Bitcoin Works as A Decentralized Ledger": "How Bitcoin Works as A Decentralized Ledger",
    "Beginner's Workshop: How to Buy Bitcoin P2P (Peer-to-Peer)": "How to Buy Bitcoin P2P (Peer-to-Peer)",
    "Hands-On Class: How to Run a Bitcoin Node for Beginners": "Hands-On Class: How to Run a Bitcoin Node",
    "Beginner's Class: How to Build a Bitcoin Hardware Wallet": "How to Build a Bitcoin Hardware Wallet",
    "Workshop: How to Vibe Code with Open Source Tools": "Workshop: How to Vibe Code with Open Source",
    "The Free Software Foundation: What Freedom in Software Means to You": "What Freedom in Software Means to You",
    "Agentic Payments and the Future of Sovereign Money": "Agentic Payments and the Future of Sovereignty",
}
GUESTS = [
    {
        "slug": "seth-for-privacy",
        "name": "Seth for Privacy",
        "role": "Privacy educator · COO, Cake Wallet · Host, Opt Out",
        "bio": (
            "A privacy educator and open-source operator who turns Bitcoin, Monero, "
            "self-hosting, and data sovereignty into practical guidance people can use."
        ),
        "highlights": [
            "COO of Cake Wallet",
            "Hosts the FOSS and privacy-focused Opt Out podcast",
            "Runs public Bitcoin, Monero, and privacy infrastructure",
        ],
        "image_url": "https://avatars.githubusercontent.com/u/40500387?v=4",
        "image_source": "https://github.com/sethforprivacy",
        "source_urls": [
            "https://sethforprivacy.com/about/",
            "https://api.github.com/users/sethforprivacy",
        ],
        "image_note": "Official public GitHub profile avatar; used instead of a face photo to respect a pseudonymous privacy educator.",
    },
    {
        "slug": "free-software-foundation",
        "name": "Free Software Foundation",
        "role": "Defending computer user freedom since 1985",
        "bio": (
            "The nonprofit behind a worldwide movement for software freedom: sponsor "
            "of GNU, publisher of the GNU GPL, and a leading defender of users’ right "
            "to run, study, share, and modify software."
        ),
        "highlights": [
            "Sponsors the GNU Project",
            "Publishes the GNU GPL, LGPL, and AGPL",
            "Defends free-software licenses through its compliance lab",
        ],
        "image_url": "https://www.fsf.org/givingguide/v10/img/charities/fsf.png",
        "image_source": "https://www.fsf.org/givingguide/v10/",
        "source_urls": [
            "https://www.fsf.org/about/",
            "https://www.fsf.org/givingguide/v10/",
            "https://www.fsf.org/givingguide/v10/img/charities/fsf.png",
        ],
        "image_note": "Official FSF logo from the Free Software Foundation's Giving Guide v10.",
        "image_fit": "contain",
    },
    {
        "slug": "frank-corva",
        "name": "Frank Corva",
        "role": "Forbes contributor · Host, new renaissance capital",
        "bio": (
            "A New York–based journalist covering Bitcoin adoption around the world, "
            "especially in developing countries; formerly Bitcoin Magazine’s White "
            "House correspondent."
        ),
        "highlights": [
            "Forbes contributor focused on global Bitcoin adoption",
            "Host of new renaissance capital",
            "Former White House correspondent for Bitcoin Magazine",
        ],
        "image_url": (
            "https://imageio.forbes.com/specials-images/imageserve/"
            "65e6429e7cf33516662c7e8a/0x0.jpg?format=jpg&crop=3024,3023,x0,y0,safe&width=900"
        ),
        "image_source": "https://www.forbes.com/sites/frankcorva/",
        "source_urls": ["https://www.forbes.com/sites/frankcorva/"],
        "image_note": "Official Forbes contributor portrait.",
    },
    {
        "slug": "win-ko-ko-aung",
        "name": "Win Ko Ko Aung",
        "role": "Global Bitcoin Adoption Fellow · Human Rights Foundation",
        "bio": (
            "A Burmese activist and refugee who helps nonprofits under authoritarian "
            "regimes use Bitcoin for financial freedom. His 2025 aid campaign funded "
            "tens of thousands of meals and rice for 350 households in Burma."
        ),
        "highlights": [
            "Global Bitcoin Adoption Fellow at HRF",
            "Former Bitcoin Policy Institute Human Rights Fellow",
            "Raised 5M+ sats for direct earthquake relief in Burma",
        ],
        "image_url": (
            "https://cdn.prod.website-files.com/68ff9c2befb06be21a39e123/"
            "690924badac253a6bc9978d9_65411bdca525b2739d9eec21_Ko%2520Ko%2520Aung.avif"
        ),
        "image_source": "https://www.btcpolicy.org/authors/win-ko-ko-aung",
        "source_urls": [
            "https://hrf.org/latest/my-reflections-on-bitcoin-as-freedom-money-in-thailand-burma/",
            "https://www.btcpolicy.org/authors/win-ko-ko-aung",
        ],
        "image_note": "Official Bitcoin Policy Institute fellow portrait.",
    },
]


def get_bytes(url: str) -> bytes:
    request = urllib.request.Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 Chrome/126 Safari/537.36"
            )
        },
    )
    with urllib.request.urlopen(request, timeout=45) as response:
        return response.read()


def get_json(url: str):
    return json.loads(get_bytes(url))


def normalize_image(
    raw: bytes,
    destination: Path,
    *,
    square: bool = False,
    square_fit: str = "crop",
) -> None:
    with Image.open(io.BytesIO(raw)) as source:
        source_image = ImageOps.exif_transpose(source).convert("RGBA")
        if square:
            if square_fit == "contain":
                side = max(source_image.size)
                image = Image.new("RGBA", (side, side), "white")
                contained = source_image.copy()
                contained.thumbnail((int(side * 0.82), int(side * 0.82)), Image.Resampling.LANCZOS)
                image.alpha_composite(
                    contained,
                    ((side - contained.width) // 2, (side - contained.height) // 2),
                )
            else:
                side = min(source_image.size)
                image = ImageOps.fit(source_image, (side, side), method=Image.Resampling.LANCZOS)
        else:
            image = source_image
        image = image.convert("RGB")
        image.thumbnail((1800, 1800), Image.Resampling.LANCZOS)
        destination.parent.mkdir(parents=True, exist_ok=True)
        image.save(destination, "JPEG", quality=90, optimize=True, progressive=True)


def source_bytes(value: str) -> bytes:
    if value.startswith("data:"):
        _, encoded = value.split(",", 1)
        return base64.b64decode(encoded)
    if value.startswith("/"):
        return get_bytes(f"https://freedomlab.nyc{value}")
    return get_bytes(value)


def classify(name: str, dashboard_category: str | None = None) -> str:
    if dashboard_category:
        return dashboard_category
    lower = name.lower()
    if any(token in lower for token in ("ai", "openclaw", "vibe code", "agentic")):
        return "AI"
    if any(token in lower for token in ("bitcoin", "lightning", "wallet", "node", "mining")):
        return "Bitcoin"
    return "Freedom Lab General"


def compact_event_label(name: str, dashboard_label: str | None = None) -> str:
    overrides = {
        "Empire State of Bitcoin Launch Event": "Empire State of Bitcoin",
        "Workshop: How to Run a Bitcoin Lightning Node for Beginners": "Lightning Node Workshop",
        "The Free Software Foundation: What Freedom in Software Means to You": "Free Software Foundation",
        "Agentic Payments and the Future of Sovereign Money": "Agentic Payments",
    }
    return overrides.get(name) or dashboard_label or name


def main() -> None:
    EVENT_ASSETS.mkdir(parents=True, exist_ok=True)
    DATA.mkdir(parents=True, exist_ok=True)

    for name, source in USER_IMAGES.items():
        if not source.exists():
            raise FileNotFoundError(source)
        normalize_image(source.read_bytes(), ASSETS / name)

    dashboard_by_url = {}
    if DASHBOARD_EVENTS.exists():
        for event in json.loads(DASHBOARD_EVENTS.read_text()):
            dashboard_by_url[event.get("url")] = event

    past = get_json(PAST_URL).get("events", [])
    future_entries = get_json(FUTURE_URL).get("entries", [])
    future = []
    for entry in future_entries:
        event = entry.get("event", entry)
        future.append(
            {
                "name": event["name"],
                "date": event["start_at"],
                "end": event.get("end_at"),
                "cover": event.get("cover_url"),
                "url": f"https://lu.ma/{event.get('url')}" if event.get("url") else None,
                "venue": None,
                "location": (event.get("geo_address_info") or {}).get("city_state"),
                "price": None,
                "status": "Upcoming",
            }
        )

    merged = {}
    for event in [*past, *future]:
        key = event.get("url") or f"{event['date']}|{event['name']}"
        merged[key] = event

    ny = ZoneInfo("America/New_York")
    ordered = sorted(merged.values(), key=lambda item: item["date"])
    output_events = []
    for index, event in enumerate(ordered, 1):
        cover = EVENT_COVER_URL_OVERRIDES.get(event.get("url")) or event.get("cover")
        local_cover = None
        if cover:
            destination = EVENT_ASSETS / f"event-{index:02d}.jpg"
            override = EVENT_COVER_OVERRIDES.get(event.get("url")) or EVENT_COVER_OVERRIDES_BY_NAME.get(event.get("name"))
            raw_cover = override.read_bytes() if override else source_bytes(cover)
            normalize_image(raw_cover, destination)
            local_cover = f"assets/events/{destination.name}"
        date = datetime.fromisoformat(event["date"].replace("Z", "+00:00")).astimezone(ny)
        dashboard = dashboard_by_url.get(event.get("url"), {})
        output_events.append(
            {
                "index": index,
                "name": event["name"],
                "public_title": PUBLIC_EVENT_TITLES.get(event["name"], event["name"]),
                "label": compact_event_label(event["name"], dashboard.get("label")),
                "date": date.strftime("%b %-d, %Y"),
                "iso_date": date.date().isoformat(),
                "year": date.year,
                "status": event.get("status") or ("Upcoming" if date > datetime.now(ny) else "Past"),
                "category": classify(event["name"], dashboard.get("category")),
                "url": event.get("url"),
                "cover": local_cover,
            }
        )

    guest_output = []
    for guest in GUESTS:
        destination = ASSETS / f"guest-{guest['slug']}.jpg"
        override = GUEST_IMAGE_OVERRIDES.get(guest["slug"])
        normalize_image(
            override.read_bytes() if override else get_bytes(guest["image_url"]),
            destination,
            square=True,
            square_fit=guest.get("image_fit", "crop"),
        )
        guest_output.append({**guest, "image": f"assets/{destination.name}"})

    (DATA / "events.json").write_text(json.dumps(output_events, indent=2) + "\n")
    (DATA / "guests.json").write_text(json.dumps(guest_output, indent=2) + "\n")
    print(
        json.dumps(
            {
                "events": len(output_events),
                "past": sum(event["status"] == "Past" for event in output_events),
                "upcoming": sum(event["status"] == "Upcoming" for event in output_events),
                "guests": len(guest_output),
            }
        )
    )


if __name__ == "__main__":
    main()
