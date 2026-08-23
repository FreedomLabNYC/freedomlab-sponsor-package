# Design retrospective and operating contract

## Scope

Reviewed the complete redacted transcripts for:

- `20260816_215426_639cecc9` — original sponsorship one-pager segment
- `20260819_210856_8e3b05` — cover, primer, tiers, publication, and repository handoff
- `20260822_144150_830a5d` — four expanded-deck concepts and later page/image/copy revisions
- `20260822_194802_081fce` — Community collage, ring, event-grid, PDF-performance, and consolidation work

The three dedicated package sessions alone contained 2,649 messages and 1,431 tool calls. That scale is evidence that the workflow, not only individual visual choices, needed redesign.

## Executive diagnosis

The strongest work came after the design became deterministic, source-backed, and measurable. The weakest work came when I moved too quickly from an ambiguous brief to a polished artifact, optimized for technical completion instead of review quality, or treated a visual requirement as an isolated CSS value rather than part of a page contract.

Five root causes account for most rework:

1. No frozen page-by-page acceptance manifest before designing.
2. No explicit distinction between literal user copy and editorial copy.
3. Asset mappings and crops were not initially keyed by stable identity and source hash.
4. QA checked page bounds more reliably than optical quality, child containment, and semantic relationships.
5. Accepted source states were not checkpointed as quickly as published PDF artifacts.

## Mistakes Harrison had to flag

### Direction and production method

- The first completed one-pager missed the desired visual direction; Harrison said, “I don't love the design much at all” (349251). I should have calibrated the aesthetic with low-cost cover studies before composing a complete page.
- A reference-led cover looked materially worse than its reference (349471). I later admitted that rough SVG polygons were the wrong production method for nuanced curved light, blending, depth, and grain (349481).
- I proposed paid image generation before confirming Harrison's cost and deterministic-editability constraints (349482). This contradicted the preferred code-editable workflow.
- I presented C1 as a separate option even though it was effectively the same as C; Harrison immediately noticed (351704). A later pixel comparison measured only 6.7/255 average difference.
- Two complete ring-option families were visually rejected (363473, 363775). They were technically valid but should have failed an internal sponsor-deck-quality gate before presentation.

### Information architecture and visual meaning

- The Community metrics were initially over-segmented; Harrison asked to merge profiles and RSVP'd people into one sponsor-readable Total attendees measure (362225).
- Four photos directly beneath four stat cards falsely looked paired to those statistics (362225). The layout created a semantic claim the data did not support.
- Featured guests initially occupied a separate page instead of being integrated into Classes & Events (362225).
- The first Community design showed five visual levels for four data tiers because the center core was not counted (363387, 363775).
- Community labels were too small, the shelf sat too low, and public labels/definitions needed rewriting (363775 and the preserved 364480 correction).
- Classes & Events initially gave the key and exact archive metadata too much prominence; Harrison moved the key to the bottom, changed 31 to 30+, removed the date range, and blanked the filler tile (363775).
- Source attribution and audit notes were placed visibly in the sponsor deck until Harrison removed them (364510, 364536). Provenance belonged in `RESEARCH.md`, not the presentation.
- Generic eyebrow and tier microcopy appeared despite Harrison's preference for direct headings; these were later removed (preserved correction in 364480).

### Copy fidelity and scope discipline

- I silently polished replacement-ready story copy. Harrison later noticed discrepancies and required verbatim copy (364963).
- A typography-only request changed columns, image geometry, and section proportions. Harrison explicitly ordered restoration and said not to change anything except text (364939).
- Exact page labels were not frozen centrally, leading to a later “Community” → “The Community” correction (367221).
- Full event titles were restored at Harrison's request (364510), but later source drift silently re-enabled abbreviated `public_title` rendering. This audit found and corrected that regression.

### Assets and crops

- The orange hardware-wallet artwork was assigned to Game Night instead of Secure Your Bitcoin Wallet on both website and PDF (364776). Hash verification proved file delivery, not semantic identity.
- Duplicate event titles were initially handled by title/position inference instead of stable event URL and date.
- Community collage crops required repeated micro-adjustments across crop, rotation, scale, and z-order (363274–363365). I should have built an annotated crop/layout manifest first.
- The second story image used an inferred source/crop and later had to be replaced with the correct supplied file (366210).
- The third story image used a smaller derivative until Harrison supplied the larger source and requested full-height use (366236).

### Review delivery, performance, and state

- I sent blocked `file://` links instead of native attachments or HTTPS links (349196).
- Review options were not reliably visible in Hermes Desktop twice; the second failure was caused by a 3.8 MB inline PNG (363263, 363339).
- A downscaled repository contact sheet made the numerical modules appear missing (352380, 352487).
- The live PDF was published at about 22 MB without linearization and opened at 194% because the wrapper used `FitH` (363583).
- The live viewer kept a stale PDF query version while many new PDFs were published. This explains hard-refresh ambiguity and was found during this audit.
- The Featured guests cards genuinely overlapped the 30+ section even after I claimed visual QA had passed (366985). The tests measured parent sections but not overflowing descendants.
- Long monolithic turns made queued messages feel ignored (365770). `/queue` is local and only becomes visible after a turn drains.

### Git and source-of-truth discipline

- Harrison had to request Git checkpoints explicitly (363546).
- Live PDFs were repeatedly committed to the website repository while the editable sponsor-package source accumulated as one large dirty working tree. The current local source is still ahead of `origin/main`; this remains the largest unresolved project risk.

## Mistakes I caught before Harrison had to

