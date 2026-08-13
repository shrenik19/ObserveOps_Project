// The four-state category delete flow:
//
//   1. confirm          "Are you sure you want to delete X Category?"   No / Yes
//   2. branch           no reports -> delete outright; otherwise -> 3
//   3. reassign         one destination per report                     Cancel / Move and Delete /
//                                                                      Proceed Anyway
//   4. force delete     type the category name to destroy it and its reports
//
// It owns the transitions only. Every rule about what may be deleted lives in store.js, and every
// pixel lives in the three dialog modules — so this file stays small enough to read at a glance.
//
// `mount` / `close` are injected rather than reaching for a DOM node, which is what makes the whole
// flow testable without a host page.

import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'
import { renderReassignReportsDialog } from './reassignReportsDialog.js'
import { renderForceDeleteDialog } from './forceDeleteDialog.js'

/**
 * Categories a report can be moved INTO. Excludes the category being deleted and `all-reports`,
 * which is a virtual view over every report rather than a bucket of its own. Favorites never
 * appears here — it is a pinned pseudo-category and is not in the store at all.
 */
export function destinationsFor(store, excludeId) {
  return store
    .getCategories()
    .filter((c) => c.id !== excludeId && c.id !== 'all-reports')
    .map((c) => ({ id: c.id, name: c.name }))
}

/**
 * @param {object}   options
 * @param {object}   options.category   the category to delete
 * @param {object}   options.store
 * @param {Function} options.mount      (element) => void — show one dialog, replacing any other
 * @param {Function} options.close      () => void — tear every dialog down
 * @param {Function} [options.onDeleted] (categoryId) => void — after any successful delete
 */
export function startDeleteCategoryFlow({ category, store, mount, close, onDeleted } = {}) {
  const cancel = () => close?.()

  const finish = () => {
    close?.()
    onDeleted?.(category.id)
  }

  function openForceDelete() {
    mount(
      renderForceDeleteDialog({
        categoryName: category.name,
        onCancel: cancel,
        onConfirm: () => {
          store.deleteCategoryWithReports(category.id)
          finish()
        },
      })
    )
  }

  function openReassign() {
    mount(
      renderReassignReportsDialog({
        categoryName: category.name,
        reports: store.getReportsByCategory(category.id).map((r) => ({ id: r.id, name: r.title })),
        categories: destinationsFor(store, category.id),
        onCancel: cancel,
        onMoveAndDelete: (assignments) => {
          store.moveReportsAndDeleteCategory(category.id, assignments)
          finish()
        },
        onProceedAnyway: openForceDelete,
      })
    )
  }

  mount(
    renderDeleteConfirmDialog({
      categoryName: category.name,
      onCancel: cancel,
      onConfirm: () => {
        if (store.countReportsInCategory(category.id) === 0) {
          store.deleteCategory(category.id)
          return finish()
        }
        openReassign()
      },
    })
  )
}
