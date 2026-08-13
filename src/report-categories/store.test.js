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
