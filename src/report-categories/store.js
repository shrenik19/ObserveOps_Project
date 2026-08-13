// The store owns BOTH categories and reports, because the invariant this module protects —
// no report points at a category that no longer exists — spans the two. Keeping reports in the
// host page would put that rule in a file that cannot be tested without a DOM.
//
// Accepts either the legacy bare category array or { categories, reports }, so the original
// callers and tests keep working unchanged.
export function createStore(initial) {
  const isBareArray = Array.isArray(initial)
  let categories = (isBareArray ? initial : initial.categories).map((c) => ({
    ...c,
    sharedWith: [...c.sharedWith],
  }))
  let reports = (isBareArray ? [] : (initial.reports ?? [])).map((r) => ({ ...r }))
  const listeners = new Set()

  function notify() {
    const snapshot = getCategories()
    listeners.forEach((listener) => listener(snapshot))
  }

  function getCategories() {
    return categories.map((c) => ({ ...c, sharedWith: [...c.sharedWith] }))
  }

  function getCategory(id) {
    const found = categories.find((c) => c.id === id)
    return found ? { ...found, sharedWith: [...found.sharedWith] } : undefined
  }

  function getReports() {
    return reports.map((r) => ({ ...r }))
  }

  function getReportsByCategory(categoryId) {
    return reports.filter((r) => r.category === categoryId).map((r) => ({ ...r }))
  }

  function countReportsInCategory(categoryId) {
    return reports.reduce((n, r) => (r.category === categoryId ? n + 1 : n), 0)
  }

  function generateId() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  }

  function addCategory({ name, visibility, sharedWith }) {
    const category = { id: generateId(), name, type: 'custom', visibility, sharedWith: [...sharedWith] }
    categories = [...categories, category]
    notify()
    return { ...category, sharedWith: [...category.sharedWith] }
  }

  function updateVisibility(id, { visibility, sharedWith }) {
    const index = categories.findIndex((c) => c.id === id)
    if (index === -1) throw new Error(`Unknown category: ${id}`)
    categories[index] = { ...categories[index], visibility, sharedWith: [...sharedWith] }
    notify()
  }

  /** Replace one report's mutable display state in place. Used by the grid's typed cells. */
  function updateReport(id, patch) {
    const index = reports.findIndex((r) => r.id === id)
    if (index === -1) throw new Error(`Unknown report: ${id}`)
    reports[index] = { ...reports[index], ...patch }
    notify()
  }

  /** Throws unless the category exists and is deletable. Returns it. */
  function assertDeletable(id) {
    const target = categories.find((c) => c.id === id)
    if (!target) throw new Error(`Unknown category: ${id}`)
    if (target.type === 'builtin') throw new Error(`Cannot delete a builtin category: ${id}`)
    return target
  }

  function removeCategory(id) {
    categories = categories.filter((c) => c.id !== id)
  }

  function deleteCategory(id) {
    assertDeletable(id)
    // Guarded so no caller can orphan a report by reaching for the simplest method. The two
    // explicit paths below are the only ways to delete a category that still holds reports.
    const held = countReportsInCategory(id)
    if (held > 0) throw new Error(`Category still holds ${held} report(s): ${id}`)
    removeCategory(id)
    notify()
  }

  /**
   * Reassign every report out of a category, then delete it. All-or-nothing: it validates the
   * whole assignment map before mutating anything, so a rejected call leaves the store untouched.
   * @param {string} id
   * @param {Record<string,string>} assignments  reportId -> destination categoryId
   */
  function moveReportsAndDeleteCategory(id, assignments = {}) {
    assertDeletable(id)

    const held = reports.filter((r) => r.category === id)
    const missing = held.filter((r) => !assignments[r.id]).map((r) => r.id)
    if (missing.length) throw new Error(`No destination for report(s): ${missing.join(', ')}`)

    for (const report of held) {
      const destination = assignments[report.id]
      if (destination === id) throw new Error(`Cannot move report ${report.id} into the category being deleted`)
      if (!categories.some((c) => c.id === destination)) throw new Error(`Unknown category: ${destination}`)
    }

    reports = reports.map((r) => (r.category === id ? { ...r, category: assignments[r.id] } : r))
    removeCategory(id)
    notify()
  }

  /** Delete a category AND every report inside it. The force path. */
  function deleteCategoryWithReports(id) {
    assertDeletable(id)
    reports = reports.filter((r) => r.category !== id)
    removeCategory(id)
    notify()
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return {
    getCategories,
    getCategory,
    addCategory,
    updateVisibility,
    deleteCategory,
    getReports,
    getReportsByCategory,
    countReportsInCategory,
    updateReport,
    moveReportsAndDeleteCategory,
    deleteCategoryWithReports,
    subscribe,
  }
}
