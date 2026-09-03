import { describe, it, expect, vi } from 'vitest'
import { renderConfigDrawer } from './configDrawer.js'

describe('config drawer', () => {
  it('offers the three probes, ICMP Echo first', () => {
    const drawer = renderConfigDrawer({ onClose: () => {} })
    const select = drawer.querySelector('#wl-probe-type')
    expect(select.options.map((o) => o.value)).toEqual(['icmp-echo', 'udp-echo', 'udp-jitter'])
    expect(select.getAttribute('value')).toBe('icmp-echo')
  })

  it('hides Destination Port for ICMP Echo', () => {
    const drawer = renderConfigDrawer({ onClose: () => {} })
    expect(drawer.querySelector('#wl-dst-port').hidden).toBe(true)
  })

  it('shows Destination Port once a UDP probe is chosen', () => {
    const drawer = renderConfigDrawer({ onClose: () => {} })
    const select = drawer.querySelector('#wl-probe-type')
    select.dispatchEvent(new CustomEvent('change', { detail: ['udp-jitter'] }))
    expect(drawer.querySelector('#wl-dst-port').hidden).toBe(false)
  })

  it('names the jitter-specific fields only for jitter', () => {
    const drawer = renderConfigDrawer({ onClose: () => {} })
    const specific = drawer.querySelector('#wl-specific')
    expect(specific.textContent).toContain('XE/XR field set')
    drawer.querySelector('#wl-probe-type').dispatchEvent(new CustomEvent('change', { detail: ['udp-jitter'] }))
    expect(specific.textContent).toContain('codec')
  })

  it('closes on the footer cancel action', () => {
    const onClose = vi.fn()
    const drawer = renderConfigDrawer({ onClose })
    drawer.dispatchEvent(new CustomEvent('footer-action', { detail: ['cancel'] }))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
