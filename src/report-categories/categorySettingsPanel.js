// Tag names, events, variants and tokens below come from
// docs/superpowers/plans/2026-08-06-ds-component-reference.md. Notably:
//   - obs-drawer ships as a real web component, so this is NOT a hand-composed overlay.
//   - obs-button emits no custom events; the native click is the contract.
//   - obs-input fires `input`/`change`; obs-radio and obs-select fire `change`.
//   - Every DS event delivers its value in event.detail as an ARRAY.

const BANNER_TEXT = {
  public: 'Visible to all users in the organization.',
  private: 'Only the Users or User Profiles you add can view this dashboard.',
}

const TITLE = { create: 'New Category', 'edit-builtin': 'Edit Category', 'edit-custom': 'Edit Category' }

// obs-select speaks in flat { key, text } options and string keys — it cannot carry the store's
// { type, id } entries directly (handing it objects renders "[object Object]"). These two functions
// are the only bridge between the two shapes.
const toKey = (entry) => `${entry.type}:${entry.id}`

function fromKey(key) {
  const separator = key.indexOf(':')
  return { type: key.slice(0, separator), id: key.slice(separator + 1) }
}

/** Spec: entries read as `@User` or `#User Profile`. */
const defaultLabel = (entry) => `${entry.type === 'profile' ? '#' : '@'}${entry.id}`

/** DS events wrap their value in an array — unwrap it, but tolerate a bare value. */
function detailValue(event) {
  const { detail } = event
  if (Array.isArray(detail)) return detail[0]
  if (detail !== undefined && detail !== null) return detail
  return event.target?.value
}

function button({ role, label, variant }) {
  const el = document.createElement('obs-button')
  el.setAttribute('data-role', role)
  el.setAttribute('variant', variant)
  el.textContent = label
  return el
}

function errorText(role, message) {
  const el = document.createElement('p')
  el.setAttribute('data-role', role)
  el.className = 'category-settings-panel__error'
  el.textContent = message
  el.hidden = true
  return el
}

