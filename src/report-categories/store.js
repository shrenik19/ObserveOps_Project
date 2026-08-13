export function createStore(initialCategories) {
  let categories = initialCategories.map((c) => ({ ...c, sharedWith: [...c.sharedWith] }))
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

  function deleteCategory(id) {
    const target = categories.find((c) => c.id === id)
    if (!target) throw new Error(`Unknown category: ${id}`)
    if (target.type === 'builtin') throw new Error(`Cannot delete a builtin category: ${id}`)
    categories = categories.filter((c) => c.id !== id)
    notify()
  }

  function subscribe(listener) {
    listeners.add(listener)
    return () => listeners.delete(listener)
  }

  return { getCategories, getCategory, addCategory, updateVisibility, deleteCategory, subscribe }
}
