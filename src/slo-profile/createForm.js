// Artboard 2 — the shipped Create SLO Profile form (SLO_setup_2), field for field, with Evaluation
// Logic as the ONLY addition, full width between Start Date and Tags.

import { renderEvaluationLogic } from './evaluationLogic.js'

const SERVICES = ['E-commerce Platform', 'Network Core', 'Branch Connectivity', 'SLO FOR MAXIS', 'ABC']

export function renderCreateForm(host, { onCancel }) {
  host.innerHTML = `
    <div class="slo-form">
      <div class="slo-form__grid">
        <div data-field="name"><obs-input label="SLO Name" required value="Checkout Availability"></obs-input></div>
        <div data-field="description"><obs-input label="SLO Description" placeholder="Optional"></obs-input></div>
        <div data-field="service">
          <obs-select id="slo-bs" label="Business Service Name" required searchable
                      can-user-add-options add-label="Create Business Service"
                      value="E-commerce Platform"></obs-select>
        </div>
        <div data-field="for"><obs-select label="SLO For" required value="Monitor"></obs-select></div>
        <div data-field="filter"><obs-select label="Source Filter" required value="Tag = platform:ecom"></obs-select></div>
        <div data-field="source"><obs-input label="Source" required readonly value="3 monitors selected"></obs-input></div>
        <div data-field="frequency"><obs-select label="Frequency" required value="Daily"></obs-select></div>
        <div data-field="target"><obs-input label="Target" required suffix="%" value="99"></obs-input></div>
        <div data-field="warning"><obs-input label="Warning" required suffix="%" value="99.5"></obs-input></div>
        <div data-field="start"><obs-input label="Start Date" required value="01-09-2026"></obs-input></div>
        <div data-field="evaluation" class="slo-form__span" id="slo-evaluation"></div>
        <div data-field="tags" class="slo-form__span"><obs-tags label="Tags" type="loose"></obs-tags></div>
        <div data-field="notify" class="slo-form__span">
          <obs-input label="Notify Team" placeholder="@User or Email or /Handle or #User Profile"></obs-input>
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

  host.querySelector('#slo-form-reset').addEventListener('click', onCancel)
  host.querySelector('#slo-form-create').addEventListener('click', onCancel)

  return { evaluation }
}
