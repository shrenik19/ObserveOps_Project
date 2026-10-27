// scripts/probe-custom-report.mjs
// Verify Report -> Create Custom Report -> SLO by RENDERING it: real clicks on the real DS
// components, measured edges and gaps (CLAUDE.md "Form layout follows the shipped product").
//
//   npm run dev
//   node scripts/probe-custom-report.mjs
//
//   CHROME  path to a Chrome/Chromium executable
//   ORIGIN  where `npm run dev` is serving  (default http://localhost:5173)
//   SHOTS   screenshot directory            (default docs/shots)

import { chromium } from 'playwright-core'

const EXE = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173'
const SHOTS = process.env.SHOTS || 'docs/shots'

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

const wait = (ms) => page.waitForTimeout(ms)
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png` })
const box = (sel) => page.$eval(sel, (e) => {
  const r = e.getBoundingClientRect()
  return { l: Math.round(r.left), r: Math.round(r.right), t: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }
})
const optionValues = (sel) => page.$eval(sel, (e) => (e.options || []).map((o) => o.value))
async function pick(selector, option) {
  await page.click(selector)
  await wait(250)
  await page.getByRole('option', { name: option, exact: true }).first().click()
  await wait(400)
}
// Rows obs-table actually painted, read from its shadow root.
const paintedRows = (sel) => page.$eval(sel, (t) => [...t.shadowRoot.querySelectorAll('tbody tr')].map((tr) => tr.textContent.replace(/\s+/g, ' ').trim()))

section('Report page → Create Custom Report')
await page.goto(`${ORIGIN}/#/reports/categories`)
await page.waitForLoadState('networkidle')
await wait(800)
const listCount = (await paintedRows('#reports-table')).length
await page.click('[data-role="create-custom-report"]')
await wait(700)
check('the wizard replaces the Report page', await page.$eval('[data-role="custom-report"]', (e) => e.getBoundingClientRect().height > 400) &&
  await page.$eval('.app-shell__body', (e) => e.getBoundingClientRect().height === 0))
check('the hash names the view', page.url().endsWith('#/reports/categories?view=create-report'), page.url())

section('Step 1 — Report Type')
const tiles = await page.$$eval('.report-tile', (ts) => ts.map((t) => ({ type: t.dataset.type, button: t.tagName === 'BUTTON', painted: t.querySelector('svg').getBoundingClientRect().width > 50 })))
check('nineteen tiles, SLO after NetRoute', tiles.length === 19 && tiles.at(-2).type === 'NetRoute' && tiles.at(-1).type === 'SLO', tiles.map((t) => t.type).slice(-3))
check('only SLO is clickable', JSON.stringify(tiles.filter((t) => t.button).map((t) => t.type)) === '["SLO"]')
check('every tile paints its picture', tiles.every((t) => t.painted))
// Black and white only (user review): every painted stroke and fill in the pictures is a grey —
// r = g = b, within a little for a token that is not a pure grey.
const artColours = await page.$$eval('.tile-art *', (els) => [...new Set(els.flatMap((e) => {
  const cs = getComputedStyle(e)
  return [cs.stroke, cs.fill].filter((c) => c && c !== 'none' && !c.startsWith('url'))
}))])
const grey = (c) => { const [r, g, b] = (c.match(/[\d.]+/g) || []).map(Number); return Math.max(r, g, b) - Math.min(r, g, b) <= 24 }
check('the tile pictures are black and white', artColours.length > 0 && artColours.every(grey), artColours)
await page.click('.report-tile[data-type="APM"]', { force: true })
await wait(300)
check('clicking APM does nothing', (await page.$$('[data-role="report-type-step"]')).length === 1)
const gridGaps = await page.$$eval('.report-tile', (ts) => {
  const [a, b] = ts.map((t) => t.getBoundingClientRect())
  return Math.round(b.left - a.right)
})
check('tiles sit 8px apart, as in the product', gridGaps === 8, gridGaps)
await page.locator('[data-role="report-type-search"] input').fill('net')
await wait(300)
check('search narrows the tiles', JSON.stringify(await page.$$eval('.report-tile:not([hidden])', (ts) => ts.map((t) => t.dataset.type))) === '["NetRoute"]')
await page.locator('[data-role="report-type-search"] input').fill('')
await wait(300)
await shot('custom-report-1-type')
await page.locator('.report-tile[data-type="SLO"]').scrollIntoViewIfNeeded()
await shot('custom-report-1b-slo-tile')
await page.click('.report-tile[data-type="SLO"]')
await wait(700)

