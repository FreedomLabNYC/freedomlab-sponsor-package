import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const started = Date.now()
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const websiteRoot = process.env.FREEDOM_LAB_WEBSITE || '/Users/harrison/.hermes/freedom-lab/website'
const sourcePdf = path.join(root, 'dist', 'concepts', 'signal-rings.pdf')
const targetRelative = 'pdf1/freedom-lab-sponsorship-package.pdf'
const indexRelative = 'pdf1/index.html'
const targetPdf = path.join(websiteRoot, targetRelative)
const targetIndex = path.join(websiteRoot, indexRelative)
const livePdfUrl = 'https://freedomlab.nyc/pdf1/freedom-lab-sponsorship-package.pdf'
const liveIndexUrl = 'https://freedomlab.nyc/pdf1/'
const dryRun = process.argv.includes('--dry-run')
const messageArgument = process.argv.find((argument) => argument.startsWith('--message='))
const commitMessage = messageArgument?.slice('--message='.length) || 'Update Freedom Lab sponsorship package'

const run = (command, args, options = {}) => execFileSync(command, args, {
  cwd: options.cwd || root,
  encoding: options.encoding || 'utf8',
  stdio: options.stdio || 'pipe',
})
const sha256 = (file) => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')

run('qpdf', ['--check', sourcePdf])
run('qpdf', ['--check-linearization', sourcePdf])
const localHash = sha256(sourcePdf)
const version = localHash.slice(0, 12)
const localBytes = fs.statSync(sourcePdf).size

if (dryRun) {
  console.log(JSON.stringify({ status: 'dry-run-pass', seconds: (Date.now() - started) / 1000, pdf: sourcePdf, bytes: localBytes, sha256: localHash, version }))
  process.exit(0)
}

if (!fs.existsSync(path.join(websiteRoot, '.git'))) throw new Error(`Website repository not found: ${websiteRoot}`)
const ownedPaths = [targetRelative, indexRelative]
const stagedBefore = run('git', ['diff', '--cached', '--name-only'], { cwd: websiteRoot }).trim()
if (stagedBefore) throw new Error(`Website repository already has staged changes: ${stagedBefore}`)
const ownedStatus = run('git', ['status', '--porcelain', '--', ...ownedPaths], { cwd: websiteRoot }).trim()
if (ownedStatus) throw new Error(`Website PDF release paths already have uncommitted changes: ${ownedStatus}`)

run('git', ['fetch', 'origin'], { cwd: websiteRoot, stdio: 'inherit' })
const headBefore = run('git', ['rev-parse', 'HEAD'], { cwd: websiteRoot }).trim()
const originBefore = run('git', ['rev-parse', 'origin/main'], { cwd: websiteRoot }).trim()
if (headBefore !== originBefore) throw new Error(`Website main is not synchronized with origin/main (${headBefore} != ${originBefore})`)

let wroteWebsite = false
let pushed = false
const rollback = () => {
  if (!wroteWebsite || pushed) return
  try { execFileSync('git', ['restore', '--staged', '--', ...ownedPaths], { cwd: websiteRoot, stdio: 'ignore' }) } catch {}
  try { execFileSync('git', ['restore', '--', ...ownedPaths], { cwd: websiteRoot, stdio: 'ignore' }) } catch {}
}
process.on('uncaughtException', (error) => { rollback(); console.error(error); process.exit(1) })
process.on('unhandledRejection', (error) => { rollback(); console.error(error); process.exit(1) })

const temporaryTarget = `${targetPdf}.tmp-${process.pid}`
fs.copyFileSync(sourcePdf, temporaryTarget)
fs.renameSync(temporaryTarget, targetPdf)
const indexBefore = fs.readFileSync(targetIndex, 'utf8')
const versionedPdf = `freedom-lab-sponsorship-package.pdf?v=${version}#page=1&amp;zoom=66`
const indexAfter = indexBefore.replace(/freedom-lab-sponsorship-package\.pdf\?v=[^"#]+#page=1&amp;zoom=66/g, versionedPdf)
if (indexAfter === indexBefore && !indexBefore.includes(versionedPdf)) throw new Error('Could not update the PDF cache version in pdf1/index.html')
fs.writeFileSync(targetIndex, indexAfter)
wroteWebsite = true
if (sha256(targetPdf) !== localHash) throw new Error('Website PDF copy does not match the generated PDF')
if ((indexAfter.match(new RegExp(versionedPdf.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length !== 2) throw new Error('PDF cache version must appear in both object and fallback links')

let commit = headBefore
const changed = run('git', ['status', '--porcelain', '--', ...ownedPaths], { cwd: websiteRoot }).trim()
if (changed) {
  run('git', ['add', '--', ...ownedPaths], { cwd: websiteRoot })
  const stagedAfter = run('git', ['diff', '--cached', '--name-only'], { cwd: websiteRoot }).trim().split('\n').filter(Boolean).sort()
  if (!stagedAfter.length || stagedAfter.some((file) => !ownedPaths.includes(file)) || !stagedAfter.includes(indexRelative)) throw new Error(`Unexpected staged paths: ${stagedAfter.join(', ')}`)
  run('git', ['commit', '--no-verify', '-m', commitMessage], { cwd: websiteRoot, stdio: 'inherit' })
  commit = run('git', ['rev-parse', 'HEAD'], { cwd: websiteRoot }).trim()
  run('git', ['push', '--no-verify', 'origin', 'main'], { cwd: websiteRoot, stdio: 'inherit' })
  pushed = true
}

const deadline = Date.now() + 90_000
let verified = false
let attempts = 0
while (Date.now() < deadline) {
  attempts += 1
  const cacheBust = `${commit.slice(0, 8)}-${attempts}`
  const head = await fetch(`${livePdfUrl}?v=${cacheBust}`, { method: 'HEAD', headers: { 'cache-control': 'no-cache' } })
  if (head.ok && Number(head.headers.get('content-length')) === localBytes) {
    const [download, indexResponse] = await Promise.all([
      fetch(`${livePdfUrl}?v=${cacheBust}-verify`, { headers: { 'cache-control': 'no-cache' } }),
      fetch(`${liveIndexUrl}?v=${cacheBust}`, { headers: { 'cache-control': 'no-cache' } }),
    ])
    if (download.ok && indexResponse.ok) {
      const remoteHash = crypto.createHash('sha256').update(Buffer.from(await download.arrayBuffer())).digest('hex')
      const liveIndex = await indexResponse.text()
      if (remoteHash === localHash && liveIndex.includes(versionedPdf)) {
        verified = true
        break
      }
    }
  }
  await new Promise((resolve) => setTimeout(resolve, 2_000))
}
if (!verified) throw new Error(`Live PDF/index did not match within 90 seconds: ${liveIndexUrl}`)

console.log(JSON.stringify({ status: 'published', seconds: (Date.now() - started) / 1000, commit, attempts, url: liveIndexUrl, bytes: localBytes, sha256: localHash, version }))
