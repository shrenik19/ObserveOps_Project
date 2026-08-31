import { describe, it, expect, vi } from 'vitest'
import { renderForceDeleteDialog, summariseMoves, warningText, pluralReports } from './forceDeleteDialog.js'

const build = (overrides = {}) =>
  renderForceDeleteDialog({ categoryName: 'Inventory', onCancel: vi.fn(), onConfirm: vi.fn(), ...overrides })

const input = (el) => el.querySelector('[data-role="force-delete-input"]')
const confirmBtn = (el) => el.querySelector('[data-role="force-delete-confirm"]')
const type = (el, value) => input(el).dispatchEvent(new CustomEvent('input', { detail: [value] }))

describe('renderForceDeleteDialog', () => {
  it('states the consequence, with the number of reports at stake', () => {
    const dialog = build({ reportCount: 5 })
    expect(dialog.querySelector('[data-role="force-delete-warning"]').textContent).toBe(
      'All 5 reports associated within this category will be permanently deleted. This action cannot be undone.'
    )
  })

  it('counts a single report in the singular', () => {
    const dialog = build({ reportCount: 1 })
    expect(dialog.querySelector('[data-role="force-delete-warning"]').textContent).toContain(
      'All 1 report associated'
    )
  })

  it('instructs the user to type the exact category name', () => {
    const dialog = build()
    expect(dialog.querySelector('[data-role="force-delete-instruction"]').textContent).toBe(
      'To confirm, type the category name Inventory (case-sensitive) below.'
    )
  })

  it('placeholders the input with the category name', () => {
    expect(input(build()).getAttribute('placeholder')).toBe('Inventory')
  })

  it('starts with the confirm button disabled', () => {
    expect(confirmBtn(build()).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the button disabled for a near miss', () => {
    const dialog = build()
    type(dialog, 'Invent')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the button disabled when only the case differs', () => {
    const dialog = build()
    type(dialog, 'inventory')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('keeps the button disabled when the text is padded with spaces', () => {
    const dialog = build()
    type(dialog, ' Inventory ')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('enables the button on an exact match', () => {
    const dialog = build()
    type(dialog, 'Inventory')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(false)
  })

  it('re-disables the button if the text stops matching', () => {
    const dialog = build()
    type(dialog, 'Inventory')
    type(dialog, 'Inventor')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
  })

  it('reports a confirmation only once the name matches', () => {
    const onConfirm = vi.fn()
    const dialog = build({ onConfirm })

    confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    expect(onConfirm).not.toHaveBeenCalled()

    type(dialog, 'Inventory')
    confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('routes Cancel to onCancel', () => {
    const onCancel = vi.fn()
    const dialog = build({ onCancel })
    dialog.querySelector('[data-role="force-delete-cancel"]').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  it('routes a dismissal to onCancel', () => {
    const onCancel = vi.fn()
    build({ onCancel }).dispatchEvent(new CustomEvent('close'))
    expect(onCancel).toHaveBeenCalledTimes(1)
  })

  // Confirming tears this dialog down, and the disconnect makes obs-modal emit its own `close`.
  // Reporting that as a cancel would undo the outcome the user just chose.
  it('does not report a cancel after a successful force delete', () => {
    const onCancel = vi.fn()
    const onConfirm = vi.fn()
    const dialog = build({ onCancel, onConfirm })

    type(dialog, 'Inventory')
    confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    dialog.dispatchEvent(new CustomEvent('close'))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('is an open obs-modal that does not close on its backdrop', () => {
    const dialog = build()
    expect(dialog.tagName.toLowerCase()).toBe('obs-modal')
    expect(dialog.hasAttribute('open')).toBe(true)
    expect(dialog.getAttribute('mask-closable')).toBe('false')
  })

  it('does not throw when handlers are omitted', () => {
    const dialog = renderForceDeleteDialog({ categoryName: 'X' })
    expect(() => {
      type(dialog, 'X')
      confirmBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    }).not.toThrow()
  })
})


describe('pluralReports', () => {
  it('says report for one and reports for any other number', () => {
    expect(pluralReports(1)).toBe('1 report')
    expect(pluralReports(0)).toBe('0 reports')
    expect(pluralReports(7)).toBe('7 reports')
  })
})

describe('summariseMoves', () => {
  const cats = [
    { id: 'config', name: 'Config' },
    { id: 'network', name: 'Network' },
  ]

  it('groups the assignments into one line per destination', () => {
    const out = summariseMoves({ r1: 'config', r2: 'config', r3: 'network' }, cats)
    expect(out).toEqual([
      { id: 'config', name: 'Config', count: 2 },
      { id: 'network', name: 'Network', count: 1 },
    ])
  })

  it('orders by size, then by name, so the biggest move reads first', () => {
    const out = summariseMoves({ r1: 'network', r2: 'config', r3: 'network' }, cats)
    expect(out.map((m) => m.name)).toEqual(['Network', 'Config'])
  })

  it('falls back to the id when a destination is unknown', () => {
    expect(summariseMoves({ r1: 'ghost' }, cats)).toEqual([
      { id: 'ghost', name: 'ghost', count: 1 },
    ])
  })

  it('returns nothing for an empty assignment map', () => {
    expect(summariseMoves({}, cats)).toEqual([])
  })
})

describe('warningText', () => {
  it('names destruction in force mode', () => {
    expect(warningText({ mode: 'force', categoryName: 'Inventory', reportCount: 3 })).toContain(
      'All 3 reports associated within this category will be permanently deleted'
    )
  })

  it('names relocation in move mode, and still says the category goes', () => {
    const text = warningText({ mode: 'move', categoryName: 'Inventory', reportCount: 3, movedCount: 3 })
    expect(text).toContain('All 3 reports will be moved')
    expect(text).toContain('Inventory will then be permanently deleted')
  })

  it('spells out a PARTIAL move as kept out of total, plus what is lost', () => {
    const text = warningText({ mode: 'move', categoryName: 'Inventory', reportCount: 10, movedCount: 7 })
    expect(text).toContain('7 out of 10 reports will be moved')
    expect(text).toContain('The remaining 3 reports will be permanently deleted along with Inventory')
    expect(text).toContain('cannot be undone')
  })

  it('counts a lone survivor and a lone casualty in the singular', () => {
    const text = warningText({ mode: 'move', categoryName: 'Inventory', reportCount: 2, movedCount: 1 })
    expect(text).toContain('1 out of 2 reports')
    expect(text).toContain('The remaining 1 report will be permanently deleted')
  })
})

describe('the move mode of the same dialog', () => {
  const moveDialog = (overrides = {}) =>
    build({
      mode: 'move',
      reportCount: 3,
      movedCount: 3,
      moves: [
        { id: 'config', name: 'Config', count: 2 },
        { id: 'network', name: 'Network', count: 1 },
      ],
      ...overrides,
    })

  it('gates on the typed name exactly as the force route does', () => {
    const dialog = moveDialog()
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)

    type(dialog, 'inventory')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)

    type(dialog, 'Inventory')
    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(false)
  })

  it('names the button for the route the user took', () => {
    expect(confirmBtn(moveDialog()).textContent).toBe('Move and Delete')
    expect(confirmBtn(build({ mode: 'force' })).textContent).toBe('Force Delete')
  })

  it('is red in both modes — the category dies either way', () => {
    expect(confirmBtn(moveDialog()).getAttribute('variant')).toBe('error')
    expect(confirmBtn(build({ mode: 'force' })).getAttribute('variant')).toBe('error')
  })

  it('shows where every report is going, and how many', () => {
    const lines = [...moveDialog().querySelectorAll('[data-role="force-delete-move-line"]')]
    expect(lines.map((l) => l.textContent)).toEqual(['2 reports → Config', '1 report → Network'])
  })

  it('shows the destroyed count in force mode instead', () => {
    const dialog = build({ mode: 'force', reportCount: 4 })
    const line = dialog.querySelector('[data-role="force-delete-destroy-line"]')
    expect(line.textContent).toBe('4 reports deleted permanently')
    expect(dialog.querySelector('[data-role="force-delete-move-line"]')).toBeNull()
  })

  it('hides the summary when there is nothing to count', () => {
    const dialog = build({ mode: 'force', reportCount: 0 })
    expect(dialog.querySelector('[data-role="force-delete-summary"]').hidden).toBe(true)
  })

  it('softens the icon only when every report survives', () => {
    // 3 held, 3 moved — nothing lost.
    expect(moveDialog({ movedCount: 3 }).querySelector('[data-role="force-delete-icon"]').getAttribute('name'))
      .toBe('infoCircle')
    expect(build({ mode: 'force' }).querySelector('[data-role="force-delete-icon"]').getAttribute('name'))
      .toBe('exclamationTriangle')
  })

  it('keeps the alarm on a partial move, which does destroy reports', () => {
    const dialog = moveDialog({ reportCount: 10, movedCount: 3 })
    expect(dialog.querySelector('[data-role="force-delete-icon"]').getAttribute('name'))
      .toBe('exclamationTriangle')
  })

  it('lists the casualties of a partial move alongside the destinations', () => {
    const dialog = moveDialog({ reportCount: 10, movedCount: 3 })
    expect(dialog.querySelector('[data-role="force-delete-destroy-line"]').textContent)
      .toBe('7 reports deleted permanently')
    expect([...dialog.querySelectorAll('[data-role="force-delete-move-line"]')]).toHaveLength(2)
  })

  it('lists no casualties when the move is complete', () => {
    const dialog = moveDialog({ reportCount: 3, movedCount: 3 })
    expect(dialog.querySelector('[data-role="force-delete-destroy-line"]')).toBeNull()
  })
})


describe('the Back button', () => {
  const backBtn = (el) => el.querySelector('[data-role="force-delete-back"]')

  it('is absent when there is no previous step to return to', () => {
    expect(backBtn(build())).toBeNull()
  })

  it('appears in both modes once a previous step exists', () => {
    expect(backBtn(build({ onBack: vi.fn() }))).not.toBeNull()
    expect(backBtn(build({ mode: 'move', onBack: vi.fn() }))).not.toBeNull()
  })

  it('reports going back, and never as a cancel', () => {
    const onBack = vi.fn()
    const onCancel = vi.fn()
    const dialog = build({ onBack, onCancel })

    backBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))

    expect(onBack).toHaveBeenCalledTimes(1)
    expect(onCancel).not.toHaveBeenCalled()
  })

  it('is a labelled arrow in the header, not a footer button', () => {
    const dialog = build({ onBack: vi.fn() })
    const back = backBtn(dialog)

    expect(back.querySelector('obs-icon').getAttribute('name')).toBe('chevronLeft')
    expect(back.textContent.trim()).toBe('Back')
    // The visible word is the accessible name; an aria-label would only shadow it.
    expect(back.hasAttribute('aria-label')).toBe(false)
    // Out of the footer, which holds only the two decisions.
    expect(dialog.querySelector('.force-delete-dialog__footer [data-role="force-delete-back"]')).toBeNull()
  })

  it('leads with the arrow, then the word', () => {
    const back = backBtn(build({ onBack: vi.fn() }))
    expect(back.firstElementChild.getAttribute('data-role')).toBe('force-delete-back-icon')
    expect(back.lastChild.textContent).toBe('Back')
  })

  it('leaves the footer to Cancel and the destructive action alone', () => {
    const dialog = build({ onBack: vi.fn() })
    const footer = dialog.querySelector('.force-delete-dialog__footer')
    const roles = [...footer.children].map((c) => c.getAttribute('data-role'))

    expect(roles).toEqual(['force-delete-cancel', 'force-delete-confirm'])
  })

  it('is latched like every other outcome, so a double click cannot fire twice', () => {
    const onBack = vi.fn()
    const dialog = build({ onBack })

    backBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))
    backBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })

  it('does not need the typed name — going back destroys nothing', () => {
    const onBack = vi.fn()
    const dialog = build({ onBack })

    expect(confirmBtn(dialog).hasAttribute('disabled')).toBe(true)
    backBtn(dialog).dispatchEvent(new Event('click', { bubbles: true }))

    expect(onBack).toHaveBeenCalledTimes(1)
  })
})
