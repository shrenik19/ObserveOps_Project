import { describe, it, expect, beforeEach } from 'vitest'
import { renderCreateForm } from './createForm.js'

describe('create slo profile form', () => {
  let host
  beforeEach(() => { host = document.createElement('div'); renderCreateForm(host, { onCancel() {} }) })

  it('labels every field with text a user can actually see', () => {
    const labels = [...host.querySelectorAll('.slo-form__grid label')].map((l) => l.textContent.trim().replace(/\s*\*$/, ''))
    for (const field of ['SLO Name', 'SLO Description', 'Business Service Name', 'SLO For',
      'Source Filter', 'Source', 'Frequency', 'Target', 'Warning', 'Start Date']) {
      expect(labels).toContain(field)
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
})
