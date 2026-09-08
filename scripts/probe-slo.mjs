// scripts/probe-slo.mjs
// Verify the SLO screens by RENDERING them. jsdom and static checks have both hidden real defects
// in this repo — see CLAUDE.md, "How we work".
//
//   npm run dev
//   node scripts/probe-slo.mjs
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

const go = async (hash) => {
  await page.goto(`${ORIGIN}/#${hash}`)
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(500)
}
const shot = (n) => page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true })
const texts = (sel) => page.$$eval(sel, (els) => els.map((e) => e.innerText.trim()))

section('Artboard 1 — the SLO list')
await go('/slo/list')
check('five tiles render', (await page.$$('.slo-tile')).length === 5)
// A painted tile, not merely a present one: an unstyled screen still has nodes.
check('a tile has real size', await page.$eval('.slo-tile', (e) => e.getBoundingClientRect().height > 60))
{
  const evals = await texts('.slo-tile__eval')
  check('the scenario SLO states a quorum', evals[0] === 'Redundant · 2 of 3', evals[0])
  check('no tile counts groups', !/group/i.test(evals.join(' ')), evals)
}
check('status is a DS severity that painted',
  await page.$eval('.slo-tile obs-severity', (e) => e.getBoundingClientRect().width > 0))
await shot('slo-list')

section('Artboard 1 — the Business Service view')
await page.click('#slo-bs-toggle')
await page.waitForTimeout(400)
{
  const heads = await texts('.slo-group__name')
  check('three services', heads.length === 3, heads)
  const counts = await texts('.slo-group__count')
  check('counts are right, singular and plural',
    counts.join(' | ') === '3 SLOs | 1 SLO | 1 SLO', counts)
  check('every SLO appears once', (await page.$$('.slo-group .slo-tile')).length === 5)
  // The rule the view exists for: a heading worse than some of its members.
  const head = await page.$eval('.slo-group .slo-group__head obs-severity', (e) => e.getAttribute('value'))
  const tiles = await page.$$eval('.slo-group:first-of-type .slo-tile obs-severity',
    (els) => els.map((e) => e.getAttribute('value')))
  check('a service takes the severest status of its SLOs',
    head === 'Breached' && tiles.filter((t) => t === 'Ok').length === 2, { head, tiles })
}
await shot('slo-list-bs')

section('Artboard 6 — the profile table')
await go('/settings/slo-profile')
check('the table painted', await page.$eval('#slo-profile-table', (e) => e.getBoundingClientRect().height > 100))
{
  const cells = await page.$eval('#slo-profile-table', (t) => t.rows.map((r) => r.evaluation))
  check('Evaluation Logic reads only Strict, Redundancy or an em dash',
    cells.every((c) => ['Strict', 'Redundancy', '—'].includes(c)), cells)
}
await shot('slo-profile-table')

section('Artboard 2 — Create SLO Profile')
await page.click('#slo-profile-create')
await page.waitForTimeout(500)
check('two evaluation rows', (await page.$$('.ev-row')).length === 2)
check('the rows painted', await page.$eval('.ev-row', (e) => e.getBoundingClientRect().height > 20))
{
  const metas = await texts('.ev-row__meta')
  check('BOTH rows state what they tolerate',
    metas[0] === 'tolerates 0 failures' && metas[1] === 'tolerates 1 failure', metas)
}
check('only the selected row is expanded',
  await page.$eval('[data-mode="strict"] .ev-row__body', (e) => e.getBoundingClientRect().height === 0) &&
  await page.$eval('[data-mode="redundant"] .ev-row__body', (e) => e.getBoundingClientRect().height > 0))
check('the quorum input painted with its addons',
  await page.$eval('#ev-quorum', (e) => e.getBoundingClientRect().width > 0))
// N = M must be unreachable, not merely discouraged.
await page.$eval('#ev-quorum', (el) => {
  el.value = '3'
  el.dispatchEvent(new Event('change', { bubbles: true }))
})
await page.waitForTimeout(300)
check('N = M is unreachable',
  (await page.$eval('#ev-quorum', (e) => e.getAttribute('value'))) === '2')
check('the business service picker is a select, not a text field',
  await page.$eval('#slo-bs', (e) => e.tagName.toLowerCase() === 'obs-select'))
await shot('slo-create')

section('Deck')
check('no console or page errors', errors.length === 0, errors.slice(0, 3))

const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length} passed, ${failed.length} failed`)
await browser.close()
// A probe that exits 0 on failure is worse than no probe: CI would go green over a broken screen.
process.exit(failed.length === 0 ? 0 : 1)
