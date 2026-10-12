import { describe, it, expect, beforeEach } from 'vitest'
import { renderProfileDrawer } from './profileDrawer.js'
import { SDP } from './catalogue.js'

// The body's field captions — not the footer's "* fields are mandatory" note, which reuses one.
const captions = (drawer) =>
  [...drawer.querySelectorAll('.integration-drawer .integration-field__label')].map((l) => l.firstChild.textContent)

// The template's selects, row by row.
const pairs = (drawer) =>
  [...drawer.querySelectorAll('[data-role="template-section"] .integration-drawer__pair')]
    .map((row) => [...row.querySelectorAll('.integration-field__label')].map((l) => l.firstChild.textContent))

describe('create integration profile drawer', () => {
  let drawer
  let created
  beforeEach(() => {
    document.body.replaceChildren()
    created = null
    drawer = renderProfileDrawer({ isTaken: (n) => n.toLowerCase() === 'taken', onCreate: (d) => { created = d } })
    document.body.append(drawer)
  })

  it('starts with the three common fields', () => {
    expect(captions(drawer)).toEqual(['Profile Name', 'Integration Type', 'Description'])
  })

  it('adds only Request Template, alone on its row and unset, when SDP is picked', () => {
    drawer.selectType(SDP)
    expect(captions(drawer)).toEqual(['Profile Name', 'Integration Type', 'Description', 'Request Template'])
    const template = drawer.querySelector('[data-role="field-Request Template"]')
    expect(template.closest('.integration-drawer__pair').children).toHaveLength(1)
    expect(template.hasAttribute('value')).toBe(false)
  })

  it('marks Request Template required, with a hint', () => {
    drawer.selectType(SDP)
    const label = [...drawer.querySelectorAll('.integration-field__label')].find((l) => l.firstChild.textContent === 'Request Template')
    expect(label.querySelector('.integration-field__required')).not.toBeNull()
    expect(label.querySelector('obs-tooltip')).not.toBeNull()
  })

  it('reveals the Network Outage fields, packed two per row', () => {
    drawer.selectType(SDP)
    drawer.selectTemplate('Network Outage')
    expect(pairs(drawer)).toEqual([
      ['Impact', 'Urgency'],
      ['Priority', 'Group'],
      ['Technician', 'Category'],
      ['Subcategory'],
    ])
  })

  it('reveals every field for Default Request, and none of them is Mode', () => {
    drawer.selectType(SDP)
    drawer.selectTemplate('Default Request')
    expect(pairs(drawer)).toEqual([
      ['Impact', 'Urgency'],
      ['Priority', 'Level'],
      ['Group', 'Technician'],
      ['Category', 'Subcategory'],
      ['Service Category', 'Item'],
    ])
  })

  it('swaps the fields when the template changes', () => {
    drawer.selectType(SDP)
    drawer.selectTemplate('Default Request')
    drawer.selectTemplate('Report an Incident')
    expect(captions(drawer)).not.toContain('Service Category')
    expect(captions(drawer).filter((c) => c === 'Impact')).toHaveLength(1)
  })

  it('calls SDP tickets requests, and requires Auto Close Ticket for it — once a template is picked', () => {
    drawer.selectType(SDP)
    expect(captions(drawer)).not.toContain('Auto Close Ticket')
    drawer.selectTemplate('Report an Incident')
    const labels = [...drawer.querySelectorAll('[data-role="template-section"] > .integration-field .integration-field__label')]
    expect(labels.map((l) => l.firstChild.textContent)).toEqual(['Auto Close Ticket', 'Request Subject', 'Request Description'])
    expect(labels.every((l) => l.querySelector('.integration-field__required'))).toBe(true)
  })

  it('keeps ServiceNow on incidents, with Auto Close Ticket optional', () => {
    drawer.selectType('ServiceNow')
    const autoClose = [...drawer.querySelectorAll('.integration-field__label')].find((l) => l.firstChild.textContent === 'Auto Close Ticket')
    expect(autoClose.querySelector('.integration-field__required')).toBeNull()
    expect(captions(drawer)).toContain('Incident Subject')
  })

  it('adds nothing for a type with no ticket fields', () => {
    drawer.selectType('Slack')
    expect(drawer.querySelector('[data-role="type-section"]').children).toHaveLength(0)
  })

  it('pre-fills the ticket templates', () => {
    drawer.selectType(SDP)
    drawer.selectTemplate('Default Request')
    expect(drawer.querySelector('[data-role="ticket-subject"]').getAttribute('value')).toMatch(/\$\$\$object\.name\$\$\$/)
  })

  it('refuses a missing name and type, marking both at once', () => {
    expect(drawer.validate()).toBeNull()
    expect(drawer.querySelector('[data-role="profile-name"]').hasAttribute('error')).toBe(true)
    expect(drawer.querySelector('.integration-field__error').textContent).toBe('Select an Integration Type')
  })

  it('refuses a taken name', () => {
    drawer.querySelector('[data-role="profile-name"]').value = ' TAKEN '
    drawer.selectType(SDP)
    expect(drawer.validate()).toBeNull()
    expect(drawer.querySelector('[data-role="profile-name"]').getAttribute('error-message')).toMatch(/already exists/)
  })

  it('refuses SDP without a Request Template', () => {
    drawer.querySelector('[data-role="profile-name"]').value = 'SDP P1'
    drawer.selectType(SDP)
    expect(drawer.validate()).toBeNull()
    expect(drawer.querySelector('.integration-field__error').textContent).toBe('Select a Request Template')
  })

  it('clears the Request Template error once a template is picked', () => {
    drawer.selectType(SDP)
    drawer.validate()
    drawer.selectTemplate('Default Request')
    const template = drawer.querySelector('[data-role="field-Request Template"]')
    expect(template.hasAttribute('data-invalid')).toBe(false)
    expect(drawer.querySelector('.integration-field__error')).toBeNull()
  })

  it('creates with a trimmed name, the picked type and its template', () => {
    drawer.querySelector('[data-role="profile-name"]').value = '  SDP P1  '
    drawer.selectType(SDP)
    drawer.selectTemplate('Network Outage')
    drawer.querySelector('[data-role="create"]').click()
    expect(created).toEqual({ name: 'SDP P1', type: SDP, description: '', template: 'Network Outage' })
  })

  it('creates a ServiceNow profile without a template', () => {
    drawer.querySelector('[data-role="profile-name"]').value = 'SN'
    drawer.selectType('ServiceNow')
    drawer.querySelector('[data-role="create"]').click()
    expect(created).toEqual({ name: 'SN', type: 'ServiceNow', description: '' })
  })

  it('Reset clears the type, the template and their fields', () => {
    drawer.selectType(SDP)
    drawer.selectTemplate('Default Request')
    drawer.querySelector('[data-role="reset"]').click()
    expect(drawer.querySelector('[data-role="type-section"]').children).toHaveLength(0)
  })
})
