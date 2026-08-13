import { describe, it, expect, vi } from 'vitest'
import { createStore } from './store.js'

const seed = [
  { id: 'all-reports', name: 'All Reports', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'private', sharedWith: [{ type: 'user', id: 'u1' }] },
]

describe('createStore', () => {
  it('returns a copy of the seeded categories', () => {
    const store = createStore(seed)
    expect(store.getCategories()).toEqual(seed)
    expect(store.getCategories()).not.toBe(seed)
  })

  it('gets a single category by id', () => {
    const store = createStore(seed)
    expect(store.getCategory('inventory').name).toBe('Inventory')
    expect(store.getCategory('missing')).toBeUndefined()
  })

  it('updates visibility and sharedWith, notifying subscribers', () => {
    const store = createStore(seed)
    const listener = vi.fn()
    store.subscribe(listener)

    store.updateVisibility('all-reports', { visibility: 'private', sharedWith: [{ type: 'user', id: 'u2' }] })

    const updated = store.getCategory('all-reports')
    expect(updated.visibility).toBe('private')
    expect(updated.sharedWith).toEqual([{ type: 'user', id: 'u2' }])
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0]).toEqual(store.getCategories())
  })

  it('throws when updating an unknown category', () => {
    const store = createStore(seed)
    expect(() => store.updateVisibility('missing', { visibility: 'public', sharedWith: [] })).toThrow(
      'Unknown category: missing'
    )
  })

  it('deletes a custom category and notifies subscribers', () => {
    const store = createStore(seed)
    const listener = vi.fn()
    store.subscribe(listener)

    store.deleteCategory('inventory')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getCategories()).toHaveLength(1)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('refuses to delete a builtin category', () => {
    const store = createStore(seed)
    expect(() => store.deleteCategory('all-reports')).toThrow('Cannot delete a builtin category: all-reports')
  })

  it('adds a new custom category with a generated id, notifying subscribers', () => {
    const store = createStore(seed)
    const listener = vi.fn()
    store.subscribe(listener)

    const created = store.addCategory({ name: 'Wireless', visibility: 'public', sharedWith: [] })

    expect(created.type).toBe('custom')
    expect(created.name).toBe('Wireless')
    expect(typeof created.id).toBe('string')
    expect(created.id.length).toBeGreaterThan(0)
    expect(store.getCategory(created.id)).toEqual(created)
    expect(store.getCategories()).toHaveLength(3)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('generates distinct ids for categories added in the same tick', () => {
    const store = createStore(seed)
    const first = store.addCategory({ name: 'Wireless', visibility: 'public', sharedWith: [] })
    const second = store.addCategory({ name: 'Wireless', visibility: 'public', sharedWith: [] })
    expect(first.id).not.toBe(second.id)
  })
})

const reportSeed = [
  { id: 'r1', category: 'inventory', title: 'Switch Inventory' },
  { id: 'r2', category: 'inventory', title: 'Firmware Compliance' },
  { id: 'r3', category: 'config', title: '3rd August Training' },
]

// The shared `seed` above carries only two categories and the original tests assert against it
// exactly, so the report tests get their own seed with a second destination to move into.
const reportCategories = [
  ...seed,
  { id: 'config', name: 'Config', type: 'builtin', visibility: 'public', sharedWith: [] },
]

const withReports = () => createStore({ categories: reportCategories, reports: reportSeed })

describe('createStore — reports', () => {
  it('accepts the legacy bare-array form and reports no reports', () => {
    const store = createStore(seed)
    expect(store.getReports()).toEqual([])
    expect(store.countReportsInCategory('inventory')).toBe(0)
  })

  it('returns copies of reports, not the seeded objects', () => {
    const store = withReports()
    expect(store.getReports()).toEqual(reportSeed)
    expect(store.getReports()).not.toBe(reportSeed)
    expect(store.getReports()[0]).not.toBe(reportSeed[0])
  })

  it('lists and counts the reports in a category', () => {
    const store = withReports()
    expect(store.getReportsByCategory('inventory').map((r) => r.id)).toEqual(['r1', 'r2'])
    expect(store.countReportsInCategory('inventory')).toBe(2)
    expect(store.countReportsInCategory('all-reports')).toBe(0)
  })

  it('refuses a plain delete while the category still holds reports', () => {
    const store = withReports()
    expect(() => store.deleteCategory('inventory')).toThrow(
      'Category still holds 2 report(s): inventory'
    )
    expect(store.getCategory('inventory')).toBeDefined()
  })

  it('allows a plain delete once the category is empty', () => {
    const store = createStore({ categories: seed, reports: [] })
    store.deleteCategory('inventory')
    expect(store.getCategory('inventory')).toBeUndefined()
  })
})

describe('moveReportsAndDeleteCategory', () => {
  it('moves every report then deletes the category, notifying once', () => {
    const store = withReports()
    const listener = vi.fn()
    store.subscribe(listener)

    store.moveReportsAndDeleteCategory('inventory', { r1: 'config', r2: 'config' })

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReportsByCategory('config').map((r) => r.id)).toEqual(['r1', 'r2', 'r3'])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('preserves every other field on a moved report', () => {
    const store = createStore({
      categories: seed,
      reports: [{ id: 'r1', category: 'inventory', title: 'Switch Inventory', favorite: true, schedule: true }],
    })
    store.moveReportsAndDeleteCategory('inventory', { r1: 'all-reports' })
    const moved = store.getReports()[0]
    expect(moved).toEqual({ id: 'r1', category: 'all-reports', title: 'Switch Inventory', favorite: true, schedule: true })
  })

  it('throws and changes nothing when a report has no destination', () => {
    const store = withReports()
    expect(() => store.moveReportsAndDeleteCategory('inventory', { r1: 'config' })).toThrow(
      'No destination for report(s): r2'
    )
    expect(store.getCategory('inventory')).toBeDefined()
    expect(store.getReportsByCategory('inventory')).toHaveLength(2)
  })

  it('throws when a destination is the category being deleted', () => {
    const store = withReports()
    expect(() => store.moveReportsAndDeleteCategory('inventory', { r1: 'inventory', r2: 'config' })).toThrow(
      'Cannot move report r1 into the category being deleted'
    )
  })

  it('throws when a destination does not exist', () => {
    const store = withReports()
    expect(() => store.moveReportsAndDeleteCategory('inventory', { r1: 'nope', r2: 'config' })).toThrow(
      'Unknown category: nope'
    )
  })

  it('refuses to move out of a builtin category', () => {
    const store = createStore({
      categories: seed,
      reports: [{ id: 'r9', category: 'all-reports', title: 'X' }],
    })
    expect(() => store.moveReportsAndDeleteCategory('all-reports', { r9: 'inventory' })).toThrow(
      'Cannot delete a builtin category: all-reports'
    )
  })
})

describe('deleteCategoryWithReports', () => {
  it('removes the category and exactly its own reports, notifying once', () => {
    const store = withReports()
    const listener = vi.fn()
    store.subscribe(listener)

    store.deleteCategoryWithReports('inventory')

    expect(store.getCategory('inventory')).toBeUndefined()
    expect(store.getReports().map((r) => r.id)).toEqual(['r3'])
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('refuses to force-delete a builtin category', () => {
    const store = withReports()
    expect(() => store.deleteCategoryWithReports('all-reports')).toThrow(
      'Cannot delete a builtin category: all-reports'
    )
  })

  it('throws on an unknown category', () => {
    const store = withReports()
    expect(() => store.deleteCategoryWithReports('missing')).toThrow('Unknown category: missing')
  })
})

describe('updateReport', () => {
  it('patches a report and notifies', () => {
    const store = withReports()
    const listener = vi.fn()
    store.subscribe(listener)
    store.updateReport('r1', { favorite: true })
    expect(store.getReports().find((r) => r.id === 'r1').favorite).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('throws on an unknown report', () => {
    expect(() => withReports().updateReport('nope', {})).toThrow('Unknown report: nope')
  })
})
