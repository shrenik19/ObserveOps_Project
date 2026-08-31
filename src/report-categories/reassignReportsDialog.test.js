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

  // A partial move is a legitimate choice: an empty row means "this report goes with the category".
  it('allows Move and Delete with only SOME reports mapped', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })

    choose(rowFor(dialog, 'r1'), 'config')
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).toHaveBeenCalledTimes(1)
    expect(onMoveAndDelete.mock.calls[0][0]).toEqual({ r1: 'config' })
  })

  it('marks no row in red for being deliberately left empty', () => {
    const dialog = build()
    choose(rowFor(dialog, 'r1'), 'config')
    click(dialog, 'reassign-move')

    expect(selectIn(rowFor(dialog, 'r2')).hasAttribute('error')).toBe(false)
  })

  it('refuses only when NOTHING is going anywhere', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).not.toHaveBeenCalled()
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').hidden).toBe(false)
  })

  it('points an empty grid at Proceed Anyway, which says what is lost', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="reassign-summary-error"]').textContent).toBe(
      'Choose a new category for at least one report, or use Proceed Anyway to delete them all.'
    )
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

  it('counts assignments on rows the search has hidden', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })

    choose(rowFor(dialog, 'r2'), 'config')
    const search = dialog.querySelector('[data-role="reassign-search"]')
    search.dispatchEvent(new CustomEvent('input', { detail: ['Switch'] }))

    // r2 is filtered out of view, but its destination still counts.
    expect(rowFor(dialog, 'r2').hidden).toBe(true)
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).toHaveBeenCalledWith({ r2: 'config' })
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

  // One route per dialog: each of these is a terminal outcome, so they are tested on fresh
  // instances rather than by firing three at one dialog.
  it('routes Cancel to onCancel', () => {
    const onCancel = vi.fn()
    click(build({ onCancel }), 'reassign-cancel')
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('routes Proceed Anyway to onProceedAnyway', () => {
    const onProceedAnyway = vi.fn()
    click(build({ onProceedAnyway }), 'reassign-force')
    expect(onProceedAnyway).toHaveBeenCalledTimes(1)
  })

  it('routes a dismissal to onCancel', () => {
    const onCancel = vi.fn()
    build({ onCancel }).dispatchEvent(new CustomEvent('close'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // Handing off to the force step replaces this element, and the resulting disconnect makes
  // obs-modal emit its own `close`. Reporting that as a cancel would tear down the force step.
  it('does not report a cancel after handing off to Proceed Anyway', () => {
    const onCancel = vi.fn()
    const onProceedAnyway = vi.fn()
    const dialog = build({ onCancel, onProceedAnyway })

    click(dialog, 'reassign-force')
    dialog.dispatchEvent(new CustomEvent('close'))

    expect(onProceedAnyway).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('does not report a cancel after a successful Move and Delete', () => {
    const onCancel = vi.fn()
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onCancel, onMoveAndDelete })

    choose(rowFor(dialog, 'r1'), 'config')
    choose(rowFor(dialog, 'r2'), 'network')
    click(dialog, 'reassign-move')
    dialog.dispatchEvent(new CustomEvent('close'))

    expect(onMoveAndDelete).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  // A rejected attempt is not an outcome — the user must be able to fix the gaps and press again.
  it('still accepts Move and Delete after a failed validation attempt', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })

    click(dialog, 'reassign-move')
    expect(onMoveAndDelete).not.toHaveBeenCalled()

    choose(rowFor(dialog, 'r1'), 'config')
    choose(rowFor(dialog, 'r2'), 'network')
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).toHaveBeenCalledWith({ r1: 'config', r2: 'network' })
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

// obs-select has no `error` attribute of its own (obs-input does), so the row also carries a
// visible message — colour alone is not an accessible error signal.
describe('per-row error message', () => {
  it('starts hidden', () => {
    const dialog = build()
    expect(rowFor(dialog, 'r1').querySelector('[data-role="reassign-row-error"]').hidden).toBe(true)
  })

  // An empty row is now a deliberate choice — "delete this one with the category" — so there is no
  // per-row mistake left to point at. The message element stays for the row-level API, but nothing
  // reveals it any more.
  it('never reveals itself, because an empty row is no longer an error', () => {
    const dialog = build()
    choose(rowFor(dialog, 'r1'), 'config')
    click(dialog, 'reassign-move')

    for (const id of ['r1', 'r2']) {
      expect(rowFor(dialog, id).querySelector('[data-role="reassign-row-error"]').hidden).toBe(true)
    }
  })
})


// ---------------------------------------------------------------------------
// Bulk move: tick rows, pick one destination, apply it to all of them at once.
// ---------------------------------------------------------------------------

const bulkBar = (el) => el.querySelector('[data-role="reassign-bulk-bar"]')
const bulkCount = (el) => el.querySelector('[data-role="reassign-bulk-count"]')
const bulkSelect = (el) => el.querySelector('[data-role="reassign-bulk-select"]')
const selectAllBox = (el) => el.querySelector('[data-role="reassign-select-all"]')
const rowBox = (el, reportId) => rowFor(el, reportId).querySelector('[data-role="reassign-row-check"]')
const rowSelect = (el, reportId) => rowFor(el, reportId).querySelector('[data-role="reassign-select"]')

const tickRow = (el, reportId, on = true) => {
  const box = rowBox(el, reportId)
  if (on) box.setAttribute('checked', '')
  else box.removeAttribute('checked')
  box.dispatchEvent(new CustomEvent('change', { detail: [on] }))
}
const tickAll = (el, on = true) => {
  const box = selectAllBox(el)
  if (on) box.setAttribute('checked', '')
  else box.removeAttribute('checked')
  box.dispatchEvent(new CustomEvent('change', { detail: [on] }))
}
const chooseBulk = (el, value) =>
  bulkSelect(el).dispatchEvent(new CustomEvent('change', { detail: [value] }))
const search = (el, term) =>
  el.querySelector('[data-role="reassign-search"]').dispatchEvent(new CustomEvent('input', { detail: [term] }))

describe('the bulk bar', () => {
  it('gives every row a tick box, and the header a select-all', () => {
    const dialog = build()
    expect(selectAllBox(dialog)).not.toBeNull()
    for (const report of reports) expect(rowBox(dialog, report.id)).not.toBeNull()
  })

  it('stays hidden until something is ticked', () => {
    const dialog = build()
    expect(bulkBar(dialog).hidden).toBe(true)

    tickRow(dialog, reports[0].id)
    expect(bulkBar(dialog).hidden).toBe(false)
  })

  it('counts what is selected, using the pill wording the product uses', () => {
    const dialog = build()
    tickRow(dialog, reports[0].id)
    expect(bulkCount(dialog).textContent).toBe('1 item selected')

    tickRow(dialog, reports[1].id)
    expect(bulkCount(dialog).textContent).toBe('2 items selected')
  })

  it('renders the count as a dismissible DS pill, not plain text', () => {
    const dialog = build()
    tickRow(dialog, reports[0].id)
    const pill = bulkCount(dialog)

    expect(pill.tagName.toLowerCase()).toBe('obs-tag')
    expect(pill.hasAttribute('closable')).toBe(true)
    expect(pill.hasAttribute('rounded')).toBe(true)
  })

  it('drops the whole selection when the pill is dismissed', () => {
    const dialog = build()
    tickAll(dialog)
    expect(bulkBar(dialog).hidden).toBe(false)

    bulkCount(dialog).dispatchEvent(new CustomEvent('close'))

    expect(bulkBar(dialog).hidden).toBe(true)
    for (const report of reports) {
      expect(rowBox(dialog, report.id).hasAttribute('checked')).toBe(false)
    }
  })

  it('hides itself again when the last row is unticked', () => {
    const dialog = build()
    tickRow(dialog, reports[0].id)
    tickRow(dialog, reports[0].id, false)
    expect(bulkBar(dialog).hidden).toBe(true)
  })

  it('offers no Apply button — choosing the category IS the action', () => {
    const dialog = build()
    tickRow(dialog, reports[0].id)
    expect(dialog.querySelector('[data-role="reassign-bulk-apply"]')).toBeNull()
  })

  it('writes the destination into every ticked row the moment it is chosen', () => {
    const dialog = build()
    tickRow(dialog, reports[0].id)
    tickRow(dialog, reports[1].id)
    chooseBulk(dialog, 'config')

    expect(rowSelect(dialog, reports[0].id).value).toBe('config')
    expect(rowSelect(dialog, reports[1].id).value).toBe('config')
  })

  it('leaves unticked rows alone', () => {
    const dialog = build()
    tickRow(dialog, reports[0].id)
    chooseBulk(dialog, 'config')

    expect(rowSelect(dialog, reports[1].id).value).toBe('')
  })

  it('does nothing at all when nothing is ticked', () => {
    const dialog = build()
    chooseBulk(dialog, 'config')

    expect(rowSelect(dialog, reports[0].id).value).toBe('')
    expect(rowSelect(dialog, reports[1].id).value).toBe('')
  })

  it('clears the selection afterwards, so the next pick cannot re-target them', () => {
    const dialog = build()
    tickRow(dialog, reports[0].id)
    chooseBulk(dialog, 'config')

    expect(bulkBar(dialog).hidden).toBe(true)
    expect(rowBox(dialog, reports[0].id).hasAttribute('checked')).toBe(false)
  })

  it('resets its own picker, so the SAME category can be applied to a second selection', () => {
    const dialog = build()
    tickRow(dialog, reports[0].id)
    chooseBulk(dialog, 'config')
    expect(bulkSelect(dialog).value).toBe('')

    tickRow(dialog, reports[1].id)
    chooseBulk(dialog, 'config')
    expect(rowSelect(dialog, reports[1].id).value).toBe('config')
  })

  it('counts as a real assignment, so Move and Delete goes through', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })
    tickAll(dialog)
    chooseBulk(dialog, 'config')
    dialog.querySelector('[data-role="reassign-move"]').dispatchEvent(new Event('click', { bubbles: true }))

    expect(onMoveAndDelete).toHaveBeenCalledTimes(1)
    const assignments = onMoveAndDelete.mock.calls[0][0]
    for (const report of reports) expect(assignments[report.id]).toBe('config')
  })

  it('can still be overridden one row at a time afterwards', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ onMoveAndDelete })
    tickAll(dialog)
    chooseBulk(dialog, 'config')
    choose(rowFor(dialog, reports[0].id), 'network')
    dialog.querySelector('[data-role="reassign-move"]').dispatchEvent(new Event('click', { bubbles: true }))

    expect(onMoveAndDelete.mock.calls[0][0][reports[0].id]).toBe('network')
  })
})

