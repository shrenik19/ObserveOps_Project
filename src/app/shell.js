// The chrome that survives navigation: rendered once, never re-rendered. Screens mount into
// #screen-root; dialogs and drawers go in #overlay-root.
//
// Deliberately imports no DS module. The custom elements are registered once by main.js, which
// keeps this file testable in jsdom, where they are inert unknown elements.

// The header's build number differs between the two old pages (8.2.6 and 8.2.7). One shell means
// one value; the later wins.
const TEMPLATE = `
  <div class="app-shell">
    <obs-sidebar id="module-nav" brand="ObserveOps" active=""></obs-sidebar>

    <div class="app-shell__main">
      <!-- The \`brand\` and \`user\` SLOTS, not the same-named text attributes. obs-app-header has no
           logo fallback, so the mark only appears if it is slotted; and the \`user\` attribute
           renders initials that look clickable but emit nothing (gap G22). -->
      <obs-app-header id="app-header" build="8.2.7">
        <!-- Our own markup, so making it a link needs no DS co-operation. obs-sidebar's logo is an
             <a> with @click.prevent that emits nothing, so it cannot be the way home. -->
        <a slot="brand" class="app-brand" href="#/">
          <obs-logo name="motadata" size="26"></obs-logo>
          ObserveOps
        </a>

        <obs-user-menu
          slot="user"
          id="user-menu"
          name="Motadata Admin"
          subtitle="admin@motadata.com"
          initials="MA"
          theme-toggle
          theme="light"
          manage-theme
          logout
        ></obs-user-menu>
      </obs-app-header>

      <div id="screen-root" class="app-shell__screen"></div>
    </div>
  </div>

  <div id="overlay-root"></div>
`

// DS events deliver the value in event.detail, sometimes wrapped in an array — unwrap.
const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

export function createShell({ host, modules }) {
  host.innerHTML = TEMPLATE

  const sidebar = host.querySelector('#module-nav')
  // The registry entry minus its screens: obs-sidebar wants { key, label, icon }.
  sidebar.items = modules.map(({ key, label, icon }) => ({ key, label, icon }))

  host.querySelector('#app-header').actions = [
    { icon: 'search', label: 'Search' },
    { icon: 'bell', label: 'Notifications', badge: 3 },
  ]

  host.querySelector('#user-menu').items = [
    { key: 'profile', label: 'My Profile', icon: 'userCircle' },
    { key: 'preferences', label: 'Preferences', icon: 'settings' },
    { key: 'about', label: 'About', icon: 'infoCircle', divider: true },
  ]

  return {
    content: host.querySelector('#screen-root'),
    overlay: host.querySelector('#overlay-root'),

    // obs-sidebar never writes its own `active` — it is a plain prop driven from here. That is why
    // an empty module needs no disabled state: ignore its navigate event and nothing moves.
    setActive(key) {
      sidebar.setAttribute('active', key || '')
    },

    onNavigate(fn) {
      sidebar.addEventListener('navigate', (event) => {
        const key = detailValue(event)?.key
        if (key) fn(key)
      })
    },
  }
}
