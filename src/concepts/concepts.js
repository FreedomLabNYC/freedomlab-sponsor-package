const OPTIONS = {
  a: {
    slug: 'signal-rings',
    name: 'Signal Rings',
    kicker: 'Cinematic · human · data-forward',
  },
  b: {
    slug: 'field-notes',
    name: 'Field Notes',
    kicker: 'Editorial · documentary · approachable',
  },
  c: {
    slug: 'street-level',
    name: 'Street Level',
    kicker: 'Architectural · ambitious · Manhattan',
  },
  d: {
    slug: 'open-protocol',
    name: 'Open Protocol',
    kicker: 'Technical · modular · cypherpunk',
  },
}

const requested = new URLSearchParams(location.search).get('option') || 'a'
const optionKey = Object.hasOwn(OPTIONS, requested) ? requested : 'a'
const option = OPTIONS[optionKey]
const requestedCollage = new URLSearchParams(location.search).get('collage') || 'panorama'
const collageKey = ['panorama', 'spotlight', 'staggered'].includes(requestedCollage) ? requestedCollage : 'panorama'
const totalPages = optionKey === 'a' ? 5 : 7
const documentRoot = document.querySelector('#document')

document.documentElement.dataset.option = optionKey
document.documentElement.dataset.collage = collageKey
document.title = `Freedom Lab NYC — ${option.name}`

const [content, guests, events] = await Promise.all([
  fetch('./data/content.json').then(requireJson),
  fetch('./data/guests.json').then(requireJson),
  fetch('./data/events.json').then(requireJson),
])

function requireJson(response) {
  if (!response.ok) throw new Error(`${response.url} returned ${response.status}`)
  return response.json()
}

function page(number, classes, label, body) {
  return `
    <div class="page-stage">
      <section class="page ${classes}" aria-label="${label}" data-page="${number}">
        ${body}
        ${number > 1 ? footer(number) : ''}
      </section>
    </div>`
}

function footer(number) {
  return `
    <footer class="page-footer" aria-hidden="true">
      <span>Freedom Lab NYC · Sponsorship package</span>
      <span>${String(number).padStart(2, '0')} / ${String(totalPages).padStart(2, '0')}</span>
    </footer>`
}

function heading(eyebrow, title, subtitle = '') {
  return `
    <header class="page-heading">
      ${eyebrow && optionKey !== 'a' ? `<div class="eyebrow">${eyebrow}</div>` : ''}
      <h1>${title}</h1>
      ${subtitle ? `<p>${subtitle}</p>` : ''}
    </header>`
}

function storyBlock(key, value) {
  return `
    <article class="story-block story-${key}">
      <div class="story-label">${value.label}</div>
      <h2>${value.title}</h2>
      <p>${value.body}</p>
    </article>`
}

function ringSystem(rings) {
  const max = rings[0].value
  return `
    <div class="ring-system" role="img" aria-label="Concentric community rings from ${rings[0].display} total attendees to ${rings.at(-1).display} core members">
      <div class="ring-glow"></div>
      ${rings.map((ring, index) => {
        const diameter = 390 - index * 66
        const ratio = ring.value / max
        return `<div class="orbit orbit-${index}" style="--diameter:${diameter}px;--ratio:${ratio}"><span></span></div>`
      }).join('')}
      <div class="ring-core"><strong>${rings.at(-1).display || rings.at(-1).value}</strong><span>${rings.at(-1).label}</span></div>
    </div>`
}

function ringLegend(rings) {
  return `
    <ol class="ring-legend">
      ${rings.map((ring, index) => `
        <li>
          <span class="ring-number">${ring.display || ring.value}</span>
          <span><strong>${ring.label}</strong><small>${ring.detail}</small></span>
          <i style="--ring-index:${index}"></i>
        </li>`).join('')}
    </ol>`
}

function sourceLine(text) {
  return optionKey === 'a' ? '' : `<div class="source-line">${text}</div>`
}

function guestCard(guest, index) {
  return `
    <article class="guest-card guest-${index + 1}">
      <div class="guest-portrait-wrap">
        <img src="${guest.image}" alt="${guest.name}">
        <span>${String(index + 1).padStart(2, '0')}</span>
      </div>
      <div class="guest-copy">
        <h2>${guest.name}</h2>
        <div class="guest-role">${guest.role}</div>
        <p>${guest.bio}</p>
        <ul class="guest-highlights">
          ${guest.highlights.map((highlight) => `<li>${highlight}</li>`).join('')}
        </ul>
      </div>
    </article>`
}

