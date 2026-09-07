// src/wan-link-discovery/progressPanel.js
// The run view. Same furniture as device discovery — title, progress bar, Total/Discovered/Failed
// tiles, Search, Abort — but the card narrates FOUR stages rather than one line, because a WAN link
// push fails differently at each one.
//
// Search is rendered as inert chrome: present and correctly placed, doing nothing, the same
// treatment this app already gives product chrome it has not implemented (the Monitors category
// bar and the unimplemented export buttons in src/wan-link/screen.js).
//
// No <obs-progress> element exists in this DS (checked elements-api.json — zero element tags match
// /progress/i). The bar below is plain markup styled from --progress-bg (track) and --primary-color
// (fill), both confirmed emitted in dist/observeops-ds.css. See docs/DS-GAPS.md G38.

import { planRun } from './runner.js'

const STEP_MS = 850
const STAGGER_MS = 500

export function renderProgressPanel({
  profileName, monitor, osKey, links, outcome = 'ok',
  autoplay = true, onDone = () => {}, onCancel = () => {},
}) {
  const el = document.createElement('section')
  el.className = 'wld-progress'
  el.innerHTML = `
    <header class="wld-progress__head">
      <h2 id="wld-prog-title"></h2>
      <span class="wld-form__spacer"></span>
      <div class="wld-progress__bar">
        <span>Discovery Progress</span>
        <div class="wld-progress__track" id="wld-prog-bar" role="progressbar"
             aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
          <i></i>
        </div>
        <span id="wld-prog-pct">0%</span>
      </div>
    </header>
    <div class="wld-progress__tiles">
      <div class="wld-tile is-selected"><span>Total Objects</span><b id="wld-prog-total">0</b></div>
      <div class="wld-tile"><span>Discovered Objects</span><b id="wld-prog-ok">0</b></div>
      <div class="wld-tile"><span>Failed Objects</span><b id="wld-prog-failed">0</b></div>
      <span class="wld-form__spacer"></span>
      <!-- Spec furniture, present but inert — same treatment as the Monitors category bar and its
           unimplemented export buttons in src/wan-link/screen.js. No filtering is wired here. -->
      <obs-input id="wld-prog-search" type="search" placeholder="Search" class="content-toolbar__search"></obs-input>
      <obs-button id="wld-prog-abort" variant="neutral-lightest">Abort</obs-button>
    </div>
    <div class="wld-progress__cards" id="wld-prog-cards"></div>
    <footer class="wld-form__footer">
      <span class="wld-progress__failnote" id="wld-prog-failnote" hidden>
        Nothing was created — there is nothing to provision. The profile never provisioned, so it
        stays editable and re-runnable from the list.
      </span>
      <span class="wld-form__spacer"></span>
      <obs-button id="wld-prog-next" variant="primary" disabled>View Discovered Objects</obs-button>
    </footer>
  `

  const $ = (id) => el.querySelector(`#${id}`)
  $('wld-prog-title').textContent = profileName
  $('wld-prog-total').textContent = String(links.length)

  const cards = $('wld-prog-cards')
  const results = []
  let ok = 0
  let failed = 0
  let settled = 0

  const runners = links.map((link, index) => {
    // Single: the only link fails. Bulk: one row fails, so mixed results stay visible.
    const failing = outcome !== 'ok' && (links.length === 1 || index === 1)
    const plan = planRun({ monitor, osKey, outcome: failing ? outcome : 'ok', index })

    const card = document.createElement('article')
    card.className = 'wld-card'
    card.innerHTML = `
      <div class="wld-card__head"></div>
      <ol class="wld-card__steps">
        ${plan.stages.map((s) => `<li><span class="wld-card__mark">○</span><span>${s}</span></li>`).join('')}
      </ol>
    `
    // link.isp / link.dip are user-typed (Single form) or come straight from a CSV file — never
    // interpolated into innerHTML. Same treatment as $('wld-prog-title').textContent above.
    card.querySelector('.wld-card__head').textContent = `${link.isp} → ${link.dip}`
    cards.appendChild(card)
    const items = [...card.querySelectorAll('li')]

    let step = 0
    const settle = (isOk) => {
      results[index] = { link, ok: isOk }
      if (isOk) ok += 1
      else failed += 1
      settled += 1
      $('wld-prog-ok').textContent = String(ok)
      $('wld-prog-failed').textContent = String(failed)
      const pct = Math.round((settled / links.length) * 100)
      const bar = $('wld-prog-bar')
      bar.setAttribute('aria-valuenow', String(pct))
      bar.querySelector('i').style.width = `${pct}%`
      $('wld-prog-pct').textContent = `${pct}%`
      if (settled !== links.length) return
      $('wld-prog-abort').hidden = true
      if (ok > 0) $('wld-prog-next').removeAttribute('disabled')
      $('wld-prog-failnote').hidden = ok > 0
      onDone(results)
    }

    return function advance() {
      if (step >= plan.stages.length) return false
      const item = items[step]
      if (step === plan.failIndex) {
        item.className = 'is-failed'
        item.innerHTML = `<span class="wld-card__mark">✕</span><span>${plan.failText}</span>`
        step = plan.stages.length
        settle(false)
        return false
      }
      item.className = 'is-done'
      const label = step === plan.stages.length - 1 ? plan.successText : plan.stages[step]
      item.innerHTML = `<span class="wld-card__mark">✓</span><span>${label}</span>`
      step += 1
      if (step === plan.stages.length) {
        settle(true)
        return false
      }
      return true
    }
  })

  /** Deterministic driver — tests use this instead of timers. */
  el.advanceAll = () => {
    let moving = true
    while (moving) moving = runners.map((run) => run()).some(Boolean)
  }
  el.results = results

  const timers = []
  if (autoplay) {
    runners.forEach((run, index) => {
      const tick = () => {
        if (run()) timers.push(setTimeout(tick, STEP_MS))
      }
      timers.push(setTimeout(tick, 400 + index * STAGGER_MS))
    })
  }

  el.stop = () => timers.forEach(clearTimeout)
  $('wld-prog-abort').addEventListener('click', () => { el.stop(); onCancel() })
  $('wld-prog-next').addEventListener('click', () => el.dispatchEvent(new CustomEvent('provision')))

  return el
}