describe('select-all is scoped to what the search is showing', () => {
  it('ticks only the visible rows', () => {
    const dialog = build()
    search(dialog, reports[0].name)
    tickAll(dialog)

    expect(bulkCount(dialog).textContent).toBe('1 item selected')
    expect(rowBox(dialog, reports[0].id).hasAttribute('checked')).toBe(true)
    expect(rowBox(dialog, reports[1].id).hasAttribute('checked')).toBe(false)
  })

  it('keeps a row ticked even after the filter hides it', () => {
    const dialog = build()
    tickRow(dialog, reports[1].id)
    search(dialog, reports[0].name)

    expect(rowBox(dialog, reports[1].id).hasAttribute('checked')).toBe(true)
    expect(bulkCount(dialog).textContent).toBe('1 item selected')
  })
})

describe('both footer routes are destructive', () => {
  it('paints Move and Delete red, like Proceed Anyway', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="reassign-move"]').getAttribute('variant')).toBe('error')
    expect(dialog.querySelector('[data-role="reassign-force"]').getAttribute('variant')).toBe('error')
  })
})


describe('the bulk picker matches the row pickers', () => {
  // The hosts share a 260px grid track either way; without `block` the component renders its
  // trigger at an intrinsic 240px INSIDE that track, so the bar's picker came out visibly narrower
  // than the ones beneath it. Only measuring the shadow .trig catches that, so assert the attribute.
  it('carries block, like every row picker', () => {
    const dialog = build()
    expect(bulkSelect(dialog).hasAttribute('block')).toBe(true)
  })

  it('agrees with the row pickers on that attribute', () => {
    const dialog = build()
    const rowPicker = rowSelect(dialog, reports[0].id)
    expect(bulkSelect(dialog).hasAttribute('block')).toBe(rowPicker.hasAttribute('block'))
  })
})

