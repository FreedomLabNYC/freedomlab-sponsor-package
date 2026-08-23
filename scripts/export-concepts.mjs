import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { chromium } from 'playwright'
import { parseStoryMarkdown } from '../src/concepts/story-data.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.join(root, 'src')
const expectedStory = parseStoryMarkdown(fs.readFileSync(path.join(srcRoot, 'concepts', 'data', 'story.md'), 'utf8'))
const expectedStoryHeadings = expectedStory.sections.map((section) => section.title)
const expectedStoryParagraphs = expectedStory.sections.map((section) => section.blocks.filter((block) => block.type === 'paragraph').map((block) => block.text))
const expectedStoryPriorities = expectedStory.sections.flatMap((section) => section.blocks.filter((block) => block.type === 'list').flatMap((block) => block.items))
const recentNodeAsset = path.join(srcRoot, 'concepts', 'assets', 'events', 'event-11.jpg')
const recentNodeAssetHash = crypto.createHash('sha256').update(fs.readFileSync(recentNodeAsset)).digest('hex')
if (recentNodeAssetHash !== 'dd8a7391eef6e294e92bd1f41769fb0f2609a9e4bf6a495806ec2697c5ff0889') throw new Error('Recent Run a Bitcoin Node PDF asset does not match the approved green artwork')
const allOptions = [
  { key: 'a', slug: 'signal-rings', name: 'Option A — Signal Rings', pages: 5 },
  { key: 'b', slug: 'field-notes', name: 'Option B — Field Notes', pages: 7 },
  { key: 'c', slug: 'street-level', name: 'Option C — Street Level', pages: 7 },
  { key: 'd', slug: 'open-protocol', name: 'Option D — Open Protocol', pages: 7 },
]
const optionArgument = process.argv.find((argument) => argument.startsWith('--option='))?.split('=', 2)[1]
const screenshotPageArgument = process.argv.find((argument) => argument.startsWith('--screenshot-page='))?.split('=', 2)[1]
const screenshotPage = screenshotPageArgument ? Number.parseInt(screenshotPageArgument, 10) : null
const skipContactSheet = process.argv.includes('--skip-contact-sheet')
const options = optionArgument ? allOptions.filter((option) => option.key === optionArgument) : allOptions
if (!options.length) throw new Error(`Unknown concept option: ${optionArgument}`)
if (screenshotPageArgument && (!Number.isInteger(screenshotPage) || screenshotPage < 1)) throw new Error(`Invalid screenshot page: ${screenshotPageArgument}`)
const types = {
  '.avif': 'image/avif',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const requested = pathname === '/' ? '/concepts/deck.html' : pathname
  const candidate = path.resolve(srcRoot, `.${requested}`)

  if (!candidate.startsWith(`${srcRoot}${path.sep}`) || !fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    response.end('Not found')
    return
  }

  response.writeHead(200, { 'content-type': types[path.extname(candidate).toLowerCase()] || 'application/octet-stream' })
  fs.createReadStream(candidate).pipe(response)
})

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const address = server.address()
const origin = `http://127.0.0.1:${address.port}`
let browser

