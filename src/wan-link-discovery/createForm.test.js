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
    // The redesign's central claim is that method is derived, never asked — guard the claim
    // itself, not just the one id/sentence a differently-worded control (a "Protocol" dropdown, an
    // SNMP/SSH toggle) would sail past. Exclude #wld-cred-hint: it legitimately names the protocol
    // (e.g. "SSH — prefilled from the monitor") to explain a credential prefill — that is an
    // explanation of a derived fact, not a method-selection control asking the user anything.
    const hint = el.querySelector('#wld-cred-hint').textContent
    const bodyWithoutHint = el.textContent.replace(hint, '')
    expect(bodyWithoutHint).not.toMatch(/method|SNMP|SSH/i)
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

describe('create form — notifications', () => {
  it('renders a Bcc affordance next to Notify', () => {
    const el = form()
    expect(el.querySelector('#wld-bcc')).not.toBeNull()
  })
})

describe('create form — reset', () => {
  it('clears stale text and re-gates the form', () => {
    const el = form()
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    el.querySelector('#wld-isp').value = 'Airtel'
    el.querySelector('#wld-dip').value = '8.8.8.8'

    el.querySelector('#wld-reset').click()

    expect(el.querySelector('#wld-isp').value).toBe('')
    expect(el.querySelector('#wld-dip').value).toBe('')
    expect(el.querySelector('#wld-gated').hidden).toBe(true)
    expect(el.querySelector('#wld-gate-msg').hidden).toBe(false)
  })

  it('restores Frequency, Operation Timeout and UDP Port to their initial defaults, not blank', () => {
    const onRun = vi.fn()
    const el = form({ onRun })
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    change(el.querySelector('#wld-probe'), 'UDP Echo')
    el.querySelector('#wld-freq').value = '120'
    el.querySelector('#wld-optimeout').value = '9999'
    el.querySelector('#wld-port').value = '1234'

    el.querySelector('#wld-reset').click()

    // The port default is what Reset is really under test for here — UDP Echo needs it, and it must
    // have come back as the field's initial default rather than surviving as '1234' or going blank.
    expect(el.querySelector('#wld-port').value).toBe('5000')

    el.querySelector('#wld-name').value = 'NX Core → Airtel'
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    change(el.querySelector('#wld-probe'), 'UDP Echo')
    el.querySelector('#wld-isp').value = 'Airtel'
    el.querySelector('#wld-dip').value = '8.8.8.8'
    el.querySelector('#wld-run').click()

    expect(onRun).toHaveBeenCalledOnce()
    const payload = onRun.mock.calls[0][0]
    expect(payload.links[0].port).toBe('5000')
    expect(el.querySelector('#wld-error').textContent).not.toContain('Frequency')
    expect(el.querySelector('#wld-error').textContent).not.toContain('Operation Timeout')
    expect(el.querySelector('#wld-error').textContent).not.toContain('UDP Port')
  })

  it('keeps the monitor locked in after reset when opened from a device', () => {
    const el = form({ monitorId: 'm-nxos', locked: true })
    el.querySelector('#wld-isp').value = 'Airtel'
    el.querySelector('#wld-dip').value = '8.8.8.8'

    el.querySelector('#wld-reset').click()

    const monitor = el.querySelector('#wld-monitor')
    expect(monitor.getAttribute('value')).toBe('m-nxos')
    expect(monitor.hasAttribute('disabled')).toBe(true)
    expect(el.querySelector('#wld-isp').value).toBe('')
    expect(el.querySelector('#wld-dip').value).toBe('')
    expect(el.querySelector('#wld-gated').hidden).toBe(false)
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

  it('requires Frequency and Operation Timeout', () => {
    const onRun = vi.fn()
    const el = form({ onRun })
    fill(el)
    el.querySelector('#wld-freq').value = ''
    el.querySelector('#wld-optimeout').value = ''
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    const err = el.querySelector('#wld-error').textContent
    expect(err).toContain('Frequency')
    expect(err).toContain('Operation Timeout')
  })

  it('lets a credential be chosen and run when it does not prefill (m-juniper)', () => {
    const onRun = vi.fn()
    const el = form({ onRun })
    change(el.querySelector('#wld-monitor'), 'm-juniper')
    // Sanity: m-juniper's own credential does not match RPM's SNMP method, so it must not prefill —
    // this is exactly the case the missing `change` listener on #wld-cred made impossible to clear.
    expect(el.querySelector('#wld-cred').getAttribute('value')).toBe('')

    el.querySelector('#wld-name').value = 'Juniper Branch Link'
    change(el.querySelector('#wld-cred'), 'Core-SNMP-v2c')
    change(el.querySelector('#wld-probe'), 'ICMP Ping')
    el.querySelector('#wld-isp').value = 'Airtel'
    el.querySelector('#wld-dip').value = '8.8.8.8'

    el.querySelector('#wld-run').click()
    expect(el.querySelector('#wld-error').hidden).toBe(true)
    expect(onRun).toHaveBeenCalledOnce()
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

describe('create form — csv mode', () => {
  const change = (el, value) => {
    el.setAttribute('value', value)
    el.value = value
    el.dispatchEvent(new CustomEvent('change', { detail: [value] }))
  }
  const form = (over = {}) =>
    renderCreateForm({ monitorId: null, locked: false, onCancel: () => {}, onRun: () => {}, ...over })

  const csvForm = (over = {}) => {
    const el = form(over)
    change(el.querySelector('#wld-monitor'), 'm-nxos')
    el.querySelector('#wld-name').value = 'NX Core bulk'
    change(el.querySelector('#wld-mode'), 'csv')
    return el
  }

  it('offers Single and CSV, Single first and selected', () => {
    const el = form()
    const toggle = el.querySelector('#wld-mode')
    expect(toggle.options.map((o) => o.value)).toEqual(['single', 'csv'])
    expect(toggle.options.map((o) => o.text)).toEqual(['Single', 'CSV'])
    expect(toggle.getAttribute('value')).toBe('single')
  })

  it('marks CSV, and only CSV, as selected after switching to it', () => {
    const el = csvForm()
    const toggle = el.querySelector('#wld-mode')
    expect(toggle.getAttribute('value')).toBe('csv')

    change(toggle, 'single')

    expect(toggle.getAttribute('value')).toBe('single')
  })

  it('swaps the per-link fields for the upload, keeping Timeout', () => {
    const el = csvForm()
    expect(el.querySelector('#wld-link-fields').hidden).toBe(true)
    expect(el.querySelector('#wld-csv-block').hidden).toBe(false)
    expect(el.querySelector('#wld-timeout-field').hidden).toBe(false)
  })

  it('never shows UDP Port in csv mode — it is a column there', () => {
    const el = csvForm()
    change(el.querySelector('#wld-probe'), 'UDP Jitter')
    expect(el.querySelector('#wld-port-field').hidden).toBe(true)
  })

  it('keeps the operations block, which applies to every row', () => {
    const el = csvForm()
    expect(el.querySelector('#wld-sla-title').hidden).toBe(false)
    expect(el.querySelector('#wld-freq-field').hidden).toBe(false)
  })

  it('requires a file', () => {
    const onRun = vi.fn()
    const el = csvForm({ onRun })
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    expect(el.querySelector('#wld-error').textContent).toContain('CSV')
  })

  it('runs one link per parsed row', () => {
    const onRun = vi.fn()
    const el = csvForm({ onRun })
    el.querySelector('#wld-csv-upload').click()
    el.querySelector('#wld-run').click()
    expect(onRun).toHaveBeenCalledOnce()
    const payload = onRun.mock.calls[0][0]
    expect(payload.mode).toBe('csv')
    expect(payload.links).toHaveLength(3)
    expect(payload.links.map((l) => l.isp)).toEqual(['Airtel', 'Jio', 'Tata'])
  })

  it('reports parse errors instead of running', () => {
    const onRun = vi.fn()
    const el = csvForm({ onRun })
    el.loadCsvText('wan_probe,isp\nICMP Echo,Airtel')
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    expect(el.querySelector('#wld-error').textContent).toContain('header')
  })

  it('returns to single mode with the link fields back', () => {
    const el = csvForm()
    change(el.querySelector('#wld-mode'), 'single')
    expect(el.querySelector('#wld-link-fields').hidden).toBe(false)
    expect(el.querySelector('#wld-csv-block').hidden).toBe(true)
  })

  it('clears the uploaded-file display on reset', () => {
    const el = csvForm()
    el.querySelector('#wld-csv-upload').click()
    expect(el.querySelector('#wld-csv-name').getAttribute('value')).toContain('rows parsed')

    el.querySelector('#wld-reset').click()

    expect(el.querySelector('#wld-csv-name').getAttribute('value')).toBe('')
  })

  it('clears the uploaded-file display on a mode round-trip, and Run then reports it missing', () => {
    const onRun = vi.fn()
    const el = csvForm({ onRun })
    el.querySelector('#wld-csv-upload').click()
    expect(el.querySelector('#wld-csv-name').getAttribute('value')).toContain('rows parsed')

    change(el.querySelector('#wld-mode'), 'single')
    change(el.querySelector('#wld-mode'), 'csv')

    expect(el.querySelector('#wld-csv-name').getAttribute('value')).toBe('')
    el.querySelector('#wld-run').click()
    expect(onRun).not.toHaveBeenCalled()
    expect(el.querySelector('#wld-error').textContent).toContain('CSV')
  })
})
