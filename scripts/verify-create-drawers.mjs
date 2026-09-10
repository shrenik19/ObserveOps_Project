// Verify the two Create drawers by RENDERING and CLICKING them, not by reading them. jsdom does not
// upgrade obs-drawer, so the unit suite can prove the composition but never the geometry — see
// CLAUDE.md, "How we work".
//
//   npm run dev
//   node scripts/verify-create-drawers.mjs
//
// CHROME overrides the browser path. DS quirk: obs-drawer / obs-button / obs-filters copy the host
// id into their shadow root (G33), so every locator here is tag-scoped or a strict locator throws.

import { chromium } from 'playwright-core'

const EXE = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const BASE = process.env.URL || 'http://localhost:5173/'
const OUT = process.env.OUT || 'docs/shots'

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errs = []
page.on('pageerror', (e) => errs.push(String(e)))
page.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })

let pass = 0
let fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}` +
    (ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`))
}

const open = async (route, button) => {
  await page.goto(BASE + route, { waitUntil: 'networkidle' })
  await page.waitForTimeout(1400)
  await page.locator(button).click()
  await page.waitForTimeout(1700)
}

/** The tier's geometry, measured — not read off the attributes that asked for it. */
const geometry = () => page.evaluate(() => {
  const body = document.querySelector('.pane-drawer')
  const cols = [...body.querySelectorAll('.pane-drawer__col')]
  const total = body.getBoundingClientRect().width
  return {
    pctOfViewport: Math.round((total / window.innerWidth) * 100),
    shares: cols.map((c) => Math.round((c.getBoundingClientRect().width / total) * 100)),
    independentScroll: cols.every((c) => getComputedStyle(c).overflowY === 'auto'),
  }
})

const rail = () => page.evaluate(() => [...document.querySelectorAll('.pane-drawer__nav-item')]
  .map((i) => ({ label: i.textContent.trim(), on: i.classList.contains('is-selected'), off: i.disabled })))

try {
  // ── Create SLO Profile ────────────────────────────────────────────────────────────────────────
  console.log('\n──────── Create SLO Profile ────────')
  await open('#/settings/slo-profile', 'obs-button#slo-profile-create')

  const g1 = await geometry()
  check('96% of the viewport — the large / full-screen tier', g1.pctOfViewport, 96)
  check('a 2 : 6 : 4 body, measured 17 / 50 / 33', g1.shares, [17, 50, 33])
  check('each column scrolls independently', g1.independentScroll, true)
  check('the list stays mounted under the overlay',
    await page.locator('#slo-profile-table').first().isVisible(), true)
  check('the rail offers the two SLO types, Availability selected',
    (await rail()).map((i) => i.label + (i.on ? ' *' : '')), ['Availability *', 'Performance'])
  await page.screenshot({ path: `${OUT}/slo-create-drawer.png` })

  // The Help Card is a live mirror — the reason it is worth a third of the drawer.
  const helpText = () => page.evaluate(() =>
    document.querySelector('.slo-help').textContent.replace(/\s+/g, ' '))
  check('the Help Card works the five days under Redundant',
    (await helpText()).includes('Redundancy recovered 40 percentage points'), true)

  await page.locator('.ev-row[data-mode="strict"]').click()
  await page.waitForTimeout(600)
  check('and follows the evaluation control into Strict',
    (await helpText()).includes('Under Strict this SLO scores 40%'), true)
  await page.screenshot({ path: `${OUT}/slo-create-drawer-strict.png` })

  await page.locator('.pane-drawer__nav-item', { hasText: 'Performance' }).click()
  await page.waitForTimeout(600)
  check('picking a type moves the selected treatment',
    (await rail()).map((i) => i.label + (i.on ? ' *' : '')), ['Availability', 'Performance *'])

  // ── Create Discovery Profile ──────────────────────────────────────────────────────────────────
  console.log('\n──────── Create Discovery Profile ────────')
  await open('#/settings/wan-link-discovery', 'obs-button#wld-create')

  const g2 = await geometry()
  check('96% of the viewport', g2.pctOfViewport, 96)
  check('a 2 : 6 : 4 body, measured 17 / 50 / 33', g2.shares, [17, 50, 33])
  check('each column scrolls independently', g2.independentScroll, true)

  const tree = await rail()
  check('the rail is the Discovery tree, 13 categories', tree.length, 13)
  check('WAN Link is the selected leaf', tree.filter((i) => i.on).map((i) => i.label), ['WAN Link'])
  check('and sits between Service Check and Wireless',
    tree.slice(tree.findIndex((i) => i.on) - 1, tree.findIndex((i) => i.on) + 2).map((i) => i.label),
    ['Service Check', 'WAN Link', 'Wireless'])
  check('every other category is shown but not choosable',
    tree.filter((i) => !i.on).every((i) => i.off), true)
  await page.screenshot({ path: `${OUT}/wld-create-drawer.png` })

  // The help rows really collapse — <details>, because the DS ships no accordion.
  const rowOpen = (n) => page.evaluate((i) =>
    document.querySelectorAll('.pane-drawer__help-section')[i].open, n)
  check('Supported Platforms opens by default', await rowOpen(0), true)
  check('the other rows start closed', await rowOpen(3), false)
  await page.locator('.pane-drawer__help-summary', { hasText: 'Discovery Mechanisms' }).click()
  await page.waitForTimeout(400)
  check('and a closed row opens on click', await rowOpen(3), true)
  await page.screenshot({ path: `${OUT}/wld-create-drawer-help.png` })

  console.log(`\n${pass} passed, ${fail} failed`)
  console.log('ERRORS:', JSON.stringify(errs))
  if (errs.length) fail++
} catch (e) {
  console.log('THREW:', String(e))
  fail++
  await page.screenshot({ path: `${OUT}/create-drawers-FAIL.png` })
} finally {
  await browser.close()
}

process.exit(fail ? 1 : 0)
