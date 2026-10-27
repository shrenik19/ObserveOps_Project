// scripts/probe-settings.mjs
// Verify the Settings layout by RENDERING it: Settings opens on My Profile beside the product's
// section menu, every Settings screen sits in its pane, and the menu opens the right section however
// you arrive. jsdom has hidden real defects in this repo — see CLAUDE.md, "How we work".
//
//   npm run dev
//   node scripts/probe-settings.mjs
//
//   CHROME  path to a Chrome/Chromium executable
//   ORIGIN  where `npm run dev` is serving  (default http://localhost:5173)
//   SHOTS   screenshot directory            (default docs/shots)

import { chromium } from 'playwright-core'

const EXE = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173'
const SHOTS = process.env.SHOTS || 'docs/shots'

const SECTIONS = [
  'My Account', 'User Settings', 'System Settings', 'Policy Settings', 'Discovery Settings',
  'Monitor Settings', 'Network Config Settings', 'Compliance Settings', 'SNMP Trap',
  'Observability Pipeline', 'Flow Settings', 'Plugin Library', 'Dependency Mapper',
  'Service Level Objective', 'Utility', 'APM', 'Real User Monitoring', 'Integration',
]

const checks = []
const check = (name, ok, detail) => {
  checks.push({ name, ok: Boolean(ok) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  — ${JSON.stringify(detail)}`}`)
}
const section = (t) => console.log(`\n──────── ${t} ────────`)

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE ${m.text()}`) })

const settle = async () => {
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
}
const go = async (hash) => {
  await page.goto(`${ORIGIN}/#${hash}`)
  await settle()
}
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` })
const hash = () => page.evaluate(() => window.location.hash)
// Light-DOM count. page.$ pierces open shadow roots, and obs-table's own internals match an id
// selector a second time — it reported two SLO tables where the document has one.
const count = (sel) => page.evaluate((sel) => document.querySelectorAll(sel).length, sel)

// The side menu's rows AS PAINTED — a row inside a closed section has no box, so it is left out.
const menuRows = () => page.$eval('#settings-menu', (m) =>
  [...m.shadowRoot.querySelectorAll('.row')]
    .filter((r) => r.getBoundingClientRect().height > 0)
    .map((r) => ({
      label: r.querySelector('.lbl')?.textContent.trim(),
      group: r.classList.contains('group'),
      active: r.classList.contains('active'),
      tag: r.querySelector('obs-tag')?.textContent.trim() || '',
    })))
const clickMenu = (label) => page.$eval('#settings-menu', (m, label) =>
  [...m.shadowRoot.querySelectorAll('.row')].find((r) => r.querySelector('.lbl')?.textContent.trim() === label).click(), label)
// Children of open sections: the painted rows that are neither a top-level section nor a leaf section.
const openChildren = async () => (await menuRows()).filter((r) => !SECTIONS.includes(r.label)).map((r) => r.label)
const activeLabel = async () => (await menuRows()).find((r) => r.active)?.label ?? null
// Tag the live menu element, so a later check can tell "same element" from "rebuilt".
const markMenu = () => page.$eval('#settings-menu', (m) => { m.dataset.probe = 'kept' })
const menuKept = () => page.$eval('#settings-menu', (m) => m.dataset.probe === 'kept')
const box = (sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height } })

// ─────────────────────────────────────────────────────────────────────────────────────────────────
section('1. Settings opens on My Profile, not a card grid')
await go('/')
await page.click('obs-sidebar >> text=Settings').catch(() => {})
await settle()
if (!(await hash()).startsWith('#/settings')) await go('/settings') // sidebar markup may differ; route directly
check('the Settings route is #/settings', (await hash()) === '#/settings', await hash())
check('no card grid', (await count('.card')) === 0)
check('the pane shows My Profile', await page.$eval('[data-role="settings-pane"]', (p) => p.dataset.item) === 'my-profile')
check('exactly one page header', (await count('obs-page-header')) === 1)

const top = (await menuRows()).filter((r) => SECTIONS.includes(r.label)).map((r) => r.label)
check('the eighteen sections, in product order', JSON.stringify(top) === JSON.stringify(SECTIONS), top)
// Every section must be DRAWN as one — same indent, a chevron — not just be present (G56).
const sectionLook = await page.$eval('#settings-menu', (m, labels) =>
  [...m.shadowRoot.querySelectorAll('.row')]
    .filter((r) => labels.includes(r.querySelector('.lbl')?.textContent.trim()))
    .map((r) => ({ label: r.querySelector('.lbl').textContent.trim(), pad: r.style.paddingLeft, chev: !!r.querySelector('.chev') }))
    .filter((r) => r.pad !== '12px' || !r.chev), SECTIONS)
check('all eighteen are drawn as sections, chevron and all', sectionLook.length === 0, sectionLook)
check('only My Account is open', JSON.stringify(await openChildren()) === JSON.stringify(['My Profile', 'UI Preference', 'License']), await openChildren())
check('My Profile is highlighted', (await activeLabel()) === 'My Profile', await activeLabel())
check('Service Level Objective carries BETA', (await menuRows()).find((r) => r.label === 'Service Level Objective')?.tag === 'BETA')

// Every section icon must draw a real glyph. An unknown name renders the same shadow DOM as a
// nonsense name — compare against one.
const icons = await page.$eval('#settings-menu', async (m) => {
  const probe = document.createElement('obs-icon')
  probe.setAttribute('name', 'qqqzzz-nonsense')
  document.body.append(probe)
  await new Promise((r) => setTimeout(r, 150))
  const blank = probe.shadowRoot?.innerHTML ?? ''
  probe.remove()
  return [...m.shadowRoot.querySelectorAll('.row')]
    .filter((r) => r.getBoundingClientRect().height > 0 && r.querySelector('obs-icon'))
    .map((r) => ({ label: r.querySelector('.lbl')?.textContent.trim(), blank: (r.querySelector('obs-icon').shadowRoot?.innerHTML ?? '') === blank }))
})
const blankIcons = icons.filter((i) => i.blank).map((i) => i.label)
check('every section draws its icon', icons.length >= 18 && blankIcons.length === 0, { drawn: icons.length, blank: blankIcons })
await page.waitForTimeout(800) // let late icon glyphs paint before the shot
await shot('settings-1-my-profile')

// ─────────────────────────────────────────────────────────────────────────────────────────────────
section('2. My Profile')
const value = (role) => page.$eval(`[data-role="${role}"]`, (e) => e.value)
check('seeded First / Last / User Name', `${await value('firstName')}|${await value('lastName')}|${await value('userName')}` === 'motadata|admin|admin')
check('User Name is read-only', await page.$eval('[data-role="userName"]', (e) => e.hasAttribute('disabled')))
const labels = await page.$$eval('.my-profile__label', (els) =>
  els.filter((e) => e.getBoundingClientRect().height > 8).map((e) => e.firstChild.textContent.trim()))
check('painted labels', JSON.stringify(labels) === JSON.stringify(['First Name', 'Last Name', 'User Name', 'Email Address', 'Mobile Number', 'Change Password']), labels)
const avatar = await box('[data-role="avatar"]')
check('avatar is a painted disc showing MA', avatar.w > 100 && Math.abs(avatar.w - avatar.h) < 1 &&
  (await page.$eval('[data-role="avatar"]', (e) => e.textContent)) === 'MA', avatar)
const update = await box('[data-role="update"]')
check('Update My Profile sits bottom-right of the pane', update.y + update.h > 900 - 60 && update.x + update.w > 1440 - 60, update)

await page.click('[data-role="update"]')
await page.waitForTimeout(300)
check('Update without an email marks the field', await page.$eval('[data-role="email"]', (e) => e.getAttribute('error-message')) === 'Email Address is required')

await page.click('[data-role="changePassword"]')
await page.waitForTimeout(300)
const pw = await page.$$eval('[data-role="passwords"] obs-input', (els) => els.filter((e) => e.getBoundingClientRect().height > 20).length)
check('Change Password ON paints three password fields', pw === 3, pw)
await shot('settings-2-change-password')

await page.fill('[data-role="email"] input', 'admin@motadata.com').catch(async () => {
  await page.click('[data-role="email"]'); await page.keyboard.type('admin@motadata.com')
})
await page.click('[data-role="changePassword"]')
await page.waitForTimeout(200)
await page.click('[data-role="update"]')
await page.waitForTimeout(300)
check('a typed email updates the profile', await page.$eval('[data-role="status"] obs-banner', (b) => b.getAttribute('variant')).catch(() => null) === 'success')

// ─────────────────────────────────────────────────────────────────────────────────────────────────
section('3. Moving through the menu keeps the menu')
await markMenu()
await clickMenu('Policy Settings')
await page.waitForTimeout(300)
await clickMenu('Metric Policy')
await settle()
check('a menu pick routes', (await hash()) === '#/settings/metric-policy', await hash())
check('the menu element is kept, not rebuilt', await menuKept())
check('Metric Policy is highlighted', (await activeLabel()) === 'Metric Policy', await activeLabel())
check('the pane shows the placeholder', await page.$eval('[data-role="settings-placeholder"] h2', (h) => h.textContent) === 'Policy Settings / Metric Policy')
await shot('settings-3-placeholder')

await clickMenu('Service Level Objective')
await page.waitForTimeout(300)
await clickMenu('SLO Profile')
await settle()
const slo = await box('#slo-profile-table')
check('SLO Profile fills the pane', slo.w > 900 && slo.h > 200, slo)
check('…exactly once', (await count('#slo-profile-table')) === 1, (await count('#slo-profile-table')))
check('still one page header', (await count('obs-page-header')) === 1)

await clickMenu('User Settings')
await page.waitForTimeout(300)
check('an untouched section opens to its one stand-in row', (await openChildren()).includes('Not in this design yet'), await openChildren())
await clickMenu('Not in this design yet')
await page.waitForTimeout(400)
check('…which routes nowhere', (await hash()) === '#/settings/slo-profile', await hash())
check('…and leaves SLO Profile highlighted', (await activeLabel()) === 'SLO Profile', await activeLabel())
const sloTables = (await count('#slo-profile-table'))
check('…and leaves the pane alone', sloTables === 1, sloTables)
await shot('settings-5-untouched-section')

// ─────────────────────────────────────────────────────────────────────────────────────────────────
section('4. Back, and pasted links, open the right section')
await page.goBack()
await settle()
check('Back returns to Metric Policy', (await hash()) === '#/settings/metric-policy', await hash())
check('…with it highlighted', (await activeLabel()) === 'Metric Policy', await activeLabel())

await go('/settings/wan-link-discovery?monitor=m-nxos')
check('the old WAN Link discovery link opens Discovery Profile', (await activeLabel()) === 'Discovery Profile', await activeLabel())
check('…with only Discovery Settings open', JSON.stringify(await openChildren()) === JSON.stringify(['Credential Profile', 'Discovery Profile']), await openChildren())
check('…and the monitor still locked from the query', await page.$eval('#wld-monitor', (m) => m.hasAttribute('disabled')).catch(() => false))
await shot('settings-4-discovery-profile')

await go(`/settings/integration?view=${encodeURIComponent('ME Service Desk Plus')}`)
check('the old SDP link opens the SDP form', (await count('[data-role="sdp-connection"]')) === 1)
check('…with ME Service Desk Plus highlighted', (await activeLabel()) === 'ME Service Desk Plus', await activeLabel())

await go('/settings/lama')
const lama = await box('#lama-table')
check('LAMA fills the pane under Integration', lama.w > 900 && (await activeLabel()) === 'LAMA', { lama, active: await activeLabel() })

await go('/settings/integration')
const cards = await page.$$('.integration-card')
check('the Integration landing still shows its cards', cards.length === 9, cards.length)
await cards[0].click()
await settle()
check('a landing card routes to its own menu item', (await hash()) === '#/settings/integration-profile' && (await activeLabel()) === 'Integration Profile', { hash: await hash(), active: await activeLabel() })

section('Errors')
check('no page or console errors', errors.length === 0, errors)

await browser.close()
const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks pass`)
process.exit(failed.length ? 1 : 0)
