import { describe, it, expect } from 'vitest'
import { renderConnectionForm } from './connectionForm.js'

describe('ME Service Desk Plus connection form', () => {
  it('makes URL Time Out a plain text field — no spinner, no unit suffix', () => {
    const timeout = renderConnectionForm().querySelector('[data-role="sdp-timeout"]')
    expect(timeout.getAttribute('type')).toBeNull()
    expect(timeout.hasAttribute('suffix')).toBe(false)
    expect(timeout.getAttribute('value')).toBe('60')
  })
})
