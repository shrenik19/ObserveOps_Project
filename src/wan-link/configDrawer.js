import { PROBES } from './probes.js'

const SPECIFIC = {
  'icmp-echo': 'ICMP Echo reuses the XE/XR field set — no NX-OS-specific field is needed.',
  'udp-echo': 'UDP Echo reuses the XE/XR field set — no NX-OS-specific field is needed.',
  'udp-jitter': 'UDP Jitter adds packet count, packet interval and codec.',
}

const field = (label, id = '') =>
  `<obs-input ${id ? `id="${id}"` : ''} label="${label}" block placeholder="—"></obs-input>`

export function renderConfigDrawer({ onClose }) {
  const drawer = document.createElement('obs-drawer')
  drawer.setAttribute('placement', 'right')
  drawer.setAttribute('width', '520')
  drawer.setAttribute('title', 'Configure WAN Link Probe')
  drawer.setAttribute('footer', 'cancel-save')
  drawer.setAttribute('use-padding', '')
  drawer.setAttribute('open', '')

  drawer.innerHTML = `
    <section class="wl-form">
      <h4 class="wl-form__legend">Probe</h4>
      <obs-select id="wl-probe-type" block value="icmp-echo"></obs-select>
      ${field('Probe Name')}

      <h4 class="wl-form__legend">Source &amp; Destination</h4>
      ${field('Source Monitor (NX-OS device)')}
      <div class="wl-form__row">${field('Source IP')}${field('Source Interface')}</div>
      <div class="wl-form__row">
        ${field('Destination IP')}
        <div id="wl-dst-port">${field('Destination Port')}</div>
      </div>

      <h4 class="wl-form__legend">Schedule &amp; Thresholds</h4>
      <div class="wl-form__row">${field('Frequency')}${field('Timeout')}</div>
      <div class="wl-form__row">${field('ToS / DSCP')}${field('VRF')}</div>

      <h4 class="wl-form__legend">Probe-specific</h4>
      <p id="wl-specific" class="wl-form__note"></p>
    </section>
  `

  const select = drawer.querySelector('#wl-probe-type')
  // A real JS array, not a JSON attribute — obs-select accepts el.options = [...].
  select.options = Object.values(PROBES).map((p) => ({ value: p.key, text: p.label }))

  const port = drawer.querySelector('#wl-dst-port')
  const specific = drawer.querySelector('#wl-specific')

  const sync = (key) => {
    // UDP probes address a port; ICMP does not.
    port.hidden = !PROBES[key].needsPort
    specific.textContent = SPECIFIC[key]
  }

  const detailValue = (event) => (Array.isArray(event.detail) ? event.detail[0] : event.detail)
  select.addEventListener('change', (event) => sync(detailValue(event) ?? 'icmp-echo'))
  sync('icmp-echo')

  drawer.addEventListener('footer-action', () => onClose())
  drawer.addEventListener('close', () => onClose())
  return drawer
}
