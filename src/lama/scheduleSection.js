// How often a LAMA profile sends data. Two mutually exclusive modes, laid out on ONE row beside
// the mode switch so nothing drops below it:
//
//   At intervals    Data Interval = a number + a unit (Minutes / Hours)
//   At fixed times  At Time       = the clock times the sends happen at
//
// The mode switch is obs-radio with as-button, which is what a segmented control IS in this DS —
// the same pattern the Scope By control in this drawer already uses.
//
// The times field is a multi-select of five-minute slots rather than a repeating picker: the
// product shows a searchable checklist, and it keeps the whole mode on a single row.

const DEFAULT_EVERY = '5'
const MODES = ['interval', 'times']

const UNITS = [
  { value: 'minutes', text: 'Minute(s)' },
  { value: 'hours', text: 'Hour(s)' },
]

/** 00:00 → 23:55 in five-minute steps, matching the product's slot list. */
export function timeSlots(stepMinutes = 5) {
  const slots = []
  for (let m = 0; m < 24 * 60; m += stepMinutes) {
    const hh = String(Math.floor(m / 60)).padStart(2, '0')
    const mm = String(m % 60).padStart(2, '0')
    slots.push(`${hh}:${mm}`)
  }
  return slots
}

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

function field(labelText, control, role) {
  const wrap = document.createElement('div')
  wrap.className = 'lama-drawer__field'
  if (role) wrap.setAttribute('data-role', role)
  wrap.appendChild(label(labelText))
  wrap.appendChild(control)
  return wrap
}

function numberInput({ role, value = '' }) {
  const el = document.createElement('obs-input')
  el.setAttribute('data-role', role)
  el.setAttribute('block', '')
  el.setAttribute('value', value)
  el.addEventListener('input', (event) => {
    const next = String(detailValue(event) ?? '')
    el.setAttribute('value', next)
    if (next.trim()) el.removeAttribute('error')
  })
  return el
}

const readValue = (el) => (el.getAttribute('value') ?? '').trim()
const isPositive = (raw) => raw !== '' && Number.isFinite(Number(raw)) && Number(raw) > 0

function markInvalid(el, message) {
  el.setAttribute('error', '')
  el.setAttribute('error-message', message)
}

export function renderScheduleSection() {
  const element = document.createElement('div')
  element.className = 'schedule'
  element.setAttribute('data-role', 'schedule-section')

  // --- Mode switch ------------------------------------------------------
  const frequency = document.createElement('obs-radio')
  frequency.setAttribute('data-role', 'schedule-frequency')
  frequency.setAttribute('as-button', '')
  frequency.setAttribute('value', 'interval')
  frequency.options = [
    { value: 'interval', text: 'At intervals' },
    { value: 'times', text: 'At fixed times' },
  ]
  element.appendChild(field('Frequency', frequency))

  // --- At intervals: a number and a unit --------------------------------
  const intervalBlock = document.createElement('div')
  intervalBlock.setAttribute('data-role', 'interval-block')
  intervalBlock.className = 'lama-drawer__field schedule__interval'
  intervalBlock.appendChild(label('Data Interval'))

  const intervalControls = document.createElement('div')
  intervalControls.className = 'schedule__interval-controls'

  const every = numberInput({ role: 'lama-data-interval', value: DEFAULT_EVERY })
  intervalControls.appendChild(every)

  const unit = document.createElement('obs-select')
  unit.setAttribute('data-role', 'lama-data-interval-unit')
  unit.setAttribute('block', '')
  unit.setAttribute('placeholder', 'Unit')
  unit.dataset.pendingOptions = JSON.stringify(UNITS)
  let unitValue = 'minutes'
  unit.addEventListener('change', (event) => {
    const next = detailValue(event)
    if (next) unitValue = String(next)
  })
  intervalControls.appendChild(unit)

  intervalBlock.appendChild(intervalControls)
  element.appendChild(intervalBlock)

  // --- At fixed times: the clock slots -----------------------------------
  const atTime = document.createElement('obs-select')
  atTime.setAttribute('data-role', 'lama-at-time')
  atTime.setAttribute('multiple', '')
  atTime.setAttribute('allow-clear', '')
  atTime.setAttribute('block', '')
  atTime.setAttribute('placeholder', 'Select')
  atTime.dataset.pendingOptions = JSON.stringify(timeSlots().map((t) => ({ value: t, text: t })))
  let chosenTimes = []
  atTime.addEventListener('change', (event) => {
    const next = detailValue(event)
    chosenTimes = Array.isArray(next) ? next.map(String) : next ? [String(next)] : []
    if (chosenTimes.length) atTime.removeAttribute('error')
  })
  const atTimeBlock = field('At Time', atTime, 'at-time-block')
  atTimeBlock.hidden = true
  element.appendChild(atTimeBlock)

  let mode = 'interval'

  function applyMode(next) {
    if (!MODES.includes(next)) return
    mode = next
    frequency.setAttribute('value', next)
    element.dataset.mode = next

    intervalBlock.hidden = next !== 'interval'
    atTimeBlock.hidden = next !== 'times'
  }
  applyMode('interval')

  frequency.addEventListener('change', (event) => applyMode(String(detailValue(event) ?? '')))

  // An empty field reports null, not 0 — `every: 0` would read as "send every zero minutes"
  // rather than "not set yet".
  const numberOrNull = (raw) => (raw === '' || !Number.isFinite(Number(raw)) ? null : Number(raw))

  function value() {
    if (mode === 'times') {
      return { mode, times: [...chosenTimes] }
    }
    return { mode, every: numberOrNull(readValue(every)), unit: unitValue }
  }

  function validate() {
    // Only the ACTIVE mode is validated — the hidden one must never block a submit.
    if (mode === 'interval') {
      const ok = isPositive(readValue(every))
      if (ok) every.removeAttribute('error')
      else markInvalid(every, 'Enter an interval greater than zero.')
      return ok
    }

    const timesOk = chosenTimes.length > 0
    if (timesOk) atTime.removeAttribute('error')
    else atTime.setAttribute('error', '')

    return timesOk
  }

  function reset() {
    every.setAttribute('value', DEFAULT_EVERY)
    every.removeAttribute('error')
    atTime.removeAttribute('error')
    chosenTimes = []
    unitValue = 'minutes'
    if (typeof atTime.value !== 'undefined') atTime.value = []
    applyMode('interval')
  }

  /** Object-valued props must be assigned only AFTER the elements are in the document. */
  function upgrade() {
    for (const el of element.querySelectorAll('obs-select[data-pending-options]')) {
      el.options = JSON.parse(el.dataset.pendingOptions)
      delete el.dataset.pendingOptions
    }
    unit.value = 'minutes'
  }

  return { element, value, validate, reset, upgrade }
}