export function renderCategorySettingsPanel({
  mode,
  category,
  onSave,
  onCancel,
  onDelete,
  // Selectable users/profiles: [{ type, id, label? }]. Supplied by the host (Task 7).
  directory = [],
} = {}) {
  // Local, non-destructive copy — the panel must never edit the store's object in place.
  const state = {
    name: category?.name ?? '',
    visibility: category?.visibility ?? 'public',
    sharedWith: category ? category.sharedWith.map((entry) => ({ ...entry })) : [],
  }

  const nameIsEditable = mode !== 'edit-builtin'

  const panel = document.createElement('obs-drawer')
  panel.setAttribute('data-role', 'category-settings-panel')
  panel.setAttribute('open', '')
  panel.setAttribute('title', TITLE[mode])
  // 40% is the element's own default (elements-api.json: width default '40%'; the registry's size
  // ladder marks it "default"). Set explicitly rather than omitted, so the panel keeps this width if
  // the DS ever changes its fallback. The spec markdown offers 480px as the alternative for the
  // detail/form variant — "width=\"480\" (or 40%)" — see gap G20 for why that value is easy to miss.
  panel.setAttribute('width', '40%')
  // No inset work needed: as of elements@0.1.159 the heading, body and footer all read
  // var(--drawer-inset, 15px), so they line up by default (G19 fixed). Set --drawer-inset to
  // change all three together. `use-padding` still moves only the body — left off deliberately.

  const body = document.createElement('div')
  body.className = 'category-settings-panel'
  panel.appendChild(body)

  // --- Name -------------------------------------------------------------
  // obs-input carries its own `label` (the FlotoFormItem pattern) — no wrapper needed.
  const nameInput = document.createElement('obs-input')
  nameInput.setAttribute('data-role', 'category-name')
  nameInput.setAttribute('label', 'Name')
  nameInput.setAttribute('value', state.name)
  nameInput.setAttribute('block', '')
  if (nameIsEditable) {
    nameInput.setAttribute('required', '')
  } else {
    nameInput.setAttribute('disabled', '')
  }
  nameInput.addEventListener('input', (event) => {
    state.name = detailValue(event) ?? ''
    if (state.name.trim()) hideError(nameError)
  })
  body.appendChild(nameInput)

  const nameError = errorText('name-error', 'Name is required.')
  body.appendChild(nameError)

  // --- Visibility & Sharing --------------------------------------------
  // A plain heading, per the project's DS rule — never a text-divider.
  const heading = document.createElement('h3')
  heading.setAttribute('data-role', 'visibility-heading')
  heading.className = 'category-settings-panel__heading'
  heading.textContent = 'Visibility & Sharing'
  body.appendChild(heading)

  // The DS has no separate segmented control: a segmented control IS obs-radio with as-button.
  const toggle = document.createElement('obs-radio')
  toggle.setAttribute('data-role', 'visibility-toggle')
  toggle.setAttribute('as-button', '')
  toggle.setAttribute('value', state.visibility)
  toggle.dataset.selected = state.visibility
  toggle.options = [
    { value: 'public', text: 'Public' },
    { value: 'private', text: 'Private' },
  ]
  toggle.addEventListener('change', (event) => {
    const next = detailValue(event)
    if (next !== 'public' && next !== 'private') return
    state.visibility = next
    toggle.dataset.selected = next
    toggle.setAttribute('value', next)
    hideError(sharingError)
    renderVisibilityDependent()
  })
  body.appendChild(toggle)

  // The real DS banner. This was a hand-built reproduction using --neutral-lightest off-purpose,
  // because the DS shipped no banner component and no info-surface token — both landed in
  // elements@0.1.144 / css@0.1.2, so the reproduction and its declared token deviation are gone.
  // obs-banner brings its own ⓘ icon and surface.
  const banner = document.createElement('obs-banner')
  banner.setAttribute('data-role', 'visibility-banner')
  banner.setAttribute('variant', 'info')

  const bannerText = document.createElement('span')
  banner.appendChild(bannerText)
  body.appendChild(banner)

  const sharingError = errorText('sharing-error', 'Add at least one user or user profile.')
  body.appendChild(sharingError)

  let picker = null

  function renderVisibilityDependent() {
    bannerText.textContent = BANNER_TEXT[state.visibility]

    if (picker) {
      picker.remove()
      picker = null
    }
    if (state.visibility !== 'private') return

    picker = document.createElement('obs-select')
    picker.setAttribute('data-role', 'sharing-picker')
    picker.setAttribute('label', 'Users / User Profile')
    picker.setAttribute('multiple', '')
    picker.setAttribute('block', '')
    picker.setAttribute('placeholder', 'Select users or user profiles')

    // Anything already shared but absent from the directory still needs a label, or the pre-selected
    // entries would render blank.
    const known = new Map(directory.map((entry) => [toKey(entry), entry.label ?? defaultLabel(entry)]))
    for (const entry of state.sharedWith) {
      if (!known.has(toKey(entry))) known.set(toKey(entry), defaultLabel(entry))
    }
    picker.addEventListener('change', (event) => {
      const next = detailValue(event)
      state.sharedWith = (Array.isArray(next) ? next : []).map(fromKey)
      if (state.sharedWith.length) hideError(sharingError)
    })

    // Sits directly below the banner, per the spec's "conditional content below the toggle".
    sharingError.insertAdjacentElement('beforebegin', picker)

    // Assign the object-valued props only AFTER insertion. Setting them on a not-yet-upgraded
    // custom element leaves plain own-properties that shadow the element's accessors once it
    // upgrades, so the trigger renders the raw key instead of the option's label.
    // { value, text }, NOT the catalogue's canonical { key, text } — that is the Vue component's
    // shape. The web element resolves an option's display as `text ?? value` and matches the
    // selection on `.value`, so a { key, … } option never matches and the trigger falls back to
    // showing the raw key. Same shape obs-radio uses.
    picker.options = [...known].map(([value, text]) => ({ value, text }))
    picker.value = state.sharedWith.map(toKey)
  }

  renderVisibilityDependent()

  // --- Footer -----------------------------------------------------------
  // Goes in obs-drawer's `actions` SLOT, not the body — the slot is the drawer's pinned footer
  // region. Putting these in the body makes them float mid-panel wherever the content ends.
  // (obs-drawer also ships footer presets — close · cancel-save · reset-cancel-save · delete-split ·
  // note-split — and `delete-split` is this exact layout. The slot is used instead only because we
  // need per-button variants and the data-role hooks the tests query.)
  const footer = document.createElement('div')
  footer.setAttribute('slot', 'actions')
  footer.className = 'category-settings-panel__footer'

  if (mode === 'edit-custom') {
    const deleteButton = button({ role: 'delete-category', label: 'Delete', variant: 'error' })
    deleteButton.addEventListener('click', () => onDelete?.(category.id))
    footer.appendChild(deleteButton)
  }

  const confirmGroup = document.createElement('div')
  confirmGroup.className = 'category-settings-panel__confirm-group'

  const cancelButton = button({ role: 'cancel-category', label: 'Cancel', variant: 'default' })
  cancelButton.addEventListener('click', () => onCancel?.())
  confirmGroup.appendChild(cancelButton)

  const saveButton = button({ role: 'save-category', label: 'Save', variant: 'primary' })
  saveButton.addEventListener('click', () => {
    if (!validate()) return
    onSave?.(payload())
  })
  confirmGroup.appendChild(saveButton)

  footer.appendChild(confirmGroup)
  // Appended to the DRAWER, not the body — a slotted child must be a direct child of the host.
  panel.appendChild(footer)

  function showError(el) {
    el.hidden = false
  }

  function hideError(el) {
    el.hidden = true
  }

  function validate() {
    let ok = true

    if (nameIsEditable && !state.name.trim()) {
      showError(nameError)
      nameInput.setAttribute('error', '')
      ok = false
    } else {
      hideError(nameError)
      nameInput.removeAttribute('error')
    }

    if (state.visibility === 'private' && state.sharedWith.length === 0) {
      showError(sharingError)
      ok = false
    } else {
      hideError(sharingError)
    }

    return ok
  }

  function payload() {
    const base = { visibility: state.visibility, sharedWith: state.sharedWith }
    // edit-builtin can't rename, so it doesn't report a name at all.
    return nameIsEditable ? { name: state.name.trim(), ...base } : base
  }


  return panel
}
