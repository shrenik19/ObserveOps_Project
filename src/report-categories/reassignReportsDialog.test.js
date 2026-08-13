import { describe, it, expect, vi } from 'vitest'
import { renderReassignReportsDialog } from './reassignReportsDialog.js'

const reports = [
  { id: 'r1', name: 'Switch Inventory' },
  { id: 'r2', name: 'Firmware Compliance' },
]

const categories = [
  { id: 'config', name: 'Config' },
  { id: 'network', name: 'Network' },
]

const build = (overrides = {}) =>
  renderReassignReportsDialog({
    categoryName: 'Inventory',
    reports,
    categories,
    onCancel: vi.fn(),
    onMoveAndDelete: vi.fn(),
    onProceedAnyway: vi.fn(),
    ...overrides,
  })

const rows = (el) => [...el.querySelectorAll('[data-role="reassign-row"]')]
const rowFor = (el, id) => rows(el).find((r) => r.dataset.reportId === id)
const selectIn = (row) => row.querySelector('[data-role="reassign-select"]')
const click = (el, role) => el.querySelector(`[data-role="${role}"]`).dispatchEvent(new Event('click', { bubbles: true }))

/** DS selects report through `change` with the value wrapped in an array. */
const choose = (row, value) => {
  const select = selectIn(row)
  select.value = value
  select.dispatchEvent(new CustomEvent('change', { detail: [value] }))
}

describe('renderReassignReportsDialog', () => {
  it('is an open obs-modal that does not close on its backdrop', () => {
    const dialog = build()
    expect(dialog.tagName.toLowerCase()).toBe('obs-modal')
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(dialog.getAttribute('mask-closable')).toBe('false')
  })

  it('renders one row per report, naming each', () => {
    const dialog = build()
    expect(rows(dialog)).toHaveLength(2)
    expect(rowFor(dialog, 'r1').textContent).toContain('Switch Inventory')
    expect(rowFor(dialog, 'r2').textContent).toContain('Firmware Compliance')
  })

  it('offers every supplied category as a destination, using the DS option shape', () => {
    const dialog = build()
    expect(selectIn(rowFor(dialog, 'r1')).options).toEqual([
      { value: 'config', text: 'Config' },
      { value: 'network', text: 'Network' },
    ])
  })

  it('starts with nothing selected and no error showing', () => {
    const dialog = build()
    expect(selectIn(rowFor(dialog, 'r1')).value).toBe('')
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(true)
  })

  it('blocks Move and Delete while any report is unmapped, showing both errors', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })

    choose(rowFor(dialog, 'r1'), 'config')
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).not.toHaveBeenCalled()
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(false)
    expect(selectIn(rowFor(dialog, 'r2')).hasAttribute('error')).toBe(true)
    expect(selectIn(rowFor(dialog, 'r1')).hasAttribute('error')).toBe(false)
  })

  it('clears a row error as soon as that row is given a destination', () => {
    const dialog = build()
    click(dialog, 'reassign-move')
    expect(selectIn(rowFor(dialog, 'r2')).hasAttribute('error')).toBe(true)

    choose(rowFor(dialog, 'r2'), 'network')
    expect(selectIn(rowFor(dialog, 'r2')).hasAttribute('error')).toBe(false)
  })

  it('clears the summary error once every row has a destination', () => {
    const dialog = build()
    click(dialog, 'reassign-move')
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(false)

    choose(rowFor(dialog, 'r1'), 'config')
    choose(rowFor(dialog, 'r2'), 'network')
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(true)
  })

  it('reports the full assignment map when every report is mapped', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })

    choose(rowFor(dialog, 'r1'), 'config')
    choose(rowFor(dialog, 'r2'), 'network')
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).toHaveBeenCalledWith({ r1: 'config', r2: 'network' })
  })

  it('validates rows hidden by the search filter, not just the visible ones', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })

    choose(rowFor(dialog, 'r1'), 'config')
    const search = dialog.querySelector('[data-role="reassign-search"]')
    search.dispatchEvent(new CustomEvent('input', { detail: ['Switch'] }))

    expect(rowFor(dialog, 'r2').hidden).toBe(true)
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).not.toHaveBeenCalled()
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(false)
  })

  it('filters rows by name, case-insensitively', () => {
    const dialog = build()
    const search = dialog.querySelector('[data-role="reassign-search"]')

    search.dispatchEvent(new CustomEvent('input', { detail: ['firmware'] }))
    expect(rowFor(dialog, 'r1').hidden).toBe(true)
    expect(rowFor(dialog, 'r2').hidden).toBe(false)

    search.dispatchEvent(new CustomEvent('input', { detail: [''] }))
    expect(rowFor(dialog, 'r1').hidden).toBe(false)
    expect(rowFor(dialog, 'r2').hidden).toBe(false)
  })

  it('routes Cancel, Proceed Anyway and dismissal to their handlers', () => {
    const onCancel = vi.fn()
    const onProceedAnyway = vi.fn()
    const dialog = build({ onCancel, onProceedAnyway })

    click(dialog, 'reassign-cancel')
    expect(onCancel).toHaveBeenCalled()

    click(dialog, 'reassign-force')
    expect(onProceedAnyway).toHaveBeenCalled()

    dialog.dispatchEvent(new CustomEvent('close'))
    expect(onCancel).toHaveBeenCalledTimes(2)
  })

  it('names the doomed category in its title', () => {
    expect(build().getAttribute('title')).toBe("Delete 'Inventory'")
  })

  it('does not throw when handlers are omitted', () => {
    const dialog = renderReassignReportsDialog({ categoryName: 'X', reports, categories })
    expect(() => {
      click(dialog, 'reassign-cancel')
      click(dialog, 'reassign-force')
    }).not.toThrow()
  })
})
