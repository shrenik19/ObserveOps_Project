import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from './screen.js'

describe('slo profile screen', () => {
  let root
  beforeEach(() => {
    // Each mount re-uses the same ids. Left to pile up in document.body, a selector like
    // '#slo-profile-form obs-drawer' resolves its #id half through getElementById — the FIRST match
    // in the document — and silently reads the wrong screen. Clear the body every time.
    document.body.replaceChildren()
    root = document.createElement('div')
    document.body.append(root)
    mount(root)
  })

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
  beforeEach(() => {
    // Each mount re-uses the same ids. Left to pile up in document.body, a selector like
    // '#slo-profile-form obs-drawer' resolves its #id half through getElementById — the FIRST match
    // in the document — and silently reads the wrong screen. Clear the body every time.
    document.body.replaceChildren()
    root = document.createElement('div')
    document.body.append(root)
    mount(root)
  })

  it('starts on the table, with no drawer open', () => {
    expect(root.querySelector('#slo-profile-list').hidden).toBe(false)
    expect(root.querySelector('#slo-profile-form').children).toHaveLength(0)
  })

  // The Create form is an OVERLAY now, not a swapped-in section: the list stays mounted and visible
  // underneath, because hiding what a drawer overlays defeats the point of a drawer.
  it('opens the Create form in a drawer, over the list, without changing route', () => {
    const before = window.location.hash
    root.querySelector('#slo-profile-create').click()
    expect(root.querySelector('#slo-profile-form obs-drawer')).not.toBeNull()
    expect(root.querySelector('#slo-profile-list').hidden).toBe(false)
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

// The filter bar (screenshot: SLO Type · Frequency · Business Service · + Filter).
//
// obs-filters has no `defaultChips` — the element exposes only `fields`, `value` and `match`
// (probed in real Chrome; setting defaultChips or default-chips does nothing). The leading chips
// are therefore seeded as valueless conditions through the documented `value` API, which renders
// the same chip row. See docs/DS-GAPS.md G37.
describe('the filter bar', () => {
  let root
  const bar = () => root.querySelector('#slo-profile-filters')
  const table = () => root.querySelector('#slo-profile-table')
  const names = () => table().rows.map((r) => r.name)

  // The DS delivers its payload in event.detail as an array — the same unwrap
  // report-categories/screen.js does.
  const change = (conditions, match = 'all') =>
    bar().dispatchEvent(new CustomEvent('change', { detail: [{ conditions, match }] }))

  beforeEach(() => {
    // Each mount re-uses the same ids. Left to pile up in document.body, a selector like
    // '#slo-profile-form obs-drawer' resolves its #id half through getElementById — the FIRST match
    // in the document — and silently reads the wrong screen. Clear the body every time.
    document.body.replaceChildren()
    root = document.createElement('div')
    document.body.append(root)
    mount(root)
  })

  it('sits between the toolbar and the table', () => {
    expect(bar()).not.toBeNull()
    expect(bar().getAttribute('kind')).toBe('bar')
    const section = root.querySelector('#slo-profile-list')
    const order = [...section.children].map((c) => c.id || c.tagName.toLowerCase())
    expect(order.indexOf('slo-profile-filters')).toBeGreaterThan(order.indexOf('obs-toolbar'))
    expect(order.indexOf('slo-profile-filters')).toBeLessThan(order.indexOf('slo-profile-table'))
  })

  it('offers exactly the three fields from the screenshot, in order', () => {
    expect(bar().fields.map((f) => f.label)).toEqual(['SLO Type', 'Frequency', 'Business Service'])
    expect(bar().fields.map((f) => f.key)).toEqual(['type', 'frequency', 'service'])
  })

  it('draws its values from the store, deduplicated, so the pickers match the table', () => {
    const byKey = Object.fromEntries(bar().fields.map((f) => [f.key, f.values]))
    expect(byKey.type).toEqual(['Availability', 'Performance'])
    expect(byKey.frequency).toEqual(['Daily', 'Weekly'])
    expect(byKey.service).toContain('WANLINK Juhu')
    expect(new Set(byKey.service).size).toBe(byKey.service.length)
  })

  it('seeds the three leading chips as valueless conditions', () => {
    expect(bar().value).toEqual([
      { field: 'type', operator: '=', value: [] },
      { field: 'frequency', operator: '=', value: [] },
      { field: 'service', operator: '=', value: [] },
    ])
  })

  it('shows every row until a chip is given a value', () => {
    expect(names()).toHaveLength(5)
  })

  it('filters the table on a single condition', () => {
    change([{ field: 'type', operator: '=', value: ['Performance'] }])
    expect(names()).toEqual(['Storage-Volume-Availability'])
  })

  it('ANDs conditions under Match All', () => {
    change([
      { field: 'type', operator: '=', value: ['Availability'] },
      { field: 'frequency', operator: '=', value: ['Weekly'] },
    ], 'all')
    expect(names()).toEqual(['API-Gateway-Availability', 'Up time'])
  })

  it('ORs conditions under Match Any', () => {
    change([
      { field: 'frequency', operator: '=', value: ['Weekly'] },
      { field: 'service', operator: '=', value: ['WANLINK Juhu'] },
    ], 'any')
    expect(names()).toEqual(['API-Gateway-Availability', 'Up time', 'WANLink SLO'])
  })

  it('accepts a scalar condition value as well as a list', () => {
    change([{ field: 'frequency', operator: '=', value: 'Daily' }])
    expect(names()).toHaveLength(3)
  })

  // A valueless chip is the resting state of a default chip — it must not filter everything out.
  it('ignores a chip that has no value yet', () => {
    change([
      { field: 'type', operator: '=', value: ['Availability'] },
      { field: 'frequency', operator: '=', value: [] },
    ])
    expect(names()).toHaveLength(4)
  })

  it('restores every row when the filters are cleared', () => {
    change([{ field: 'type', operator: '=', value: ['Performance'] }])
    expect(names()).toHaveLength(1)
    change([])
    expect(names()).toHaveLength(5)
  })

  // Tolerate the bare conditions array obs-filters emitted before elements@0.1.150, exactly as
  // report-categories/screen.js does.
  it('tolerates the pre-0.1.150 bare-array change payload', () => {
    bar().dispatchEvent(new CustomEvent('change', {
      detail: [[{ field: 'type', operator: '=', value: ['Performance'] }]],
    }))
    expect(names()).toEqual(['Storage-Volume-Availability'])
  })

  // onCreate re-reads the store, and must not smuggle a filtered-out row back onto the table.
  it('keeps the filter applied when a profile is created', () => {
    change([{ field: 'type', operator: '=', value: ['Performance'] }])
    root.querySelector('#slo-profile-create').click()
    root.querySelector('#slo-form-create').click()
    // The created profile is an Availability one, so the Performance filter still holds.
    expect(names()).toEqual(['Storage-Volume-Availability'])
  })

  // A new profile can introduce a Business Service the pickers have never seen.
  it('refreshes the field values after a profile is created', () => {
    root.querySelector('#slo-profile-create').click()
    root.querySelector('#slo-form-create').click()
    const byKey = Object.fromEntries(bar().fields.map((f) => [f.key, f.values]))
    expect(byKey.service).toContain('E-commerce Platform')
    expect(new Set(byKey.service).size).toBe(byKey.service.length)
  })
})

// The Create drawer — the DS's large / full-screen tier, per the product's own Create SLO Profile.
describe('the Create SLO Profile drawer', () => {
  let root
  const open = () => { root.querySelector('#slo-profile-create').click() }
  const drawer = () => root.querySelector('#slo-profile-form obs-drawer')

  beforeEach(() => {
    document.body.replaceChildren()
    root = document.createElement('div')
    document.body.append(root)
    mount(root)
    open()
  })

  it('is the large / full-screen tier, multi-pane', () => {
    expect(drawer().getAttribute('width')).toBe('96%')
    expect(drawer().getAttribute('scrolled-content')).toBe('false')
    expect(drawer().getAttribute('title')).toBe('Create SLO Profile')
  })

  it('lays out a 2 : 6 : 4 body — rail, form, Help Card', () => {
    expect(drawer().querySelectorAll('.pane-drawer__col')).toHaveLength(3)
    expect(drawer().querySelector('.pane-drawer__nav .pane-drawer__nav-item')).not.toBeNull()
    expect(drawer().querySelector('.pane-drawer__form .slo-form')).not.toBeNull()
    expect(drawer().querySelector('.pane-drawer__help .slo-help')).not.toBeNull()
  })

  it('offers Availability and Performance in the rail, Availability first and selected', () => {
    const items = [...drawer().querySelectorAll('.pane-drawer__nav-item')]
    expect(items.map((i) => i.textContent.trim())).toEqual(['Availability', 'Performance'])
    expect(items[0].classList.contains('is-selected')).toBe(true)
  })

  it('moves the selected treatment when a type is picked', () => {
    drawer().querySelectorAll('.pane-drawer__nav-item')[1].click()
    const items = [...drawer().querySelectorAll('.pane-drawer__nav-item')]
    expect(items[1].classList.contains('is-selected')).toBe(true)
    expect(items[0].classList.contains('is-selected')).toBe(false)
  })

  // profiles.js recorded that the form collects no Availability/Performance distinction, so `type`
  // defaulted to Availability for everything created. The rail is now where that is decided.
  it('stores the type the rail is on', () => {
    drawer().querySelectorAll('.pane-drawer__nav-item')[1].click()
    root.querySelector('#slo-form-create').click()
    const rows = root.querySelector('#slo-profile-table').rows
    expect(rows[rows.length - 1].type).toBe('Performance')
  })

  it('still defaults to Availability when the rail is left alone', () => {
    root.querySelector('#slo-form-create').click()
    const rows = root.querySelector('#slo-profile-table').rows
    expect(rows[rows.length - 1].type).toBe('Availability')
  })

  it('shows the picked type in the Help Card', () => {
    drawer().querySelectorAll('.pane-drawer__nav-item')[1].click()
    const text = drawer().querySelector('.slo-help').textContent.replace(/\s+/g, ' ')
    expect(text).toContain('Performance')
  })

  // The Help Card is a live mirror of the form, which is what makes it worth a third of the drawer.
  it('follows the evaluation control into Strict', () => {
    const help = () => drawer().querySelector('.slo-help').textContent.replace(/\s+/g, ' ')
    expect(help()).toContain('recovered 40 percentage points')
    root.querySelector('[data-mode="strict"]').click()
    expect(help()).toContain('Switch to Redundant')
    expect(help()).toContain('scores 40%')
  })

  it('closes back to the table when the drawer closes', () => {
    drawer().dispatchEvent(new CustomEvent('close'))
    expect(root.querySelector('#slo-profile-form').children).toHaveLength(0)
    expect(root.querySelector('#slo-profile-list').hidden).toBe(false)
  })
})
