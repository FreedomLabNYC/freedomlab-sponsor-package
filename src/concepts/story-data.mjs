export function parseStoryMarkdown(source) {
  if (typeof source !== 'string' || !source.trim()) throw new Error('Story source is empty')

  const sections = []
  let section = null
  let paragraphLines = []
  let listItems = []

  const flushParagraph = () => {
    if (!paragraphLines.length) return
    section.blocks.push({ type: 'paragraph', text: paragraphLines.join(' ') })
    paragraphLines = []
  }

  const flushList = () => {
    if (!listItems.length) return
    section.blocks.push({ type: 'list', items: listItems })
    listItems = []
  }

  for (const rawLine of source.replaceAll('\r\n', '\n').split('\n')) {
    const line = rawLine.trim()
    const heading = line.match(/^#\s+(.+)$/)
    const listItem = line.match(/^\d+\.\s+(.+)$/)

    if (heading) {
      if (section) {
        flushParagraph()
        flushList()
      }
      section = { title: heading[1], blocks: [] }
      sections.push(section)
      continue
    }

    if (!section) {
      if (line) throw new Error('Story content must begin with a level-one heading')
      continue
    }

    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    if (listItem) {
      flushParagraph()
      listItems.push(listItem[1])
      continue
    }

    flushList()
    paragraphLines.push(line)
  }

  if (section) {
    flushParagraph()
    flushList()
  }

  if (sections.length !== 3) throw new Error(`Story must contain exactly three sections; found ${sections.length}`)
  for (const [index, item] of sections.entries()) {
    if (!item.title.trim()) throw new Error(`Story section ${index + 1} has no heading`)
    if (!item.blocks.some((block) => block.type === 'paragraph')) throw new Error(`Story section ${index + 1} has no body copy`)
  }

  return { sections }
}
