// Settings -> Integration -> ME Service Desk Plus: the connection form. Same fields and layout as
// the shipped ServiceNow form, minus "Create Alert from Motadata ObserveOps as Event / Incident" —
// SDP has no event table, so every alert becomes a request.

import { field, upgradeSelects } from './profileDrawer.js'

const CREDENTIAL_PROFILES = ['SDP_TechnicianKey_Prod', 'SDP_OAuth_Cloud']
const DEFAULTS = { url: 'https://sdp.acme-corp.com:8080/', timeout: '60', emails: ['pmg.aiops22@gmail.com'] }

export function renderConnectionForm({ onTest } = {}) {
  const el = document.createElement('section')
  el.className = 'sdp-connection'
  el.dataset.role = 'sdp-connection'
  el.innerHTML = `
    <header class="sdp-connection__intro">
      <span class="sdp-connection__mark" aria-hidden="true">SDP</span>
      <div>
        <h2 class="sdp-connection__title">ME Service Desk Plus</h2>
        <p class="sdp-connection__blurb">
          ManageEngine ServiceDesk Plus is an IT service management platform for incident, request,
          problem and change management. For more information:
          <obs-link external>ME Service Desk Plus Integration</obs-link>
        </p>
      </div>
    </header>
    <div class="sdp-connection__grid"></div>
    <div class="sdp-connection__actions">
      <obs-button variant="default" data-role="sdp-reset">Reset</obs-button>
      <obs-button variant="default" data-role="sdp-test">Test</obs-button>
      <obs-button variant="primary" data-role="sdp-save">Save</obs-button>
    </div>
  `
  const grid = el.querySelector('.sdp-connection__grid')

  const url = document.createElement('obs-input')
  url.dataset.role = 'sdp-url'
  url.setAttribute('block', '')
  url.setAttribute('value', DEFAULTS.url)

  const timeout = document.createElement('obs-input')
  timeout.dataset.role = 'sdp-timeout'
  timeout.setAttribute('block', '')
  timeout.setAttribute('type', 'number')
  timeout.setAttribute('suffix', 'sec')
  timeout.setAttribute('value', DEFAULTS.timeout)

  const credential = document.createElement('obs-select')
  credential.dataset.role = 'sdp-credential'
  credential.setAttribute('block', '')
  credential.setAttribute('value', CREDENTIAL_PROFILES[0])
  credential.dataset.pendingOptions = JSON.stringify(CREDENTIAL_PROFILES.map((v) => ({ value: v, text: v })))

  const createCredential = document.createElement('obs-button')
  createCredential.dataset.role = 'sdp-create-credential'
  createCredential.setAttribute('variant', 'default')
  createCredential.textContent = 'Create Credential Profile'

  // A segmented control IS obs-radio as-button, per the DS.
  const reoccur = document.createElement('obs-radio')
  reoccur.dataset.role = 'sdp-reoccur'
  reoccur.setAttribute('as-button', '')
  reoccur.setAttribute('value', 'new')

  // Free-typed addresses: obs-tags type="loose" (type + Enter to add).
  const emails = document.createElement('obs-tags')
  emails.dataset.role = 'sdp-failover-email'
  emails.setAttribute('type', 'loose')
  emails.setAttribute('block', '')
  emails.setAttribute('placeholder', 'Add email and press Enter')

  const toggle = (role) => {
    const s = document.createElement('obs-switch')
    s.dataset.role = role
    s.setAttribute('checked-text', 'ON')
    s.setAttribute('unchecked-text', 'OFF')
    return s
  }

  const credentialRow = document.createElement('div')
  credentialRow.className = 'sdp-connection__credential'
  credentialRow.append(field('Credential Profiles', credential, { required: true }), createCredential)

  // The two switches stack in the left column, as on the ServiceNow form.
  const switchField = (...args) => {
    const f = field(...args)
    f.classList.add('sdp-connection__switch')
    return f
  }

  grid.append(
    field('Server URL', url, { required: true }),
    field('URL Time Out', timeout, { required: true, hint: 'Seconds to wait for Service Desk Plus to answer before the call fails.' }),
    credentialRow,
    field('If alert re-occurs', reoccur),
    field('Fail Over Email', emails, { required: true, hint: 'Alerts are emailed here when Service Desk Plus cannot be reached.' }),
    switchField('Auto Sync', toggle('sdp-auto-sync'), { hint: 'Keep alert and request status in step both ways.' }),
    switchField('Use Proxy Server', toggle('sdp-proxy'), { hint: 'Route calls through the proxy set in System Settings.' })
  )

  function reset() {
    url.value = DEFAULTS.url
    timeout.value = DEFAULTS.timeout
    credential.value = CREDENTIAL_PROFILES[0]
    reoccur.value = 'new'
    emails.value = [...DEFAULTS.emails]
    for (const s of el.querySelectorAll('obs-switch')) s.checked = false
  }

  el.querySelector('[data-role="sdp-reset"]').addEventListener('click', reset)
  el.querySelector('[data-role="sdp-test"]').addEventListener('click', () => onTest?.())

  // Object-valued props only after insertion.
  el.upgrade = () => {
    upgradeSelects(el)
    reoccur.options = [
      { value: 'new', text: 'Create new ticket' },
      { value: 'reopen', text: 'Re-open closed ticket' },
    ]
    emails.value = [...DEFAULTS.emails]
  }
  return el
}
