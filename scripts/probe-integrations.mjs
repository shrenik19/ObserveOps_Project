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

const COMMON = ['Profile Name', 'Integration Type', 'Description']
const TICKET = ['Auto Close Ticket', 'Request Subject', 'Request Description']
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// The template's rows as painted: each row's field count, and whether a pair sits side by side.
const templateRows = () => page.$$eval('[data-role="template-section"] .integration-drawer__pair', (rows) => rows.map((r) => {
  const [a, b] = [...r.children].map((c) => c.getBoundingClientRect())
  return b ? (Math.abs(a.top - b.top) < 2 && b.left > a.right ? 2 : 'misaligned') : 1
}))

// Step 1 — the type: SDP shows only Request Template, as Jira shows only Project.
await pick('[data-role="integration-type"]', SDP)
{
  const caps = await paintedCaptions('.integration-drawer')
  check('SDP adds only Request Template', same(caps, [...COMMON, 'Request Template']), caps)
}
check('Request Template starts unset', !(await page.$eval('[data-role="field-Request Template"]', (s) => s.value)))
check('Request Template is required, with a hint', await page.$$eval('.integration-drawer__type .integration-field__label', (els) => {
  const l = els.find((e) => e.firstChild.textContent === 'Request Template')
  return l?.querySelector('.integration-field__required') != null && l?.querySelector('obs-tooltip') != null
}))
check('Request Template fills only the left half', await page.$eval('[data-role="field-Request Template"]', (s) => {
  const row = s.closest('.integration-drawer__pair').getBoundingClientRect()
  const box = s.getBoundingClientRect()
  return box.width > 100 && box.right < row.left + row.width / 2 + 1
}))
await shot('integration-3a-drawer-sdp-type')

await page.locator('[data-role="profile-name"] input').fill('SDP P1 Requests')
await page.click('[data-role="create"]')
await page.waitForTimeout(300)
check('Create without a template is refused, and says why', await page.$eval('[data-role="field-Request Template"]', (s) =>
  s.nextElementSibling?.textContent === 'Select a Request Template' && s.nextElementSibling.getBoundingClientRect().height > 8))
check('…and the drawer stays open', (await page.$$('[data-role="integration-profile-drawer"]')).length === 1)

// Step 2 — the template: its fields appear, packed two per row.
await pick('[data-role="field-Request Template"]', 'Network Outage')
{
  const caps = await paintedCaptions('.integration-drawer')
  const expected = [...COMMON, 'Request Template', 'Impact', 'Urgency', 'Priority', 'Group', 'Technician', 'Category', 'Subcategory', ...TICKET]
  check('Network Outage reveals its seven fields, then the ticket fields', same(caps, expected), caps)
  const rows = await templateRows()
  check('…packed 2-2-2-1, pairs side by side', same(rows, [2, 2, 2, 1]), rows)
}
check('picking a template clears its error', !(await page.$eval('[data-role="field-Request Template"]', (s) => s.hasAttribute('data-invalid'))))
await shot('integration-3b-drawer-sdp-network-outage')

await pick('[data-role="field-Request Template"]', 'Default Request')
{
  const caps = await paintedCaptions('.integration-drawer')
  const expected = [...COMMON, 'Request Template', 'Impact', 'Urgency', 'Priority', 'Level', 'Group', 'Technician',
    'Category', 'Subcategory', 'Service Category', 'Item', ...TICKET]
  check('switching to Default Request swaps in all ten fields', same(caps, expected), caps)
  check('no Mode field anywhere', !caps.includes('Mode'))
  const rows = await templateRows()
  check('…five full pairs', same(rows, [2, 2, 2, 2, 2]), rows)
  // The product's Jira drawer leaves 24px between its two columns.
  const gaps = await page.$$eval('[data-role="template-section"] .integration-drawer__pair', (rs) => rs.map((r) => {
    const [a, b] = [...r.querySelectorAll('obs-select')].map((s) => s.getBoundingClientRect())
    return Math.round(b.left - a.right)
  }))
  check('…24px between the columns, as in the product', gaps.every((g) => g === 24), gaps)
}
check('Auto Close Ticket is required for SDP', await page.$$eval('.integration-drawer__type .integration-field__label', (els) =>
  els.find((e) => e.firstChild.textContent === 'Auto Close Ticket')?.querySelector('.integration-field__required') != null))
check('the description is a multi-line field', await page.$eval('[data-role="ticket-description"]', (e) => e.getBoundingClientRect().height > 60))
check('no "Create Alert … as Event / Incident" choice', !(await page.$eval('[data-role="integration-profile-drawer"]', (d) => /as\s+event|event\s*\/\s*incident/i.test(d.innerText))))
await shot('integration-3-drawer-sdp')

await page.locator('[data-role="profile-name"] input').fill('')
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
{
  // Edges line up across rows: whatever sits below starts and ends where the field above does.
  const box = (sel) => page.$eval(sel, (e) => { const r = e.getBoundingClientRect(); return { l: Math.round(r.left), r: Math.round(r.right) } })
  const url = await box('[data-role="sdp-url"]')
  const timeout = await box('[data-role="sdp-timeout"]')
  const button = await box('[data-role="sdp-create-credential"]')
  const credential = await box('[data-role="sdp-credential"]')
  const email = await box('[data-role="sdp-failover-email"]')
  const save = await box('[data-role="sdp-save"]')
  check('24px between the two columns, as in the product', timeout.l - url.r === 24, timeout.l - url.r)
  check('Create Credential Profile starts where URL Time Out starts', button.l === timeout.l, [button.l, timeout.l])
  check('Credential Profiles spans the Server URL column exactly', credential.l === url.l && credential.r === url.r, [credential, url])
  check('Fail Over Email starts where URL Time Out starts', email.l === timeout.l, [email.l, timeout.l])
  check('Save ends at the right edge of the fields', save.r === timeout.r, [save.r, timeout.r])
  // Side by side, the controls share a top edge — a caption's ⓘ must not push one down.
  const top = (sel) => page.$eval(sel, (e) => Math.round(e.getBoundingClientRect().top))
  const rows = [[await top('[data-role="sdp-url"]'), await top('[data-role="sdp-timeout"]')],
    [await top('[data-role="sdp-reoccur"]'), await top('[data-role="sdp-failover-email"]')]]
  check('fields side by side share a top edge', rows.every(([a, b]) => a === b), rows)
}
check('URL Time Out is a plain text field — no spinner, no "sec"', await page.$eval('[data-role="sdp-timeout"]', (e) => {
  const input = e.shadowRoot.querySelector('input')
  return input?.type === 'text' && !/\bsec\b/.test(e.shadowRoot.textContent) && !e.shadowRoot.querySelector('[class*="step"], [class*="spin"]')
}))
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