function eventCard(event) {
  const category = event.category.toLowerCase().replaceAll(' ', '-').replaceAll('lab-general', 'general')
  return `
    <article class="event-card category-${category}">
      <div class="event-image">
        ${event.cover ? `<img src="${event.cover}" alt="" loading="eager">` : '<div class="event-image-fallback"></div>'}
      </div>
      <div class="event-copy">
        <div class="event-meta"><span>${event.date}</span>${event.status === 'Upcoming' ? '<strong>Upcoming</strong>' : ''}</div>
        <h2>${event.name}</h2>
        <div class="event-category">${event.category}</div>
      </div>
      <span class="event-index">${String(event.index).padStart(2, '0')}</span>
    </article>`
}

function compactEventCard(event) {
  const category = event.category.toLowerCase().replaceAll(' ', '-').replaceAll('lab-general', 'general')
  return `
    <article class="compact-event-card category-${category}" title="${event.name}">
      <div class="event-image">
        ${event.cover ? `<img src="${event.cover}" alt="${event.name}" loading="eager">` : '<div class="event-image-fallback"></div>'}
      </div>
      <div class="compact-event-copy">
        <h2>${event.name}</h2>
        ${event.status === 'Upcoming' ? '<strong>Upcoming</strong>' : ''}
      </div>
    </article>`
}

function archiveGuestCard(guest) {
  return `
    <article class="archive-guest-card">
      <img src="${guest.image}" alt="${guest.name}">
      <div><h3>${guest.name}</h3><p>${guest.role}</p></div>
    </article>`
}

function compactArchivePage(number) {
  return page(number, 'archive-page compact-archive-page', 'Freedom Lab event archive', `
    ${heading('', 'Classes & Events', '31 events from October 2024 through September 2026.')}
    <section class="archive-overview" aria-label="Event archive overview">
      <div class="archive-count-block"><strong>${content.archive.count}</strong><span>events</span><small>${content.archive.date_range}</small></div>
      <div class="archive-overview-copy">
        <div class="archive-program-copy">
          <div>
            <h2>What we teach</h2>
            <p>Hands-on Bitcoin fundamentals grew into privacy, open-source AI, software freedom, digital mindfulness, and community experimentation.</p>
          </div>
          <div class="archive-category-totals">
            ${content.archive.category_counts.map((category) => `<span><b>${category.value}</b>${category.label}</span>`).join('')}
          </div>
        </div>
        <section class="archive-guests" aria-label="Featured guests">
          <h2>Featured guests</h2>
          <div class="archive-guest-grid">${guests.map(archiveGuestCard).join('')}</div>
        </section>
      </div>
    </section>
    <section class="compact-events-grid" aria-label="All 31 past and upcoming Freedom Lab events">
      ${[...events].reverse().map(compactEventCard).join('')}
      <aside class="compact-archive-total"><strong>31</strong><span>events<br>in public</span></aside>
    </section>
  `)
}

function archiveSummary() {
  return `
    <aside class="archive-summary" aria-label="Event archive totals">
      <div><strong>${content.archive.count}</strong><span>events</span></div>
      ${content.archive.category_counts.map((category) => `<p><b>${category.value}</b>${category.label}</p>`).join('')}
      <small>${content.archive.upcoming} upcoming · through Sep 2026</small>
    </aside>`
}

function archivePage(number, batch, title, range, summary = '') {
  return page(number, 'archive-page', `Freedom Lab event archive ${range}`, `
    ${heading('The proof is in the calendar', title, summary)}
    <div class="archive-key" aria-label="Event category key">
      <span class="key-bitcoin">Bitcoin</span>
      <span class="key-ai">Sovereign AI</span>
      <span class="key-general">Freedom Lab General</span>
    </div>
    <section class="events-grid" aria-label="${range}">
      ${batch.map(eventCard).join('')}
      ${batch.length < 16 ? archiveSummary() : ''}
    </section>
    ${sourceLine('31 events · Oct 2024—Sep 2026 · freedomlab.nyc archive + Luma future feed · checked Aug 22, 2026')}
  `)
}