try {
  browser = await chromium.launch({ headless: true })
  for (const option of options) {
    const errors = []
    const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2 })
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`)
    })
    page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

    const response = await page.goto(`${origin}/concepts/deck.html?option=${option.key}`, { waitUntil: 'networkidle' })
    await page.waitForSelector('[data-ready="true"]')
    await page.evaluate(() => document.fonts.ready)

    const state = await page.evaluate(() => {
      const pages = [...document.querySelectorAll('.page')]
      const overflow = []
      pages.forEach((pageElement, pageIndex) => {
        const pageBox = pageElement.getBoundingClientRect()
        for (const element of pageElement.querySelectorAll('*')) {
          const style = getComputedStyle(element)
          if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) continue
          const box = element.getBoundingClientRect()
          if (!box.width || !box.height) continue
          const outside = box.left < pageBox.left - 1 || box.top < pageBox.top - 1 || box.right > pageBox.right + 1 || box.bottom > pageBox.bottom + 1
          if (outside) overflow.push({ page: pageIndex + 1, tag: element.tagName, className: element.className, box: [box.left, box.top, box.right, box.bottom] })
        }
      })
      return {
        pageCount: pages.length,
        imagesLoaded: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
        imageCount: document.images.length,
        eventCards: document.querySelectorAll('.event-card,.compact-event-card').length,
        compactEventCards: document.querySelectorAll('.compact-event-card').length,
        compactTitlesPresent: [...document.querySelectorAll('.compact-event-card h2')].every((title) => title.textContent.trim().length > 0),
        compactImagesSquare: [...document.querySelectorAll('.compact-event-card .event-image')].every((image) => Math.abs(image.getBoundingClientRect().width - image.getBoundingClientRect().height) < 1),
        compactTitleOrder: [...document.querySelectorAll('.compact-event-card h2')].map((title) => title.textContent.trim()),
        compactUsesPublicTitles: [...document.querySelectorAll('.compact-event-card')].every((card) => card.querySelector('h2')?.textContent.trim() === card.dataset.publicTitle),
        compactTitlesFit: [...document.querySelectorAll('.compact-event-card h2')].every((title) => title.scrollHeight <= title.clientHeight + 1),
        compactTitlesUseTwoLines: [...document.querySelectorAll('.compact-event-card h2')].every((title) => getComputedStyle(title).webkitLineClamp === '2'),
        compactUpcomingLabels: [...document.querySelectorAll('.compact-event-card strong')].map((label) => label.textContent.trim()),
        compactCopySpacing: (() => {
          const cards = [...document.querySelectorAll('.compact-event-card')]
          return cards.map((card) => {
            const image = card.querySelector('.event-image').getBoundingClientRect()
            const copy = card.querySelector('.compact-event-copy').getBoundingClientRect()
            const title = card.querySelector('h2').getBoundingClientRect()
            return {
              imageToTitle: Math.round((title.top - image.bottom) * 10) / 10,
              titleToBottom: Math.round((copy.bottom - title.bottom) * 10) / 10,
              copyHeight: Math.round(copy.height * 10) / 10,
            }
          })
        })(),
        compactColorLinesAtBottom: [...document.querySelectorAll('.compact-event-card')].every((card) => {
          const style = getComputedStyle(card)
          return parseFloat(style.borderBottomWidth) === 3 && parseFloat(style.borderTopWidth) === 0
        }),
        removedArchiveSourceText: !document.body.innerText.includes('Abbreviated titles: audited Freedom Lab dashboard'),
        verticalStorySections: document.querySelectorAll('.vertical-story-section').length,
        verticalStoryHeadings: [...document.querySelectorAll('.vertical-story-section h2')].map((heading) => heading.textContent.trim()),
        verticalStoryPriorities: [...document.querySelectorAll('.vertical-future ol li')].map((item) => item.textContent.trim()),
        verticalStoryParagraphs: [...document.querySelectorAll('.vertical-story-section')].map((section) => [...section.querySelectorAll('.vertical-story-copy > p')].map((paragraph) => paragraph.textContent)),
        verticalStoryCopyFits: [...document.querySelectorAll('.vertical-story-copy')].every((copy) => copy.scrollHeight <= copy.clientHeight + 1),
        eyebrowCount: document.querySelectorAll('.eyebrow,.story-label').length,
        sourceLineCount: document.querySelectorAll('.source-line').length,
        decorativeTierLabelCount: document.querySelectorAll('.tier-card header > div > span,.tier-code').length,
        communityShelf: [...document.querySelectorAll('.momentum-page .ring-legend li')].map((row) => ({
          number: row.querySelector('.ring-number')?.textContent.trim(),
          label: row.querySelector('strong')?.textContent.trim(),
          detail: row.querySelector('small')?.textContent.trim(),
        })),
        communityRingCount: document.querySelectorAll('.momentum-page .orbit').length,
        communityCoreCount: document.querySelectorAll('.momentum-page .ring-core').length,
        communityHeading: document.querySelector('.momentum-page .page-heading h1')?.textContent.trim(),
        communityRingGeometry: (() => {
          const diameters = [...document.querySelectorAll('.momentum-page .orbit')].map((ring) => Math.round(ring.getBoundingClientRect().width))
          const core = Math.round(document.querySelector('.momentum-page .ring-core')?.getBoundingClientRect().width || 0)
          const radialGaps = diameters.slice(0, -1).map((diameter, index) => (diameter - diameters[index + 1]) / 2)
          radialGaps.push((diameters.at(-1) - core) / 2)
          return { diameters, core, radialGaps }
        })(),
        communityVerticalGaps: (() => {
          const main = document.querySelector('.momentum-page .momentum-main')?.getBoundingClientRect()
          const stats = document.querySelector('.momentum-page .legacy-stats')?.getBoundingClientRect()
          const collage = document.querySelector('.momentum-page .community-strip')?.getBoundingClientRect()
          return { mainToCollage: collage.top - main.bottom, collageToStats: stats.top - collage.bottom }
        })(),
        communityStatValues: [...document.querySelectorAll('.momentum-page .legacy-stats article > strong')].map((value) => value.textContent.trim()),
        communityStatLabels: [...document.querySelectorAll('.momentum-page .legacy-stats article > span')].map((label) => label.textContent.trim()),
        communityTextFits: [...document.querySelectorAll('.momentum-page .ring-legend li,.momentum-page .legacy-stats article')].every((element) => element.scrollHeight <= element.clientHeight + 1),
        collage: document.documentElement.dataset.collage,
        collageFrames: [...document.querySelectorAll('.momentum-page .community-strip figure')].map((figure) => {
          const box = figure.getBoundingClientRect()
          return { width: Math.round(box.width), height: Math.round(box.height) }
        }),
        communityFontSizes: (() => {
          const px = (selector) => {
            const element = document.querySelector(selector)
            return element ? parseFloat(getComputedStyle(element).fontSize) : null
          }
          return {
            number: px('.momentum-page .orbit-marker b') ?? px('.momentum-page .ring-number'),
            label: px('.momentum-page .ring-callout strong') ?? px('.momentum-page .ring-legend strong'),
            detail: px('.momentum-page .ring-callout p') ?? px('.momentum-page .ring-legend small'),
            statLabel: px('.momentum-page .legacy-stats article > span'),
            statNote: px('.momentum-page .legacy-stats article > small'),
          }
        })(),
        currentStoryImage: (() => {
          const image = document.querySelector('.vertical-current img')
          return image ? { width: image.naturalWidth, height: image.naturalHeight, src: image.getAttribute('src') } : null
        })(),
        currentStoryGeometry: (() => {
          const section = document.querySelector('.vertical-current')
          const copy = section?.querySelector('.vertical-story-copy')
          const figure = section?.querySelector('figure')
          return {
            copyWidth: Math.round(copy?.getBoundingClientRect().width || 0),
            imageWidth: Math.round(figure?.getBoundingClientRect().width || 0),
          }
        })(),
        futureStoryImage: (() => {
          const image = document.querySelector('.vertical-future img')
          const figure = image?.closest('figure')
          return image ? {
            width: image.naturalWidth,
            height: image.naturalHeight,
            src: image.getAttribute('src'),
            rendered: [Math.round(figure.getBoundingClientRect().width), Math.round(figure.getBoundingClientRect().height)],
          } : null
        })(),
        secureBitcoinWalletImage: (() => {
          const image = document.querySelector('.compact-event-card[title="Beginner’s Workshop: Secure Your Bitcoin Wallet"] img')
          return image ? { width: image.naturalWidth, height: image.naturalHeight, src: image.getAttribute('src') } : null
        })(),
        lightningNodeImage: (() => {
          const image = document.querySelector('.compact-event-card[title="Workshop: How to Run a Bitcoin Lightning Node for Beginners"] img')
          return image ? { width: image.naturalWidth, height: image.naturalHeight, src: image.getAttribute('src') } : null
        })(),
        recentRunNodeImage: (() => {
          const card = document.querySelector('.compact-event-card[data-event-url="https://lu.ma/wphbb1r0"]')
          const image = card?.querySelector('img')
          return image ? { width: image.naturalWidth, height: image.naturalHeight, src: image.getAttribute('src'), title: card.querySelector('h2')?.textContent.trim() } : null
        })(),
        fsfGuestImage: (() => {
          const card = [...document.querySelectorAll('.archive-guest-card')].find((item) => item.querySelector('h3')?.textContent.trim() === 'Free Software Foundation')
          const image = card?.querySelector('img')
          return image ? { width: image.naturalWidth, height: image.naturalHeight, src: image.getAttribute('src') } : null
        })(),
        guestCards: document.querySelectorAll('.guest-card').length,
        archiveGuestCards: document.querySelectorAll('.archive-guest-card').length,
        standaloneGuestPages: document.querySelectorAll('.guests-page').length,
        archiveGuestsFirst: (() => {
          const guestsSection = document.querySelector('.compact-archive-page .archive-guests')
          const lowerSection = document.querySelector('.compact-archive-page .archive-overview-lower')
          return Boolean(guestsSection && lowerSection && guestsSection.getBoundingClientRect().top < lowerSection.getBoundingClientRect().top)
        })(),
        archiveLayout: (() => {
          const guests = document.querySelector('.compact-archive-page .archive-guests')
          const lower = document.querySelector('.compact-archive-page .archive-overview-lower')
          const eventsGrid = document.querySelector('.compact-archive-page .compact-events-grid')
          const guestGrid = document.querySelector('.compact-archive-page .archive-guest-grid')
          const headshot = document.querySelector('.compact-archive-page .archive-guest-card img')
          const guestRect = guests?.getBoundingClientRect()
          const lowerRect = lower?.getBoundingClientRect()
          const eventsRect = eventsGrid?.getBoundingClientRect()
          return {
            widths: [guestRect?.width, lowerRect?.width, eventsRect?.width].map((value) => Math.round(value || 0)),
            lefts: [guestRect?.left, lowerRect?.left, eventsRect?.left].map((value) => Math.round(value || 0)),
            guestColumns: guestGrid ? getComputedStyle(guestGrid).gridTemplateColumns.split(' ').length : 0,
            headshot: Math.round(headshot?.getBoundingClientRect().width || 0),
            guestHeight: Math.round(guestRect?.height || 0),
            guestToLowerGap: Math.round((lowerRect?.top || 0) - (guestRect?.bottom || 0)),
            lowerToEventsGap: Math.round((eventsRect?.top || 0) - (lowerRect?.bottom || 0)),
            lowerHeight: Math.round(lowerRect?.height || 0),
            eventCopyMaxHeight: Math.round(Math.max(...[...document.querySelectorAll('.compact-archive-page .compact-event-copy')].map((copy) => copy.getBoundingClientRect().height))),
            guestCardsContained: [...document.querySelectorAll('.compact-archive-page .archive-guest-card')].every((card) => card.getBoundingClientRect().bottom <= guestRect.bottom + 1),
          }
        })(),
        archiveCountText: document.querySelector('.compact-archive-page .archive-count-block')?.innerText.replace(/\s+/g, ' ').trim(),
        archiveHasDateRange: document.querySelector('.compact-archive-page')?.innerText.includes('Oct 2024') || false,
        archiveHasPublicTotal: document.querySelector('.compact-archive-page')?.innerText.includes('events in public') || false,
        archiveBlankCount: document.querySelectorAll('.compact-archive-page .compact-archive-blank').length,
        archiveKeyLabels: [...document.querySelectorAll('.compact-archive-page .compact-archive-key span')].map((label) => label.textContent.trim()),
        stageWidths: [...document.querySelectorAll('.page-stage')].map((stage) => Math.round(stage.getBoundingClientRect().width)),
        overflow: overflow.slice(0, 20),
      }
    })

    if (!response || response.status() !== 200) throw new Error(`${option.name}: preview returned ${response?.status() ?? 'no response'}`)
    if (state.pageCount !== option.pages) throw new Error(`${option.name}: expected ${option.pages} pages, found ${state.pageCount}`)
    if (!state.imagesLoaded) throw new Error(`${option.name}: one or more images failed to load`)
    if (state.eventCards !== 31) throw new Error(`${option.name}: expected 31 event cards, found ${state.eventCards}`)
    if (option.key === 'a' && state.compactEventCards !== 31) throw new Error(`${option.name}: expected 31 compact event cards, found ${state.compactEventCards}`)
    if (option.key === 'a' && !state.compactTitlesPresent) throw new Error(`${option.name}: one or more compact event titles are missing`)
    if (option.key === 'a' && !state.compactImagesSquare) throw new Error(`${option.name}: one or more compact event images are not square`)
    if (option.key === 'a' && state.compactTitleOrder[0] !== 'Agentic Payments and the Future of Sovereignty') throw new Error(`${option.name}: newest event is not first`)
    if (option.key === 'a' && state.compactTitleOrder.at(-1) !== 'Empire State of Bitcoin Launch Event') throw new Error(`${option.name}: oldest event is not last`)
    if (option.key === 'a' && !state.compactUsesPublicTitles) throw new Error(`${option.name}: a compact event card does not show its approved abbreviated title`)
    if (option.key === 'a' && !state.compactTitlesUseTwoLines) throw new Error(`${option.name}: compact event titles are not constrained to two lines`)
    if (option.key === 'a' && !state.compactTitlesFit) throw new Error(`${option.name}: one or more abbreviated event titles need more than two lines`)
    if (option.key === 'a' && state.compactUpcomingLabels.length !== 0) throw new Error(`${option.name}: compact event cards still show Upcoming text`)
    if (option.key === 'a') {
      const badCopySpacing = state.compactCopySpacing.find(({ imageToTitle, titleToBottom, copyHeight }) => imageToTitle < 6 || titleToBottom < 0 || copyHeight !== 22)
      if (badCopySpacing) throw new Error(`${option.name}: event image/title spacing or copy-box balance regressed: ${JSON.stringify(badCopySpacing)}`)
    }
    if (option.key === 'a' && !state.compactColorLinesAtBottom) throw new Error(`${option.name}: event color lines are not on the bottom edge`)
    if (option.key === 'a' && !state.removedArchiveSourceText) throw new Error(`${option.name}: removed archive source text is still visible`)
    if (option.key === 'a' && state.verticalStorySections !== 3) throw new Error(`${option.name}: expected three vertical story sections`)
    if (option.key === 'a' && JSON.stringify(state.verticalStoryHeadings) !== JSON.stringify(expectedStoryHeadings)) throw new Error(`${option.name}: story headings differ from story.md`)
    if (option.key === 'a' && JSON.stringify(state.verticalStoryPriorities) !== JSON.stringify(expectedStoryPriorities)) throw new Error(`${option.name}: story priorities differ from story.md`)
    if (option.key === 'a' && JSON.stringify(state.verticalStoryParagraphs) !== JSON.stringify(expectedStoryParagraphs)) throw new Error(`${option.name}: story copy differs from story.md`)
    if (option.key === 'a' && !state.verticalStoryCopyFits) throw new Error(`${option.name}: story copy clips its section`)
    if (option.key === 'a' && state.eyebrowCount !== 0) throw new Error(`${option.name}: eyebrow or kicker text remains in the selected deck`)
    if (option.key === 'a' && state.sourceLineCount !== 0) throw new Error(`${option.name}: source attribution remains in the selected deck`)
    if (option.key === 'a' && state.decorativeTierLabelCount !== 0) throw new Error(`${option.name}: decorative tier labels remain in the selected deck`)
    if (option.key === 'a' && state.communityRingCount + state.communityCoreCount !== state.communityShelf.length) throw new Error(`${option.name}: ring outlines plus center core do not match the community tiers`)
    if (option.key === 'a' && state.communityHeading !== 'The Community') throw new Error(`${option.name}: community heading is not The Community`)
    if (option.key === 'a' && (state.communityRingGeometry.diameters.join('|') !== '302|230|158' || state.communityRingGeometry.core !== 86 || state.communityRingGeometry.radialGaps.some((gap) => gap !== 36))) throw new Error(`${option.name}: community rings are not evenly enlarged`)
    if (option.key === 'a' && (state.communityVerticalGaps.mainToCollage < 15 || state.communityVerticalGaps.collageToStats < 30)) throw new Error(`${option.name}: community sections are too tightly spaced or out of order`)
    if (option.key === 'a' && state.communityShelf.map((row) => row.number).join('|') !== '800+|195+|45+|15+') throw new Error(`${option.name}: community shelf values do not match the approved wording`)
    if (option.key === 'a' && state.communityShelf.map((row) => row.label).join('|') !== 'Total attendees|Repeat attendees|Frequent members|Core members') throw new Error(`${option.name}: community shelf labels do not match the approved wording`)
    if (option.key === 'a' && state.communityShelf.map((row) => row.detail).join('|') !== "Number of attendees who have RSVP'd to our events|Attendees who have returned for more than one event.|Frequent participants in our workshops, classes, and events.|Our core community that regularly participates in events, helps grow the lab and works on freedom tech projects together.") throw new Error(`${option.name}: community shelf descriptions do not match the approved wording`)
    if (option.key === 'a' && state.communityStatValues.join('|') !== '1,000+|45+|140+|30+') throw new Error(`${option.name}: community stat values do not match the approved wording`)
    if (option.key === 'a' && state.communityStatLabels.join('|') !== 'Mailing list|Attendees per event|Member-only chat|Events hosted') throw new Error(`${option.name}: community stat labels do not match the approved wording`)
    if (option.key === 'a' && !state.communityTextFits) throw new Error(`${option.name}: enlarged community copy clips its containers`)
    if (option.key === 'a' && (state.communityFontSizes.number < 25 || state.communityFontSizes.label < 13.5 || state.communityFontSizes.detail < 10.2 || state.communityFontSizes.statLabel < 13.5 || state.communityFontSizes.statNote < 9.2)) throw new Error(`${option.name}: community typography is smaller than the approved readability floor`)
    if (option.key === 'a' && (state.currentStoryImage?.width !== 1127 || state.currentStoryImage?.height !== 821 || !state.currentStoryImage.src.endsWith('/about-current-chair-crop.jpg'))) throw new Error(`${option.name}: current-space photo is not the approved top-and-bottom crop`)
    if (option.key === 'a' && (state.currentStoryGeometry.copyWidth <= 290 || state.currentStoryGeometry.imageWidth !== 350)) throw new Error(`${option.name}: current-space crop did not preserve extra text width`)
    if (option.key === 'a' && (state.futureStoryImage?.width !== 904 || state.futureStoryImage?.height !== 941 || !state.futureStoryImage.src.endsWith('/about-future-building-full-height-crop.jpg') || state.futureStoryImage.rendered.join('x') !== '290x302')) throw new Error(`${option.name}: future-building image is not the approved full-height crop`)
    if (option.key === 'a' && (state.secureBitcoinWalletImage?.width !== 1254 || state.secureBitcoinWalletImage?.height !== 1254 || !state.secureBitcoinWalletImage.src.endsWith('/event-06.jpg'))) throw new Error(`${option.name}: Secure Your Bitcoin Wallet does not use the approved orange artwork`)
    if (option.key === 'a' && (state.lightningNodeImage?.width !== 1672 || state.lightningNodeImage?.height !== 941 || !state.lightningNodeImage.src.endsWith('/event-02.jpg'))) throw new Error(`${option.name}: Lightning Node event does not use the approved blue-and-yellow artwork`)
    if (option.key === 'a' && (state.recentRunNodeImage?.width !== 1672 || state.recentRunNodeImage?.height !== 941 || !state.recentRunNodeImage.src.endsWith('/event-11.jpg') || state.recentRunNodeImage.title !== 'Workshop: How to Run a Bitcoin Node')) throw new Error(`${option.name}: recent Run a Bitcoin Node event does not use the approved green artwork and spaced title`)
    if (option.key === 'a' && (state.fsfGuestImage?.width !== 580 || state.fsfGuestImage?.height !== 580 || !state.fsfGuestImage.src.endsWith('/guest-free-software-foundation.jpg'))) throw new Error(`${option.name}: Free Software Foundation does not use the approved Giving Guide logo`)
    if (option.key === 'a' && state.archiveGuestCards !== 4) throw new Error(`${option.name}: expected 4 guest profiles on Classes & Events, found ${state.archiveGuestCards}`)
    if (option.key === 'a' && (state.archiveLayout.guestColumns !== 2 || state.archiveLayout.headshot !== 112 || state.archiveLayout.guestHeight !== 322)) throw new Error(`${option.name}: Featured guests is not the approved enlarged 2x2 grid`)
    if (option.key === 'a' && (new Set(state.archiveLayout.widths).size !== 1 || new Set(state.archiveLayout.lefts).size !== 1)) throw new Error(`${option.name}: Classes & Events sections do not share the same width and alignment`)
    if (option.key === 'a' && (!state.archiveLayout.guestCardsContained || state.archiveLayout.guestToLowerGap < 16 || state.archiveLayout.lowerToEventsGap < 18 || state.archiveLayout.lowerHeight > 76 || state.archiveLayout.eventCopyMaxHeight > 26)) throw new Error(`${option.name}: Classes & Events sections overlap or event copy boxes are too tall`)
    if (option.key === 'a' && state.standaloneGuestPages !== 0) throw new Error(`${option.name}: standalone Featured guests page still exists`)
    if (option.key === 'a' && !state.archiveGuestsFirst) throw new Error(`${option.name}: Featured guests is not the first Classes & Events section`)
    if (option.key === 'a' && state.archiveCountText !== '30+ events') throw new Error(`${option.name}: Classes & Events count is not 30+ events`)
    if (option.key === 'a' && state.archiveHasDateRange) throw new Error(`${option.name}: removed Classes & Events date range is still visible`)
    if (option.key === 'a' && state.archiveHasPublicTotal) throw new Error(`${option.name}: removed events-in-public total is still visible`)
    if (option.key === 'a' && state.archiveBlankCount !== 1) throw new Error(`${option.name}: compact archive must end with one blank square`)
    if (option.key === 'a' && state.archiveKeyLabels.join('|') !== 'Bitcoin|Sovereign AI|Freedom Lab General') throw new Error(`${option.name}: subtle bottom event key is missing or incorrect`)
    if (option.key !== 'a' && state.guestCards !== 4) throw new Error(`${option.name}: expected 4 guest cards, found ${state.guestCards}`)
    if (state.overflow.length) throw new Error(`${option.name}: elements overflow page bounds\n${JSON.stringify(state.overflow, null, 2)}`)
    if (errors.length) throw new Error(`${option.name}: ${errors.join('\n')}`)

    const previewDir = path.join(root, 'docs', 'concepts', option.slug)
    if (!screenshotPage) fs.rmSync(previewDir, { recursive: true, force: true })
    fs.mkdirSync(previewDir, { recursive: true })
    if (screenshotPage && screenshotPage > state.pageCount) throw new Error(`${option.name}: screenshot page ${screenshotPage} exceeds ${state.pageCount} pages`)
    const screenshotIndices = screenshotPage ? [screenshotPage - 1] : [...Array(state.pageCount).keys()]
    for (const index of screenshotIndices) {
      await page.locator('.page').nth(index).screenshot({
        path: path.join(previewDir, `page-${String(index + 1).padStart(2, '0')}.png`),
      })
    }

    await page.emulateMedia({ media: 'print' })
    await page.addStyleTag({
      content: '@media print{html,body,.document{width:8.5in!important;height:11in!important;margin:0!important;padding:0!important;overflow:hidden!important}.page-stage{display:none!important;break-after:auto!important;page-break-after:auto!important}.page-stage.export-target{display:block!important;position:fixed!important;left:0!important;top:0!important;width:8.5in!important;height:11in!important;margin:0!important;overflow:hidden!important}}',
    })

    const distDir = path.join(root, 'dist', 'concepts')
    fs.mkdirSync(distDir, { recursive: true })
    const temporaryPages = []
    for (let index = 0; index < state.pageCount; index += 1) {
      await page.evaluate((targetIndex) => {
        document.querySelectorAll('.page-stage').forEach((stage, stageIndex) => {
          stage.classList.toggle('export-target', stageIndex === targetIndex)
          stage.style.width = '8.5in'
          stage.style.height = '11in'
        })
        document.querySelectorAll('.page').forEach((element) => element.removeAttribute('style'))
      }, index)
      const temporaryPage = path.join(distDir, `.${option.slug}-page-${index + 1}.pdf`)
      temporaryPages.push(temporaryPage)
      await page.pdf({
        path: temporaryPage,
        format: 'Letter',
        printBackground: true,
        preferCSSPageSize: true,
        margin: { top: '0', right: '0', bottom: '0', left: '0' },
      })
    }

    const merged = await PDFDocument.create()
    const fixedDate = new Date('2024-10-27T00:00:00.000Z')
    merged.setTitle(`Freedom Lab NYC — ${option.name}`)
    merged.setAuthor('Freedom Lab NYC')
    merged.setProducer('Freedom Lab NYC deterministic exporter')
    merged.setCreator('Freedom Lab NYC deterministic exporter')
    merged.setCreationDate(fixedDate)
    merged.setModificationDate(fixedDate)
    for (const temporaryPage of temporaryPages) {
      const source = await PDFDocument.load(fs.readFileSync(temporaryPage))
      if (source.getPageCount() !== 1) throw new Error(`${temporaryPage} produced ${source.getPageCount()} pages`)
      const [copied] = await merged.copyPages(source, [0])
      merged.addPage(copied)
    }
    const pdfPath = path.join(distDir, `${option.slug}.pdf`)
    if (merged.getPageCount() !== option.pages) throw new Error(`${option.name}: merged PDF has ${merged.getPageCount()} pages`)
    fs.writeFileSync(pdfPath, await merged.save())
    temporaryPages.forEach((temporaryPage) => fs.rmSync(temporaryPage, { force: true }))

    const optimizedPdfPath = path.join(distDir, `.${option.slug}-linearized.pdf`)
    execFileSync('qpdf', [
      '--linearize',
      '--deterministic-id',
      '--object-streams=generate',
      '--compress-streams=y',
      '--recompress-flate',
      '--compression-level=9',
      pdfPath,
      optimizedPdfPath,
    ], { stdio: 'inherit' })
    fs.renameSync(optimizedPdfPath, pdfPath)
    const pdfBytes = fs.statSync(pdfPath).size
    if (option.key === 'a' && pdfBytes > 10_000_000) throw new Error(`${option.name}: optimized PDF exceeds the 10 MB live-loading budget (${pdfBytes} bytes)`)

    if (!skipContactSheet) execFileSync('python3', [path.join(root, 'scripts', 'make-concept-contact-sheets.py'), option.slug, option.name], { stdio: 'inherit' })
    fs.writeFileSync(
      path.join(previewDir, 'qa.json'),
      `${JSON.stringify({ option: option.name, pdf: pdfPath, pdfBytes, linearized: true, ...state, errors }, null, 2)}\n`,
    )
    console.log(JSON.stringify({ option: option.name, pdf: pdfPath, pdfBytes, linearized: true, pages: state.pageCount, images: state.imageCount, events: state.eventCards }))
    await page.close()
  }
} finally {
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
