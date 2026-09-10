// Verify the WAN Link Discovery screen by RENDERING it, not by reading it. jsdom and static checks
// have both hidden real defects in this repo — see CLAUDE.md, "How we work".
//
//   npm run dev
//   node scripts/probe-wan-link-discovery.mjs
//
// Env overrides (nothing machine-specific is hardcoded below):
//   CHROME  path to a Chrome/Chromium executable
//   ORIGIN  where `npm run dev` is serving  (default http://localhost:5173)
//   SHOTS   directory the screenshots are written to  (default docs/shots)
//
// Exits 0 only when every check below passed. Each check prints PASS/FAIL with what was measured,
// so a failure names the defect rather than just the assertion.

import { chromium } from 'playwright-core'

const EXE = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const ORIGIN = process.env.ORIGIN || 'http://localhost:5173'
const SHOTS = process.env.SHOTS || 'docs/shots'
const DISCOVERY = `${ORIGIN}/#/settings/wan-link-discovery`
const WAN_LINK = `${ORIGIN}/#/monitors/wan-link`

const checks = []
const check = (name, ok, detail) => {
  checks.push({ name, ok: Boolean(ok) })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail === undefined ? '' : `  — ${fmt(detail)}`}`)
}
const fmt = (v) => (typeof v === 'string' ? v : JSON.stringify(v))
const section = (title) => console.log(`\n──────── ${title} ────────`)

const browser = await chromium.launch({ executablePath: EXE })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })

const errors = []
page.on('pageerror', (e) => errors.push(`PAGEERROR ${e.message}`))
page.on('console', (m) => { if (m.type() === 'error') errors.push(`CONSOLE ${m.text()}`) })

const shot = (name) => page.screenshot({ path: `${SHOTS}/${name}.png` })

// obs-select / obs-radio are web components: set the value and fire their own event, as a real
// selection would. Their popovers are shadow-DOM overlays; this drives the same code path the
// component's own click handler does.
const pick = async (id, value) => {
  await page.evaluate(([i, v]) => {
    const el = document.getElementById(i)
    el.setAttribute('value', v)
    el.value = v
    el.dispatchEvent(new CustomEvent('change', { detail: [v], bubbles: true }))
  }, [id, value])
  await page.waitForTimeout(150)
}
const typeInto = async (id, value) => {
  await page.evaluate(([i, v]) => {
    const el = document.getElementById(i)
    el.value = v
    el.setAttribute('value', v)
  }, [id, value])
}
// What the USER sees in an obs-input, read out of the component's own rendered <input>, not from
// the attribute the app wrote. A value that never reaches the input is exactly the class of defect
// that reads fine in jsdom.
const renderedInput = (id) => page.evaluate(
  (i) => document.getElementById(i)?.shadowRoot?.querySelector('input')?.value ?? null, id)

// Every element this screen toggles with `el.hidden`, measured as PAINTED, not as a property.
// The UA's `[hidden] { display: none }` is the weakest rule in the cascade: any author rule that
// sets `display` on the element beats it, so `el.hidden` reads true while the element is still on
// screen. jsdom reads the property and passes. Only the box tells the truth.
const TOGGLED = [
  'wld-list', 'wld-port-field', 'wld-link-fields', 'wld-csv-block', 'wld-gated',
  'wld-gate-msg', 'wld-os-warning', 'wld-error', 'wld-prog-abort', 'wld-prog-failnote',
]
// screen.js's `show()` swaps the Create form and the progress panel in and out of #wld-view with
// replaceChildren — they are mutually exclusive subtrees, never mounted together. So a single audit
// never sees all ten ids: it sees #wld-list (which persists throughout, hidden) plus whichever
// subtree is currently mounted. These are the two subsets a `hiddenAudit()` call can legitimately
// return; anything short of the right one for the state under test means an id was renamed or
// removed, not merely "the other screen isn't up".
const FORM_IDS = [
  'wld-list', 'wld-port-field', 'wld-link-fields', 'wld-csv-block', 'wld-gated',
  'wld-gate-msg', 'wld-os-warning', 'wld-error',
]
const PROGRESS_IDS = ['wld-list', 'wld-prog-abort', 'wld-prog-failnote']
const hiddenAudit = () => page.evaluate((ids) => {
  const out = {}
  for (const id of ids) {
    const el = document.getElementById(id)
    if (!el) continue
    const r = el.getBoundingClientRect()
    out[id] = {
      hiddenProp: el.hidden,
      display: getComputedStyle(el).display,
      box: `${Math.round(r.width)}x${Math.round(r.height)}`,
      painted: r.width > 0 && r.height > 0,
    }
  }
  return out
}, TOGGLED)
// A hidden element that still paints is the defect. Returns the offenders.
const paintedWhileHidden = (audit) =>
  Object.entries(audit).filter(([, v]) => v.hiddenProp && v.painted).map(([k]) => k)
// `if (!el) continue` above means a renamed or removed id silently drops out of the audit instead
// of failing loudly — an audit that came back empty (or short) would otherwise still print PASS on
// paintedWhileHidden's empty-array check. Assert the audited id set is EXACTLY the one this state
// owns, so a missing id fails here by name instead of vanishing.
const auditCoversExactly = (audit, expectedIds) => {
  const got = Object.keys(audit).sort()
  const want = [...expectedIds].sort()
  return got.length === want.length && got.every((k, i) => k === want[i])
}

// ═══════════════ A · the profile list ═══════════════
section('A · profile list')
await page.goto(DISCOVERY, { waitUntil: 'networkidle' })
// Screens load by dynamic import(), so the shell paints before the screen mounts.
await page.waitForSelector('obs-table#wld-table')
await page.waitForTimeout(700)

const list = await page.evaluate(() => {
  const t = document.querySelector('obs-table#wld-table')
  return {
    rows: t.rows.length,
    headers: [...t.shadowRoot.querySelectorAll('thead th')].map((h) => h.textContent.trim()),
    bodyCells: t.shadowRoot.querySelectorAll('tbody td').length,
    objectObject: document.body.innerText.includes('[object Object]'),
    filterChips: document.querySelector('#wld-filters')?.getBoundingClientRect().height ?? 0,
  }
})
await shot('wld-list')
check('list · the table renders rows', list.rows > 0 && list.bodyCells > 0,
  `${list.rows} rows, ${list.bodyCells} painted cells`)
check('list · all 7 columns render their titles', list.headers.filter(Boolean).length === 7, list.headers)
check('list · no [object Object] anywhere on the page', !list.objectObject)
check('list · the filter bar has height', list.filterChips > 0, `${Math.round(list.filterChips)}px`)

// ═══════════════ B · the Create form and the monitor cascade ═══════════════
section('B · Create form · monitor cascade')
await page.click('#wld-create')
await page.waitForSelector('#wld-monitor')
await page.waitForTimeout(400)

const auditFormOpen = await hiddenAudit()
console.log('  hidden audit (form open):', JSON.stringify(auditFormOpen))
check('hidden · audit found exactly the Create form\'s toggled ids (form open)',
  auditCoversExactly(auditFormOpen, FORM_IDS), Object.keys(auditFormOpen))
// The Create form is an OVERLAY now — the DS large / full-screen drawer — so the list deliberately
// stays mounted and painted UNDERNEATH it. What matters is that the drawer is actually covering it.
check('overlay · the Create drawer covers the list, which stays mounted',
  auditFormOpen['wld-list'].painted && !auditFormOpen['wld-list'].hiddenProp,
  auditFormOpen['wld-list'])
check('hidden · nothing else toggled off is still painted',
  paintedWhileHidden(auditFormOpen).length === 0, paintedWhileHidden(auditFormOpen))

await pick('wld-monitor', 'm-nxos')
const afterMonitor = await page.evaluate(() => ({
  vendor: document.getElementById('wld-vendor').getAttribute('value'),
  os: document.getElementById('wld-os').getAttribute('value'),
  cred: document.getElementById('wld-cred').getAttribute('value'),
  slaTitle: document.getElementById('wld-sla-title').textContent.trim(),
  // The [object Object] trap: a select whose options were set wrong renders that literal string.
  rendersObjectObject: document.body.innerText.includes('[object Object]'),
  // What the trigger actually SHOWS, not what the attribute says.
  monitorTrigger: document.getElementById('wld-monitor').shadowRoot
    ?.querySelector('.trig').textContent.replace(/\s+/g, ' ').trim(),
  vendorTrigger: document.getElementById('wld-vendor').shadowRoot
    ?.querySelector('.trig').textContent.replace(/\s+/g, ' ').trim(),
  gatedPainted: document.getElementById('wld-gated').getBoundingClientRect().height > 0,
}))
console.log('  afterMonitor:', JSON.stringify(afterMonitor))
check('cascade · vendor', afterMonitor.vendor === 'Cisco Systems', afterMonitor.vendor)
check('cascade · device OS', afterMonitor.os === 'nx-os', afterMonitor.os)
check('cascade · credential prefilled', afterMonitor.cred === 'NXOS-SSH-Ops', afterMonitor.cred)
check('cascade · operations title', afterMonitor.slaTitle === 'IP SLA Operations Test Parameters',
  afterMonitor.slaTitle)
check('cascade · no [object Object]', !afterMonitor.rendersObjectObject)
check('cascade · the monitor trigger shows the option TEXT, not the id',
  afterMonitor.monitorTrigger.includes('CORE-NX-01.test.com'), afterMonitor.monitorTrigger)
check('cascade · the vendor trigger shows its value', afterMonitor.vendorTrigger === 'Cisco Systems',
  afterMonitor.vendorTrigger)
check('cascade · the gated section is now painted', afterMonitor.gatedPainted)

// ═══════════════ C · UDP Port placement, form footer, page width ═══════════════
section('C · UDP Port, footer, page width')
await pick('wld-probe', 'UDP Jitter')
const udpPort = await page.evaluate(() => {
  const field = document.getElementById('wld-port-field')
  const label = field.querySelector('label').textContent.replace(/\s+/g, ' ').trim()
  const timeout = document.getElementById('wld-timeout-field').getBoundingClientRect()
  const box = field.getBoundingClientRect()
  return {
    label,
    visible: box.height > 0,
    sameRowAsTimeout: Math.abs(box.top - timeout.top) < 4,
    rightOfTimeout: box.left > timeout.left,
  }
})
const footer = await page.evaluate(() => {
  const f = document.querySelector('.wld-form__footer').getBoundingClientRect()
  const last = document.getElementById('wld-notify-field').getBoundingClientRect()
  return { belowLastField: f.top >= last.bottom - 2, footerTop: Math.round(f.top), lastBottom: Math.round(last.bottom) }
})
const noHorizontalScroll = await page.evaluate(
  () => document.documentElement.scrollWidth <= window.innerWidth)
await shot('wld-form')
check('udp · the field is labelled UDP Port', udpPort.label.includes('UDP Port'), udpPort.label)
check('udp · the field is visible for a UDP probe', udpPort.visible)
check('udp · it sits on the same row as Timeout', udpPort.sameRowAsTimeout)
check('udp · it sits to the right of Timeout', udpPort.rightOfTimeout)
check('form · the footer sits below the last field, not floating mid-panel',
  footer.belowLastField, footer)
check('form · no horizontal scroll', noHorizontalScroll)

// The form is taller than the viewport, so "below the last field" is only half the question:
// Save and Run has to be REACHABLE. The content region owns the scroll, not the page.
const reach = await page.evaluate(() => {
  const content = document.getElementById('wld-content')
  const scrolls = content.scrollHeight > content.clientHeight
    && getComputedStyle(content).overflowY === 'auto'
  document.querySelector('.wld-form__footer').scrollIntoView({ block: 'end' })
  const run = document.getElementById('wld-run').getBoundingClientRect()
  return { scrolls, runInViewport: run.top >= 0 && run.bottom <= window.innerHeight + 1 }
})
check('form · Save and Run can be scrolled to, inside the content region', reach.runInViewport, reach)

// `.wld-field[hidden]` proved in the state that actually exercises it: an ICMP probe needs no port.
await pick('wld-probe', 'ICMP Echo')
const auditIcmp = await hiddenAudit()
console.log('  hidden audit (ICMP probe):', JSON.stringify(auditIcmp['wld-port-field']))
check('hidden · audit found exactly the Create form\'s toggled ids (ICMP state)',
  auditCoversExactly(auditIcmp, FORM_IDS), Object.keys(auditIcmp))
check('hidden · #wld-port-field is not painted for a non-UDP probe',
  auditIcmp['wld-port-field'].hiddenProp && !auditIcmp['wld-port-field'].painted,
  auditIcmp['wld-port-field'])
check('hidden · nothing else toggled off is painted (ICMP state)',
  paintedWhileHidden(auditIcmp).length === 0, paintedWhileHidden(auditIcmp))
await shot('wld-form-icmp')

// ═══════════════ D · Single | CSV mode ═══════════════
section('D · Single | CSV mode')
await pick('wld-probe', 'UDP Jitter')
await shot('wld-mode-single')
const singleMode = await page.evaluate(() => ({
  linkFieldsPainted: document.getElementById('wld-link-fields').getBoundingClientRect().height > 0,
  csvPainted: document.getElementById('wld-csv-block').getBoundingClientRect().height > 0,
}))
check('csv · Single mode paints the link fields and not the CSV block',
  singleMode.linkFieldsPainted && !singleMode.csvPainted, singleMode)

// The segmented control must read as ONE control: segments joined, the selected one distinct.
const segments = await page.evaluate(() => {
  const opts = [...document.getElementById('wld-mode').shadowRoot.querySelectorAll('.opt')]
  const group = document.getElementById('wld-mode').shadowRoot.querySelector('.rg')
  return {
    count: opts.length,
    boxes: opts.map((o) => {
      const r = o.getBoundingClientRect()
      const cs = getComputedStyle(o)
      return {
        text: o.textContent.trim(), on: o.classList.contains('on'),
        left: Math.round(r.left), right: Math.round(r.right), h: Math.round(r.height),
        bg: cs.backgroundColor, fg: cs.color,
      }
    }),
    groupBorder: getComputedStyle(group).borderTopWidth,
    groupRadius: getComputedStyle(group).borderTopLeftRadius,
  }
})
const [segA, segB] = segments.boxes
check('csv · the mode control renders two segments', segments.count === 2,
  segments.boxes.map((b) => b.text))
check('csv · the segments are joined (no gap between them)',
  Math.abs(segB.left - segA.right) <= 1, `gap ${segB.left - segA.right}px`)
check('csv · the selected segment is visibly distinct from the other',
  segA.bg !== segB.bg && segA.fg !== segB.fg, { on: segA, off: segB })
check('csv · the control is drawn as one bordered group',
  parseFloat(segments.groupBorder) > 0 && parseFloat(segments.groupRadius) > 0,
  { border: segments.groupBorder, radius: segments.groupRadius })

await pick('wld-mode', 'csv')
await page.waitForTimeout(200)
await shot('wld-mode-csv')
const csvMode = await page.evaluate(() => {
  const block = document.getElementById('wld-csv-block')
  const upload = block.querySelector('.wld-form__upload')
  const input = document.getElementById('wld-csv-name').getBoundingClientRect()
  const button = document.getElementById('wld-csv-upload').getBoundingClientRect()
  const sample = document.getElementById('wld-csv-sample')
  const sRect = sample.getBoundingClientRect()
  const sCs = getComputedStyle(sample)
  return {
    linkFieldsPainted: document.getElementById('wld-link-fields').getBoundingClientRect().height > 0,
    portPainted: document.getElementById('wld-port-field').getBoundingClientRect().height > 0,
    uploadDisplay: getComputedStyle(upload).display,
    // The defect the rules were written blind against: input and button stacked, not on one row.
    uploadOnOneRow: Math.abs(input.top - button.top) < 6,
    uploadGap: Math.round(button.left - input.right),
    inputGrew: input.width > button.width,
    sampleBelowUpload: sRect.top >= input.bottom - 1,
    sampleUnderlined: sCs.textDecorationLine.includes('underline'),
    sampleBorder: sCs.borderTopWidth,
    sampleColour: sCs.color,
    sampleNotFullWidth: sRect.width < input.width,
    columnsHint: document.getElementById('wld-csv-columns').textContent.trim().slice(0, 60),
  }
})
console.log('  csvMode:', JSON.stringify(csvMode))
check('csv · CSV mode hides the link fields', !csvMode.linkFieldsPainted)
check('csv · CSV mode hides UDP Port (the port is a column, not a field)', !csvMode.portPainted)
check('csv · the upload row is a flex row, input beside button',
  csvMode.uploadDisplay === 'flex' && csvMode.uploadOnOneRow && csvMode.inputGrew, csvMode)
check('csv · the upload row has a real gap', csvMode.uploadGap >= 6 && csvMode.uploadGap <= 16,
  `${csvMode.uploadGap}px`)
check('csv · Sample CSV is a styled link below the row, not a default button',
  csvMode.sampleBelowUpload && csvMode.sampleUnderlined
  && parseFloat(csvMode.sampleBorder) === 0 && csvMode.sampleNotFullWidth, csvMode)
check('csv · the column contract is spelled out', csvMode.columnsHint.startsWith('One row per link'),
  csvMode.columnsHint)

await page.click('#wld-csv-sample')
await page.waitForTimeout(250)
const afterSample = await renderedInput('wld-csv-name')
check('csv · Sample CSV fills the file field with the parsed-row count',
  /3 rows parsed/.test(afterSample ?? ''), afterSample)

// The round-trip: Single → CSV must NOT show a stale file name for a file that no longer exists.
await pick('wld-mode', 'single')
await page.waitForTimeout(150)
const singleAgain = await page.evaluate(() => ({
  linkFieldsPainted: document.getElementById('wld-link-fields').getBoundingClientRect().height > 0,
  csvPainted: document.getElementById('wld-csv-block').getBoundingClientRect().height > 0,
}))
check('csv · Single mode brings the link fields back',
  singleAgain.linkFieldsPainted && !singleAgain.csvPainted, singleAgain)
await pick('wld-mode', 'csv')
await page.waitForTimeout(200)
const roundTrip = await renderedInput('wld-csv-name')
check('csv · the file field is EMPTY after a Single→CSV round-trip', roundTrip === '',
  `rendered value ${JSON.stringify(roundTrip)}`)
await shot('wld-mode-csv-roundtrip')

// ═══════════════ E · Reset restores the INITIAL state ═══════════════
section('E0 · Notifications · Bcc reveal')
// This section exists because of a bug jsdom structurally cannot see. "+ Bcc" was first built on
// obs-link, which link.json documents as a NAVIGATION control ("Performs an action? -> Button, not
// a link"). One click cleared the hash, the router remounted the Overview, and the half-filled form
// was destroyed — while 38 jsdom tests passed, because jsdom does not navigate. It is an
// obs-button variant="transparent" now, and these checks pin that the form survives the clicks.
const bccState = () => page.evaluate(() => {
  const g = (id) => document.getElementById(id)
  const painted = (el) => { const b = el?.getBoundingClientRect(); return !!b && b.width > 0 && b.height > 0 }
  return {
    hash: location.hash,
    formMounted: !!document.querySelector('.wld-form'),
    linkPainted: painted(g('wld-bcc')),
    rowPainted: painted(g('wld-bcc-row')),
  }
})
const bccBefore = await bccState()
check('bcc · starts collapsed — the link shows, the row does not paint',
  bccBefore.linkPainted && !bccBefore.rowPainted, bccBefore)

await page.click('#wld-bcc')
await page.waitForTimeout(400)
const bccOpen = await bccState()
check('bcc · the click REVEALS the row and does not navigate away',
  bccOpen.rowPainted && !bccOpen.linkPainted && bccOpen.formMounted
  && bccOpen.hash === bccBefore.hash, bccOpen)

await page.click('#wld-bcc-remove')
await page.waitForTimeout(400)
const bccClosed = await bccState()
check('bcc · the remove control collapses it, form still mounted',
  !bccClosed.rowPainted && bccClosed.linkPainted && bccClosed.formMounted
  && bccClosed.hash === bccBefore.hash, bccClosed)

section('E · Reset')
await pick('wld-mode', 'single')
await pick('wld-probe', 'UDP Jitter')
for (const [id, v] of Object.entries({
  'wld-name': 'typed name', 'wld-isp': 'typed isp', 'wld-dip': '1.2.3.4',
  'wld-freq': '999', 'wld-optimeout': '111', 'wld-port': '222', 'wld-notify': 'a@b.c',
})) await typeInto(id, v)
await page.click('#wld-reset')
await page.waitForTimeout(400)
const afterReset = {
  name: await renderedInput('wld-name'),
  isp: await renderedInput('wld-isp'),
  dip: await renderedInput('wld-dip'),
  notify: await renderedInput('wld-notify'),
  freq: await renderedInput('wld-freq'),
  optimeout: await renderedInput('wld-optimeout'),
  port: await renderedInput('wld-port'),
  ...(await page.evaluate(() => ({
    monitor: document.getElementById('wld-monitor').getAttribute('value'),
    gatePainted: document.getElementById('wld-gate-msg').getBoundingClientRect().height > 0,
    errorPainted: document.getElementById('wld-error').getBoundingClientRect().height > 0,
  }))),
}
console.log('  afterReset:', JSON.stringify(afterReset))
await shot('wld-reset')
check('reset · typed text fields are cleared',
  [afterReset.name, afterReset.isp, afterReset.dip, afterReset.notify].every((v) => v === ''),
  afterReset)
check('reset · Frequency returns to its DEFAULT 60, not empty', afterReset.freq === '60', afterReset.freq)
check('reset · Operation Timeout returns to its DEFAULT 5000, not empty',
  afterReset.optimeout === '5000', afterReset.optimeout)
check('reset · UDP Port returns to its DEFAULT 5000, not empty', afterReset.port === '5000', afterReset.port)
check('reset · the monitor is cleared on an un-locked form', afterReset.monitor === '', afterReset.monitor)
check('reset · the "select a monitor" gate is painted again', afterReset.gatePainted)
check('reset · no error is showing after a Reset', !afterReset.errorPainted)

// Save and Run must not complain about the three fields the user never touched.
await pick('wld-monitor', 'm-nxos')
await pick('wld-probe', 'UDP Jitter')
await typeInto('wld-name', 'Probe · single run')
await typeInto('wld-isp', 'Airtel')
await typeInto('wld-dip', '8.8.8.8')
await page.click('#wld-run')
await page.waitForTimeout(500)
const afterRun = await page.evaluate(() => ({
  errorPainted: document.getElementById('wld-error')?.getBoundingClientRect().height > 0,
  errorText: document.getElementById('wld-error')?.textContent.trim() ?? '',
  onProgress: !!document.querySelector('.wld-progress'),
}))
check('reset · Save and Run does NOT error on the untouched default fields',
  !afterRun.errorPainted && afterRun.onProgress, afterRun)

// ═══════════════ F · the run, driven by the REAL timers ═══════════════
// Nothing here calls el.advanceAll(). This is the autoplay path the real page uses and no unit
// test covers.
section('F · progress panel on the real timer')
await page.click('#wld-prog-abort')
await page.waitForTimeout(400)
await page.click('#wld-create')
await page.waitForSelector('#wld-monitor')
await pick('wld-monitor', 'm-nxos')
await pick('wld-mode', 'csv')
await page.click('#wld-csv-sample')
await page.waitForTimeout(250)
await typeInto('wld-name', 'Probe · CSV run')
const tRun = Date.now()
await page.click('#wld-run')
await page.waitForSelector('.wld-progress')
const midRun = await page.evaluate(() => ({
  pct: document.getElementById('wld-prog-pct').textContent.trim(),
  total: document.getElementById('wld-prog-total').textContent.trim(),
  fillWidth: document.querySelector('.wld-progress__track i').getBoundingClientRect().width,
}))
check('run · the panel opens at 0% with the link count on Total',
  midRun.pct === '0%' && midRun.total === '3', midRun)
await shot('wld-progress-start')

// Settle on its own — no advanceAll, no synthetic clock.
await page.waitForFunction(
  () => document.getElementById('wld-prog-pct')?.textContent.trim() === '100%',
  null, { timeout: 30000 })
await page.waitForTimeout(400)
const elapsed = Date.now() - tRun
const run = await page.evaluate(() => {
  const cards = [...document.querySelectorAll('.wld-card')]
  const lines = cards.flatMap((c) => [...c.querySelectorAll('.wld-card__steps li')])
  const track = document.getElementById('wld-prog-bar')
  const fill = track.querySelector('i').getBoundingClientRect()
  return {
    pct: document.getElementById('wld-prog-pct').textContent.trim(),
    ariaNow: track.getAttribute('aria-valuenow'),
    total: Number(document.getElementById('wld-prog-total').textContent),
    ok: Number(document.getElementById('wld-prog-ok').textContent),
    failed: Number(document.getElementById('wld-prog-failed').textContent),
    cards: cards.length,
    lines: lines.length,
    // A pending line has neither class and still shows the ○ mark.
    pending: lines.filter((l) => !l.classList.contains('is-done') && !l.classList.contains('is-failed')).length,
    pendingMarks: lines.filter((l) => l.querySelector('.wld-card__mark')?.textContent.trim() === '○').length,
    nextEnabled: !document.getElementById('wld-prog-next').hasAttribute('disabled'),
    fillPct: Math.round((fill.width / track.getBoundingClientRect().width) * 100),
    lastLines: cards.map((c) => c.querySelector('li:last-child').textContent.replace(/\s+/g, ' ').trim()),
  }
})
console.log(`  run settled in ${elapsed}ms:`, JSON.stringify(run))
await shot('wld-progress-done')
const auditDone = await hiddenAudit()
console.log('  hidden audit (run complete):', JSON.stringify(auditDone))
check('hidden · audit found exactly the progress panel\'s toggled ids (run complete)',
  auditCoversExactly(auditDone, PROGRESS_IDS), Object.keys(auditDone))
check('run · the bar reaches 100% on the timer alone', run.pct === '100%' && run.ariaNow === '100', run.pct)
check('run · the bar is PAINTED full, not just labelled 100%', run.fillPct >= 99, `${run.fillPct}%`)
check('run · Discovered + Failed sums to the number of links',
  run.ok + run.failed === run.total, `${run.ok} + ${run.failed} === ${run.total}`)
check('run · one card per link', run.cards === run.total, run.cards)
check('run · every card resolved all four stage lines',
  run.lines === run.total * 4 && run.pending === 0 && run.pendingMarks === 0,
  { lines: run.lines, pending: run.pending, pendingMarks: run.pendingMarks })
check('run · the last line of each card is the success line',
  run.lastLines.every((l) => /First result received/.test(l)), run.lastLines)
check('run · View Discovered Objects becomes enabled', run.nextEnabled)
check('hidden · Abort is not painted once the run has settled',
  auditDone['wld-prog-abort'].hiddenProp && !auditDone['wld-prog-abort'].painted,
  auditDone['wld-prog-abort'])
check('hidden · nothing toggled off is painted (run complete)',
  paintedWhileHidden(auditDone).length === 0, paintedWhileHidden(auditDone))

// ═══════════════ G · the provision grid: badge and rename ═══════════════
section('G · provision grid')
await page.click('#wld-prog-next')
await page.waitForSelector('obs-table#wld-prov-table')
await page.waitForTimeout(600)
const grid = await page.evaluate(() => {
  const t = document.querySelector('obs-table#wld-prov-table')
  const rows = [...t.shadowRoot.querySelectorAll('tbody tr')]
  const nameCell = rows[0]?.querySelectorAll('td')[1]
  const badgeSpan = nameCell?.querySelector('span')
  return {
    rows: rows.length,
    // The badge has to be VISIBLE, not merely in the row data — it was headless once.
    firstName: badgeSpan?.textContent.trim() ?? null,
    badgePainted: badgeSpan ? badgeSpan.getBoundingClientRect().height > 0 : false,
    allBadged: rows.every((r) => /^[NPU] · /.test(r.querySelectorAll('td')[1]?.textContent.trim() ?? '')),
    pencils: t.shadowRoot.querySelectorAll('.edit-pencil').length,
    pencilPainted: (() => {
      const p = t.shadowRoot.querySelector('.edit-pencil')
      if (!p) return false
      const r = p.getBoundingClientRect()
      return r.width > 0 && r.height > 0
    })(),
    checkboxes: t.shadowRoot.querySelectorAll('tbody obs-checkbox').length,
    addDisabled: document.getElementById('wld-prov-add').hasAttribute('disabled'),
    legend: document.getElementById('wld-prov-legend').textContent.replace(/\s+/g, ' ').trim(),
    // An unknown icon name renders an EMPTY badge with no error (DS-GAPS G24), so check the glyph
    // actually drew rather than that the element exists.
    exportIconDrawn: (() => {
      const i = document.querySelector('obs-button#wld-prov-export obs-icon')
      return Boolean(i?.shadowRoot && /<svg|<path|<use/.test(i.shadowRoot.innerHTML))
    })(),
  }
})
console.log('  grid:', JSON.stringify(grid))
await shot('wld-provision')
check('grid · one row per verified link', grid.rows === 3, grid.rows)
check('grid · the N badge is rendered and painted in the NAME cell',
  grid.badgePainted && /^N · /.test(grid.firstName ?? '') && grid.allBadged, grid.firstName)
check('grid · a rename affordance (pencil) is rendered and painted per row',
  grid.pencils === grid.rows && grid.pencilPainted, `${grid.pencils} pencils`)
check('grid · the checkbox column is rendered', grid.checkboxes === grid.rows, grid.checkboxes)
check('grid · Add Selected Objects starts disabled', grid.addDisabled)
check('grid · the N/P/U legend is rendered', /N New/.test(grid.legend) && /U Unprovisioned/.test(grid.legend),
  grid.legend)
check('grid · the export icon draws a glyph, not an empty badge', grid.exportIconDrawn)

// Selection through the component's own checkbox must enable Add Selected Objects. This is the
// one path no unit test can reach: obs-table reflects `selected` back as a JSON STRING, and an
// `Array.isArray` guard on it left this button permanently disabled to the mouse (G41).
await page.locator('obs-table#wld-prov-table tbody obs-checkbox').first().click()
await page.waitForTimeout(400)
const afterSelect = await page.evaluate(() => {
  const t = document.querySelector('obs-table#wld-prov-table')
  return {
    addDisabled: document.getElementById('wld-prov-add').hasAttribute('disabled'),
    reflectedType: Array.isArray(t.selected) ? 'array' : typeof t.selected,
    reflected: t.selected,
    checkedInComponent: [...t.shadowRoot.querySelectorAll('tbody obs-checkbox')].filter((c) => c.checked).length,
  }
})
console.log('  afterSelect:', JSON.stringify(afterSelect))
await shot('wld-provision-selected')
check('grid · ticking a row through the component enables Add Selected Objects',
  !afterSelect.addDisabled && afterSelect.checkedInComponent === 1, afterSelect)

// A USER-driven rename: the component's own pencil, its own input typed into, its own Save link.
const before = grid.firstName
await page.locator('obs-table#wld-prov-table .edit-pencil').first().click()
await page.waitForTimeout(400)
const editing = await page.evaluate(() => {
  const row = document.querySelector('obs-table#wld-prov-table').shadowRoot.querySelector('tbody tr')
  return {
    inputs: row.querySelectorAll('obs-input.edit-input').length,
    actions: [...row.querySelectorAll('.edit-acts *')].map((b) => b.textContent.trim()),
    editorPainted: (() => {
      const i = row.querySelector('obs-input.edit-input')
      return i ? i.getBoundingClientRect().height > 0 : false
    })(),
  }
})
console.log('  editing row:', JSON.stringify(editing))
await shot('wld-provision-editing')
check('grid · the pencil opens a painted inline editor with Save/Cancel',
  editing.inputs === 1 && editing.editorPainted && editing.actions.includes('Save'), editing)

const editor = page.locator('obs-table#wld-prov-table obs-input.edit-input input').first()
await editor.fill('N · Renamed by the probe')
await page.locator('obs-table#wld-prov-table obs-link.edit-save').first().click()
await page.waitForTimeout(600)
const afterRename = await page.evaluate(() => {
  const t = document.querySelector('obs-table#wld-prov-table')
  const cell = t.shadowRoot.querySelector('tbody tr td:nth-of-type(2)')
  return {
    text: cell?.textContent.trim() ?? null,
    painted: cell ? cell.getBoundingClientRect().height > 0 : false,
    stillEditing: !!t.shadowRoot.querySelector('tbody tr obs-input.edit-input'),
    others: [...t.shadowRoot.querySelectorAll('tbody tr')].slice(1)
      .map((r) => r.querySelectorAll('td')[1].textContent.trim()),
  }
})
console.log('  rename:', JSON.stringify({ before, afterRename }))
await shot('wld-provision-renamed')
check('grid · a user-driven rename changes the DISPLAYED name, badge intact',
  afterRename.painted && !afterRename.stillEditing
  && afterRename.text === 'N · Renamed by the probe', { before, after: afterRename.text })
check('grid · the rename touches only its own row',
  afterRename.others.every((n) => /^N · /.test(n)) && !afterRename.others.some((n) => /Renamed/.test(n)),
  afterRename.others)
check('grid · the row stays selected across the rename',
  !(await page.evaluate(() => document.getElementById('wld-prov-add').hasAttribute('disabled'))))

// ═══════════════ H · the device deep link ═══════════════
section('H · deep link from the WAN Link screen')
// The Add WAN Link button that used to originate this deep link was removed from the WAN Link
// screen's template on request, so there is no in-app entry point left to click. The ROUTE is
// still live, and it is the route this section exists to prove: router.js must strip the query
// string off the screen segment, or the hash resolves against nothing and drops the user on the
// Settings module index. That fix has no other browser-level evidence, so drive it directly.
const href = '#/settings/wan-link-discovery?monitor=m-nxos'
await page.goto(WAN_LINK, { waitUntil: 'networkidle' })
await page.waitForTimeout(500)
check('deeplink · the Add WAN Link button is gone from the WAN Link screen',
  await page.evaluate(() => !document.getElementById('wan-link-add')))

await page.goto(`${ORIGIN}/${href}`, { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
const landed = await page.evaluate(() => ({
  hash: location.hash,
  onCreateForm: !!document.querySelector('.wld-form') && !!document.getElementById('wld-monitor'),
  inDrawer: !!document.querySelector('.pane-drawer__form .wld-form'),
  // The router bug this fixed: the hash resolved against nothing and dropped the user here.
  onModuleIndex: !!document.querySelector('.overview-card, .card-list a'),
  listPainted: (() => {
    const l = document.getElementById('wld-list')
    return l ? l.getBoundingClientRect().height > 0 : false
  })(),
}))
console.log('  landed:', JSON.stringify(landed))
check('deeplink · the hash keeps its query string', landed.hash === href, landed.hash)
check('deeplink · it lands on the discovery Create form', landed.onCreateForm, landed)
check('deeplink · NOT on the Settings module index', !landed.onModuleIndex)
// Same overlay rule as above: deep-linking opens the drawer OVER the list rather than instead of it,
// so the list being painted underneath is correct. The drawer being there is the real assertion.
check('deeplink · the Create drawer is what opened', landed.inDrawer, landed)

const locked = await page.evaluate(() => {
  const m = document.getElementById('wld-monitor')
  const sel = m.shadowRoot?.querySelector('.sel')
  return {
    value: m.getAttribute('value'),
    disabledAttr: m.hasAttribute('disabled'),
    // Disabled has to LOOK disabled, not just carry the attribute.
    drawnDisabled: sel?.classList.contains('disabled') ?? false,
    trigger: m.shadowRoot?.querySelector('.trig').textContent.replace(/\s+/g, ' ').trim(),
    vendor: document.getElementById('wld-vendor').getAttribute('value'),
    os: document.getElementById('wld-os').getAttribute('value'),
    gatedPainted: document.getElementById('wld-gated').getBoundingClientRect().height > 0,
  }
})
console.log('  locked:', JSON.stringify(locked))
await shot('wld-deeplink')
check('deeplink · the Monitor is pre-filled from the hash', locked.value === 'm-nxos', locked.value)
check('deeplink · the Monitor is disabled, and drawn as disabled',
  locked.disabledAttr && locked.drawnDisabled, locked)
check('deeplink · the trigger still shows the monitor\'s name',
  locked.trigger.includes('CORE-NX-01.test.com'), locked.trigger)
// The '· locked — opened from this device' hint was removed from the label on request, so
// nothing on the page explains the disabled Monitor any more. The lock itself is still asserted
// above (disabledAttr + drawnDisabled); only its explanation is gone.
check('deeplink · the cascade ran, so the form is already gated open',
  locked.vendor === 'Cisco Systems' && locked.os === 'nx-os' && locked.gatedPainted, locked)

await page.click('#wld-reset')
await page.waitForTimeout(500)
const lockedAfterReset = await page.evaluate(() => {
  const m = document.getElementById('wld-monitor')
  return {
    value: m.getAttribute('value'),
    disabledAttr: m.hasAttribute('disabled'),
    drawnDisabled: m.shadowRoot?.querySelector('.sel')?.classList.contains('disabled') ?? false,
    gatedPainted: document.getElementById('wld-gated').getBoundingClientRect().height > 0,
    cred: document.getElementById('wld-cred').getAttribute('value'),
  }
})
console.log('  lockedAfterReset:', JSON.stringify(lockedAfterReset))
await shot('wld-deeplink-reset')
check('deeplink · Reset keeps the monitor locked in',
  lockedAfterReset.value === 'm-nxos' && lockedAfterReset.disabledAttr
  && lockedAfterReset.drawnDisabled && lockedAfterReset.gatedPainted, lockedAfterReset)
check('deeplink · Reset re-derives the credential from the locked monitor',
  lockedAfterReset.cred === 'NXOS-SSH-Ops', lockedAfterReset.cred)

// ═══════════════ console ═══════════════
section('console')
check('no page errors and no console errors across the whole walkthrough',
  errors.length === 0, errors)

await browser.close()

const failed = checks.filter((c) => !c.ok)
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
if (failed.length) console.log('FAILED:\n  ' + failed.map((c) => c.name).join('\n  '))
process.exit(failed.length ? 1 : 0)
