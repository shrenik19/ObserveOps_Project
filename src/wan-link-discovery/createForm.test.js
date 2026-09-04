import { describe, it, expect, vi } from 'vitest'
import { renderCreateForm } from './createForm.js'

const change = (el, value) => {
  el.setAttribute('value', value)
  el.value = value
  el.dispatchEvent(new CustomEvent('change', { detail: [value] }))
}
const form = (over = {}) =>
  renderCreateForm({ monitorId: null, locked: false, onCancel: () => {}, onRun: () => {}, ...over })

describe('create form — before a monitor is chosen', () => {
  it('gates the link and operations blocks', () => {
    const el = form()
    expect(el.querySelector('#wld-gated').hidden).toBe(true)
    expect(el.querySelector('#wld-gate-msg').hidden).toBe(false)
  })

  it('offers every monitored device', () => {
    const el = form()
    expect(el.querySelector('#wld-monitor').options).toHaveLength(4)
  })
})

describe('create form — the monitor drives everything', () => {
  it('auto-fills Vendor and disables it', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    const vendor = el.querySelector('#wld-vendor')
    expect(vendor.getAttribute('value')).toBe('Cisco Systems')
    expect(vendor.hasAttribute('disabled')).toBe(true)
  })

  it('auto-fills Device OS and leaves it editable', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    const os = el.querySelector('#wld-os')
    expect(os.getAttribute('value')).toBe('nx-os')
    expect(os.hasAttribute('disabled')).toBe(false)
    expect(os.options.map((o) => o.value)).toEqual(['ios-xe', 'ios-xr', 'nx-os'])
  })

  it('shows no method field at all', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-method')).toBeNull()
    expect(el.textContent).not.toContain('Monitors WAN link performance by collecting key metrics')
  })

  it('prefills the credential when the protocol matches', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-cred').getAttribute('value')).toBe('NXOS-SSH-Ops')
  })

  it('offers the monitor its own interfaces', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-iface').options.map((o) => o.value)).toContain('Ethernet1/48')
  })

  it('offers only that platform probes', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-juniper')
    expect(el.querySelector('#wld-probe').options.map((o) => o.value)).toEqual(['ICMP Ping'])
  })

  it('names the operations block after the vendor', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-sla-title').textContent).toBe('IP SLA Operations Test Parameters')
    change(el.querySelector('#wld-monitor'), 'm-juniper')
    expect(el.querySelector('#wld-sla-title').textContent).toBe('Juniper RPM Operations Test Parameters')
  })
})

describe('create form — reactive rules', () => {
  it('shows UDP Port only for the UDP probes', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    expect(el.querySelector('#wld-port-field').hidden).toBe(true)
    change(el.querySelector('#wld-probe'), 'UDP Jitter')
    expect(el.querySelector('#wld-port-field').hidden).toBe(false)
    change(el.querySelector('#wld-probe'), 'ICMP Echo')
    expect(el.querySelector('#wld-port-field').hidden).toBe(true)
  })

  it('clears a probe the new Device OS does not have, and says so', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    change(el.querySelector('#wld-probe'), 'UDP Jitter')
    change(el.querySelector('#wld-os'), 'ios-xe')
    expect(el.querySelector('#wld-probe').getAttribute('value')).toBe('')
    expect(el.querySelector('#wld-os-warning').hidden).toBe(false)
  })

  it('keeps a probe the new Device OS still has', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    change(el.querySelector('#wld-probe'), 'ICMP Echo')
    change(el.querySelector('#wld-os'), 'ios-xr')
    expect(el.querySelector('#wld-probe').getAttribute('value')).toBe('ICMP Echo')
    expect(el.querySelector('#wld-os-warning').hidden).toBe(true)
  })

  it('resets the source interface when the monitor changes', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    change(el.querySelector('#wld-iface'), 'Ethernet1/48')
    change(el.querySelector('#wld-monitor'), 'm-xr')
    expect(el.querySelector('#wld-iface').getAttribute('value')).toBe('')
  })
})

describe('create form — locked entry from a device', () => {
  it('pre-selects the monitor and disables the field', () => {
    const el = form({ monitorId: 'm-nxos', locked: true })
    const monitor = el.querySelector('#wld-monitor')
    expect(monitor.getAttribute('value')).toBe('m-nxos')
    expect(monitor.hasAttribute('disabled')).toBe(true)
    expect(el.querySelector('#wld-gated').hidden).toBe(false)
  })
})

describe('create form — validation', () => {
  const fill = (el) => {
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    el.querySelector('#wld-name').value = 'NX Core → Airtel'
    change(el.querySelector('#wld-probe'), 'ICMP Echo')
    change(el.querySelector('#wld-iface'), 'Ethernet1/48')
    el.querySelector('#wld-isp').value = 'Airtel'
    el.querySelector('#wld-dip').value = '8.8.8.8'
  }

  it('names every missing field and does not run', () => {
    const onRun = vi.fn()
    const el = form({ onRun })
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    const err = el.querySelector('#wld-error').textContent
    expect(err).toContain('Profile Name')
    expect(err).toContain('Monitor')
  })

  it('requires UDP Port for a UDP probe and not otherwise', () => {
    const onRun = vi.fn()
    const el = form({ onRun })
    fill(el)
    change(el.querySelector('#wld-probe'), 'UDP Echo')
    el.querySelector('#wld-port').value = ''
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    expect(el.querySelector('#wld-error').textContent).toContain('UDP Port')
  })

  it('runs with one link once the form is complete', () => {
    const onRun = vi.fn()
    const el = form({ onRun })
    fill(el)
    el.querySelector('#wld-run').click()
    expect(onRun).toHaveBeenCalledOnce()
    const payload = onRun.mock.calls[0][0]
    expect(payload.name).toBe('NX Core → Airtel')
    expect(payload.monitor.id).toBe('m-nxos')
    expect(payload.osKey).toBe('nx-os')
    expect(payload.mode).toBe('single')
    expect(payload.links).toHaveLength(1)
    expect(payload.links[0]).toMatchObject({ probe: 'ICMP Echo', isp: 'Airtel', dip: '8.8.8.8' })
  })
})
