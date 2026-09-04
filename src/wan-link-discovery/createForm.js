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
import { CSV_COLUMNS, sampleCsv, parseCsv } from './csv.js'

/** DS change events carry an array: detail is ['nx-os'], not 'nx-os'. */
const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)

/**
 * Single source of truth for the three fields that ship with a non-blank initial value. Used both
 * when first rendering the field and when Reset restores it — Reset must return the form to its
 * INITIAL state, not blank it, and Frequency/Operation Timeout are required by the validator.
 */
const RESET_DEFAULTS = { 'wld-freq': '60', 'wld-optimeout': '5000', 'wld-port': '5000' }

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
      <div class="wld-form__mode">
        <obs-button id="wld-mode-single" variant="neutral-lightest" data-selected>Single</obs-button>
        <obs-button id="wld-mode-csv" variant="neutral-lightest">CSV</obs-button>
      </div>
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

      <div id="wld-csv-block" hidden>
        <div class="wld-form__row">
          <div class="wld-field">
            <label class="wld-field__label" for="wld-csv-name">
              CSV<span class="wld-field__req">*</span>
            </label>
            <div class="wld-form__upload">
              <obs-input id="wld-csv-name" block readonly placeholder="Select File"></obs-input>
              <obs-button id="wld-csv-upload" variant="primary">Upload CSV</obs-button>
            </div>
            <button type="button" class="wld-form__sample" id="wld-csv-sample">Sample CSV</button>
          </div>
          <div></div><div></div>
        </div>
        <p class="wld-form__gate" id="wld-csv-columns"></p>
      </div>

      <div class="wld-form__row">
        ${inputField('wld-timeout', 'Timeout')}
        ${inputField('wld-port', 'UDP Port', { required: true, value: RESET_DEFAULTS['wld-port'] })}
        <div></div>
      </div>

      <h4 class="wld-form__legend" id="wld-sla-title">IP SLA Operations Test Parameters</h4>
      <div class="wld-form__row">
        ${inputField('wld-payload', 'Payload')}
        ${inputField('wld-tos', 'Type of service')}
        <div></div>
      </div>
      <div class="wld-form__row">
        ${inputField('wld-freq', 'Frequency', { required: true, value: RESET_DEFAULTS['wld-freq'] })}
        ${inputField('wld-optimeout', 'Operation Timeout', { required: true, value: RESET_DEFAULTS['wld-optimeout'] })}
        <div></div>
      </div>

      <h4 class="wld-form__legend">Notifications</h4>
      <div class="wld-form__row">
        ${inputField('wld-notify', 'Notify')}
        <div class="wld-field wld-field--action">
          <!-- Inert chrome: the product's Bcc affordance on this row, unwired — same treatment the
               Monitors category bar gets in src/wan-link/screen.js. -->
          <obs-button id="wld-bcc" variant="neutral-lightest">+ Bcc</obs-button>
        </div>
        <div></div>
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

  // Declared here, immediately after `monitor`, and NOT after syncPort: syncPort reads `mode`, and
  // syncMonitor() runs at the bottom of this factory, so a lower declaration would throw a TDZ
  // ReferenceError at render time — a failure no static read of the file would show.
  let mode = 'single'
  let csv = null
  // The most recent parse failure, if any — kept separate from the generic "missing field" list so
  // Run doesn't clobber a specific "here's what's wrong with your file" message with a bare "CSV".
  let csvError = null

  function syncPort() {
    // UDP Port is the ONLY conditional field on the form, and it sits beside Timeout. In csv mode
    // the port is a column in the file, never a field on the page.
    $('wld-port-field').hidden = mode !== 'single' || !needsPort($('wld-probe').getAttribute('value'))
  }

  function setMode(next) {
    mode = next
    if (next === 'single') {
      // Leaving CSV mode discards the loaded file — the upload display must say so too, or a
      // round-trip back into CSV mode shows a stale "N rows parsed" for a file that no longer exists.
      csv = null
      csvError = null
      $('wld-csv-name').setAttribute('value', '')
    }
    $('wld-mode-single').toggleAttribute('data-selected', next === 'single')
    $('wld-mode-csv').toggleAttribute('data-selected', next === 'csv')
    $('wld-link-fields').hidden = next !== 'single'
    $('wld-csv-block').hidden = next !== 'csv'
    $('wld-error').hidden = true
    syncPort()
  }

  /** Exposed so a test can supply file text without a real file input. */
  el.loadCsvText = (text) => {
    const { rows, errors } = parseCsv(text)
    if (errors.length) {
      csv = null
      csvError = errors.join('  ')
      $('wld-csv-name').setAttribute('value', '')
      $('wld-error').textContent = csvError
      $('wld-error').hidden = false
      return
    }
    csv = rows
    csvError = null
    $('wld-csv-name').setAttribute('value', `wan-links.csv  ·  ${rows.length} rows parsed`)
    $('wld-error').hidden = true
  }

  $('wld-mode-single').addEventListener('click', () => setMode('single'))
  $('wld-mode-csv').addEventListener('click', () => setMode('csv'))
  $('wld-csv-upload').addEventListener('click', () => {
    const m = monitor()
    if (m) el.loadCsvText(sampleCsv(m, $('wld-os').getAttribute('value')))
  })
  $('wld-csv-sample').addEventListener('click', () => {
    const m = monitor()
    if (m) el.loadCsvText(sampleCsv(m, $('wld-os').getAttribute('value')))
  })

  $('wld-csv-columns').textContent =
    `One row per link. Columns: ${CSV_COLUMNS.join(' · ')} — exactly what the Single form asks ` +
    'per link. Credential Profile, Timeout and the Operations Test Parameters below apply to every row.'

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
    setMode('single')
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
  $('wld-cred').addEventListener('change', (e) => {
    $('wld-cred').setAttribute('value', detailValue(e) ?? '')
  })

  $('wld-exit').addEventListener('click', () => onCancel())
  $('wld-reset').addEventListener('click', () => {
    const keepMonitor = locked && !!monitorId
    if (!keepMonitor) {
      setOptions('wld-monitor', monitorOptions(), '')
      setOptions('wld-vendor', [], '')
      $('wld-vendor').removeAttribute('disabled')
      setOptions('wld-os', [], '')
    }
    // Cred/probe/iface are always monitor-derived — clear them here too, then let syncMonitor()
    // (called below) recompute them fresh, whether or not the monitor itself was kept.
    setOptions('wld-cred', [], '')
    $('wld-cred-hint').textContent = ''
    setOptions('wld-probe', [], '')
    setOptions('wld-iface', [], '')
    $('wld-os-warning').hidden = true

    $('wld-name').value = ''
    ;[
      'wld-isp', 'wld-src-loc', 'wld-dst-loc', 'wld-dip', 'wld-timeout', 'wld-port',
      'wld-payload', 'wld-tos', 'wld-freq', 'wld-optimeout', 'wld-notify',
    ].forEach((id) => {
      const value = RESET_DEFAULTS[id] ?? ''
      $(id).value = value
      $(id).setAttribute('value', value)
    })
    // The uploaded-file display is not in the list above — it has no RESET_DEFAULTS entry and
    // starts blank, not with a placeholder-shaped default.
    $('wld-csv-name').setAttribute('value', '')

    $('wld-error').hidden = true
    syncMonitor()
  })

  $('wld-run').addEventListener('click', () => {
    const missing = []
    if (!text('wld-name')) missing.push('Profile Name')
    if (!monitor()) missing.push('Monitor')
    if (!$('wld-cred').getAttribute('value')) missing.push('Credential Profile')
    if (!text('wld-freq')) missing.push('Frequency')
    if (!text('wld-optimeout')) missing.push('Operation Timeout')

    const probe = $('wld-probe').getAttribute('value')
    if (mode === 'csv') {
      if (!csv) missing.push('CSV')
    } else {
      if (!probe) missing.push('WAN Probe')
      if (!text('wld-isp')) missing.push('ISP')
      if (!text('wld-dip')) missing.push('Destination IP')
      if (needsPort(probe) && !text('wld-port')) missing.push('UDP Port')
    }

    if (missing.length) {
      // A stored parse failure is more useful than a bare "CSV" — show it verbatim when it's the
      // only thing wrong.
      $('wld-error').textContent = mode === 'csv' && csvError && missing.length === 1 && missing[0] === 'CSV'
        ? csvError
        : `Required: ${missing.join(' · ')}`
      $('wld-error').hidden = false
      return
    }
    $('wld-error').hidden = true

    const links = mode === 'csv' ? csv : [{
      probe,
      isp: text('wld-isp'),
      iface: $('wld-iface').getAttribute('value') || '',
      srcLocation: text('wld-src-loc'),
      dip: text('wld-dip'),
      dstLocation: text('wld-dst-loc'),
      port: needsPort(probe) ? text('wld-port') : '',
    }]

    onRun({
      name: text('wld-name'),
      monitor: monitor(),
      osKey: $('wld-os').getAttribute('value'),
      mode,
      links,
    })
  })

  syncMonitor()
  return el
}