- Raw dashboard records produced incorrect 841/634 totals; canonical identity merges produced 830/624 (360297–360470 and preserved 364480 handoff).
- The first archive chronology was wrong and was reversed to newest-first reading order.
- The first PDF exporter produced two pages for one intended page until print isolation was fixed (352154, 352158).
- A first “landscape” collage had three portrait-shaped frames and failed its own aspect-ratio gate (362305).
- Strict citation verification failed twice before claim wording and marker rendering were corrected.
- Generic Ghostscript compression produced bright-green transparency/color corruption; I rejected those smaller files and kept qpdf linearization (363599).
- A broad CSS selector displaced the Core members label outside its ring; the selector and containment test were fixed (363736).
- A local website cover path crashed the concept preparer because it assumed every source was HTTP; local-path support was added (364735).
- A broad event-page generator created collateral changes during a one-event edit; those changes were restored and the edit was narrowed (364600).
- The first exact-copy story render clipped text; row budgets were adjusted before publication (364970).
- The first ring-spacing correction was still mathematically uneven: 27, 27, and 54 px radial gaps. The core had been omitted from the calculation (364846).
- Variant-specific QA crashed on missing elements in other concepts; null guards were added (364854).
- The first full-height building-crop assertion assumed 304 px while the real content box was 302 px; the crop was regenerated from measured geometry (366311).
- During this audit, I found two current regressions Harrison had not flagged: full event titles had reverted to abbreviations, and the live PDF wrapper still referenced an obsolete cache version. Both are now fixed and live-verified.

## What worked well

- Deterministic HTML/CSS/SVG made precise iteration and rollback possible once the workflow stabilized.
- The four original deck directions were structurally distinct, and Signal Rings was a sound selection.
- The event archive was exhaustively verified at 31 cards with order, square-image, count, and asset checks.
- Research provenance stayed available after visible attribution was removed.
- Live verification was strong: PDF page count, US Letter geometry, qpdf integrity/linearization, HTTP status, byte size, SHA-256 parity, and changed-page renders.
- The workflow improved after failures: ring parity, exact-copy, crop dimensions, event-image semantics, section widths/gaps, and descendant containment now have regression checks.
- The story now has one Markdown source of truth and a focused page-2 exporter.

## Default workflow for future design projects

### 1. Intake contract before drawing

Write a one-screen manifest containing:

- exact canvas and page count/order;
- literal vs editorial copy mode;
- exact labels, values, and minimum print sizes;
- stable asset/record IDs and source hashes;
- semantic relationships between adjacent modules;
- fixed elements that may not change;
- review surface and delivery format;
- publication/cache/rollback requirements.

### 2. Calibrate style cheaply

Before building a whole page, produce three genuinely distinct thumbnails or partial proofs. Translate references into measurable traits and reject any option that differs only in polish.

### 3. Preserve exact sources

Store every upload before cropping. Maintain source hash, dimensions, crop box, intended slot/surface, and stable record key. Generate derivatives reproducibly.

### 4. Freeze content before density decisions

Use canonical, identity-merged data. Establish exact item count and longest strings before choosing grid size or typography.

### 5. Build one selected path

Once Harrison selects a direction, stop regenerating rejected options. Apply page-local changes with a focused exporter.

### 6. Run two QA passes

**Mechanical:** counts, order, hashes, fonts, page bounds, text bounds, child containment, sibling gaps, and no unexpected asset changes.

**Optical:** full-resolution screenshot inspection for hierarchy, crop quality, implied relationships, near-collisions, readability, and sponsor-facing polish.

### 7. Deliver review evidence correctly

Send one chat-optimized contact sheet plus the changed full-resolution page. Never rely only on a side pane, local file link, or downscaled all-pages thumbnail.

### 8. Checkpoint accepted states

Commit the editable source, exact sources, derivatives, changed-page render, QA, and PDF together before the next material revision. Use Git for rollback, not memory.

### 9. Publish transactionally

Publish only accepted work. Update the PDF and SHA-versioned viewer wrapper together, push an allowlisted commit, then verify the live wrapper version and PDF hash.

### 10. Keep turns steerable

Use focused commands, avoid global generators for one-record changes, and split long work into visible bounded stages so `/steer` can land promptly.

## Changes implemented from this retrospective

- Added `src/concepts/data/story.md` as the literal story source of truth.
- Added `story:update`, `story:check`, focused `story:export`, and transactional `story:publish` commands.
- Added `deck:publish`, which updates the PDF and SHA-versioned viewer wrapper together and verifies both live.
- Added `scripts/build-story-crops.py` plus immutable source assets and crop provenance.
- Added stable URL/date-based event artwork overrides and cross-surface asset tests.
- Added ring-level parity and equal-radial-gap checks.
- Added child-containment and inter-section overlap checks for Classes & Events.
- Restored full event titles and expanded the card allowance to four lines where required.
- Updated `README.md` and `EDITING_GUIDE.md` to describe the selected five-page package and focused workflow.
- Updated the reusable deterministic design and presentation skills with literal-copy, stable-ID asset, semantic-adjacency, child-containment, and chat-delivery rules.
- Updated the live `/pdf1/` wrapper to use the current PDF's SHA-derived cache version.
- Made full and focused PDF exports byte-deterministic by fixing document metadata and qpdf IDs; two consecutive exports now produce the same SHA-256.

## Remaining project debt

1. The editable sponsor-package source repository has not yet been checkpointed and pushed; `origin/main` still points to `675450b` while the selected live PDF is newer.
2. Page 4's exhaustive event archive is necessarily dense; full titles now fit, but print readability remains the page's weakest visual quality.
3. Page 5 has substantial unused space below each tier. It is clean but underdeveloped; future content should improve it only when there are real sponsor benefits or proof to add, not decorative filler.
4. The cover no longer visibly says “Sponsorship Packages,” despite an earlier explicit request. Later cover approvals may have superseded that text, so this should be treated as a review question rather than silently changed.
