// Tag names, glyph keys and variants below are the values recorded in
// docs/superpowers/plans/2026-08-06-ds-component-reference.md — don't guess them, look them up there.
//
// Two of them are not what the plan originally assumed:
//   - The visibility glyph pair is globe/lockAlt, not open-lock/closed-lock: the icon library has no
//     open padlock, and `unlockAlt` draws an undo arrow despite its name.
//   - The destructive button variant is `error`; `destructive` is not in the enum and falls back to navy.
const VISIBILITY_ICON = { public: 'globe', private: 'lockAlt' }
const VISIBILITY_LABEL = { public: 'Public category', private: 'Private category' }

// obs-button emits no custom events — the native click is the contract.
function iconButton({ role, icon, label, variant }) {
  const button = document.createElement('obs-button')
  button.setAttribute('data-role', role)
  button.setAttribute('squared', '') // .squared-button 35x35 — the product's row/toolbar icon action
  button.setAttribute('variant', variant)
  button.setAttribute('aria-label', label)

  const glyph = document.createElement('obs-icon')
  glyph.setAttribute('name', icon)
  glyph.setAttribute('size', '14')
  button.appendChild(glyph)

  return button
}

export function renderCategoryRow(category, handlers = {}) {
  const { onEdit, onDelete } = handlers

  const li = document.createElement('li')
  li.className = 'category-row'
  li.dataset.categoryId = category.id

  // Anatomy mirrors what obs-side-menu mode="categories" renders internally
  // (icon -> label -> actions), so a hand-rolled row still reads as DS-native.
  const lock = document.createElement('span')
  lock.className = 'category-row__lock'
  lock.setAttribute('data-role', 'visibility-lock')
  lock.setAttribute('data-visibility', category.visibility)
  lock.setAttribute('aria-label', VISIBILITY_LABEL[category.visibility])
  lock.setAttribute('role', 'img')

  const lockGlyph = document.createElement('obs-icon')
  lockGlyph.setAttribute('name', VISIBILITY_ICON[category.visibility])
  lockGlyph.setAttribute('size', '14')
  lock.appendChild(lockGlyph)
  li.appendChild(lock)

  const name = document.createElement('span')
  name.className = 'category-row__name'
  name.textContent = category.name
  li.appendChild(name)

  const actions = document.createElement('span')
  actions.className = 'category-row__actions'

  // Every category is editable — built-ins can have their visibility changed even though
  // their name is locked (that distinction is the panel's edit-builtin mode, not the row's).
  const editButton = iconButton({
    role: 'edit-category',
    icon: 'pencil',
    label: `Edit ${category.name}`,
    variant: 'transparent',
  })
  editButton.addEventListener('click', () => onEdit?.(category.id))
  actions.appendChild(editButton)

  if (category.type === 'custom') {
    // `transparent`, not `error`. variant="error" paints a solid red fill — right for the
    // confirmation dialog's Delete button, far too loud for a quiet hover action in a nav list
    // (the DS calls squared-button a "quiet utility control in toolbar/list/grid"). The destructive
    // signal here is the red glyph plus the confirm dialog, not a red block.
    const deleteButton = iconButton({
      role: 'delete-category',
      icon: 'trash',
      label: `Delete ${category.name}`,
      variant: 'transparent',
    })
    deleteButton.addEventListener('click', () => onDelete?.(category.id))
    actions.appendChild(deleteButton)
  }

  li.appendChild(actions)

  return li
}
