import { modules, allScreens } from './registry.js'
import { cardListHTML } from './cardList.js'
import { pageHeaderHTML } from './pageHeader.js'

export const meta = { pageHeader: { heading: 'Overview', icon: 'dashboard' } }

// The default route. Every card here is generated from the registry, so a new screen appears the
// moment its registry line exists — there is no list to keep in step by hand.
export function mount(root) {
  root.innerHTML = `
    ${pageHeaderHTML(meta.pageHeader)}
    <main class="app-shell__content landing">
      <p class="landing__blurb">
        Product screens rebuilt entirely from the published
        <code>@mtdt/observeops-ds-*</code> packages, as an outside consumer would. No hardcoded
        colours, no invented components. The design-system gap report these screens produced is in
        <code>docs/DS-GAPS.md</code>.
      </p>
      ${cardListHTML(allScreens(modules))}
    </main>
  `
  return function unmount() {}
}
