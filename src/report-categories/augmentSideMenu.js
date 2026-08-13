// Augments obs-side-menu's rendered rows with the affordances the DS deliberately leaves to the
// consumer. From side-menu.json's own known-issue:
//
//   "obs-side-menu is a render-faithful reproduction ... inline rename (pencil), create/delete
//    affordances, and the router/filter wiring are the consumer's; obs-side-menu provides the
//    searchable accordion/tree chrome + select/tab/search events."
//
// The create affordance now lives in the component's own `search-action` slot (added in
// elements@0.1.150), so only the row-level wiring is left here. What it adds:
//   - real click wiring for the pencil (the component renders it but emits only `select`, with the
//     same payload as a row click, so there is no event to bind)
//   - an accessible name + keyboard activation, which the component's bare <obs-icon> lacks
//   - hover-only reveal: the component also shows the pencil on the ACTIVE row, which reads as a
//     permanent control rather than an affordance
//
// Deleting a category is deliberately NOT here — it lives in the settings drawer, so the row stays
// a navigation target with a single edit affordance.
//
// It operates on any root element so it can be tested without a live custom element.

const STYLE_MARKER = 'rbac-augment'

// Mirrors the component's own .pencil rule (hidden until the row is hovered or active) so the
// injected control behaves identically. Colours are tokens — never hardcoded.
const AUGMENT_CSS = `
  .rbac-action {
    flex-shrink: 0;
    cursor: pointer;
    visibility: hidden;
  }
  /* The component reveals the pencil on hover AND on the active row. Hide it on the active row so
     it stays an on-hover affordance; source order beats the component's own rule at equal
     specificity. The :hover rule follows so an active+hovered row still shows it. */
  .row.active .rbac-action {
    visibility: hidden;
  }
  .row:hover .rbac-action,
  .rbac-action:focus-visible {
    visibility: visible;
  }
  /* The visibility indicator is state, not an action — smaller than the row's text and controls. */
  .r-ic {
    flex-shrink: 0;
  }
  /* The component strips focus rings (catalogue-wide SF-001); restore one for the controls we own. */
  .rbac-action:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  /* The custom/default marker. Decorative only — it states a fact about the row, it does not act,
     so it carries no role and no tabindex (adding those would repeat gap G22's mistake). Hidden
     until hover, matching the pencil's behaviour. */
  .rbac-type-marker {
    flex-shrink: 0;
    visibility: hidden;
    color: var(--neutral-light);
  }
  .row:hover .rbac-type-marker {
    visibility: visible;
  }

`

function ensureStyles(root) {
  if (root.querySelector(`style[data-role="${STYLE_MARKER}"]`)) return
  const style = document.createElement('style')
  style.setAttribute('data-role', STYLE_MARKER)
  style.textContent = AUGMENT_CSS
  root.appendChild(style)
}

/** Make an icon behave like a real button — the DS renders bare, unfocusable <obs-icon>s. */
function makeActivatable(el, label, onActivate) {
  el.setAttribute('role', 'button')
  el.setAttribute('tabindex', '0')
  el.setAttribute('aria-label', label)
  el.addEventListener('click', (event) => {
    event.stopPropagation()
    onActivate()
  })
  el.addEventListener('keydown', (event) => {
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    event.stopPropagation()
    onActivate()
  })
}

/**
 * @param {object}   options
 * @param {Element}  options.root        the side menu's shadow root (or any container of `.row`s)
 * @param {Array}    options.categories  the RBAC store's categories
 * @param {Function} options.onEdit      called with the category
 * @param {number}   options.iconSize    px size for the row's visibility indicator
 * @returns {number} how many rows were augmented this pass
 */
export function augmentCategoryRows({ root, categories = [], onEdit, iconSize = 12 } = {}) {
  if (!root) return 0
  ensureStyles(root)

  let touched = 0

  for (const row of root.querySelectorAll('.row')) {
    const label = row.querySelector('.lbl')?.textContent?.trim()
    const category = categories.find((c) => c.name === label)
    if (!category) continue // e.g. the pinned Favorites row, which is not a category

    // Idempotent: the component re-renders its rows on search/active changes, so this runs again.
    if (row.dataset.rbacBound === category.id) continue
    row.dataset.rbacBound = category.id
    touched += 1

    // The component renders the visibility glyph at row-text size; shrink it so it reads as a
    // quiet state indicator. obs-icon takes its size from the attribute, not CSS.
    const indicator = row.querySelector('.r-ic')
    if (indicator) indicator.setAttribute('size', String(iconSize))

    // Mark custom categories so a user can tell them from the built-in ones without opening the
    // drawer. Default categories get nothing, which is the distinction.
    if (category.type === 'custom' && !row.querySelector('.rbac-type-marker')) {
      const marker = document.createElement('obs-icon')
      marker.className = 'rbac-type-marker'
      marker.setAttribute('name', 'cog')
      marker.setAttribute('size', String(iconSize))
      marker.setAttribute('aria-hidden', 'true')
      const existingPencil = row.querySelector('.pencil')
      if (existingPencil) row.insertBefore(marker, existingPencil)
      else row.appendChild(marker)
    }

    const pencil = row.querySelector('.pencil')
    if (pencil) {
      pencil.classList.add('rbac-action')
      makeActivatable(pencil, `Edit ${category.name}`, () => onEdit?.(category))
    }

  }

  return touched
}
