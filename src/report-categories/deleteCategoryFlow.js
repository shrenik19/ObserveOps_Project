// The four-state category delete flow:
//
//   1. confirm          the question AND what it costs, in numbers      No / Yes
//   2. branch           no reports -> delete outright; otherwise -> 3
//   3. reassign         a destination per report, in bulk or one by one Cancel / Move and Delete /
//                                                                      Proceed Anyway
//   4. type the name    BOTH routes out of step 3 land here
//
// Step 4 used to gate only Proceed Anyway, with Move and Delete committing straight from the grid.
// Both routes destroy the category, so both are now gated the same way and differ only in what the
// dialog says: one lists where the reports are going, the other says how many are about to be lost.
//
// It owns the transitions only. Every rule about what may be deleted lives in store.js, and every
// pixel lives in the three dialog modules — so this file stays small enough to read at a glance.
//
// `mount` / `close` are injected rather than reaching for a DOM node, which is what makes the whole
// flow testable without a host page.

import { renderDeleteConfirmDialog } from './deleteConfirmDialog.js'
import { renderReassignReportsDialog } from './reassignReportsDialog.js'
import { renderForceDeleteDialog, summariseMoves } from './forceDeleteDialog.js'

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

  /**
   * What the reassign grid held when the user last left it. Kept at flow level, not inside the
   * dialog, because the dialog is destroyed on every step change — going Back builds a NEW grid and
   * this is what makes it come back filled in rather than blank.
   */
  let chosen = {}

  const finish = () => {
    close?.()
    onDeleted?.(category.id)
  }

  /** How many reports the category holds right now — read fresh, never cached across steps. */
  const reportCount = () => store.countReportsInCategory(category.id)

  /** Step 4, destructive route: the category and every report in it. */
  function openForceDelete() {
    mount(
      renderForceDeleteDialog({
        categoryName: category.name,
        mode: 'force',
        reportCount: reportCount(),
        onBack: openReassign,
        onCancel: cancel,
        onConfirm: () => {
          store.deleteCategoryWithReports(category.id)
          finish()
        },
      })
    )
  }

  /** Step 4, relocating route: the same gate, with the destinations spelled out. */
  function openMoveConfirm(assignments) {
    // Remembered before the confirmation replaces this step, so Back can hand it straight back.
    chosen = { ...assignments }
    const moves = summariseMoves(assignments, destinationsFor(store, category.id))
    mount(
      renderForceDeleteDialog({
        categoryName: category.name,
        mode: 'move',
        // The whole category, and how much of it is being kept — the dialog needs both to say
        // "7 out of 10".
        reportCount: reportCount(),
        movedCount: Object.keys(assignments).length,
        moves,
        onBack: openReassign,
        onCancel: cancel,
        onConfirm: () => {
          store.moveReportsAndDeleteCategory(category.id, assignments)
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
        initialAssignments: chosen,
        onCancel: cancel,
        // Hands off to the typed-name gate rather than committing — the grid decides WHERE the
        // reports go, step 4 decides whether it happens at all.
        onMoveAndDelete: openMoveConfirm,
        onProceedAnyway: openForceDelete,
      })
    )
  }

  mount(
    renderDeleteConfirmDialog({
      categoryName: category.name,
      // The first dialog now discloses the cost instead of only asking for consent.
      reportCount: reportCount(),
      onCancel: cancel,
      onConfirm: () => {
        if (reportCount() === 0) {
          store.deleteCategory(category.id)
          return finish()
        }
        openReassign()
      },
    })
  )
}
