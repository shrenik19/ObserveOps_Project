import { describe, it, expect, vi } from 'vitest'
import { startDeleteCategoryFlow, destinationsFor } from './deleteCategoryFlow.js'
import { createStore } from './store.js'

const categories = [
  { id: 'all-reports', name: 'All Reports', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'config', name: 'Config', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'public', sharedWith: [] },
  { id: 'empty', name: 'Capacity Planning', type: 'custom', visibility: 'public', sharedWith: [] },
]

const reports = [
  { id: 'r1', category: 'inventory', title: 'Switch Inventory' },
  { id: 'r2', category: 'inventory', title: 'Firmware Compliance' },
  { id: 'r3', category: 'config', title: '3rd August Training' },
]

function harness(categoryId) {
  const store = createStore({ categories, reports })
  const mount = vi.fn()
  const close = vi.fn()
  const onDeleted = vi.fn()
  startDeleteCategoryFlow({ category: store.getCategory(categoryId), store, mount, close, onDeleted })
  const shown = () => mount.mock.calls.at(-1)[0]
  return { store, mount, close, onDeleted, shown }
}

const click = (el, role) => el.querySelector(`[data-role="${role}"]`).dispatchEvent(new Event('click', { bubbles: true }))
const typeName = (dialog, value) =>
  dialog
    .querySelector('[data-role="force-delete-input"]')
    .dispatchEvent(new CustomEvent('input', { detail: [value] }))
const choose = (dialog, reportId, value) => {
  const select = dialog
    .querySelector(`[data-role="reassign-row"][data-report-id="${reportId}"]`)
    .querySelector('[data-role="reassign-select"]')
  select.dispatchEvent(new CustomEvent('change', { detail: [value] }))
}

describe('destinationsFor', () => {
  it('excludes the doomed category and the virtual All Reports view', () => {
    const store = createStore({ categories, reports })
    expect(destinationsFor(store, 'inventory')).toEqual([
      { id: 'config', name: 'Config' },
      { id: 'empty', name: 'Capacity Planning' },
    ])
  })
})

describe('startDeleteCategoryFlow', () => {
  it('opens the confirm dialog first', () => {
    const { shown } = harness('inventory')
    expect(shown().getAttribute('data-role')).toBe('delete-confirm-dialog')
  })

  it('closes and changes nothing when the confirm is declined', () => {
    const { store, shown, close, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('cancel'))
    expect(close).toHaveBeenCalled()
    expect(onDeleted).not.toHaveBeenCalled()
    expect(store.getCategory('inventory')).toBeDefined()
  })

  it('deletes an empty category outright, without a reassignment step', () => {
    const { store, shown, close, onDeleted, mount } = harness('empty')
    shown().dispatchEvent(new CustomEvent('confirm'))

    expect(store.getCategory('empty')).toBeUndefined()
    expect(onDeleted).toHaveBeenCalledWith('empty')
    expect(close).toHaveBeenCalled()
    expect(mount).toHaveBeenCalledTimes(1)
  })

  it('opens the reassignment step when the category holds reports', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    expect(shown().getAttribute('data-role')).toBe('reassign-dialog')
    expect(shown().querySelectorAll('[data-role="reassign-row"]')).toHaveLength(2)
  })

  // The real component emits confirm -> close -> hide from one click on Yes. The trailing `close`
  // must not be read as a dismissal, or it tears down the reassignment step that `confirm` just
  // opened and the flow dead-ends with nothing on screen.
  it('keeps the reassignment step open through the real confirm/close/hide sequence', () => {
    const { shown, close } = harness('inventory')
    const confirmDialog = shown()

    confirmDialog.dispatchEvent(new CustomEvent('confirm'))
    confirmDialog.dispatchEvent(new CustomEvent('close'))
    confirmDialog.dispatchEvent(new CustomEvent('hide'))

    expect(shown().getAttribute('data-role')).toBe('reassign-dialog')
    expect(close).not.toHaveBeenCalled()
  })

  // Same hazard one step later: mounting the force dialog disconnects the reassignment dialog,
  // which makes the component emit its own close.
  it('keeps the force step open when the reassignment dialog reports close on teardown', () => {
    const { shown, close } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    click(reassign, 'reassign-force')
    reassign.dispatchEvent(new CustomEvent('close'))

    expect(shown().getAttribute('data-role')).toBe('force-delete-dialog')
    expect(close).not.toHaveBeenCalled()
  })

  it('sends Move and Delete to the typed-name gate rather than committing', () => {
    const { store, shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    choose(reassign, 'r1', 'config')
    choose(reassign, 'r2', 'config')
    click(reassign, 'reassign-move')

    // Nothing has happened yet — the gate is now in the way.
    expect(store.getCategory('inventory')).toBeDefined()
    expect(shown().dataset.mode).toBe('move')
  })

  it('moves the reports and deletes the category once the name is typed', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    choose(reassign, 'r1', 'config')
    choose(reassign, 'r2', 'config')
    click(reassign, 'reassign-move')

    typeName(shown(), 'Inventory')
    click(shown(), 'force-delete-confirm')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReportsByCategory('config').map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
    expect(onDeleted).toHaveBeenCalledWith('inventory')
  })

  it('will not move anything until the typed name matches exactly', () => {
    const { store, shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    choose(reassign, 'r1', 'config')
    choose(reassign, 'r2', 'config')
    click(reassign, 'reassign-move')

    typeName(shown(), 'inventory') // wrong case
    click(shown(), 'force-delete-confirm')

    expect(store.getCategory('inventory')).toBeDefined()
  })

  it('counts the move on the final dialog, grouped by destination', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    choose(reassign, 'r1', 'config')
    choose(reassign, 'r2', 'config')
    click(reassign, 'reassign-move')

    const lines = [...shown().querySelectorAll('[data-role="force-delete-move-line"]')]
    expect(lines.map((l) => l.textContent)).toEqual(['2 reports → Config'])
  })

  it('counts what will be destroyed on the Proceed Anyway route', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')

    expect(shown().dataset.mode).toBe('force')
    expect(shown().querySelector('[data-role="force-delete-destroy-line"]').textContent).toBe(
      '2 reports deleted permanently'
    )
  })

  it('discloses the cost in the FIRST dialog, not only the last', () => {
    const { shown } = harness('inventory')
    const dialog = shown()

    // Three separate lines, not one paragraph — assert them apart.
    expect(dialog.querySelector('[data-role="delete-confirm-stake"]').textContent)
      .toBe('2 reports are in this category.')
    expect(dialog.querySelector('[data-role="delete-confirm-warning"]').textContent)
      .toContain('This action cannot be undone')
  })

  it('says plainly when an empty category costs nothing', () => {
    const { shown } = harness('empty')
    expect(shown().querySelector('[data-role="delete-confirm-stake"]').textContent).toBe(
      'Capacity Planning holds no reports.'
    )
  })

  it('does not delete anything while a report is unmapped', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))

    const reassign = shown()
    choose(reassign, 'r1', 'config')
    click(reassign, 'reassign-move')

    expect(store.getCategory('inventory')).toBeDefined()
    expect(onDeleted).not.toHaveBeenCalled()
  })

  it('advances to the force-delete step on Proceed Anyway', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')
    expect(shown().getAttribute('data-role')).toBe('force-delete-dialog')
  })

  it('force-deletes the category and its reports once the name is typed', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')

    const force = shown()
    force
      .querySelector('[data-role="force-delete-input"]')
      .dispatchEvent(new CustomEvent('input', { detail: ['Inventory'] }))
    click(force, 'force-delete-confirm')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReports().map((r) => r.id)).toEqual(['r3'])
    expect(onDeleted).toHaveBeenCalledWith('inventory')
  })

  it('cancelling the force step tears the whole flow down', () => {
    const { store, shown, close } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')
    click(shown(), 'force-delete-cancel')

    expect(close).toHaveBeenCalled()
    expect(store.getCategory('inventory')).toBeDefined()
  })
})


