// Verify the SLO Profile filter bar by RENDERING and CLICKING it, not by reading it. jsdom does
// not upgrade obs-filters at all, so the unit suite cannot see this screen's real behaviour — see
// CLAUDE.md, "How we work".
//
//   npm run dev
//   node scripts/verify-slo-filters.mjs
//
// CHROME overrides the browser path. Two DS quirks shape this script:
//   - obs-filters and obs-button copy the host id into their shadow root (G33), so every locator
//     is tag-scoped (obs-filters#… , obs-button#…) or a strict locator throws.
//   - the chip's value picker is a nested obs-select; its options must be clicked inside THAT
//     shadow root, because the table has a "Performance" cell of its own that wins otherwise.
import { chromium } from 'playwright-core'
const OUT = process.env.OUT || 'docs/shots'
const browser = await chromium.launch({ executablePath: process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe' })
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } })
const errs = []
page.on('pageerror', e => errs.push(String(e)))
page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
const B = 'obs-filters#slo-profile-filters'
let pass = 0, fail = 0
const check = (label, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  ok ? pass++ : fail++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n        got  ${JSON.stringify(got)}\n        want ${JSON.stringify(want)}`}`)
}
const clickIn = async (sel, text = null) => {
  const box = await page.evaluate(({ sel, text, B }) => {
    const root = document.querySelector(B).shadowRoot
    let ns = [...root.querySelectorAll(sel)].filter(n => n.offsetHeight > 0)
    if (text != null) ns = ns.filter(n => n.textContent.replace(/\s+/g,' ').trim() === text)
    const n = ns[0]; if (!n) return null
    const r = n.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }
  }, { sel, text, B })
  if (!box) throw new Error(`not found: ${sel} ${text ?? ''}`)
  await page.mouse.click(box.x, box.y); await page.waitForTimeout(750)
}
// Click an option inside the value obs-select's OWN shadow root — not anywhere on the page, or
// the table's own "Performance" cell wins.
const pickValue = async (label) => {
  const box = await page.evaluate(({ B, label }) => {
    const all = document.querySelector(B).shadowRoot.querySelectorAll('.seg.val obs-select'); const s = all[all.length - 1]
    const b = [...s.shadowRoot.querySelectorAll('button.mopt')]
      .find(o => (o.querySelector('.mlbl')?.textContent || '').trim() === label)
    if (!b) return null
    const r = b.getBoundingClientRect(); return { x: r.x + r.width/2, y: r.y + r.height/2 }
  }, { B, label })
  if (!box) throw new Error(`value option not found: ${label}`)
  await page.mouse.click(box.x, box.y); await page.waitForTimeout(800)
}
const names = () => page.evaluate(() => document.querySelector('#slo-profile-table').rows.map(r => r.name))
const chips = () => page.evaluate(B => [...document.querySelector(B).shadowRoot.querySelectorAll('.chip-wrap')].map(c => c.textContent.replace(/\s+/g,' ').trim()), B)
const reload = async () => {
  await page.goto('http://localhost:5173/#/settings/slo-profile', { waitUntil: 'networkidle' })
  await page.locator(B).waitFor({ state: 'attached' }); await page.waitForTimeout(1500)
}
try {
  await reload()

  // --- resting state matches the screenshot ---------------------------------------------------
  check('three leading chips, in order', await chips(), ['SLO Type', 'Frequency', 'Business Service'])
  check('"+ Filter" is the add affordance',
    await page.evaluate(B => document.querySelector(B).shadowRoot.querySelector('.add-filter').textContent.replace(/\s+/g,' ').trim(), B), 'Filter')
  check('every row shows at rest', (await names()).length, 5)
  await page.screenshot({ path: `${OUT}/slo-profile-filters.png` })

  // --- apply SLO Type = Performance -----------------------------------------------------------
  await clickIn('.add-filter'); await clickIn('.bar-menu *', 'SLO Type'); await clickIn('.bar-menu *', '=')
  await page.screenshot({ path: `${OUT}/slo-profile-filters-value.png` })
  await pickValue('Performance')
  check('table filters as soon as the value is picked', await names(), ['Storage-Volume-Availability'])
  await page.screenshot({ path: `${OUT}/slo-profile-filtered.png` })

  // --- add a second condition: Frequency = Daily (Match All) ----------------------------------
  await clickIn('.add-filter'); await clickIn('.bar-menu *', 'Frequency'); await clickIn('.bar-menu *', '=')
  await pickValue('Daily')
  check('two conditions AND together', await names(), ['Storage-Volume-Availability'])

  // --- Clear All restores the estate ----------------------------------------------------------
  await clickIn('.clear-all')
  check('Clear All restores every row', (await names()).length, 5)
  await page.screenshot({ path: `${OUT}/slo-profile-filters-cleared.png` })

  // --- a filter survives creating a profile ---------------------------------------------------
  await reload()
  await clickIn('.add-filter'); await clickIn('.bar-menu *', 'SLO Type'); await clickIn('.bar-menu *', '=')
  await pickValue('Performance')
  check('filtered before create', await names(), ['Storage-Volume-Availability'])
  await page.locator('obs-button#slo-profile-create').click(); await page.waitForTimeout(900)
  await page.locator('obs-button#slo-form-create').click(); await page.waitForTimeout(1100)
  check('the filter still holds after a create', await names(), ['Storage-Volume-Availability'])
  await page.screenshot({ path: `${OUT}/slo-profile-filtered-after-create.png` })

  console.log(`\n${pass} passed, ${fail} failed`)
  console.log('ERRORS:', JSON.stringify(errs))
} catch (e) {
  console.log('THREW:', String(e)); fail++
  await page.screenshot({ path: `${OUT}/slo-profile-filters-FAIL.png` })
} finally { await browser.close() }
process.exit(fail ? 1 : 0)
