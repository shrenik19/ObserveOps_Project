import { describe, it, expect, vi } from 'vitest'
import { renderDetailDrawer } from './detailDrawer.js'
import { LINKS } from './probes.js'

const linkOf = (probe) => LINKS.find((l) => l.probe === probe)

describe('detail drawer', () => {
  it('opens on the right, titled by the link', () => {
    const drawer = renderDetailDrawer({ link: linkOf('icmp-echo'), onClose: () => {} })
    expect(drawer.tagName.toLowerCase()).toBe('obs-drawer')
    expect(drawer.getAttribute('placement')).toBe('right')
    expect(drawer.hasAttribute('open')).toBe(true)
    expect(drawer.textContent).toContain(linkOf('icmp-echo').name)
  })

  it('gives an echo probe three charts and no tiles', () => {
    const drawer = renderDetailDrawer({ link: linkOf('udp-echo'), onClose: () => {} })
    expect(drawer.querySelectorAll('.wl-card--chart')).toHaveLength(1)
    expect(drawer.querySelectorAll('.wl-card')).toHaveLength(3)
    expect(drawer.querySelectorAll('.wl-tile')).toHaveLength(0)
  })

  it('gives UDP Jitter six tiles and six plotted charts', () => {
    const drawer = renderDetailDrawer({ link: linkOf('udp-jitter'), onClose: () => {} })
    expect(drawer.querySelectorAll('.wl-tile')).toHaveLength(6)
    expect(drawer.querySelectorAll('.wl-card--chart')).toHaveLength(6)
    // Eight widgets in the grid: six charts plus the donut and the bars.
    expect(drawer.querySelectorAll('.wl-grid > .wl-card')).toHaveLength(8)
  })

  it('labels the availability windows per probe', () => {
    const echo = renderDetailDrawer({ link: linkOf('icmp-echo'), onClose: () => {} })
    expect(echo.textContent).toContain('Last 15 Days')
    const jitter = renderDetailDrawer({ link: linkOf('udp-jitter'), onClose: () => {} })
    expect(jitter.textContent).toContain('30 Days')
  })

  it('separates name, probe type and status with two vertical rules', () => {
    const drawer = renderDetailDrawer({ link: linkOf('udp-jitter'), onClose: () => {} })
    expect(drawer.querySelectorAll('.wl-drawer__sep')).toHaveLength(2)
  })

  it('shows the group path and the overflow count as chips', () => {
    const drawer = renderDetailDrawer({ link: linkOf('udp-jitter'), onClose: () => {} })
    const tags = [...drawer.querySelectorAll('.wl-drawer__groups obs-tag')]
    expect(tags.map((t) => t.textContent)).toEqual(['Network > Switch > Cisco Systems', '+2'])
  })

  it('carries the link status as a severity chip', () => {
    const drawer = renderDetailDrawer({ link: linkOf('udp-jitter'), onClose: () => {} })
    const chip = drawer.querySelector('obs-severity')
    expect(chip.getAttribute('severity')).toBe(linkOf('udp-jitter').status)
    expect(chip.getAttribute('shape')).toBe('chip')
  })

  it('calls onClose when the drawer closes', () => {
    const onClose = vi.fn()
    const drawer = renderDetailDrawer({ link: linkOf('icmp-echo'), onClose })
    drawer.dispatchEvent(new CustomEvent('close'))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