describe('going back from the confirmation', () => {
  const back = (dialog) =>
    dialog.querySelector('[data-role="force-delete-back"]').dispatchEvent(new Event('click', { bubbles: true }))

  it('returns to the reassign grid from the Move and Delete route', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    choose(shown(), 'r1', 'config')
    click(shown(), 'reassign-move')

    expect(shown().dataset.mode).toBe('move')
    back(shown())

    expect(shown().getAttribute('data-role')).toBe('reassign-dialog')
  })

  it('returns to the reassign grid from the Proceed Anyway route too', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    click(shown(), 'reassign-force')

    expect(shown().dataset.mode).toBe('force')
    back(shown())

    expect(shown().getAttribute('data-role')).toBe('reassign-dialog')
  })

  it('brings the chosen destinations back with it', () => {
    const { shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    choose(shown(), 'r1', 'config')
    choose(shown(), 'r2', 'config')
    click(shown(), 'reassign-move')
    back(shown())

    const grid = shown()
    for (const id of ['r1', 'r2']) {
      const select = grid
        .querySelector(`[data-role="reassign-row"][data-report-id="${id}"]`)
        .querySelector('[data-role="reassign-select"]')
      expect(select.value).toBe('config')
    }
  })

  it('deletes nothing on the way back', () => {
    const { store, shown } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    choose(shown(), 'r1', 'config')
    click(shown(), 'reassign-move')
    back(shown())

    expect(store.getCategory('inventory')).toBeDefined()
    expect(store.getReportsByCategory('inventory')).toHaveLength(2)
  })

  it('can still be completed after going back and forward again', () => {
    const { store, shown, onDeleted } = harness('inventory')
    shown().dispatchEvent(new CustomEvent('confirm'))
    choose(shown(), 'r1', 'config')
    click(shown(), 'reassign-move')
    back(shown())

    click(shown(), 'reassign-move')
    typeName(shown(), 'Inventory')
    click(shown(), 'force-delete-confirm')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(onDeleted).toHaveBeenCalledWith('inventory')
  })

  it('offers no Back on an empty category, which never saw the grid', () => {
    const { shown } = harness('empty')
    shown().dispatchEvent(new CustomEvent('confirm'))
    // An empty category deletes outright — there is no confirmation step at all.
    expect(shown().querySelector('[data-role="force-delete-back"]')).toBeNull()
  })
})
