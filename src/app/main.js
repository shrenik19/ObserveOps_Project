// The composition root, and the ONLY module that imports the design system. Everything else stays
// free of it, so every other unit is testable in jsdom.
import '@mtdt/observeops-ds-elements'
// NOT '@mtdt/observeops-ds-css/dist/observeops-ds.css' — that path is absent from the package's
// exports map and throws under Vite. See the reference doc, correction 7.
import '@mtdt/observeops-ds-css/observeops-ds.css'
// Populates globalThis.__OBS_LOGOS__, which obs-logo reads; the elements bundle does not import it.
// Without it every <obs-logo> renders "?", including obs-sidebar's default.
import '@mtdt/observeops-ds-elements/logos'

import './shell.css'
import { modules } from './registry.js'
import { parse, resolve } from './router.js'
import { createShell } from './shell.js'
import { createScreenHost } from './screenHost.js'
import { cardListHTML } from './cardList.js'
import { pageHeaderHTML } from './pageHeader.js'

const shell = createShell({ host: document.body, modules })
const host = createScreenHost({ content: shell.content, overlay: shell.overlay })

// A module holding several screens shows its own card grid. No new component: it is the Overview's
// grid with a filter, which is what makes the two-level registry affordable.
const moduleIndex = (module) => ({
  mount(root) {
    root.innerHTML = `
      ${pageHeaderHTML({ heading: module.label, icon: module.icon })}
      <main class="app-shell__content landing">
        ${cardListHTML(module.screens.map((screen) => ({ module, screen })))}
      </main>
    `
    return () => {}
  },
})

async function route() {
  const target = resolve(parse(window.location.hash), modules)

  // A module with no screens behind it: leave the URL and the highlight exactly as they are.
  if (target.kind === 'ignore') return

  if (target.kind === 'overview') {
    shell.setActive(null)
    await host.show(() => import('./overviewScreen.js'))
    return
  }

  shell.setActive(target.module.key)

  if (target.kind === 'moduleIndex') {
    await host.show(async () => moduleIndex(target.module))
    return
  }

  await host.show(target.screen.load)
}

// Clicking a sidebar module sets the hash; `hashchange` does the rest, so navigation has exactly
// one path through the code whether it came from a click, a link, the back button or a pasted URL.
shell.onNavigate((key) => {
  const target = resolve({ module: key, screen: null }, modules)
  if (target.kind === 'ignore') return
  window.location.hash = `#/${key}`
})

window.addEventListener('hashchange', route)
route()
