import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const started = performance.now()
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const srcRoot = path.join(root, 'src')
const evidenceDir = path.join(root, 'docs', 'concepts', 'smoke')
fs.mkdirSync(evidenceDir, { recursive: true })

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
}

const server = http.createServer((request, response) => {
  const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
  const requested = pathname === '/' || pathname === '/concepts/' ? '/concepts/index.html' : pathname
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
  const errors = []
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 })
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page: ${error.message}`))

  const indexResponse = await page.goto(`${origin}/concepts/`, { waitUntil: 'networkidle' })
  if (indexResponse?.status() !== 200) throw new Error(`index returned ${indexResponse?.status()}`)
  if ((await page.locator('.card').count()) !== 4) throw new Error('expected four concept cards')
  if (!(await page.locator('img').evaluateAll((images) => images.every((image) => image.complete && image.naturalWidth > 0)))) throw new Error('index image failed')
  await page.screenshot({ path: path.join(evidenceDir, 'index-desktop.png'), fullPage: true })

  await page.getByRole('link', { name: 'Open full deck' }).first().click()
  await page.waitForSelector('[data-ready="true"]')
  if (!page.url().endsWith('/concepts/deck.html?option=a')) throw new Error(`unexpected option URL ${page.url()}`)
  if ((await page.locator('.page').count()) !== 5) throw new Error('option A did not render five pages')

  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(`${origin}/concepts/`, { waitUntil: 'networkidle' })
  const indexMobile = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }))
  if (indexMobile.scrollWidth > indexMobile.innerWidth) throw new Error(`mobile index overflow ${JSON.stringify(indexMobile)}`)
  await page.screenshot({ path: path.join(evidenceDir, 'index-mobile.png'), fullPage: true })

  await page.goto(`${origin}/concepts/deck.html?option=d`, { waitUntil: 'networkidle' })
  await page.waitForSelector('[data-ready="true"]')
  const deckMobile = await page.evaluate(() => ({
    innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    stageWidth: Math.round(document.querySelector('.page-stage').getBoundingClientRect().width),
    pages: document.querySelectorAll('.page').length,
  }))
  if (deckMobile.scrollWidth > deckMobile.innerWidth) throw new Error(`mobile deck overflow ${JSON.stringify(deckMobile)}`)
  if (deckMobile.pages !== 7) throw new Error(`mobile deck pages ${deckMobile.pages}`)
  await page.locator('.page').nth(1).screenshot({ path: path.join(evidenceDir, 'open-protocol-mobile-page-02.png') })

  if (errors.length) throw new Error(errors.join('\n'))
  console.log(JSON.stringify({
    status: 'pass',
    duration_ms: Math.round(performance.now() - started),
    desktop: { cards: 4, clicked: 'Option A', pages: 5 },
    mobile: { index: indexMobile, deck: deckMobile },
    errors,
    screenshots: evidenceDir,
  }))
} finally {
  if (browser) await browser.close()
  await new Promise((resolve) => server.close(resolve))
}
