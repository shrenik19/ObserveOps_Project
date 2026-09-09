import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from './screen.js'

describe('slo profile screen', () => {
  let root
  beforeEach(() => { root = document.createElement('div'); document.body.append(root); mount(root) })

  it('renders the profile table', () => {
    expect(root.querySelector('#slo-profile-table')).not.toBeNull()
    expect(root.querySelector('#slo-profile-table').rows).toHaveLength(5)
  })

  it('leads with SLO Type and puts Evaluation Logic beside Frequency', () => {
    const titles = root.querySelector('#slo-profile-table').columns.map((c) => c.title)
    expect(titles[0]).toBe('SLO TYPE')
    expect(titles[titles.indexOf('FREQUENCY') + 1]).toBe('EVALUATION LOGIC')
  })

  it('keeps Warning before Target, as shipped', () => {
    const titles = root.querySelector('#slo-profile-table').columns.map((c) => c.title)
    expect(titles.indexOf('WARNING')).toBeLessThan(titles.indexOf('TARGET'))
  })

  // G1: obs-table cannot host a component in a cell. The column does not need one.
  it('renders Evaluation Logic as plain text', () => {
    const values = root.querySelector('#slo-profile-table').rows.map((r) => r.evaluation)
    expect(values.every((v) => !/[<>]/.test(v))).toBe(true)
    expect(new Set(values)).toEqual(new Set(['Redundancy', 'Strict', '—']))
  })

  it('offers Create SLO Profile', () => {
    expect(root.querySelector('#slo-profile-create')).not.toBeNull()
  })
})

describe('the two views', () => {
  let root
  beforeEach(() => { root = document.createElement('div'); document.body.append(root); mount(root) })

  it('starts on the table', () => {
    expect(root.querySelector('#slo-profile-list').hidden).toBe(false)
    expect(root.querySelector('#slo-profile-form').hidden).toBe(true)
  })

  it('opens the Create form without changing route', () => {
    const before = window.location.hash
    root.querySelector('#slo-profile-create').click()
    expect(root.querySelector('#slo-profile-form').hidden).toBe(false)
    expect(root.querySelector('#slo-profile-list').hidden).toBe(true)
    expect(root.querySelectorAll('.ev-row')).toHaveLength(2)
    expect(window.location.hash).toBe(before)
  })

  it('comes back to the table', () => {
    root.querySelector('#slo-profile-create').click()
    root.querySelector('#slo-form-create').click()
    expect(root.querySelector('#slo-profile-list').hidden).toBe(false)
    expect(root.querySelector('#slo-profile-form').innerHTML).toBe('')
  })

  // Spec §8 puts only EDITING out of scope. "The Create form creates" — the table must show the
  // row without navigating away from it, the way lama/screen.js and
  // wan-link-discovery/profileStore.js already persist their own Create flows.
  it('persists the created profile, so the table gains a row matching what the form held', () => {
    const table = root.querySelector('#slo-profile-table')
    const before = table.rows.length

    root.querySelector('#slo-profile-create').click()
    root.querySelector('#slo-form-create').click()

    const rows = table.rows
    expect(rows).toHaveLength(before + 1)
    const created = rows[rows.length - 1]
    expect(created).toMatchObject({
      name: 'Checkout Availability',
      service: 'E-commerce Platform',
      frequency: 'Daily',
      target: '99',
      warning: '99.5',
      start: '01-09-2026',
      evaluation: 'Redundancy',
    })
  })
})
