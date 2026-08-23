# Editing guide for agents

## Goal

Maintain the selected, deterministic five-page Signal Rings sponsorship package for Freedom Lab NYC. The other three concept studies remain comparison artifacts, not co-equal release targets.

## Invariants

- Page order is fixed unless the user explicitly changes it:
  1. Cover
  2. Freedom Lab story
  3. The Community
  4. Classes & Events with Featured guests
  5. Sponsorship tiers
- Every page is exactly 8.5 × 11 inches.
- Use relative local assets only.
- Keep Freedom Lab green `#32D011` as the primary signal color.
- Preserve the dark background system and soft-white body text.
- Do not use paid or nondeterministic image generation.
- Treat replacement-ready user copy as literal. Store page-2 prose only in `src/concepts/data/story.md`; offer typo/grammar corrections separately.
- Preserve every supplied source image under `src/concepts/source-assets/` and use explicit derivatives for crops. Never edit the only copy of an upload.
- Map event artwork by stable event URL/date, never duplicate title or visual position.
- Keep exactly one Community visual level per displayed tier: one center core plus one outline for every non-core tier. The concept exporter enforces visual-level and legend-tier parity.
- The event archive shows full event titles, newest-first, with up to four lines per card. `public_title` remains metadata only.
- Keep public-source attribution in `docs/concepts/RESEARCH.md`, not visibly in the selected PDF.
- Do not add eyebrow, kicker, overline, or decorative pre-title text.
- Page 1 is approved raster artwork. Pages 2–5 remain editable HTML/CSS/data.

## Key content

### Community proof

- Ring shelf: `800+` Total attendees, `195+` Repeat attendees, `45+` Frequent members, `15+` Core members.
- Bottom cards: `1,000+` Mailing list, `45+` Attendees per event, `140+` Member-only chat, `30+` Events hosted.
- Three outlined rings plus one center core must equal the four ring-shelf tiers.
- The collage is a collective community proof block, not four photos paired to four statistics.

### Sponsor tiers

**Event Sponsor — $500/event**

- Acknowledgments: event listing, in person, social media
- Stickers
- Placard

**Premium Sponsor — $10,000/year**

- 2+ announcement presentations
- 2+ dedicated workshops
- 3D-printed logo on the Premium Sponsor Wall

## Workflow

1. Read `src/concepts/data/story.md`, `src/concepts/data/content.json`, `src/concepts/data/events.json`, `src/concepts/concepts.js`, and the selected-option CSS before editing.
2. Write a one-screen acceptance manifest: exact copy mode, page, stable record IDs, asset hashes, counts/order, minimum type, and elements that must remain unchanged.
3. Make one local source change. Do not publish exploratory variants.
4. Run the focused exporter for the changed page:

```bash
node scripts/export-concepts.mjs --option=a --screenshot-page=<page> --skip-contact-sheet
```

For story-only copy/image changes, use `npm run story:export`. For literal story replacement, edit `story.md` or run `pbpaste | npm run story:update -- -` first.

5. Inspect the changed full-resolution page in chat. Check child containment, sibling gaps, text bounds, crop focal points, and semantic adjacency—not only page overflow.
6. Run `npm run smoke:concepts` after structural/shared changes. Do not rerun all four concepts for a page-local micro-edit.
7. Publish an accepted selected-deck change with `npm run deck:publish -- --message='...'`. It updates both the PDF and SHA-versioned viewer URL, pushes only those two files, and verifies the live PDF hash plus wrapper version.
8. Create a source-repository checkpoint for every accepted state. Roll back from Git, never from memory or a hand-reconstructed CSS state.

### Accepted-change checkpoints

- After each accepted selected-deck change, commit source, exact supplied assets, crop derivatives/provenance, focused QA JSON, changed-page render, and regenerated PDF together.
- Concept export uses PDF-specific JPEG derivatives plus `qpdf --linearize` so the live document starts rendering quickly without changing the approved source images.
- `npm run deck:publish` owns the separate website-repository commit and cache-version update. Do not manually copy only the PDF; that caused stale hard-refresh behavior.
- Do not stack multiple accepted visual changes in one uncommitted working-tree blob. Each accepted state should be independently revertible with Git.

## Visual quality

- Maintain symmetric margins and readable type.
- Do not let photos crop faces or important sponsor artifacts.
- Prefer restrained borders, bracket details, and one strong focal hierarchy.
- Avoid generic gradients, purple accents, glassmorphism, or decorative UI chrome.
- Before showing variants, reject near-duplicates and check that each differs structurally on at least two axes.
- Deliver one chat-optimized contact sheet plus full-resolution pages; never rely only on a side preview or a multi-megabyte PNG.
- Measure every nested card/grid against its parent and the next section. A parent inside the page can still contain children that overlap a sibling.
- Verify duplicate event artwork by URL/date in both PDF and website, including dedicated event-page metadata and responsive derivatives.