section('Step 2 — Report Criteria')
check('the rail names the type', await page.$eval('[data-role="report-steps"] .cr-step__label', (l) => l.textContent) === 'Report Type : SLO')
{
  // The product's page title and step rail, measured (user screenshot, 2026-10-27).
  const titleFont = await page.$eval('.cr-header__title', (t) => { const cs = getComputedStyle(t); return [parseFloat(cs.fontSize), Number(cs.fontWeight)] })
  check('the page title is ~20px regular, as in the product', titleFont[0] === 20 && titleFont[1] === 400, titleFont)
  const rail = await page.$$eval('.cr-step', (rows) => rows.map((r) => {
    const m = r.querySelector('.cr-step__marker')
    const ms = getComputedStyle(m)
    const rs = getComputedStyle(r)
    return {
      cls: r.className, h: Math.round(r.getBoundingClientRect().height), text: m.textContent,
      check: Boolean(m.querySelector('obs-icon[name="check"]')), markerBg: ms.backgroundColor,
      markerW: Math.round(m.getBoundingClientRect().width), rule: parseFloat(rs.borderBottomWidth), bg: rs.backgroundColor,
    }
  }))
  const [done, cur, next] = rail
  const filled = (c) => c !== 'rgba(0, 0, 0, 0)' && c !== 'transparent'
  check('a finished step shows a filled dark check', done.check && filled(done.markerBg), done)
  check('the current step shows an outlined number on a banded row', cur.text === '2' && !filled(cur.markerBg) && filled(cur.bg) && !filled(next.bg), [cur, next])
  check('rows are 45px with a rule between them, markers 26px', rail.every((r) => r.h === 45 && r.rule >= 1 && r.markerW === 26), rail.map((r) => [r.h, r.rule, r.markerW]))
  check('no connector lines between the markers', (await page.$$('.custom-report__rail obs-steps')).length === 0)
}
check('the date range shows on this step', await page.$eval('[data-role="report-range"]', (e) => e.getBoundingClientRect().width > 50))
check('Widget Type is Grid | Top N', JSON.stringify(await optionValues('[data-role="widget-type"]')) === '["Grid","Top N"]')
check('SLO counters are slo.*', (await optionValues('[data-role="counter-0"]'))[0] === 'slo.achieved.percent')
await pick('[data-role="slo-type"]', 'APM')
check('APM counters are slo.instance.*', (await optionValues('[data-role="counter-0"]'))[0] === 'slo.instance.achieved.percent')
await pick('[data-role="slo-type"]', 'SLO')
check('Aggregation is Last only, pre-selected', JSON.stringify(await optionValues('[data-role="aggregation-0"]')) === '["Last"]' &&
  await page.$eval('[data-role="aggregation-0"]', (e) => e.value) === 'Last')
check('SLO Type starts on SLO, Counter on slo.achieved.percent', await page.$eval('[data-role="slo-type"]', (e) => e.value) === 'SLO' &&
  await page.$eval('[data-role="counter-0"]', (e) => e.value) === 'slo.achieved.percent')
// An empty box: enabled, no placeholder text, and a visible frame (alpha checked, not just width).
check('Source is an empty, bordered box', await page.$eval('[data-role="source"]', (e) => !e.hasAttribute('disabled') &&
  !e.shadowRoot.querySelector('.trig')?.innerText.trim() &&
  [...e.shadowRoot.querySelectorAll('*')].some((n) => {
    const cs = getComputedStyle(n)
    const alpha = cs.borderTopColor.startsWith('rgba') ? Number(cs.borderTopColor.split(',')[3]) : 1
    return parseFloat(cs.borderTopWidth) >= 1 && alpha > 0 && n.getBoundingClientRect().height >= 28
  })))
