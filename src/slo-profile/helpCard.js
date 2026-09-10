// The Create SLO Profile drawer's reference panel — column 3 of the 2 : 6 : 4 body.
//
// This is the Help Card `redundancy-slo/wireframe.html` artboard 2 designed, and the one
// createForm.js held a titled-but-empty slot for ("Deliberately empty rather than approximated").
// It is now called for, so it lands here: a live summary of the form, the worked five-day matrix,
// and the Strict-vs-Redundant comparison note.
//
// It is a TEACHING panel, not a preview — the five days are a fixed worked example, chosen by the
// designer so the comparison note reports a real number rather than a contrived one. Only the
// evaluation mode and the quorum move it.

/** The worked example. Fixed, so "recovered N percentage points" is a fact and not a coincidence. */
const DAYS = 5
const MEMBERS = [
  ['APP-1', [1, 1, 1, 1, 1]],
  ['APP-2', [1, 0, 1, 0, 0]],
  ['APP-3', [1, 1, 1, 0, 1]],
]

const pct = (n) => Math.round((n / DAYS) * 100)

const LEAD = 'An Availability SLO passes when the monitored components stay reachable for at least ' +
  'the <b>Target</b> percentage of the period. '

const escape = (v) => String(v).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]))

export function renderSloHelpCard(initial = {}) {
  const panel = document.createElement('aside')
  panel.className = 'pane-drawer__help-panel slo-help'

  const title = document.createElement('h3')
  title.className = 'pane-drawer__help-title'
  title.textContent = 'SLO Help card'
  panel.append(title)

  const lead = document.createElement('p')
  lead.className = 'slo-help__lead'

  const fields = document.createElement('table')
  fields.className = 'slo-help__fields'

  const exampleHeading = document.createElement('p')
  exampleHeading.className = 'slo-help__example-heading'
  exampleHeading.textContent = 'Worked example — 5 days'

  const matrix = document.createElement('table')
  matrix.className = 'slo-help__matrix'

  const note = document.createElement('div')
  note.className = 'slo-help__note'

  panel.append(lead, fields, exampleHeading, matrix, note)

  let state = {
    mode: 'redundant',
    quorum: 2,
    type: 'Availability',
    service: 'E-commerce Platform',
    source: '3 monitors',
    frequency: 'Daily',
    target: '99',
    warning: '99.5',
    ...initial,
  }

  function render() {
    const redundant = state.mode === 'redundant'
    const members = MEMBERS.length
    const quorum = Math.min(Math.max(Number(state.quorum) || members, 1), members)

    lead.innerHTML = LEAD + (redundant
      ? 'Under <b>Redundant</b>, the SLO counts as reachable while it holds its quorum — so a ' +
        'single member failing costs it nothing.'
      : 'Under <b>Strict</b>, every member must be up; one monitor down means the period is violated.')

    fields.innerHTML = `
      <tr><th>Field</th><th>Value</th></tr>
      <tr><td>SLO Type</td><td>${escape(state.type)}</td></tr>
      <tr><td>Business Service Name</td><td>${escape(state.service)}</td></tr>
      <tr><td>Source</td><td>${escape(state.source)}</td></tr>
      <tr><td>Frequency</td><td>${escape(state.frequency)}</td></tr>
      <tr><td>Target</td><td>${escape(state.target)}%</td></tr>
      <tr><td>Warning</td><td>${escape(state.warning)}%</td></tr>
      <tr><td>Evaluation Logic</td><td>${redundant ? 'Redundancy' : 'Strict'}</td></tr>
    `

    // Per day: how many members were up, and whether that clears the bar. Under Strict the bar is
    // every member, which is why the quorum row is dropped rather than shown as "3 of 3".
    const upPerDay = Array.from({ length: DAYS }, (_, d) =>
      MEMBERS.reduce((total, [, days]) => total + days[d], 0))
    const holds = upPerDay.map((up) => up >= quorum)
    const strict = upPerDay.map((up) => up === members)

    const okDays = redundant ? holds.filter(Boolean).length : strict.filter(Boolean).length
    const strictDays = strict.filter(Boolean).length

    let html = `<tr><th>Monitor</th>${
      Array.from({ length: DAYS }, (_, d) => `<th>Day ${d + 1}</th>`).join('')
    }<th>Status</th></tr>`

    if (redundant) {
      html += `<tr class="is-group"><td colspan="${DAYS + 2}">Members` +
        `<span class="slo-help__quorum"> quorum ≥ ${quorum} of ${members}</span></td></tr>`
    }

    for (const [name, days] of MEMBERS) {
      html += `<tr><td>${name}</td>${
        days.map((v) => `<td class="${v ? 'is-up' : 'is-down'}">${v ? 'Up' : 'Down'}</td>`).join('')
      }<td>${pct(days.reduce((a, b) => a + b, 0))}%</td></tr>`
    }

    if (redundant) {
      html += `<tr class="is-quorum"><td>quorum</td>${
        upPerDay.map((up, d) => `<td class="${holds[d] ? '' : 'is-down'}">${up}/${members}</td>`).join('')
      }<td></td></tr>`
    }

    const overall = redundant ? holds : strict
    html += `<tr class="is-overall"><td>Overall Status</td>${
      overall.map((v) => `<td class="${v ? 'is-up' : 'is-down'}">${v ? 'Ok' : 'Breach'}</td>`).join('')
    }<td>${pct(okDays)}%</td></tr>`

    // The counterfactual is the whole point of the panel, so it is drawn under Redundant too.
    if (redundant) {
      html += `<tr class="is-strict"><td>Strict would be</td>${
        strict.map((v) => `<td>${v ? 'Ok' : 'Breach'}</td>`).join('')
      }<td>${pct(strictDays)}%</td></tr>`
    }

    matrix.innerHTML = html

    note.innerHTML = redundant
      ? `Redundancy recovered <b>${pct(okDays) - pct(strictDays)} percentage points</b> — ` +
        `${pct(okDays)}% against ${pct(strictDays)}% under Strict. ` +
        'Same five days, same monitors, same outages.'
      : `Under Strict this SLO scores <b>${pct(strictDays)}%</b>. ` +
        'Switch to Redundant to see what the same five days are worth.'
  }

  render()

  panel.update = (next = {}) => {
    state = { ...state, ...next }
    render()
  }

  return panel
}
