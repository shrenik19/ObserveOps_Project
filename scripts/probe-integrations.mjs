// scripts/probe-integrations.mjs
// Verify Settings -> Integration (ME Service Desk Plus) by RENDERING it. jsdom and static checks
// have both hidden real defects in this repo — see CLAUDE.md, "How we work".
//
//   npm run dev
//   node scripts/probe-integrations.mjs
//
//   CHROME  path to a Chrome/Chromium executable
//   ORIGIN  where `npm run dev` is serving  (default http://localhost:5173)
//   SHOTS   screenshot directory            (default docs/shots)

import { chromium } from 'playwright-core'

const EXE = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173'
const SHOTS = process.env.SHOTS || 'docs/shots'
const SDP = 'ME Service Desk Plus'

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

const go = async (hash) => {
  await page.goto(`${ORIGIN}/#${hash}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(600)
}
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` })

// The side menu's rows, as painted: label, whether it is a section, and whether it is active.
const menuRows = () => page.$eval('#settings-menu', (m) =>
  [...m.shadowRoot.querySelectorAll('.row')].map((r) => ({
    label: r.querySelector('.lbl')?.textContent.trim(),
    group: r.classList.contains('group'),
    active: r.classList.contains('active'),
    tag: r.querySelector('obs-tag')?.textContent.trim() || '',
  })))
const clickMenu = (label) => page.$eval('#settings-menu', (m, label) =>
  [...m.shadowRoot.querySelectorAll('.row')].find((r) => r.querySelector('.lbl')?.textContent.trim() === label).click(), label)

// A visible caption: painted with real size, not merely present in the DOM (G49).
const paintedCaptions = (scope) => page.$$eval(`${scope} .integration-field__label`, (els) =>
  els.filter((e) => e.getBoundingClientRect().height > 8).map((e) => e.firstChild?.textContent.trim()))

// Pick an option the way a user does: open the select, click the option.
async function pick(selector, option) {
  await page.click(selector)
  await page.waitForTimeout(250)
  await page.getByRole('option', { name: option, exact: true }).first().click()
  await page.waitForTimeout(350)
}

section('Landing')
await go('/settings/integration')
{
  const rows = await menuRows()
  const groups = rows.filter((r) => r.group).map((r) => r.label)
  const leaves = rows.filter((r) => !r.group).map((r) => r.label)
  check('the Settings menu lists nine sections, Integration last', groups.length === 9 && groups.at(-1) === 'Integration', groups)
  // The menu opens its first section by default; only Integration may be open here (G53).
  check('only Integration is open', leaves[0] === 'Integration Profile' && leaves.length === 9, leaves)
  check('SDP sits right after ServiceNow', leaves.indexOf(SDP) === leaves.indexOf('ServiceNow') + 1)
  check('SDP carries the NEW tag', rows.find((r) => r.label === SDP)?.tag === 'NEW')
}
check('nine integration cards', (await page.$$('.integration-card')).length === 9)
await shot('integration-1-landing')

section('Integration Profile list')
await page.click(`.integration-card[data-integration="Integration Profile"]`)
await page.waitForTimeout(600)
check('the hash names the view', page.url().endsWith('?view=Integration%20Profile'), page.url())
check('the menu marks Integration Profile active', (await menuRows()).find((r) => r.active)?.label === 'Integration Profile')
const rowCount = () => page.$eval('#integration-table', (t) => t.rows.length)
check('twelve seeded profiles', (await rowCount()) === 12)
check('two of them are SDP', await page.$eval('#integration-table', (t, sdp) => t.rows.filter((r) => r.type === sdp).length === 2, SDP))
check('the table painted rows', await page.$eval('#integration-table', (t) => t.getBoundingClientRect().height > 300))
await page.locator('[data-role="profile-search"] input').fill('sdp')
await page.waitForTimeout(300)
check('search narrows to the SDP profiles', (await rowCount()) === 2, await rowCount())
await page.locator('[data-role="profile-search"] input').fill('')
await page.waitForTimeout(300)
await shot('integration-2-profiles')

section('Create Integration Profile drawer')
await page.click('[data-role="create-profile"]')
await page.waitForTimeout(600)
// The obs-drawer host has no box of its own — its panel is in the shadow root — so measure the body.
check('the drawer opened', await page.$eval('.integration-drawer', (d) => d.getBoundingClientRect().width > 300))
check('before a type, only the three common fields', JSON.stringify(await paintedCaptions('.integration-drawer')) ===
  JSON.stringify(['Profile Name', 'Integration Type', 'Description']), await paintedCaptions('.integration-drawer'))

await pick('[data-role="integration-type"]', SDP)
{
  const caps = await paintedCaptions('.integration-drawer')
  const expected = ['Profile Name', 'Integration Type', 'Description', 'Request Template', 'Impact', 'Urgency', 'Priority',
    'Mode', 'Level', 'Group', 'Technician', 'Category', 'Subcategory', 'Service Category', 'Item',
    'Auto Close Ticket', 'Request Subject', 'Request Description']
  check('SDP adds its fields, painted, in the designer\'s order', JSON.stringify(caps) === JSON.stringify(expected), caps)
}
{
  // Pairs sit side by side: the right field's caption starts at the same height as the left's.
  const pairs = await page.$$eval('.integration-drawer__type .integration-drawer__pair', (rows) => rows.map((r) => {
    const [a, b] = [...r.children].map((c) => c.getBoundingClientRect())
    return Math.abs(a.top - b.top) < 2 && b.left > a.right
  }))
  check('the twelve selects pair up two per row', pairs.length === 6 && pairs.every(Boolean), pairs)
}
check('Request Template defaults to Default Request',
  await page.$eval('[data-role="field-Request Template"]', (s) => s.value) === 'Default Request')