function tiersPage(number) {
  return page(number, 'tiers-page', 'Freedom Lab NYC sponsorship tiers', `
    ${optionKey === 'a' ? heading('', 'Sponsorship tiers', 'Support Freedom Lab classes, events, and community.') : heading('Partner with the community', 'Sponsorship tiers', 'Support the room where complex tools become practical freedoms.')}
    <section class="tier-proof" aria-label="Examples of sponsor recognition">
      <figure><img src="../assets/event-sponsor-placard.jpeg" alt="Cake Wallet sponsor placard at a Freedom Lab event"><figcaption>Event visibility</figcaption></figure>
      <figure><img src="../assets/premium-sponsor-wall.jpg" alt="3D-printed sponsor logos displayed at Freedom Lab"><figcaption>Permanent recognition</figcaption></figure>
    </section>
    <section class="tier-grid">
      <article class="tier-card event-tier">
        <header><div>${optionKey === 'a' ? '' : '<span>Tier 01</span>'}<h2>Event Sponsor</h2></div><strong>$500<small>/ event</small></strong></header>
        <ul>
          <li><b>Acknowledgments</b><span>Event listing · In person · Social media</span></li>
          <li><b>Stickers</b></li>
          <li><b>Placard</b></li>
        </ul>
        ${optionKey === 'a' ? '' : '<div class="tier-code">Event activation</div>'}
      </article>
      <article class="tier-card premium-tier">
        <header><div>${optionKey === 'a' ? '' : '<span>Tier 02</span>'}<h2>Premium Sponsor</h2></div><strong>$10,000<small>/ year</small></strong></header>
        <ul>
          <li><b>2+ announcement presentations</b></li>
          <li><b>2+ dedicated workshops</b></li>
          <li><b>3D-printed logo</b><span>On the Premium Sponsor Wall</span></li>
        </ul>
        ${optionKey === 'a' ? '' : '<div class="tier-code">Annual partnership</div>'}
      </article>
    </section>
    <div class="tier-close">${optionKey === 'a' ? 'Help build Freedom Lab’s permanent home in Manhattan.' : 'Help build the most visible home for freedom tech in Manhattan.'}</div>
  `)
}

const story = content.story
const eventFirst = events.slice(0, 16)
const eventSecond = events.slice(16)

function signalStorySection(className, title, paragraphs, image, alt) {
  return `
    <article class="vertical-story-section ${className}">
      <figure><img src="${image}" alt="${alt}"></figure>
      <div class="vertical-story-copy">
        <h2>${title}</h2>
        ${paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join('')}
      </div>
    </article>`
}

const signalStoryCopy = {
  started: 'We began with hands-on Bitcoin education: building hardware wallets, running Bitcoin and Lightning nodes, mining bitcoin, and understanding how the systems work.',
  current: 'Bitcoin remains the foundation. We now also teach sovereign AI, encryption, self-hosted infrastructure, and open-source hardware and software. Our office inside a West Village maker space gives us a base for workshops, coworking, and shared experimentation.',
  difference: 'We make complex freedom tools approachable for beginners while giving experienced users and developers a place to test, use, and build them together.',
  future: 'We want a permanent Freedom Lab building in central Manhattan: well branded, accessible from the ground floor, and visible to the city. It would be a classroom, coworking home, and place where developers meet the people who use their tools. As AI makes building easier, the community can create more useful freedom technology without losing sight of usability or digital rights.',
}

const signalStoryPageBody = `
  ${heading('', 'Freedom Lab NYC')}
  <section class="vertical-story" aria-label="Freedom Lab past, present, and future">
    ${signalStorySection('vertical-started', 'How we started', [signalStoryCopy.started], 'assets/about-start-workshop.jpg', 'A packed hands-on Freedom Lab workshop around a shared table')}
    ${signalStorySection('vertical-current', 'Where we are', [signalStoryCopy.current, signalStoryCopy.difference], '../assets/community-01.jpg', 'Freedom Lab members gathered for a class in the current workspace')}
    ${signalStorySection('vertical-future', 'Where we’re going', [signalStoryCopy.future], 'assets/about-future-building.jpg', 'Illustrative street-level Freedom Lab NYC building concept')}
  </section>
  ${sourceLine('Narrative supplied by Freedom Lab NYC · current-space photo: original 1242×864 source · future image is illustrative')}
`