check('the preview box shows No data found before the query is complete', await page.$eval('[data-role="preview-empty"]', (e) => e.textContent === 'No data found' && e.getBoundingClientRect().height > 0))
{
  const [pv, next] = await Promise.all([box('.slo-preview'), box('[data-role="next"]')])
  check('the preview box fills the step down to Previous / Next', next.t - (pv.t + pv.h) <= 40 && pv.h > 300, [pv.t + pv.h, next.t])
}
await page.click('[data-role="next"]')
await wait(300)
check('Next without a Source Filter is refused, and says why', await page.$$eval('.cr-field__error', (es) => es.map((e) => e.textContent)).then((t) => t.includes('Select a Source Filter') && !t.includes('Select a Counter')))
await pick('[data-role="source-filter"]', 'Availability SLO')
check('Source lists the five Availability SLOs once picked', (await optionValues('[data-role="source"]')).length === 5)
{
  const cols = await Promise.all(['slo-type', 'counter-0', 'aggregation-0', 'source-filter', 'source'].map((r) => box(`[data-role="${r}"]`)))
  const gaps = cols.slice(1).map((c, i) => c.l - cols[i].r)
  check('20px between the query columns, as in the product report', gaps.every((g) => g === 20), gaps)
  check('the first row shares a top edge', cols.every((c) => c.t === cols[0].t), cols.map((c) => c.t))
  const sf = await page.$eval('[data-role="source-filter"]', (e) => e.shadowRoot.textContent)
  check('"Availability SLO" is not clipped', await page.$eval('[data-role="source-filter"]', (e) => {
    const t = [...e.shadowRoot.querySelectorAll('*')].find((n) => n.children.length === 0 && /Availability SLO/.test(n.textContent))
    return t && t.scrollWidth <= t.clientWidth + 1
  }), sf.trim().slice(0, 40))
}
await page.click('[data-role="add-row"]')
await wait(500)
await pick('[data-role="counter-1"]', 'slo.burn.rate')
{
  const [c0, c1, a0, a1, sf, rm] = await Promise.all(['counter-0', 'counter-1', 'aggregation-0', 'aggregation-1', 'source-filter', 'remove-row-1'].map((r) => box(`[data-role="${r}"]`)))
  check('the added row sits under Counter and Aggregation', c1.l === c0.l && c1.r === c0.r && a1.l === a0.l && a1.r === a0.r, { c0, c1, a0, a1 })
  check('⊗ starts on the Source Filter edge, as in the product', rm.l === sf.l, [rm.l, sf.l])
  check('⊕ moved to the added row', (await page.$$('[data-role="add-row"]')).length === 1 && await page.$eval('[data-role="add-row"]', (e) => e.dataset.row) === '1')
}
await shot('custom-report-2-criteria-grid')
{
  const rows = await paintedRows('[data-role="preview-table"]')
  check('the grid previews the five Availability SLOs', rows.length === 5, rows.length)
  const heads = await page.$eval('[data-role="preview-table"]', (t) => [...t.shadowRoot.querySelectorAll('th')].map((h) => h.textContent.trim()).filter(Boolean))
  check('…with a column per counter', heads.includes('SLO.ACHIEVED.PERCENT') && heads.includes('SLO.BURN.RATE'), heads)
  check('…scrolling sideways rather than clipping', await page.$eval('.slo-preview', (p) => p.scrollWidth > p.clientWidth + 50))
  check('tags paint as chips', await page.$eval('[data-role="preview-table"]', (t) => t.shadowRoot.querySelectorAll('obs-tag, .obs-tag, [class*="tag"]').length > 0))
}
{
  const [q, panel, next] = await Promise.all(['.slo-query', '.slo-properties', '[data-role="next"]'].map(box))
  check('Properties and Next end on the query\'s right edge', panel.r === q.r && next.r === q.r, [q.r, panel.r, next.r])
}
await page.click('[data-role="remove-row-1"]')
await wait(400)
check('⊗ removes the added row', (await page.$$('[data-role="counter-1"]')).length === 0)

