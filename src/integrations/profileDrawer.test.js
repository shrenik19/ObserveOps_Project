import { describe, it, expect, beforeEach } from 'vitest'
import { renderProfileDrawer } from './profileDrawer.js'
import { SDP } from './catalogue.js'

// The body's field captions — not the footer's "* fields are mandatory" note, which reuses one.
const captions = (drawer) =>
  [...drawer.querySelectorAll('.integration-drawer .integration-field__label')].map((l) => l.firstChild.textContent)

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

  it('adds the SDP fields, in pairs, when SDP is picked', () => {
    drawer.selectType(SDP)
    const pairs = [...drawer.querySelectorAll('[data-role="type-section"] .integration-drawer__pair')]
      .map((row) => [...row.querySelectorAll('.integration-field__label')].map((l) => l.firstChild.textContent))
    expect(pairs).toEqual([
      ['Request Template', 'Impact'],
      ['Urgency', 'Priority'],
      ['Mode', 'Level'],
      ['Group', 'Technician'],
      ['Category', 'Subcategory'],
      ['Service Category', 'Item'],
    ])
  })

  it('calls SDP tickets requests, and requires Auto Close Ticket for it', () => {
    drawer.selectType(SDP)
    const labels = [...drawer.querySelectorAll('[data-role="type-section"] > .integration-field .integration-field__label')]
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

  it('pre-fills Request Template and the ticket templates', () => {
    drawer.selectType(SDP)
    expect(drawer.querySelector('[data-role="field-Request Template"]').getAttribute('value')).toBe('Default Request')
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

  it('creates with a trimmed name and the picked type', () => {
    drawer.querySelector('[data-role="profile-name"]').value = '  SDP P1  '
    drawer.selectType(SDP)
    drawer.querySelector('[data-role="create"]').click()
    expect(created).toEqual({ name: 'SDP P1', type: SDP, description: '' })
  })

  it('Reset clears the type and its fields', () => {
    drawer.selectType(SDP)
    drawer.querySelector('[data-role="reset"]').click()
    expect(drawer.querySelector('[data-role="type-section"]').children).toHaveLength(0)
  })
})
