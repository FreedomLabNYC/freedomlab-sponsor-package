# Editing guide for agents

## Goal

Maintain a deterministic, editable, three-page US Letter sponsorship package for Freedom Lab NYC.

The isolated review routes under `src/concepts/` are a concept study, not a silent replacement for the canonical three-page package. Signal Rings is currently five pages; the other studies are seven. Promote one only after the user selects a direction.

## Invariants

- Page order is fixed unless the user explicitly changes it:
  1. Cover
  2. Primer
  3. Sponsorship tiers
- Every page is exactly 8.5 × 11 inches.
- Use relative local assets only.
- Keep Freedom Lab green `#32D011` as the primary signal color.
- Preserve the dark background system and soft-white body text.
- Do not use paid or nondeterministic image generation.
- Do not silently rewrite user-supplied copy, prices, statistics, or photos.
- Keep exactly one Community visual level per displayed tier: one center core plus one outline for every non-core tier. The concept exporter enforces visual-level and legend-tier parity.
- Preserve `public_title` values in the event manifest as the approved public-facing abbreviated titles; the compact archive renders those titles in no more than two lines.
- Page 1 is approved raster artwork. Pages 2 and 3 must remain editable HTML/CSS.

## Key content

### Primer statistics

- `X` Paying Members — placeholder until a verified value is supplied
- `801` Calendar Subscribers
- `45+` Attendees per event
- `30` Freedom Tech Events Hosted

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

1. Inspect `src/index.html` and `src/styles.css` before editing.
2. Make surgical changes and preserve supplied image assets.
3. Run:

```bash
npm install
npm run export:pdf
```

4. Verify the command reports `pageCount: 3` and `imagesLoaded: true`.
5. Inspect the PDF visually before claiming completion.
6. Commit the regenerated `dist/freedom-lab-sponsorship-package.pdf` with source edits.

### Accepted-change checkpoints

- After each accepted concept change, run `npm run export:concepts` and `npm run smoke:concepts`, then commit the source, derived assets, QA JSON, page renders, and regenerated PDF together.
- Concept export uses PDF-specific JPEG derivatives plus `qpdf --linearize` so the live document starts rendering quickly without changing the approved source images.
- Publish `dist/concepts/signal-rings.pdf` to `freedomlab.nyc/pdf1/` in a separate website-repository commit, update `pdf1/index.html` to a PDF query version derived from the new SHA-256 while preserving `#page=1&zoom=66`, and verify the live PDF hash and rendered changed page.
- Do not stack multiple accepted visual changes in one uncommitted working-tree blob. Each accepted state should be independently revertible with Git.

## Visual quality

- Maintain symmetric margins and readable type.
- Do not let photos crop faces or important sponsor artifacts.
- Prefer restrained borders, bracket details, and one strong focal hierarchy.
- Avoid generic gradients, purple accents, glassmorphism, or decorative UI chrome.
