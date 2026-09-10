// The DS's LARGE / FULL-SCREEN drawer tier — `width` 85–96%, `scrolled-content="false"`, and a
// 2 : 6 : 4 body whose three columns scroll independently.
//
// This is the shape `apm-application-registration-drawer.vue` established and the drawer spec
// documents as the tier for "complex multi-pane flows — a left nav + main scrollable form + a right
// reference panel". Both Create forms in this app are that shape: Create SLO Profile and Create
// Discovery Profile each open OVER their list, not beside it.
//
// The DS ships the TOKENS for this (--drawer-sidebar-background, --code-tag-background-color,
// --dashboard-background, --help-card-bg-color all resolve) but NOT the classes: the `.ds-*`
// primitives the drawer spec's changelog names live in the storybook's own ds-primitives.less and
// are absent from @mtdt/observeops-ds-css. So the panes are app CSS over published tokens —
// paneDrawer.css — the same treatment src/slo-list/sloList.css gives its tiles (G47).

import './paneDrawer.css'

/**
 * @param {object}    o
 * @param {string}    o.title      drawer header
 * @param {Node}      o.nav        column 1 — the 2
 * @param {Node}      o.form       column 2 — the 6
 * @param {Node}      o.help       column 3 — the 4
 * @param {Node}     [o.actions]   pinned footer; goes in obs-drawer's `actions` SLOT, not the body
 * @param {Function} [o.onClose]   the drawer's own × / Escape
 * @param {string}   [o.width]     85–96% is the tier; 96% is the reference implementation
 */
export function renderPaneDrawer({ title, nav, form, help, actions, onClose, width = '96%' }) {
  const drawer = document.createElement('obs-drawer')
  drawer.setAttribute('open', '')
  drawer.setAttribute('title', title)
  drawer.setAttribute('width', width)
  // The whole point of the tier: without this the drawer wraps the body in ONE scroll region and
  // the three columns can no longer scroll independently.
  drawer.setAttribute('scrolled-content', 'false')

  const body = document.createElement('div')
  body.className = 'pane-drawer'

  const column = (name, content) => {
    const col = document.createElement('div')
    col.className = `pane-drawer__col pane-drawer__${name}`
    if (content) col.append(content)
    return col
  }

  body.append(column('nav', nav), column('form', form), column('help', help))
  drawer.append(body)

  if (actions) {
    // obs-drawer's `actions` slot is its pinned footer — the same placement
    // src/report-categories/categorySettingsPanel.js uses, and the reason we do not take one of the
    // built-in footer presets: these two forms carry their own action sets.
    actions.setAttribute('slot', 'actions')
    drawer.append(actions)
  }

  // obs-drawer fires `close` when it is REMOVED FROM THE DOM as well as when the user closes it,
  // and neither the registry nor elements-api.json says so. Wiring `close` straight to "go back to
  // the list" therefore tears down whatever replaced the drawer: Save and Run swapped the progress
  // panel in, the drawer's removal fired `close`, and the handler immediately emptied the view
  // again. Exactly the trap G25 records for obs-modal, now in obs-drawer — filed as G51.
  //
  // The two cases are distinguishable, verified in real Chrome: a user close fires while the
  // element is still connected (and with `open` already cleared); a teardown fires after it has
  // been detached. Only the connected one is a user closing the drawer.
  if (onClose) {
    drawer.addEventListener('close', () => {
      if (drawer.isConnected) onClose()
    })
  }

  return drawer
}

/** Column 1 — the tinted rail. Selected sits on --code-tag-background-color, per the reference. */
export function renderNavRail({ items, selected, onSelect = () => {}, heading, search = false }) {
  const rail = document.createElement('nav')
  rail.className = 'pane-drawer__rail'

  if (heading) {
    const h = document.createElement('h3')
    h.className = 'pane-drawer__rail-heading'
    h.textContent = heading
    rail.append(h)
  }

  if (search) {
    const box = document.createElement('obs-input')
    box.setAttribute('type', 'search')
    box.setAttribute('placeholder', 'Search')
    box.className = 'pane-drawer__rail-search'
    rail.append(box)
  }

  const list = document.createElement('ul')
  list.className = 'pane-drawer__nav-list'

  for (const item of items) {
    const li = document.createElement('li')
    const button = document.createElement('button')
    button.type = 'button'
    button.className = 'pane-drawer__nav-item'
    button.dataset.key = item.key
    button.textContent = item.label

    if (item.disabled) {
      // A category this flow does not serve is still part of the product's tree — shown, so the
      // rail reads as the real Discovery tree, but not choosable here.
      button.setAttribute('disabled', '')
    } else {
      button.addEventListener('click', () => onSelect(item.key))
    }

    if (item.key === selected) {
      button.classList.add('is-selected')
      button.setAttribute('aria-current', 'true')
    }

    li.append(button)
    list.append(li)
  }

  rail.append(list)
  return rail
}

/** Column 3 — the reference panel. Sections are the product's collapsible help rows. */
export function renderHelpPanel({ title, sections = [], footer } = {}) {
  const panel = document.createElement('aside')
  panel.className = 'pane-drawer__help-panel'

  const h = document.createElement('h3')
  h.className = 'pane-drawer__help-title'
  h.textContent = title
  panel.append(h)

  for (const section of sections) {
    // <details> is the product's collapsible help row. There is no DS equivalent — 0 of 47 elements
    // match /collapse|accordion|details/ — so this is app markup over published tokens.
    const row = document.createElement('details')
    row.className = 'pane-drawer__help-section'
    if (section.open) row.open = true

    const summary = document.createElement('summary')
    summary.className = 'pane-drawer__help-summary'
    summary.textContent = section.heading
    row.append(summary)

    const body = document.createElement('div')
    body.className = 'pane-drawer__help-body'
    if (section.content instanceof Node) body.append(section.content)
    else body.innerHTML = section.content ?? ''
    row.append(body)

    panel.append(row)
  }

  if (footer) {
    const f = document.createElement('div')
    f.className = 'pane-drawer__help-footer'
    if (footer instanceof Node) f.append(footer)
    else f.innerHTML = footer
    panel.append(f)
  }

  return panel
}
