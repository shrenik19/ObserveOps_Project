import '@mtdt/observeops-ds-elements'
import '@mtdt/observeops-ds-css/observeops-ds.css'
import '@mtdt/observeops-ds-elements/logos'

import { renderLamaProfileDrawer } from './lamaProfileDrawer.js'
import '../report-categories/hostPage.css'
import './lama.css'

const drawerRoot = document.getElementById('drawer-root')
const table = document.getElementById('lama-table')

document.getElementById('module-nav').items = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'monitors', label: 'Monitors', icon: 'monitor' },
  { key: 'alerts', label: 'Alerts', icon: 'alert' },
  { key: 'topology', label: 'Topology', icon: 'networkTopology' },
  { key: 'reports', label: 'Reports', icon: 'report' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
]

document.getElementById('app-header').actions = [
  { icon: 'search', label: 'Search' },
  { icon: 'bell', label: 'Notifications', badge: 3 },
]

const userMenu = document.getElementById('user-menu')
userMenu.items = [
  { key: 'profile', label: 'My Profile', icon: 'userCircle' },
  { key: 'preferences', label: 'Preferences', icon: 'settings' },
  { key: 'about', label: 'About', icon: 'infoCircle', divider: true },
]

// The LAMA list. Starts empty, as the product does before a profile exists.
const profiles = []

table.columns = [
  { key: 'name', title: 'NAME', sortable: true },
  { key: 'description', title: 'DESCRIPTION' },
  { key: 'exchange', title: 'EXCHANGE', width: 130 },
  { key: 'application', title: 'APPLICATION', width: 150 },
  { key: 'dataInterval', title: 'DATA INTERVAL', width: 140 },
  { key: 'monitoringHours', title: 'MONITORING HOURS', width: 170 },
  { key: 'lastSyncAt', title: 'LAST SYNC AT', width: 150 },
  { key: 'status', title: 'STATUS', type: 'status', width: 110 },
]
table.rowActions = [
  { key: 'edit', label: 'Edit', icon: 'pencil' },
  { key: 'delete', label: 'Delete', icon: 'trash', danger: true },
]
table.rows = profiles

const closeDrawer = () => drawerRoot.replaceChildren()

function openDrawer() {
  const { element } = renderLamaProfileDrawer({
    onCancel: closeDrawer,
    onCreate: ({ customFields }) => {
      // No backend: show the result by adding the profile to the grid, so the flow is visible.
      profiles.push({
        id: `lama-${profiles.length + 1}`,
        name: document.querySelector('[data-role="lama-name"]')?.getAttribute('value') || 'Untitled Profile',
        description: `${customFields.length} custom field(s)`,
        exchange: 'NSE',
        application: 'Trading',
        dataInterval: '5 Minute(s)',
        monitoringHours: 'Market Hours',
        lastSyncAt: '—',
        status: 'Active',
      })
      table.rows = [...profiles]
      closeDrawer()
    },
  })
  drawerRoot.replaceChildren(element)
  // Object-valued props must be assigned after the elements are in the document.
  requestAnimationFrame(() => element.upgradeSelects())
}

document.getElementById('create-lama-profile').addEventListener('click', openDrawer)
