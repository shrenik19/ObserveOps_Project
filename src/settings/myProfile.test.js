import { describe, it, expect, beforeEach } from 'vitest'
import { mount, validate, initials, SEEDED } from './myProfile.js'

const valid = {
  ...SEEDED, email: 'admin@motadata.com', changePassword: false,
  currentPassword: '', newPassword: '', confirmPassword: '',
}

describe('validate', () => {
  it('passes the seeded profile once it has an email', () => {
    expect(validate(valid)).toEqual({})
  })

  it('requires first name, last name and email', () => {
    expect(Object.keys(validate({ ...valid, firstName: ' ', lastName: '', email: '' })))
      .toEqual(['firstName', 'lastName', 'email'])
  })

  it('rejects a malformed email or mobile number', () => {
    expect(validate({ ...valid, email: 'admin@' }).email).toBe('Enter a valid email address')
    expect(validate({ ...valid, mobile: 'call me' }).mobile).toBe('Enter a valid mobile number')
    expect(validate({ ...valid, mobile: '+91 98765 43210' })).toEqual({})
  })

  it('checks the password fields only when Change Password is on', () => {
    expect(validate({ ...valid, newPassword: 'x' })).toEqual({})
    const on = { ...valid, changePassword: true }
    expect(Object.keys(validate(on))).toEqual(['currentPassword', 'newPassword', 'confirmPassword'])
    expect(validate({ ...on, currentPassword: 'a', newPassword: 'short', confirmPassword: 'short' }).newPassword)
      .toBe('Use at least 8 characters')
    expect(validate({ ...on, currentPassword: 'a', newPassword: 'longenough', confirmPassword: 'different' }).confirmPassword)
      .toBe('Passwords do not match')
  })
})

describe('initials', () => {
  it('takes the first letter of each name', () => {
    expect(initials('motadata', 'admin')).toBe('MA')
    expect(initials('', '')).toBe('?')
  })
})

describe('the My Profile form', () => {
  let root
  const $ = (role) => root.querySelector(`[data-role="${role}"]`)
  const type = (role, value) => { $(role).value = value }
  const toggle = (on) => $('changePassword').dispatchEvent(new CustomEvent('change', { detail: [on] }))

  beforeEach(() => {
    root = document.createElement('div')
    mount(root)
  })

  it("renders the screenshot's fields, seeded, with User Name read-only", () => {
    expect($('firstName').value).toBe('motadata')
    expect($('lastName').value).toBe('admin')
    expect($('userName').value).toBe('admin')
    expect($('userName').hasAttribute('disabled')).toBe(true)
    expect($('avatar').textContent).toBe('MA')
    expect([...root.querySelectorAll('.my-profile__required')]).toHaveLength(7)
  })

  it('hides the password fields until Change Password is on', () => {
    expect($('passwords').hidden).toBe(true)
    toggle(true)
    expect($('passwords').hidden).toBe(false)
    toggle(false)
    expect($('passwords').hidden).toBe(true)
  })

  it('refuses to update without an email, marking the field', () => {
    $('update').click()
    expect($('email').hasAttribute('error')).toBe(true)
    expect($('email').getAttribute('error-message')).toBe('Email Address is required')
    expect($('status').querySelector('obs-banner').getAttribute('variant')).toBe('error')
  })

  it('updates the profile and repaints the initials', () => {
    type('firstName', 'Shrenik')
    type('lastName', 'Dalal')
    type('email', 'shrenik@example.com')
    $('update').click()
    expect($('status').querySelector('obs-banner').getAttribute('variant')).toBe('success')
    expect($('avatar').textContent).toBe('SD')
  })

  it('updates the password, then closes and empties its fields', () => {
    type('email', 'admin@motadata.com')
    toggle(true)
    type('currentPassword', 'old-secret')
    type('newPassword', 'new-secret-1')
    type('confirmPassword', 'new-secret-1')
    $('update').click()
    expect($('status').textContent).toContain('password')
    expect($('passwords').hidden).toBe(true)
    expect($('newPassword').value).toBe('')
  })

  it('Reset returns to the last saved values', () => {
    type('email', 'admin@motadata.com')
    $('update').click()
    type('firstName', 'changed')
    toggle(true)
    $('reset').click()
    expect($('firstName').value).toBe('motadata')
    expect($('email').value).toBe('admin@motadata.com')
    expect($('passwords').hidden).toBe(true)
    expect($('status').children).toHaveLength(0)
  })
})