describe('where the bulk bar sits', () => {
  it('is placed between the search box and the grid', () => {
    const dialog = build()
    const body = dialog.querySelector('.reassign-dialog')
    const children = [...body.children]

    const searchAt = children.findIndex((c) => c.getAttribute('data-role') === 'reassign-search')
    const barAt = children.findIndex((c) => c.getAttribute('data-role') === 'reassign-bulk-bar')
    const gridAt = children.findIndex((c) => c.classList.contains('reassign-dialog__grid'))

    expect(searchAt).toBeGreaterThan(-1)
    expect(barAt).toBeGreaterThan(searchAt)
    expect(gridAt).toBeGreaterThan(barAt)
  })
})


describe('coming back to a grid already filled in', () => {
  it('restores the destinations it was opened with', () => {
    const dialog = build({ initialAssignments: { r1: 'config', r2: 'network' } })

    expect(rowSelect(dialog, 'r1').value).toBe('config')
    expect(rowSelect(dialog, 'r2').value).toBe('network')
  })

  it('restores a PARTIAL grid, leaving the rest empty', () => {
    const dialog = build({ initialAssignments: { r1: 'config' } })

    expect(rowSelect(dialog, 'r1').value).toBe('config')
    expect(rowSelect(dialog, 'r2').value).toBe('')
  })

  it('counts a restored destination, so Move and Delete goes straight through', () => {
    const onMoveAndDelete = vi.fn()
    const dialog = build({ initialAssignments: { r1: 'config' }, onMoveAndDelete })
    click(dialog, 'reassign-move')

    expect(onMoveAndDelete).toHaveBeenCalledWith({ r1: 'config' })
  })

  it('opens blank when there is nothing to restore', () => {
    const dialog = build()
    expect(rowSelect(dialog, 'r1').value).toBe('')
  })
})
