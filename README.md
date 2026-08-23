# Freedom Lab NYC Sponsor Package

Editable source for Freedom Lab NYC's three-page sponsorship package.

## Full-resolution preview

Each page is shown separately so the copy and numerical modules remain readable. Click any page to open its original resolution.

### Page 1 — Cover

[![Freedom Lab NYC sponsorship package cover](docs/preview/page-01-cover.png)](docs/preview/page-01-cover.png)

### Page 2 — Primer

[![Freedom Lab NYC primer with community photos and numerical modules](docs/preview/page-02-primer.png)](docs/preview/page-02-primer.png)

### Page 3 — Sponsorship tiers

[![Freedom Lab NYC sponsorship tiers](docs/preview/page-03-sponsorship-tiers.png)](docs/preview/page-03-sponsorship-tiers.png)

- **Live preview:** https://freedomlab.nyc/sponsors-html/
- **Published PDF:** https://freedomlab.nyc/sponsor/
- **Fork this repository:** https://github.com/FreedomLabNYC/freedomlab-sponsor-package/fork

## Pages

1. Cover artwork
2. Freedom Lab NYC primer, community photos, and key statistics
3. Event Sponsor and Premium Sponsor tiers

Pages 2 and 3 are editable HTML/CSS. Page 1 uses the approved supplied raster artwork at `src/assets/cover-art.png`; replace that asset to change the artwork while preserving the page frame.

## Quick start

```bash
npm install
brew install qpdf
npm run preview
```

Open http://localhost:8000.

## Sponsor package concept study

Four isolated, complete deck directions live at:

```text
http://localhost:8000/concepts/
```

- **Signal Rings** — cinematic, human, and data-forward
- **Field Notes** — light editorial documentary
- **Street Level** — architectural and Manhattan-focused
- **Open Protocol** — technical and cypherpunk

Each option includes the current cover, a new Freedom Lab story page, audited community RSVP rings, four verified featured guests, all 31 archived/upcoming events, and the existing sponsorship tiers. Signal Rings uses five pages by integrating featured guests into Classes & Events and fitting all 31 square event images and full event titles into one half-page grid; the other studies remain seven pages. The canonical three-page package is unchanged while the concepts are under review.

```bash
npm run prepare:concepts
npm run export:concepts
npm run smoke:concepts
```

Concept PDFs are written to `dist/concepts/`; page renders and contact sheets are written to `docs/concepts/`. Research and source provenance are in `docs/concepts/RESEARCH.md`.

## Export the PDF

```bash
npm run export:pdf
```

This starts a temporary local server, opens the real HTML in Chromium, verifies three pages and all images, and writes:

```text
dist/freedom-lab-sponsorship-package.pdf
```

The output must contain exactly three US Letter pages.

## Editing

- Main markup: `src/index.html`
- Visual system and layouts: `src/styles.css`
- Images and fonts: `src/assets/`
- Exporter: `scripts/export-pdf.mjs`
- Agent editing guide: `EDITING_GUIDE.md`

All assets use relative paths. No paid or nondeterministic image generation is required.

## Sharing changes

1. Fork the repository.
2. Create a branch.
3. Edit the HTML/CSS/assets.
4. Run `npm run export:pdf`.
5. Commit both source changes and the regenerated PDF.
6. Open a pull request with screenshots or the new PDF attached.