check('Auto Close Ticket is required for SDP', await page.$$eval('.integration-drawer__type .integration-field__label', (els) =>
  els.find((e) => e.firstChild.textContent === 'Auto Close Ticket')?.querySelector('.integration-field__required') != null))
check('the description is a multi-line field', await page.$eval('[data-role="ticket-description"]', (e) => e.getBoundingClientRect().height > 60))
check('no "Create Alert … as Event / Incident" choice', !(await page.$eval('[data-role="integration-profile-drawer"]', (d) => /as\s+event|event\s*\/\s*incident/i.test(d.innerText))))
await shot('integration-3-drawer-sdp')

await page.click('[data-role="create"]')
await page.waitForTimeout(300)
check('an empty name is refused', await page.$eval('[data-role="profile-name"]', (e) => e.hasAttribute('error')))
await page.locator('[data-role="profile-name"] input').fill('metric-alert')
await page.click('[data-role="create"]')
await page.waitForTimeout(300)
check('a taken name is refused', await page.$eval('[data-role="profile-name"]', (e) => /already exists/.test(e.getAttribute('error-message') || '')))
await page.locator('[data-role="profile-name"] input').fill('SDP P1 Requests')
await page.click('[data-role="create"]')
await page.waitForTimeout(600)
check('the drawer closed', (await page.$$('[data-role="integration-profile-drawer"]')).length === 0)
check('the new profile tops the list', await page.$eval('#integration-table', (t, sdp) => {
  const r = t.rows.find((x) => x.name === 'SDP P1 Requests'); return r?.type === sdp && t.rows.length === 13
}, SDP))
// A real user close must still close (the G51 guard acts on `close` only while connected).
await page.click('[data-role="create-profile"]')
await page.waitForTimeout(500)
await page.keyboard.press('Escape')
await page.waitForTimeout(500)
check('Escape closes the drawer', await page.$eval('#overlay-root', (o) => o.children.length === 0))
check('the filter offers SDP as an Integration Type', await page.$eval('#integration-filters', (f, sdp) => f.fields[0].values.includes(sdp), SDP))

section('ME Service Desk Plus connection form')
await clickMenu(SDP)
await page.waitForTimeout(700)
check('the hash names the view', page.url().endsWith('?view=ME%20Service%20Desk%20Plus'), page.url())
{
  const caps = await paintedCaptions('.sdp-connection')
  const expected = ['Server URL', 'URL Time Out', 'Credential Profiles', 'If alert re-occurs', 'Fail Over Email', 'Auto Sync', 'Use Proxy Server']
  check('the ServiceNow fields, painted', JSON.stringify(caps) === JSON.stringify(expected), caps)
}
check('no "Create Alert from Motadata ObserveOps as" field', !(await page.$eval('.sdp-connection', (e) => /create alert from/i.test(e.innerText))))
check('the segmented control shows both choices', await page.$eval('[data-role="sdp-reoccur"]', (e) =>
  /Create new ticket/.test(e.shadowRoot.textContent) && /Re-open closed ticket/.test(e.shadowRoot.textContent)))
check('the fail-over address is a chip', await page.$eval('[data-role="sdp-failover-email"]', (e) => /pmg\.aiops22@gmail\.com/.test(e.shadowRoot.textContent)))
check('the credential select shows its value, not [object Object]', await page.$eval('[data-role="sdp-credential"]', (e) =>
  /SDP_TechnicianKey_Prod/.test(e.shadowRoot.textContent) && !/object Object/.test(e.shadowRoot.textContent)))
{
  const [a, b] = await page.$$eval('.sdp-connection__switch', (els) => els.map((e) => e.getBoundingClientRect().left))
  check('Auto Sync and Use Proxy Server stack in the left column', Math.abs(a - b) < 1, [a, b])
}
await page.click('[data-role="sdp-test"]')
await page.waitForTimeout(400)
check('Test reports the connection', await page.$eval('[data-role="sdp-test-result"]', (e) => e.getBoundingClientRect().height > 20))
await shot('integration-4-sdp-connection')

section('Deep link, other entries')
await go(`/settings/integration?view=${encodeURIComponent(SDP)}`)
check('a deep link opens the SDP form', (await page.$$('.sdp-connection')).length === 1)
check('…with SDP active in the menu', (await menuRows()).find((r) => r.active)?.label === SDP)
await clickMenu('Slack')
await page.waitForTimeout(400)
check('an untouched integration says it keeps its screen', await page.$eval('[data-role="out-of-scope"]', (e) => /keeps its existing screen/.test(e.textContent)))
await clickMenu('LAMA')
await page.waitForTimeout(800)
check('LAMA goes to the existing LAMA screen', page.url().endsWith('#/settings/lama'), page.url())

check('no page or console errors', errors.length === 0, errors)

await browser.close()
const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
process.exit(failed.length ? 1 : 0)
