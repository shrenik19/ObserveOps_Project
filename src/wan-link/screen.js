import { pageHeaderHTML } from '../app/pageHeader.js'

export const meta = { pageHeader: { heading: 'Monitors', icon: 'monitor' } }

// The product's Monitors category bar. WAN Link is one tab among many; the rest render and do
// nothing, exactly as the other screens in this app treat their inert chrome.
const CATEGORIES = [
  'Inventory', 'Network', 'SDN', 'Server & Apps', 'Storage', 'Virtualization', 'HCI',
  'Database', 'Container Orchestration', 'Cloud', 'Interface', 'WAN Link', 'Process',
  'Container', 'Service', 'Service Check', 'Other',
]

const tabKey = (label) => label.toLowerCase().replace(/[^a-z0-9]+/g, '-')

const TEMPLATE = `
  ${pageHeaderHTML({ heading: 'Monitors', icon: 'monitor' })}
  <div class="module-tabs">
    <obs-tabs id="wan-link-tabs"></obs-tabs>
  </div>
  <div class="app-shell__body">
    <main class="app-shell__content" id="wan-link-content"></main>
  </div>
`

export function mount(root) {
  root.innerHTML = TEMPLATE

  // Set as a JSON attribute so the value survives regardless of custom-element upgrade timing —
  // the same reason report-categories does it this way.
  const tabs = root.querySelector('#wan-link-tabs')
  tabs.setAttribute('tabs', JSON.stringify(CATEGORIES.map((label) => ({ key: tabKey(label), label }))))
  tabs.setAttribute('value', 'wan-link')

  return function unmount() {}
}