const standardStoryPageBody = `
  ${heading('About Freedom Lab NYC', story.title, story.dek)}
  <section class="story-visuals" aria-label="Freedom Lab then and future">
    <figure class="story-photo start-photo">
      <img src="assets/about-start-workshop.jpg" alt="A packed hands-on Freedom Lab workshop around a shared table">
      <figcaption>Hands-on education · West Village</figcaption>
    </figure>
    <figure class="story-photo future-photo">
      <img src="assets/about-future-building.jpg" alt="Illustrative street-level Freedom Lab NYC building concept">
      <figcaption>Illustrative vision · our next home</figcaption>
    </figure>
  </section>
  <section class="story-grid">
    ${storyBlock('started', story.started)}
    ${storyBlock('now', story.now)}
    ${storyBlock('difference', story.difference)}
    ${storyBlock('next', story.next)}
  </section>
  ${sourceLine('Mission language: freedomlab.nyc · narrative supplied by Freedom Lab NYC · images supplied for this concept')}
`

const storyPageBody = optionKey === 'a' ? signalStoryPageBody : standardStoryPageBody
const endingPages = optionKey === 'a'
  ? [compactArchivePage(4), tiersPage(5)]
  : [
      archivePage(5, eventFirst, 'A curriculum you can see', 'Archive events 1 through 16', 'The archive begins with Bitcoin fundamentals and grows into a broader freedom-tech program.'),
      archivePage(6, eventSecond, 'The program keeps expanding', 'Archive events 17 through 31', 'Community nights, open-source AI, software freedom, digital mindfulness — plus what comes next.'),
      tiersPage(7),
    ]

const markup = [
  page(1, 'cover-page', 'Freedom Lab NYC sponsorship package cover', ''),
  page(2, 'story-page', 'Freedom Lab NYC story, present, and future', storyPageBody),
  page(3, 'momentum-page', 'Freedom Lab community momentum', `
    ${optionKey === 'a' ? heading('', 'Community') : heading('Community momentum', 'An open door — with a real core', 'The audience keeps widening. A meaningful group keeps coming back.')}
    <section class="momentum-main">
      ${ringSystem(content.community_rings)}
      ${ringLegend(content.community_rings)}
    </section>
    <section class="legacy-stats" aria-label="Statistics retained from the current sponsorship package">
      ${content.existing_stats.map(stat => `
        <article>
          <strong>${stat.value}</strong>
          <span>${stat.label}</span>
          <small>${stat.note}</small>
        </article>`).join('')}
    </section>
    <section class="community-strip collage-${collageKey}" aria-label="Freedom Lab community photo collage">
      <figure><img src="${optionKey === 'a' && collageKey === 'panorama' ? '../assets/community-01-no-wall.jpg' : '../assets/community-01.jpg'}" alt="Freedom Lab community event in a meeting room"></figure>
      <figure><img src="${optionKey === 'a' && collageKey === 'panorama' ? '../assets/community-02-audience-crop.jpg' : '../assets/community-02.jpeg'}" alt="Freedom Lab class with a full audience"></figure>
      <figure><img src="${optionKey === 'a' && collageKey === 'panorama' ? '../assets/community-03-table-crop.jpg' : '../assets/community-03.jpeg'}" alt="Freedom Lab members playing a Bitcoin board game"></figure>
      <figure><img src="../assets/community-04.jpeg" alt="Freedom Lab workshop around a long table"></figure>
    </section>
    ${sourceLine('RSVP rings: audited Freedom Lab dashboard snapshot, Aug 22, 2026 · RSVP history is not check-in attendance')}
  `),
  ...(optionKey === 'a' ? [] : [page(4, 'guests-page', 'Featured Freedom Lab guests', `
      ${heading('Featured guests', 'Practitioners with real-world stakes', 'Privacy infrastructure, software freedom, global Bitcoin reporting, and human-rights adoption.')}
      <section class="guest-grid">
        ${guests.map(guestCard).join('')}
      </section>
      ${sourceLine('Official profiles and portraits: sethforprivacy.com · fsf.org · Forbes · Human Rights Foundation · Bitcoin Policy Institute')}
    `)]),
  ...endingPages,
].join('')

documentRoot.className = `document option-${option.slug}`
documentRoot.dataset.option = optionKey
documentRoot.dataset.ready = 'true'
documentRoot.innerHTML = markup

function sizePages() {
  const scale = Math.min(1, (window.innerWidth - 24) / 816)
  document.querySelectorAll('.page-stage').forEach((stage) => {
    const innerPage = stage.querySelector('.page')
    stage.style.width = `${816 * scale}px`
    stage.style.height = `${1056 * scale}px`
    innerPage.style.transform = `scale(${scale})`
  })
}

sizePages()
window.addEventListener('resize', sizePages, { passive: true })
