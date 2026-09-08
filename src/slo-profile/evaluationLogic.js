// Option G: two selectable rows, each stating what it tolerates, the selected one expanding to its
// rule and — under Redundant — its quorum.
//
// THIS IS THE ONE INVENTED CONTROL IN THIS APP, and it is deliberate. obs-radio renders the choice
// and nothing else: its shadow root has no <slot>, so a light-DOM child placed inside it is present
// and unpainted. Rather than downgrade the design to fit the component, the design is built and
// handed to the DS team as G45 — a working reference implementation instead of a description.
// Everything inside the row that the DS DOES have is the DS's: obs-input for the quorum,
// obs-tooltip for the sentence. Colour is tokens only.

import { createEvaluation } from './evaluation.js'

const MODES = [
  { mode: 'strict', label: 'Strict' },
  { mode: 'redundant', label: 'Redundant' },
]

export function renderEvaluationLogic(host, { members }) {
  const evaluation = createEvaluation({ members })

  host.innerHTML = `
    <div class="ev">
      <div class="ev__label">Evaluation Logic <i class="ev__req">*</i></div>
      <p class="ev__lead" id="ev-lead"></p>
      <div class="ev__rows" role="radiogroup" aria-label="Evaluation Logic">
        ${MODES.map(({ mode, label }) => `
          <div class="ev-row" data-mode="${mode}" role="radio" tabindex="0" aria-checked="false">
            <div class="ev-row__top">
              <span class="ev-row__dot" aria-hidden="true"></span>
              <span class="ev-row__name">${label}</span>
              <span class="ev-row__meta"></span>
              <obs-tooltip placement="top-end"></obs-tooltip>
            </div>
            <div class="ev-row__body" hidden>
              <p class="ev-row__rule"></p>
              ${mode === 'redundant' ? `
                <obs-input id="ev-quorum" type="number" value="2"
                           addon-before="at least" addon-after=""></obs-input>` : ''}
            </div>
          </div>`).join('')}
      </div>
    </div>
  `

  const row = (mode) => host.querySelector(`[data-mode="${mode}"]`)
  const quorumInput = host.querySelector('#ev-quorum')

  const render = () => {
    host.querySelector('#ev-lead').textContent = evaluation.lead()

    for (const { mode } of MODES) {
      const el = row(mode)
      const on = evaluation.mode === mode
      el.classList.toggle('is-on', on)
      el.setAttribute('aria-checked', String(on))
      el.querySelector('.ev-row__body').hidden = !on
      el.querySelector('.ev-row__meta').textContent = evaluation.meta(mode)
      el.querySelector('.ev-row__rule').textContent = evaluation.rule(mode)
      el.querySelector('obs-tooltip').textContent = evaluation.sentence(mode)
    }

    quorumInput.setAttribute('value', String(evaluation.quorum))
    quorumInput.setAttribute('addon-after', `of ${members} must stay up`)
  }

  const pick = (mode) => { evaluation.setMode(mode); render() }

  for (const { mode } of MODES) {
    row(mode).addEventListener('click', (e) => {
      // The quorum input lives inside the Redundant row; typing in it must not re-pick the row.
      if (e.target.closest('#ev-quorum')) return
      pick(mode)
    })
    row(mode).addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); pick(mode) }
    })
  }

  // The clamp lives in evaluation.js, not in the input: `min`/`max` on a number field is a hint a
  // user can type past, and N = M must be unreachable rather than merely discouraged.
  quorumInput.addEventListener('change', (e) => {
    evaluation.setQuorum(Number(e.target.value))
    render()
  })

  render()
  return { evaluation }
}
