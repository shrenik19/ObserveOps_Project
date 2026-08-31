import { describe, it, expect, vi } from 'vitest'
import { augmentCategoryRows } from './augmentSideMenu.js'

const categories = [
  { id: 'all-reports', name: 'All Reports', type: 'builtin', visibility: 'public', sharedWith: [] },
  { id: 'inventory', name: 'Inventory', type: 'custom', visibility: 'private', sharedWith: [] },
]

// Reproduces the row markup obs-side-menu renders: .row > .lbl (+ .pencil when edit:true),
// plus the pinned Favorites row, which is not a category.
function buildRoot({ withPencil = true } = {}) {
  const root = document.createElement('div')
  root.innerHTML = `
    <div class="srow"><obs-input class="sinput"></obs-input></div>
    <div class="rows">
      <div class="row leaf"><span class="lbl">Favorites</span></div>
      <div class="row leaf"><obs-icon class="r-ic"></obs-icon><span class="lbl">All Reports</span>${withPencil ? '<obs-icon class="pencil"></obs-icon>' : ''}</div>
      <div class="row leaf"><obs-icon class="r-ic"></obs-icon><span class="lbl">Inventory</span>${withPencil ? '<obs-icon class="pencil"></obs-icon>' : ''}</div>
    </div>
  `
  return root
}

const rowFor = (root, label) =>
  [...root.querySelectorAll('.row')].find((r) => r.querySelector('.lbl').textContent === label)


describe('augmentCategoryRows', () => {
  it('adds no delete control — deleting is the drawer\'s job', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    expect(root.querySelector('[data-role="delete-category"]')).toBeNull()
  })

  // The component reveals the pencil on hover AND on the active row; the latter reads as a
  // permanent control rather than an affordance.
  it('hides the pencil on the active row, revealing it only on hover', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    const css = root.querySelector('style[data-role="rbac-augment"]').textContent

    expect(css).toMatch(/\.row\.active \.rbac-action \{\s*visibility: hidden/)
    expect(css.indexOf('.row:hover .rbac-action')).toBeGreaterThan(css.indexOf('.row.active .rbac-action'))
  })

  it('shrinks the visibility indicator to the requested size', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories, iconSize: 12 })
    expect(rowFor(root, 'Inventory').querySelector('.r-ic').getAttribute('size')).toBe('12')
  })

  it('stops a pencil click from reaching the row underneath', () => {
    const rowClick = vi.fn()
    const root = buildRoot()
    augmentCategoryRows({ root, categories, onEdit: vi.fn() })

    const row = rowFor(root, 'Inventory')
    row.addEventListener('click', rowClick)
    row.querySelector('.pencil').dispatchEvent(new Event('click', { bubbles: true }))

    expect(rowClick).not.toHaveBeenCalled()
  })

  it('leaves the Favorites row alone — it is not a category', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })

    const favorites = rowFor(root, 'Favorites')
    expect(favorites.querySelector('.rbac-action')).toBeNull()
    expect(favorites.dataset.rbacBound).toBeUndefined()
  })

  it('calls onEdit with the category when the pencil is activated', () => {
    const onEdit = vi.fn()
    const root = buildRoot()
    augmentCategoryRows({ root, categories, onEdit })

    rowFor(root, 'Inventory').querySelector('.pencil').dispatchEvent(new Event('click', { bubbles: true }))
    expect(onEdit).toHaveBeenCalledWith(categories[1])
  })

  it('gives the pencil an accessible name and keyboard activation', () => {
    const onEdit = vi.fn()
    const root = buildRoot()
    augmentCategoryRows({ root, categories, onEdit })

    const pencil = rowFor(root, 'Inventory').querySelector('.pencil')
    expect(pencil.getAttribute('aria-label')).toBe('Edit Inventory')
    expect(pencil.getAttribute('role')).toBe('button')
    expect(pencil.getAttribute('tabindex')).toBe('0')

    pencil.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    expect(onEdit).toHaveBeenCalledTimes(1)
  })

  // The component re-renders its rows on search and active changes, so this runs repeatedly.
  it('is idempotent — re-running does not duplicate controls', () => {
    const root = buildRoot()
    expect(augmentCategoryRows({ root, categories })).toBe(2)
    expect(augmentCategoryRows({ root, categories })).toBe(0)

    expect(root.querySelectorAll('style[data-role="rbac-augment"]')).toHaveLength(1)
  })

  it('re-augments a row whose category changed identity', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })

    const renamed = [categories[0], { ...categories[1], id: 'inventory-2' }]
    expect(augmentCategoryRows({ root, categories: renamed })).toBe(1)
  })

  it('injects its stylesheet once, into the root it was given', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    const style = root.querySelector('style[data-role="rbac-augment"]')
    expect(style.textContent).toContain('.rbac-action')
    expect(style.textContent).toContain('var(--primary)')
  })

  it('does nothing without a root', () => {
    expect(() => augmentCategoryRows({ categories })).not.toThrow()
    expect(augmentCategoryRows({ categories })).toBe(0)
  })
})


