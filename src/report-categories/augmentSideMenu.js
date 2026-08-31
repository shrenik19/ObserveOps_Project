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
// Custom categories carry a marker at the END of their name, revealed on hover like the pencil.
// Built-in categories get nothing at all — the absence IS the distinction, so the marker never has to
// be read as "this one is default".
//
// The glyph is `user` — a category someone made, as opposed to one that shipped with the product.
//
// It is not the obvious name, because the obvious names do not exist. The DS ships 552 glyphs;
// exactly TWO contain "custom" (`custom`, `customDashboard`) and NONE contains "categ", so
// `customCategory` and `customReport` are both unavailable (DS-GAPS G24 — established by extracting
// the bundle's own glyph map, since there is still no published icon inventory).
//
// PROVISIONAL. It stands in for a custom-category glyph the DS does not ship; change the name here
// if one ever arrives.
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
  /* The visibility indicator is state, not an action — smaller than the row's text and controls.
     It stays where the component puts it: leading, in front of the name. */
  .r-ic {
    flex-shrink: 0;
  }
  /* flex-GROW must be 0. The component gives .lbl flex:1, which makes the label eat the whole row
     and shoves the custom marker against the right edge — where it reads as another action beside
     the pencil rather than as a mark on the name. Shrinking is still allowed, so a long name
     ellipsises instead of pushing the marker out of the row. */
  .row .lbl {
    flex: 0 1 auto;
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  /* Hugs the end of the name. Without this the row's own gap strands it mid-row. */
  .row .lbl + .rbac-type-marker {
    margin-left: 6px;
  }
  /* The label no longer takes the slack, so the row's ACTIONS have to claim it — otherwise the
     pencil creeps in beside the name instead of sitting at the row's right edge. The first match
     takes all the free space; anything after it packs against it. */
  .row .pencil,
  .row .cnt {
    margin-left: auto;
  }
  .row .pencil ~ .cnt {
    margin-left: 4px;
  }
  /* Hidden until the row is hovered, exactly like the pencil — it is a detail, not a permanent
     badge, so a resting list stays quiet. */
  .rbac-type-marker {
    flex-shrink: 0;
    visibility: hidden;
    color: var(--neutral-light);
  }
  .row:hover .rbac-type-marker {
    visibility: visible;
  }

  /* The component strips focus rings (catalogue-wide SF-001); restore one for the controls we own. */
  .rbac-action:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
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

    // Sits immediately after the label, so it reads as a mark ON the name rather than as a second
    // action next to the pencil. Decorative: it states a fact, it does not act, so it carries no role
    // and no tabindex (adding those would repeat gap G22's mistake).
    if (category.type === 'custom' && !row.querySelector('.rbac-type-marker')) {
      const marker = document.createElement('obs-icon')
      marker.className = 'rbac-type-marker'
      marker.setAttribute('name', 'user')
      marker.setAttribute('size', String(iconSize))
      marker.setAttribute('aria-hidden', 'true')
      const label = row.querySelector('.lbl')
      if (label) label.insertAdjacentElement('afterend', marker)
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
