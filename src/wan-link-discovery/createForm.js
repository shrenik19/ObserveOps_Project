// src/wan-link-discovery/createForm.js
// Create Discovery Profile -> WAN Link.
//
// Every other category on this page starts from an IP/Host you TYPE. WAN Link starts from a monitor
// you PICK, and because that device is already monitored we know its vendor, OS, collector,
// interfaces and credential before the form asks anything. Vendor, Device OS, Credential Profiles,
// Source Interface, the probe list and even the Operations section title all resolve from it.
//
// There is no method field. Every Device OS has exactly one method, so asking would be a question
// with one possible answer — the product's own Juniper drawer already omits the SNMP/SSH cards.

import { PLATFORMS, osOptions, probeOptions, needsPort, slaTitle } from './platforms.js'
import {
  findMonitor, monitorOptions, credentialOptions, interfaceOptions, prefillCredential,
} from './monitors.js'

/** DS change events carry an array: detail is ['nx-os'], not 'nx-os'. */
const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

/** obs-select has no `label` attribute — obs-input does, obs-select does not. */
const selectField = (id, label, { required = false, hint = '' } = {}) => `
  <div class="wld-field" id="${id}-field">
    <label class="wld-field__label" for="${id}">
      ${label}${required ? '<span class="wld-field__req">*</span>' : ''}
      ${hint ? `<span class="wld-field__hint">${hint}</span>` : ''}
    </label>
    <obs-select id="${id}" block value=""></obs-select>
  </div>
`

const inputField = (id, label, { required = false, hint = '', value = '' } = {}) => `
  <div class="wld-field" id="${id}-field">
    <label class="wld-field__label" for="${id}">
      ${label}${required ? '<span class="wld-field__req">*</span>' : ''}
      ${hint ? `<span class="wld-field__hint">${hint}</span>` : ''}
    </label>
    <obs-input id="${id}" block placeholder="Enter" value="${value}"></obs-input>
  </div>
`