await page.click('[data-role="widget-type"] >> text=Top N')
await wait(500)
for (const view of ['area', 'line', 'hbar', 'vbar', 'pie', 'gauge']) {
  await page.click(`[data-view="${view}"]`)
  await wait(350)
  const marks = await page.$$eval('.slo-preview [data-item]', (es) => es.filter((e) => { const r = e.getBoundingClientRect(); return r.width > 0 || r.height > 0 }).length)
  check(`Top N ${view} paints a mark per SLO`, marks === 5, marks)
  if (view === 'hbar' || view === 'gauge') await page.locator('.slo-preview-area').screenshot({ path: `${SHOTS}/custom-report-3-topn-${view}.png` })
}
await page.click('[data-view="grid"]')
await wait(350)
check('Top N grid shows the ranked table', (await paintedRows('[data-role="preview-table"]')).length === 5)
{
  const before = (await box('.slo-preview')).w
  await page.click('[data-role="properties-toggle"]')
  await wait(300)
  const after = (await box('.slo-preview')).w
  check('collapsing Properties widens the preview', after > before + 150, [before, after])
  await page.click('[data-role="properties-toggle"]')
  await wait(300)
}
{
  // The product's three tabs paint; Column Setting and Timeline Preference are inert (user decision).
  const tabs = page.locator('.slo-properties obs-tabs')
  const labels = await tabs.evaluate((t) => t.shadowRoot.textContent.replace(/\s+/g, ' '))
  check('Properties shows Style, Column Setting and Timeline Preference',
    ['Style', 'Column Setting', 'Timeline Preference'].every((l) => labels.includes(l)), labels.trim().slice(-60))
  for (const label of ['Column Setting', 'Timeline Preference']) {
    await tabs.getByText(label, { exact: true }).click({ force: true })
    await wait(250)
  }
  check('…and clicking the other two leaves Style open', await tabs.evaluate((t) => t.value ?? t.getAttribute('value')) === 'style' &&
    (await page.$$('[data-role="font-size"], [data-view]')).length > 0)
}
// Negative control: the gap check must be able to fail.
await page.addStyleTag({ content: '.slo-query { column-gap: 32px !important; }' })
await wait(200)
{
  const [a, b] = await Promise.all([box('[data-role="slo-type"]'), box('[data-role="counter-0"]')])
  check('negative control: a 32px gap is caught', b.l - a.r !== 20, b.l - a.r)
}
await page.$$eval('style', (ss) => ss.filter((s) => s.textContent.includes('column-gap: 32px')).forEach((s) => s.remove()))
const criteriaNext = await box('[data-role="next"]')
await page.click('[data-role="next"]')
await wait(600)

