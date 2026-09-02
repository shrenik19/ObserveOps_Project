// Verify the WAN Link screen by RENDERING it, not by reading it. jsdom and static checks have
// both hidden real defects in this repo — see CLAUDE.md, "How we work".
//
//   npm run dev
//   node scripts/verify-wan-link.mjs
//
// CHROME overrides the browser path; URL overrides the target.

import { chromium } from 'playwright-core'

const EXE = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const URL = process.env.URL || 'http://localhost:5173/#/monitors/wan-link'

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })

const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()) })

await page.goto(URL, { waitUntil: 'networkidle' })
// Screens load by dynamic import(), so the shell paints before the screen mounts.
await page.locator('obs-table#wan-link-table').waitFor({ state: 'attached' })
await page.waitForTimeout(600)

const rows = await page.locator('obs-table#wan-link-table').evaluate((t) => t.rows.length)
const headers = await page.locator('obs-table#wan-link-table').evaluate((t) => t.columns.map((c) => c.title))
await page.screenshot({ path: 'docs/shots/wan-link-list.png' })

// A real click on a real row, not a synthetic event.
await page.getByText('nxosudpjitter-VI-70.70.70.2→70.70.70.1').first().click()
await page.waitForTimeout(600)

const tiles = await page.locator('.wl-tile').count()
// The six tiles must sit on ONE row. They inherit .wl-card, whose grid-column is span 12, so a
// missing override silently stacks them — a layout bug no unit test can see.
const tileTops = await page.locator('.wl-tile').evaluateAll((els) =>
  [...new Set(els.map((e) => Math.round(e.getBoundingClientRect().top)))])
const tileRows = tileTops.length
const charts = await page.locator('.wl-card--chart').count()
const widgets = await page.locator('.wl-grid > .wl-card').count()
const polylines = await page.locator('.wl-chart__plot polyline').count()
await page.screenshot({ path: 'docs/shots/wan-link-jitter.png' })

// Every stroke must resolve to a real colour. An unresolved var() computes to '' or 'none', which
// is exactly the failure a static check cannot see.
const strokes = await page.locator('.wl-chart__plot polyline').evaluateAll((els) =>
  els.map((e) => getComputedStyle(e).stroke))
const unresolved = strokes.filter((s) => !s || s === 'none')
const distinctStrokes = new Set(strokes).size

await page.keyboard.press('Escape')
await page.waitForTimeout(400)

// The echo layout: three widgets, one of them a plotted chart.
await page.getByText('nxosicmpecho-Jio-70.70.70.2→70.70.70.1').first().click()
await page.waitForTimeout(600)
const echoWidgets = await page.locator('.wl-grid > .wl-card').count()
const echoCharts = await page.locator('.wl-card--chart').count()
await page.screenshot({ path: 'docs/shots/wan-link-echo.png' })

const result = {
  rows, headers, tiles, tileRows, charts, widgets, polylines,
  distinctStrokes, unresolved: unresolved.length,
  echoWidgets, echoCharts, errors,
}
console.log(JSON.stringify(result, null, 2))

await browser.close()

const ok =
  errors.length === 0 && unresolved.length === 0 &&
  rows === 3 && tiles === 6 && tileRows === 1 && charts === 8 && widgets === 10 && polylines === 29 &&
  echoWidgets === 3 && echoCharts === 1
process.exit(ok ? 0 : 1)
