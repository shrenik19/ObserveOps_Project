import { describe, it, expect, beforeEach } from 'vitest'
import { renderCreateForm } from './createForm.js'

describe('create slo profile form', () => {
  let host
  beforeEach(() => { host = document.createElement('div'); renderCreateForm(host, { onCancel() {} }) })

  it('labels every field with text a user can actually see', () => {
    const labelEls = [...host.querySelectorAll('.slo-form__grid label')]
    const labels = labelEls.map((l) => l.textContent.trim().replace(/\s*\*$/, ''))
    // Pinned at twelve, not merely "contains these ten": a check that only asserts membership
    // stays green even if labels are missing entirely, which is exactly the bug this pins against.
    expect(labelEls).toHaveLength(12)
    for (const field of ['SLO Name', 'SLO Description', 'Business Service Name', 'SLO For',
      'Source Filter', 'Source', 'Frequency', 'Target', 'Warning', 'Start Date', 'Tags', 'Notify Team']) {
      expect(labels).toContain(field)
    }
  })

  it('points every label at a control that actually exists', () => {
    const labelEls = [...host.querySelectorAll('.slo-form__grid label')]
    for (const label of labelEls) {
      const forId = label.getAttribute('for')
      expect(forId).toBeTruthy()
      expect(host.querySelector(`#${forId}`)).not.toBeNull()
    }
  })

  // BS_Setup: the business service is an entity, picked and creatable, not typed.
  it('makes Business Service Name a searchable picker that can add a value', () => {
    const bs = host.querySelector('#slo-bs')
    expect(bs.tagName.toLowerCase()).toBe('obs-select')
    expect(bs.hasAttribute('searchable')).toBe(true)
    expect(bs.hasAttribute('can-user-add-options')).toBe(true)
    expect(bs.getAttribute('add-label')).toBe('Create Business Service')
  })

  it('places Evaluation Logic between Start Date and Tags', () => {
    const fields = [...host.querySelectorAll('[data-field]')].map((e) => e.dataset.field)
    expect(fields.indexOf('evaluation')).toBe(fields.indexOf('start') + 1)
    expect(fields.indexOf('tags')).toBe(fields.indexOf('evaluation') + 1)
  })

  it('mounts the Option G control', () => {
    expect(host.querySelectorAll('.ev-row')).toHaveLength(2)
  })

  // Reserved, not built: the designer asked for the slot and its title only, and will say when
  // the full Help Card (artboard 2's worked matrix) should land in it.
  it('reserves a titled Help Card beside the form', () => {
    const help = host.querySelector('.slo-create__help')
    expect(help).not.toBeNull()
    expect(help.querySelector('.slo-create__help-title').textContent.trim()).toBe('SLO Help card')
    expect(help.querySelector('.slo-create__help-body').textContent.trim()).toBe('')
  })

  it('offers Reset and Create', () => {
    expect(host.querySelector('#slo-form-create').textContent).toContain('Create SLO Profile')
    expect(host.querySelector('#slo-form-reset')).not.toBeNull()
  })

  it('Reset restores the form without leaving it', () => {
    const input = host.querySelector('#ev-quorum')
    input.value = '1'
    input.dispatchEvent(new Event('change', { bubbles: true }))
    expect(host.querySelector('#ev-quorum').getAttribute('value')).toBe('1')

    host.querySelector('#slo-form-reset').click()
    expect(host.querySelector('#ev-quorum').getAttribute('value')).toBe('2')
    expect(host.querySelector('.ev-row')).not.toBeNull()   // still on the form
  })

  // Spec §8: "The Create form creates." Clicking Create must hand the caller a draft carrying the
  // form's own current values, not silently discard them (see slo-profile/screen.js's onCreate).
  it('Create calls onCreate with the values the form holds', () => {
    let draft = null
    const h = document.createElement('div')
    renderCreateForm(h, { onCancel() {}, onCreate: (d) => { draft = d } })

    h.querySelector('#slo-form-create').click()

    expect(draft).toEqual({
      name: 'Checkout Availability',
      service: 'E-commerce Platform',
      frequency: 'Daily',
      target: '99',
      warning: '99.5',
      start: '01-09-2026',
      evaluation: 'Redundancy',
    })
  })

  it('Create reports Strict when Strict is selected', () => {
    let draft = null
    const h = document.createElement('div')
    renderCreateForm(h, { onCancel() {}, onCreate: (d) => { draft = d } })

    h.querySelector('[data-mode="strict"]').click()
    h.querySelector('#slo-form-create').click()

    expect(draft.evaluation).toBe('Strict')
  })
})