describe('the custom-category marker', () => {
  const markerIn = (root, label) => rowFor(root, label).querySelector('.rbac-type-marker')

  it('marks a CUSTOM category', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    expect(markerIn(root, 'Inventory')).not.toBeNull()
  })

  it('leaves a BUILT-IN category unmarked — the absence is the distinction', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    expect(markerIn(root, 'All Reports')).toBeNull()
  })

  it('uses a glyph the DS actually ships', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    // `user` — a category someone made. The obvious names are unavailable: of the DS's 552 glyphs,
    // only `custom` and `customDashboard` contain "custom", and none contains "categ".
    expect(markerIn(root, 'Inventory').getAttribute('name')).toBe('user')
  })

  it('sits at the END of the name, directly after the label', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    const row = rowFor(root, 'Inventory')
    expect(row.querySelector('.lbl').nextElementSibling).toBe(markerIn(root, 'Inventory'))
  })

  it('is decorative — no role, no tabindex, hidden from assistive tech', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    const marker = markerIn(root, 'Inventory')

    expect(marker.getAttribute('aria-hidden')).toBe('true')
    expect(marker.getAttribute('role')).toBeNull()
    expect(marker.hasAttribute('tabindex')).toBe(false)
  })

  it('is revealed on hover only, like the pencil', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    const css = root.querySelector('style[data-role="rbac-augment"]').textContent

    expect(css).toMatch(/\.rbac-type-marker \{[^}]*visibility: hidden/)
    expect(css).toMatch(/\.row:hover \.rbac-type-marker/)
  })

  it('is not duplicated when the pass runs again over the same rows', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories })
    for (const r of root.querySelectorAll('.row')) delete r.dataset.rbacBound
    augmentCategoryRows({ root, categories })

    expect(rowFor(root, 'Inventory').querySelectorAll('.rbac-type-marker')).toHaveLength(1)
  })
})


describe('the visibility padlock leads the row', () => {
  it('stays IN FRONT of the category name, where the component puts it', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories, onEdit: vi.fn() })

    for (const row of root.querySelectorAll('.row')) {
      const indicator = row.querySelector('.r-ic')
      if (!indicator) continue
      expect(indicator.nextElementSibling).toBe(row.querySelector('.lbl'))
    }
  })

  it('is never moved, however many times the pass runs', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories, onEdit: vi.fn() })
    for (const r of root.querySelectorAll('.row')) delete r.dataset.rbacBound
    augmentCategoryRows({ root, categories, onEdit: vi.fn() })

    const row = rowFor(root, 'Inventory')
    expect(row.querySelector('.r-ic').nextElementSibling).toBe(row.querySelector('.lbl'))
    expect(row.querySelectorAll('.r-ic')).toHaveLength(1)
  })

  it('orders the row: padlock, name, marker, pencil', () => {
    const root = buildRoot()
    augmentCategoryRows({ root, categories, onEdit: vi.fn() })
    const row = rowFor(root, 'Inventory')

    expect([...row.children].map((c) => c.className)).toEqual([
      'r-ic',
      'lbl',
      'rbac-type-marker',
      'pencil rbac-action',
    ])
  })
})
