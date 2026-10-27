// Settings: the product's section menu beside one pane. Every #/settings/... route mounts this
// layout once; moving between its items only swaps the pane, so the menu keeps its open sections,
// scroll and search text the way the product's does.
//
// A menu pick sets the hash, and the router calls `update()`. Arriving any other way — Back,
// Forward, a pasted link — rebuilds the menu instead, because obs-side-menu only opens the section
// holding `active` when it is created (DS-GAPS G53).

import { pageHeaderHTML } from '../app/pageHeader.js'
import { href } from '../app/router.js'
import { modules, findScreen } from '../app/registry.js'
import { leafFromHash, leafByLabel, menuItems, seedItems, STUB_LABEL } from './menu.js'
import './settings.css'

export const meta = { pageHeader: { heading: 'Settings', icon: 'settings' } }

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Settings', icon: 'settings' })}
  <div class="app-shell__body">
    <nav class="settings-nav" aria-label="Settings" data-role="settings-nav"></nav>
    <div class="settings-pane" data-role="settings-pane"></div>
  </div>
`

const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

function renderPlaceholder(pane, leaf) {
  pane.innerHTML = `
    <main class="app-shell__content settings-placeholder" data-role="settings-placeholder">
      <h2 class="settings-placeholder__title"></h2>
      <obs-banner variant="info"></obs-banner>
    </main>
  `
  pane.querySelector('.settings-placeholder__title').textContent = `${leaf.section.label} / ${leaf.label}`
  pane.querySelector('obs-banner').textContent =
    `${leaf.label} keeps its existing screen. It has no design work in this app yet.`
}

export function mount(root) {
  root.innerHTML = TEMPLATE
  const nav = root.querySelector('[data-role="settings-nav"]')
  const pane = root.querySelector('[data-role="settings-pane"]')
  const overlay = document.getElementById('overlay-root')

  let menu = null
  let picked = null // the key of the item last chosen in the menu, until the route catches up
  let unmountPane = null
  let token = 0 // guards against a slow import landing after a newer pick

  function buildMenu(leaf) {
    const el = document.createElement('obs-side-menu')
    el.id = 'settings-menu'
    el.setAttribute('mode', 'sections')
    el.setAttribute('placeholder', 'Search')
    el.setAttribute('items', JSON.stringify(seedItems(leaf)))
    if (leaf.inMenu !== false) el.setAttribute('active', leaf.label)
    el.addEventListener('select', (event) => {
      const label = detailValue(event)?.label
      if (label === STUB_LABEL) {
        restoreHighlight(el)
        return
      }
      const next = leafByLabel(label)
      if (!next) return
      const target = href('settings', next.key)
      // Re-picking the open item changes no hash, so no update would come to clear `picked`.
      if (window.location.hash === target) return
      picked = next.key
      el.setAttribute('active', next.label)
      window.location.hash = target
    })
    nav.replaceChildren(el)
    menu = el
    // After the first render, so the seeded open state is already in place.
    requestAnimationFrame(() => { if (menu === el) el.items = menuItems() })
  }

  // A stand-in row has no route, but the menu has already moved its highlight onto it. The element
  // re-reads `active` only when the value changes, so step it to another value and back.
  function restoreHighlight(el) {
    const current = el.getAttribute('active') ?? ''
    el.setAttribute('active', `${current} `)
    setTimeout(() => { if (menu === el) el.setAttribute('active', current) })
  }

  function clearPane() {
    token += 1
    if (typeof unmountPane === 'function') unmountPane()
    unmountPane = null
    overlay?.replaceChildren()
    pane.replaceChildren()
  }

  async function renderPane(leaf) {
    clearPane()
    pane.dataset.item = leaf.key
    const load = leaf.screen && findScreen(modules, 'settings', leaf.screen)?.load
    if (!load) {
      renderPlaceholder(pane, leaf)
      return
    }
    const mine = token
    const screen = await load()
    if (mine !== token) return
    unmountPane = screen.mount(pane, { view: leaf.view }) ?? null
  }

  function update() {
    const leaf = leafFromHash(window.location.hash)
    if (picked !== leaf.key) buildMenu(leaf)
    else menu.setAttribute('active', leaf.label)
    picked = null
    return renderPane(leaf)
  }

  const ready = update()

  return {
    update,
    ready, // resolves once the first pane has mounted — for tests
    unmount() {
      clearPane()
      menu = null
    },
  }
}
