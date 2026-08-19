// How often a LAMA profile sends data. Two mutually exclusive modes:
//
//   interval  every N minutes            — the original behaviour, and the default
//   times     at fixed times of day      — one or more clock times the user configures
//
// The mode switch is obs-radio with as-button, which is what a segmented control IS in this DS —
// the same pattern the Scope By control in this drawer already uses, so the form stays consistent.
//
// The time rows reuse fieldRepeater, so the (+)/(x) rule is identical to Custom Fields: a lone row
// shows (+) only; two or more show (x) on every row and (+) on the last.
//
// obs-date-time-picker note: `kind="field-time"` is flagged referenceOnly in elements-api.json but
// DOES work — verified by rendering: it opens an hour/minute spinner and emits
// `change` with `[{ time: "05:12 PM" }]`. What it will NOT do is accept a value programmatically
// (setting .value leaves the trigger blank), so the chosen time is tracked here rather than read
// back off the element. See docs/DS-GAPS.md, G28.

import { createFieldRepeater } from './fieldRepeater.js'

const DEFAULT_MINUTES = '5'
const MODES = ['interval', 'times']

/** DS events wrap their value in an array — unwrap, tolerating a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

function label(text) {
  const el = document.createElement('span')
  el.className = 'lama-drawer__field-label'
  el.textContent = text
  return el
}

export function renderScheduleSection() {
  const element = document.createElement('div')
  element.className = 'schedule'
  element.setAttribute('data-role', 'schedule-section')

  // --- Mode switch ------------------------------------------------------
  const freqWrap = document.createElement('div')
  freqWrap.className = 'lama-drawer__field'
  freqWrap.appendChild(label('Frequency'))

  const frequency = document.createElement('obs-radio')
  frequency.setAttribute('data-role', 'schedule-frequency')
  frequency.setAttribute('as-button', '')
  frequency.setAttribute('value', 'interval')
  frequency.options = [
    { value: 'interval', text: 'Every' },
    { value: 'times', text: 'At fixed times' },
  ]
  freqWrap.appendChild(frequency)
  element.appendChild(freqWrap)

  // --- Interval mode ----------------------------------------------------
  const intervalBlock = document.createElement('div')
  intervalBlock.setAttribute('data-role', 'interval-block')
  intervalBlock.className = 'lama-drawer__field'
  intervalBlock.appendChild(label('Data Interval'))

  const minutes = document.createElement('obs-input')
  minutes.setAttribute('data-role', 'lama-data-interval')
  minutes.setAttribute('value', DEFAULT_MINUTES)
  minutes.setAttribute('suffix', 'Minute(s)')
  minutes.setAttribute('block', '')
  minutes.addEventListener('input', (event) => {
    const next = String(detailValue(event) ?? '')
    minutes.setAttribute('value', next)
    if (next.trim()) minutes.removeAttribute('error')
  })
  intervalBlock.appendChild(minutes)
  element.appendChild(intervalBlock)

  // --- Fixed-times mode -------------------------------------------------
  const timesBlock = document.createElement('div')
  timesBlock.setAttribute('data-role', 'times-block')
  timesBlock.className = 'schedule__times'
  timesBlock.hidden = true
  timesBlock.appendChild(label('Send At'))

  const timesMount = document.createElement('div')
  timesMount.className = 'schedule__time-rows'
  timesBlock.appendChild(timesMount)

  const timesError = document.createElement('p')
  timesError.setAttribute('data-role', 'times-error')
  timesError.className = 'schedule__error'
  timesError.textContent = 'Choose at least one time.'
  timesError.hidden = true
  timesBlock.appendChild(timesError)

  element.appendChild(timesBlock)

  const times = createFieldRepeater({
    mount: timesMount,
    name: 'send-at',
    addLabel: 'Add time',
    removeLabel: 'Remove time',
    renderRow: () => {
      const row = document.createElement('div')
      row.setAttribute('data-role', 'send-at-row')
      row.className = 'schedule__time-row'

      const picker = document.createElement('obs-date-time-picker')
      picker.setAttribute('data-role', 'send-at-time')
      picker.setAttribute('kind', 'field-time')
      picker.setAttribute('placeholder', 'Select Time')
      picker.setAttribute('empty', '')
      row.appendChild(picker)

      // The picker cannot be read back, so hold the chosen time here.
      const state = { time: '' }
      picker.addEventListener('change', (event) => {
        const next = detailValue(event)
        state.time = String(next?.time ?? next ?? '')
        if (state.time) timesError.hidden = true
      })

      return { element: row, picker, state }
    },
  })

  let mode = 'interval'

  function applyMode(next) {
    if (!MODES.includes(next)) return
    mode = next
    frequency.setAttribute('value', next)
    intervalBlock.hidden = next !== 'interval'
    timesBlock.hidden = next !== 'times'

    // Seed the first row the first time the list is shown, not on every switch back.
    if (next === 'times' && times.count() === 0) times.addRow()
  }

  frequency.addEventListener('change', (event) => applyMode(String(detailValue(event) ?? '')))

  /** Chosen times, in order, without blanks or duplicates. */
  const chosenTimes = () => [
    ...new Set(times.rows().map((r) => r.state.time).filter(Boolean)),
  ]

  function value() {
    if (mode === 'times') return { mode, times: chosenTimes() }
    return { mode, minutes: Number(minutes.getAttribute('value')) }
  }

  function validate() {
    // Only the ACTIVE mode is validated — the hidden one must never block a submit.
    if (mode === 'interval') {
      const raw = (minutes.getAttribute('value') ?? '').trim()
      const n = Number(raw)
      const ok = raw !== '' && Number.isFinite(n) && n > 0
      if (ok) {
        minutes.removeAttribute('error')
      } else {
        minutes.setAttribute('error', '')
        minutes.setAttribute('error-message', 'Enter an interval greater than zero.')
      }
      return ok
    }

    const ok = chosenTimes().length > 0
    timesError.hidden = ok
    return ok
  }

  function reset() {
    minutes.setAttribute('value', DEFAULT_MINUTES)
    minutes.removeAttribute('error')
    for (const row of times.rows()) times.removeRow(row.id)
    timesMount.replaceChildren()
    timesError.hidden = true
    applyMode('interval')
  }

  return { element, value, validate, reset }
}
