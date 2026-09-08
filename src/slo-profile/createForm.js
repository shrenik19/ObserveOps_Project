// Artboard 2 — the shipped Create SLO Profile form (SLO_setup_2), field for field, with Evaluation
// Logic as the ONLY addition, full width between Start Date and Tags.

import { renderEvaluationLogic } from './evaluationLogic.js'

const SERVICES = ['E-commerce Platform', 'Network Core', 'Branch Connectivity', 'SLO FOR MAXIS', 'ABC']

/** obs-select has no `label` attribute — obs-input does, obs-select does not (see
 *  src/wan-link-discovery/createForm.js). Neither does obs-tags. So every field on this form draws
 *  its own external label, the same way, rather than mixing an internal obs-input label with bare
 *  unlabelled selects. */
const label = (id, text, { required = false } = {}) =>
  `<label class="slo-field__label" for="${id}">${text}${required ? '<span class="slo-field__req">*</span>' : ''}</label>`

export function renderCreateForm(host, { onCancel }) {
  host.innerHTML = `
    <div class="slo-form">
      <div class="slo-form__grid">
        <div data-field="name" class="slo-field">
          ${label('slo-name', 'SLO Name', { required: true })}
          <obs-input id="slo-name" required value="Checkout Availability"></obs-input>
        </div>
        <div data-field="description" class="slo-field">
          ${label('slo-description', 'SLO Description')}
          <obs-input id="slo-description" placeholder="Optional"></obs-input>
        </div>
        <div data-field="service" class="slo-field">
          ${label('slo-bs', 'Business Service Name', { required: true })}
          <obs-select id="slo-bs" required searchable
                      can-user-add-options add-label="Create Business Service"
                      value="E-commerce Platform"></obs-select>
        </div>
        <div data-field="for" class="slo-field">
          ${label('slo-for', 'SLO For', { required: true })}
          <obs-select id="slo-for" required value="Monitor"></obs-select>
        </div>
        <div data-field="filter" class="slo-field">
          ${label('slo-filter', 'Source Filter', { required: true })}
          <obs-select id="slo-filter" required value="Tag = platform:ecom"></obs-select>
        </div>
        <div data-field="source" class="slo-field">
          ${label('slo-source', 'Source', { required: true })}
          <obs-input id="slo-source" required readonly value="3 monitors selected"></obs-input>
        </div>
        <div data-field="frequency" class="slo-field">
          ${label('slo-frequency', 'Frequency', { required: true })}
          <obs-select id="slo-frequency" required value="Daily"></obs-select>
        </div>
        <div data-field="target" class="slo-field">
          ${label('slo-target', 'Target', { required: true })}
          <obs-input id="slo-target" required suffix="%" value="99"></obs-input>
        </div>
        <div data-field="warning" class="slo-field">
          ${label('slo-warning', 'Warning', { required: true })}
          <obs-input id="slo-warning" required suffix="%" value="99.5"></obs-input>
        </div>
        <div data-field="start" class="slo-field">
          ${label('slo-start', 'Start Date', { required: true })}
          <obs-input id="slo-start" required value="01-09-2026"></obs-input>
        </div>
        <div data-field="evaluation" class="slo-form__span" id="slo-evaluation"></div>
        <div data-field="tags" class="slo-field slo-form__span">
          ${label('slo-tags', 'Tags')}
          <obs-tags id="slo-tags" type="loose"></obs-tags>
        </div>
        <div data-field="notify" class="slo-field slo-form__span">
          ${label('slo-notify', 'Notify Team')}
          <obs-input id="slo-notify" placeholder="@User or Email or /Handle or #User Profile"></obs-input>
        </div>
      </div>
      <footer class="slo-form__actions">
        <span class="slo-form__note"><i class="ev__req">*</i> fields are mandatory</span>
        <obs-button id="slo-form-reset" variant="default">Reset</obs-button>
        <obs-button id="slo-form-create" variant="primary">Create SLO Profile</obs-button>
      </footer>
    </div>
  `

  host.querySelector('#slo-bs').options = SERVICES.map((s) => ({ value: s, text: s }))

  // Source says "3 monitors selected", so M is 3 and `of M` is derived, never typed.
  const { evaluation } = renderEvaluationLogic(host.querySelector('#slo-evaluation'), { members: 3 })

  host.querySelector('#slo-form-reset').addEventListener('click', () => renderCreateForm(host, { onCancel }))
  host.querySelector('#slo-form-create').addEventListener('click', onCancel)

  return { evaluation }
}
