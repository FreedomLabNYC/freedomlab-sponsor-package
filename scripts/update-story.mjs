import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { parseStoryMarkdown } from '../src/concepts/story-data.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destination = path.join(root, 'src', 'concepts', 'data', 'story.md')
const argument = process.argv[2]

if (!argument) {
  console.error('Usage: npm run story:update -- <story.md|->')
  process.exit(2)
}

const source = argument === '--check'
  ? fs.readFileSync(destination, 'utf8')
  : argument === '-'
    ? fs.readFileSync(0, 'utf8')
    : fs.readFileSync(path.resolve(argument), 'utf8')

const parsed = parseStoryMarkdown(source)

if (argument !== '--check') {
  const normalized = source.endsWith('\n') ? source : `${source}\n`
  const temporary = `${destination}.tmp-${process.pid}`
  fs.writeFileSync(temporary, normalized)
  fs.renameSync(temporary, destination)
}

console.log(JSON.stringify({
  status: argument === '--check' ? 'valid' : 'updated',
  file: destination,
  sections: parsed.sections.map((section) => section.title),
}))