export function renderCreateForm({ monitorId = null, locked = false, onCancel, onRun }) {
  const el = document.createElement('section')
  el.className = 'wld-form'
  el.innerHTML = `
    <div class="wld-form__row">
      ${inputField('wld-name', 'Discovery Profile Name', { required: true })}
      <div></div>
      <div class="wld-form__mode" id="wld-mode"></div>
    </div>

    <div class="wld-form__row">
      ${selectField('wld-monitor', 'Monitor', { required: true, hint: '<span id="wld-monitor-hint"></span>' })}
      ${selectField('wld-vendor', 'Vendor', { hint: '· from monitor' })}
      ${selectField('wld-os', 'Device OS', { required: true, hint: '· editable' })}
    </div>
    <p class="wld-form__warning" id="wld-os-warning" hidden>
      Probe cleared — it is not available on this Device OS.
    </p>

    <div class="wld-form__row">
      ${selectField('wld-cred', 'Credential Profiles', { required: true, hint: '<span id="wld-cred-hint"></span>' })}
      <div class="wld-field wld-field--action">
        <obs-button variant="neutral-lightest">Create Credential Profile</obs-button>
      </div>
      <div></div>
    </div>

    <p class="wld-form__gate" id="wld-gate-msg">
      Select a <b>Monitor</b> to configure the link — the available probes depend on its Device OS.
    </p>

    <div id="wld-gated" hidden>
      <h4 class="wld-form__legend">Discovery Parameters of WAN Link</h4>
      <div id="wld-link-fields">
        <div class="wld-form__row">
          ${selectField('wld-probe', 'WAN Probe', { required: true })}
          ${inputField('wld-isp', 'Internet Service Provider', { required: true })}
          <div></div>
        </div>
        <div class="wld-form__row">
          ${selectField('wld-iface', 'Source Interface', { hint: '· from the monitor' })}
          ${inputField('wld-src-loc', 'Source Router Location')}
          <div></div>
        </div>
        <div class="wld-form__row">
          ${inputField('wld-dip', 'Destination IP', { required: true })}
          ${inputField('wld-dst-loc', 'Destination Router Location')}
          <div></div>
        </div>
      </div>

      <div class="wld-form__row">
        ${inputField('wld-timeout', 'Timeout')}
        ${inputField('wld-port', 'UDP Port', { required: true, value: '5000' })}
        <div></div>
      </div>

      <h4 class="wld-form__legend" id="wld-sla-title">IP SLA Operations Test Parameters</h4>
      <div class="wld-form__row">
        ${inputField('wld-payload', 'Payload')}
        ${inputField('wld-tos', 'Type of service')}
        <div></div>
      </div>
      <div class="wld-form__row">
        ${inputField('wld-freq', 'Frequency', { required: true, value: '60' })}
        ${inputField('wld-optimeout', 'Operation Timeout', { required: true, value: '5000' })}
        <div></div>
      </div>

      <h4 class="wld-form__legend">Notifications</h4>
      <div class="wld-form__row">
        ${inputField('wld-notify', 'Notify')}
      </div>
    </div>

    <footer class="wld-form__footer">
      <obs-button id="wld-exit" variant="neutral-lightest">Save and Exit</obs-button>
      <span class="wld-form__mandatory"><span class="wld-field__req">*</span> fields are mandatory</span>
      <span class="wld-form__spacer"></span>
      <span class="wld-form__error" id="wld-error" hidden></span>
      <obs-button id="wld-reset" variant="neutral-lightest">Reset</obs-button>
      <obs-button id="wld-run" variant="primary">Save and Run</obs-button>
    </footer>
  `

  const $ = (id) => el.querySelector(`#${id}`)
  const setOptions = (id, options, value = '') => {
    const select = $(id)
    select.options = options
    select.setAttribute('value', value)
    select.value = value
    return select
  }
  const text = (id) => ($(id).value ?? $(id).getAttribute('value') ?? '').toString().trim()

  setOptions('wld-monitor', monitorOptions(), monitorId ?? '')
  if (locked && monitorId) {
    $('wld-monitor').setAttribute('disabled', '')
    $('wld-monitor-hint').textContent = '· locked — opened from this device'
  }

  const monitor = () => findMonitor($('wld-monitor').getAttribute('value'))

  function syncPort() {
    // UDP Port is the ONLY conditional field on the form, and it sits beside Timeout.
    $('wld-port-field').hidden = !needsPort($('wld-probe').getAttribute('value'))
  }

  function syncOs({ fromMonitor = false } = {}) {
    const m = monitor()
    if (!m) return
    const osKey = $('wld-os').getAttribute('value')
    const platform = PLATFORMS[osKey]

    const previousCred = $('wld-cred').getAttribute('value')
    const creds = credentialOptions(platform.method)
    const prefill = prefillCredential(m, platform.method)
    const keptCred = creds.some((c) => c.value === previousCred) ? previousCred : ''
    setOptions('wld-cred', creds, prefill || keptCred)
    $('wld-cred-hint').textContent = prefill
      ? `· ${platform.method} — prefilled from the monitor`
      : `· ${platform.method} — the monitor has no matching credential`

    const previousProbe = $('wld-probe').getAttribute('value')
    const probes = probeOptions(osKey)
    const kept = probes.some((p) => p.value === previousProbe)
    setOptions('wld-probe', probes, kept ? previousProbe : '')
    // Clear rather than silently swap, and say why.
    $('wld-os-warning').hidden = fromMonitor || !previousProbe || kept

    $('wld-sla-title').textContent = slaTitle(platform.vendor)
    syncPort()
  }

  function syncMonitor() {
    const m = monitor()
    $('wld-gated').hidden = !m
    $('wld-gate-msg').hidden = !!m
    if (!m) return

    setOptions('wld-vendor', [{ value: m.vendor, text: m.vendor }], m.vendor)
    $('wld-vendor').setAttribute('disabled', '')

    setOptions('wld-os', osOptions(m.vendor), m.os)
    $('wld-os').removeAttribute('disabled')

    setOptions('wld-iface', interfaceOptions(m), '')
    syncOs({ fromMonitor: true })
  }

  $('wld-monitor').addEventListener('change', (e) => {
    $('wld-monitor').setAttribute('value', detailValue(e) ?? '')
    syncMonitor()
  })
  $('wld-os').addEventListener('change', (e) => {
    $('wld-os').setAttribute('value', detailValue(e) ?? '')
    syncOs()
  })
  $('wld-probe').addEventListener('change', (e) => {
    $('wld-probe').setAttribute('value', detailValue(e) ?? '')
    syncPort()
  })
  $('wld-iface').addEventListener('change', (e) => {
    $('wld-iface').setAttribute('value', detailValue(e) ?? '')
  })

  $('wld-exit').addEventListener('click', () => onCancel())
  $('wld-reset').addEventListener('click', () => {
    setOptions('wld-monitor', monitorOptions(), '')
    $('wld-name').value = ''
    syncMonitor()
  })

  $('wld-run').addEventListener('click', () => {
    const missing = []
    if (!text('wld-name')) missing.push('Profile Name')
    if (!monitor()) missing.push('Monitor')
    if (!$('wld-cred').getAttribute('value')) missing.push('Credential Profile')
    const probe = $('wld-probe').getAttribute('value')
    if (!probe) missing.push('WAN Probe')
    if (!text('wld-isp')) missing.push('ISP')
    if (!text('wld-dip')) missing.push('Destination IP')
    if (needsPort(probe) && !text('wld-port')) missing.push('UDP Port')

    if (missing.length) {
      $('wld-error').textContent = `Required: ${missing.join(' · ')}`
      $('wld-error').hidden = false
      return
    }
    $('wld-error').hidden = true

    onRun({
      name: text('wld-name'),
      monitor: monitor(),
      osKey: $('wld-os').getAttribute('value'),
      mode: 'single',
      links: [{
        probe,
        isp: text('wld-isp'),
        iface: $('wld-iface').getAttribute('value') || '',
        srcLocation: text('wld-src-loc'),
        dip: text('wld-dip'),
        dstLocation: text('wld-dst-loc'),
        port: needsPort(probe) ? text('wld-port') : '',
      }],
    })
  })

  syncMonitor()
  return el
}