section('Step 3 — Report Properties')
{
  const [name, desc, cat, ori, sched, save] = await Promise.all(['report-name', 'report-description', 'report-category', 'report-orientation', 'report-schedule', 'save-exit'].map((r) => box(`[data-role="${r}"]`)))
  check('14px between the two columns, as measured on the product', desc.l - name.r === 14, desc.l - name.r)
  const nameField = await page.$eval('[data-role="report-name"]', (e) => Math.round(e.getBoundingClientRect().bottom))
  const catCaption = await page.$eval('[data-role="report-category"]', (e) => Math.round(e.closest('.cr-field').getBoundingClientRect().top))
  check('~40px between rows, as measured on the product', catCaption - nameField === 40, catCaption - nameField)
  check('Category under Name, Orientation under Description', cat.l === name.l && cat.r === name.r && ori.l === desc.l, { name, cat, desc, ori })
  check('Schedule starts on the Name edge', sched.l === name.l, [sched.l, name.l])
  check('side-by-side fields share a top edge', name.t === desc.t && cat.t === ori.t, [name.t, desc.t, cat.t, ori.t])
  // The product pins the footer to the page's bottom-right corner on every step (user screenshot).
  const prev = await box('[data-role="prev"]')
  check('Save & Exit sits where Next did, bottom-right', save.r === criteriaNext.r && save.t === criteriaNext.t, [save, criteriaNext])
  check('Previous sits just left of Save & Exit', prev.t === save.t && save.l - prev.r === 8, [prev.r, save.l])
  // Measure what paints, at rest: a filled grey Previous, an outlined Save & Exit. The click on Next
  // left the pointer over Save & Exit, so move it off first or this measures the hover state.
  await page.mouse.move(600, 140)
  await wait(250)
  const look = (role) => page.$eval(`[data-role="${role}"]`, (host) => {
    const btn = host.shadowRoot.querySelector('button') ?? host
    const cs = getComputedStyle(btn)
    const alpha = (c) => (c.startsWith('rgba') ? parseFloat(c.split(',')[3]) : c === 'transparent' ? 0 : 1)
    return { bg: cs.backgroundColor, bgAlpha: alpha(cs.backgroundColor), border: parseFloat(cs.borderTopWidth) * alpha(cs.borderTopColor), borderColor: cs.borderTopColor }
  })
  const [prevLook, saveLook, pageBg] = [await look('prev'), await look('save-exit'),
    await page.evaluate(() => getComputedStyle(document.body).backgroundColor)]
  check('Previous is filled grey', prevLook.bgAlpha > 0 && prevLook.bg !== pageBg && prevLook.bg !== 'rgb(255, 255, 255)', prevLook)
  check('Save & Exit is outlined', saveLook.border >= 1, saveLook)
}
check('Category offers the real categories, not All Reports', await optionValues('[data-role="report-category"]').then((v) => v.includes('availability') && !v.includes('all-reports')))
await page.click('[data-role="save-exit"]')
await wait(300)
check('Save & Exit without a name and category is refused', await page.$eval('[data-role="report-name"]', (e) => e.getAttribute('error-message')) === 'Report Name is required' &&
  await page.$$eval('.cr-field__error', (es) => es.some((e) => e.textContent === 'Select a Report Category')))
await page.locator('[data-role="report-name"] input').fill('Active Alerts')
await pick('[data-role="report-category"]', 'Availability')
await page.click('[data-role="save-exit"]')
await wait(300)
check('a name already in the list is refused', /already exists/.test(await page.$eval('[data-role="report-name"]', (e) => e.getAttribute('error-message') || '')))
await page.locator('[data-role="report-name"] input').fill('SLO Weekly Availability')
await page.click('[data-role="prev"]')
await wait(500)
check('Previous keeps the criteria', await page.$eval('[data-role="counter-0"]', (e) => e.value) === 'slo.achieved.percent' &&
  (await page.$$('[data-role="slo-preview"]')).length === 1)
await page.click('[data-role="next"]')
await wait(500)
check('…and Next keeps the name', await page.$eval('[data-role="report-name"]', (e) => e.value) === 'SLO Weekly Availability')
await shot('custom-report-4-properties')
await page.click('[data-role="save-exit"]')
await wait(800)

section('Saved')
check('back on the Report page', (await page.$$('[data-role="custom-report"]')).length === 0 && page.url().endsWith('#/reports/categories'), page.url())
{
  const rows = await paintedRows('#reports-table')
  const row = rows.find((r) => r.includes('SLO Weekly Availability'))
  check('the report is in the list as SLO / Custom', Boolean(row) && / SLO /.test(` ${row} `) && row.includes('Custom'), row)
}
await shot('custom-report-5-list')

section('Back arrow, deep link')
await page.click('[data-role="create-custom-report"]')
await wait(600)
await page.click('[data-role="report-back"]')
await wait(500)
check('the back arrow returns to the list', (await page.$$('[data-role="custom-report"]')).length === 0 &&
  await page.$eval('.app-shell__body', (e) => e.getBoundingClientRect().height > 200))
check('…which still holds every report', (await paintedRows('#reports-table')).length === listCount)
await page.goto(`${ORIGIN}/#/reports/categories?view=create-report`)
await page.waitForLoadState('networkidle')
await wait(800)
check('the deep link opens the wizard', (await page.$$('[data-role="report-type-step"]')).length === 1)

check('no page or console errors', errors.length === 0, errors)

await browser.close()
const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
process.exit(failed.length ? 1 : 0)
