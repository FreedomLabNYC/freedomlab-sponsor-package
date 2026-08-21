import http from 'node:http'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { PDFDocument } from 'pdf-lib'
import { chromium } from 'playwright'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.join(root, 'src')
const output = path.join(root, 'dist', 'freedom-lab-sponsorship-package.pdf')

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const requested = pathname === '/' ? '/index.html' : pathname
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
const url = `http://127.0.0.1:${address.port}/`

let browser
try {
  browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1000, height: 3600 } })
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

  const response = await page.goto(url, { waitUntil: 'networkidle' })
  const state = await page.evaluate(() => ({
    pageCount: document.querySelectorAll('.page').length,
    imagesLoaded: [...document.images].every((image) => image.complete && image.naturalWidth > 0),
  }))

  if (!response || response.status() !== 200) throw new Error(`Preview returned ${response?.status() ?? 'no response'}`)
  if (state.pageCount !== 3) throw new Error(`Expected 3 pages, found ${state.pageCount}`)
  if (!state.imagesLoaded) throw new Error('One or more images failed to load')
  if (errors.length) throw new Error(errors.join('\n'))

  await page.emulateMedia({ media: 'print' })
  await page.addStyleTag({
    content: '@media print{html,body,.document{width:8.5in!important;height:11in!important;margin:0!important;padding:0!important;overflow:hidden!important}.page-stage{display:none!important;break-after:auto!important;page-break-after:auto!important}.page-stage.export-target{display:block!important;position:fixed!important;left:0!important;top:0!important;width:8.5in!important;height:11in!important;margin:0!important;overflow:hidden!important}}',
  })

  fs.mkdirSync(path.dirname(output), { recursive: true })
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

    const temporaryPage = path.join(root, 'dist', `.page-${index + 1}.pdf`)
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
  for (const temporaryPage of temporaryPages) {
    const source = await PDFDocument.load(fs.readFileSync(temporaryPage))
    if (source.getPageCount() !== 1) throw new Error(`${temporaryPage} produced ${source.getPageCount()} pages`)
    const [copied] = await merged.copyPages(source, [0])
    merged.addPage(copied)
  }
  if (merged.getPageCount() !== 3) throw new Error(`Expected merged PDF to contain 3 pages, found ${merged.getPageCount()}`)
  fs.writeFileSync(output, await merged.save())
  temporaryPages.forEach((temporaryPage) => fs.rmSync(temporaryPage, { force: true }))

  console.log(JSON.stringify({ output, pageCount: merged.getPageCount(), imagesLoaded: state.imagesLoaded }))
} finally {
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
