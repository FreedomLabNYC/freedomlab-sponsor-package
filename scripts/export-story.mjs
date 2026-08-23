import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { chromium } from 'playwright'
import { parseStoryMarkdown } from '../src/concepts/story-data.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.join(root, 'src')
const storyPath = path.join(srcRoot, 'concepts', 'data', 'story.md')
const pdfPath = path.join(root, 'dist', 'concepts', 'signal-rings.pdf')
const screenshotPath = path.join(root, 'docs', 'concepts', 'signal-rings', 'page-02.png')
const qaPath = path.join(root, 'docs', 'concepts', 'signal-rings', 'story-qa.json')
const expected = parseStoryMarkdown(fs.readFileSync(storyPath, 'utf8'))

if (!fs.existsSync(pdfPath)) throw new Error('Signal Rings PDF is missing; run npm run export:concepts once')

const types = {
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
const origin = `http://127.0.0.1:${server.address().port}`
let browser
const temporaryPage = path.join(root, 'dist', 'concepts', `.signal-rings-story-${process.pid}.pdf`)
const temporaryMerged = path.join(root, 'dist', 'concepts', `.signal-rings-merged-${process.pid}.pdf`)
const temporaryOptimized = path.join(root, 'dist', 'concepts', `.signal-rings-optimized-${process.pid}.pdf`)

try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1000, height: 1200 }, deviceScaleFactor: 2 })
  const errors = []
  page.on('console', (message) => { if (message.type() === 'error') errors.push(`console: ${message.text()}`) })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

  const response = await page.goto(`${origin}/concepts/deck.html?option=a`, { waitUntil: 'domcontentloaded' })
  if (!response || response.status() !== 200) throw new Error(`Story preview returned ${response?.status() ?? 'no response'}`)
  await page.waitForSelector('[data-ready="true"]')
  await page.evaluate(() => document.fonts.ready)
  await page.waitForFunction(() => [...document.querySelectorAll('.story-page img')].every((image) => image.complete && image.naturalWidth > 0))

  const state = await page.evaluate(() => {
    const storyPage = document.querySelector('.story-page')
    const storyBox = storyPage.getBoundingClientRect()
    const outside = [...storyPage.querySelectorAll('*')].filter((element) => {
      const style = getComputedStyle(element)
      if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false
      const box = element.getBoundingClientRect()
      if (!box.width || !box.height) return false
      return box.left < storyBox.left - 1 || box.top < storyBox.top - 1 || box.right > storyBox.right + 1 || box.bottom > storyBox.bottom + 1
    }).map((element) => ({ tag: element.tagName, className: element.className }))

    const textContained = [...storyPage.querySelectorAll('.vertical-story-copy h2,.vertical-story-copy p,.vertical-story-copy li')].every((element) => {
      const box = element.getBoundingClientRect()
      const section = element.closest('.vertical-story-section').getBoundingClientRect()
      return box.left >= section.left - 1 && box.top >= section.top - 1 && box.right <= section.right + 1 && box.bottom <= section.bottom + 1
    })

    return {
      pages: document.querySelectorAll('.page').length,
      headings: [...storyPage.querySelectorAll('.vertical-story-section h2')].map((heading) => heading.textContent.trim()),
      paragraphs: [...storyPage.querySelectorAll('.vertical-story-section')].map((section) => [...section.querySelectorAll('.vertical-story-copy > p')].map((paragraph) => paragraph.textContent)),
      priorities: [...storyPage.querySelectorAll('.vertical-future ol li')].map((item) => item.textContent.trim()),
      images: [...storyPage.querySelectorAll('img')].map((image) => ({ src: image.getAttribute('src'), width: image.naturalWidth, height: image.naturalHeight })),
      currentImage: (() => {
        const section = storyPage.querySelector('.vertical-current')
        const image = section.querySelector('img')
        return {
          src: image.getAttribute('src'),
          natural: [image.naturalWidth, image.naturalHeight],
          imageWidth: Math.round(section.querySelector('figure').getBoundingClientRect().width),
          copyWidth: Math.round(section.querySelector('.vertical-story-copy').getBoundingClientRect().width),
        }
      })(),
      futureImage: (() => {
        const section = storyPage.querySelector('.vertical-future')
        const image = section.querySelector('img')
        const figure = section.querySelector('figure')
        return {
          src: image.getAttribute('src'),
          natural: [image.naturalWidth, image.naturalHeight],
          rendered: [Math.round(figure.getBoundingClientRect().width), Math.round(figure.getBoundingClientRect().height)],
        }
      })(),
      textContained,
      outside,
    }
  })

  const expectedHeadings = expected.sections.map((section) => section.title)
  const expectedParagraphs = expected.sections.map((section) => section.blocks.filter((block) => block.type === 'paragraph').map((block) => block.text))
  const expectedPriorities = expected.sections.flatMap((section) => section.blocks.filter((block) => block.type === 'list').flatMap((block) => block.items))
  if (state.pages !== 5) throw new Error(`Expected five pages; found ${state.pages}`)
  if (JSON.stringify(state.headings) !== JSON.stringify(expectedHeadings)) throw new Error('Rendered story headings differ from story.md')
  if (JSON.stringify(state.paragraphs) !== JSON.stringify(expectedParagraphs)) throw new Error('Rendered story paragraphs differ from story.md')
  if (JSON.stringify(state.priorities) !== JSON.stringify(expectedPriorities)) throw new Error('Rendered story list differs from story.md')
  if (state.currentImage.src !== 'assets/about-current-chair-crop.jpg' || state.currentImage.natural.join('x') !== '1127x821' || state.currentImage.imageWidth !== 350 || state.currentImage.copyWidth <= 290) throw new Error(`Current-space image crop is incorrect: ${JSON.stringify(state.currentImage)}`)
  if (state.futureImage.src !== 'assets/about-future-building-full-height-crop.jpg' || state.futureImage.natural.join('x') !== '904x941' || state.futureImage.rendered.join('x') !== '290x302') throw new Error(`Future-building image crop is incorrect: ${JSON.stringify(state.futureImage)}`)
  if (!state.textContained || state.outside.length) throw new Error(`Story page clips or overflows: ${JSON.stringify({ textContained: state.textContained, outside: state.outside })}`)
  if (errors.length) throw new Error(errors.join('\n'))

  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true })
  await page.locator('.story-page').screenshot({ path: screenshotPath })

  await page.emulateMedia({ media: 'print' })
  await page.addStyleTag({
    content: '@media print{html,body,.document{width:8.5in!important;height:11in!important;margin:0!important;padding:0!important;overflow:hidden!important}.page-stage{display:none!important;break-after:auto!important;page-break-after:auto!important}.page-stage.export-target{display:block!important;position:fixed!important;left:0!important;top:0!important;width:8.5in!important;height:11in!important;margin:0!important;overflow:hidden!important}}',
  })
  await page.evaluate(() => {
    document.querySelectorAll('.page-stage').forEach((stage, index) => stage.classList.toggle('export-target', index === 1))
    document.querySelectorAll('.page').forEach((element) => element.removeAttribute('style'))
  })
  await page.pdf({
    path: temporaryPage,
    format: 'Letter',
    printBackground: true,
    preferCSSPageSize: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })

  const baseline = await PDFDocument.load(fs.readFileSync(pdfPath))
  const storyPdf = await PDFDocument.load(fs.readFileSync(temporaryPage))
  if (baseline.getPageCount() !== 5 || storyPdf.getPageCount() !== 1) throw new Error('Unexpected baseline or story page count')
  const merged = await PDFDocument.create()
  const fixedDate = new Date('2024-10-27T00:00:00.000Z')
  merged.setTitle('Freedom Lab NYC — Signal Rings')
  merged.setAuthor('Freedom Lab NYC')
  merged.setProducer('Freedom Lab NYC deterministic exporter')
  merged.setCreator('Freedom Lab NYC deterministic exporter')
  merged.setCreationDate(fixedDate)
  merged.setModificationDate(fixedDate)
  for (let index = 0; index < 5; index += 1) {
    const source = index === 1 ? storyPdf : baseline
    const sourceIndex = index === 1 ? 0 : index
    const [copied] = await merged.copyPages(source, [sourceIndex])
    merged.addPage(copied)
  }
  fs.writeFileSync(temporaryMerged, await merged.save())
  execFileSync('qpdf', [
    '--linearize', '--deterministic-id', '--object-streams=generate', '--compress-streams=y',
    temporaryMerged, temporaryOptimized,
  ], { stdio: 'inherit' })
  execFileSync('qpdf', ['--check', temporaryOptimized], { stdio: 'ignore' })
  fs.renameSync(temporaryOptimized, pdfPath)
  fs.writeFileSync(qaPath, `${JSON.stringify({ status: 'pass', pdf: pdfPath, story: storyPath, ...state }, null, 2)}\n`)
  console.log(JSON.stringify({ status: 'pass', pdf: pdfPath, bytes: fs.statSync(pdfPath).size, screenshot: screenshotPath }))
} finally {
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
  for (const temporary of [temporaryPage, temporaryMerged, temporaryOptimized]) fs.rmSync(temporary, { force: true })
}
