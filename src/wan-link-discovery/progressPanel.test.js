import { describe, it, expect, vi } from 'vitest'
import { renderProgressPanel } from './progressPanel.js'
import { findMonitor } from './monitors.js'

const LINKS = [
  { probe: 'ICMP Echo', isp: 'Airtel', iface: 'Ethernet1/1', dip: '8.8.8.8', port: '' },
  { probe: 'UDP Echo', isp: 'Jio', iface: 'Ethernet1/2', dip: '1.1.1.1', port: '5000' },
  { probe: 'UDP Jitter', isp: 'Tata', iface: 'Ethernet1/48', dip: '9.9.9.9', port: '5001' },
]

const panel = (over = {}) =>
  renderProgressPanel({
    profileName: 'NX Core bulk', monitor: findMonitor('m-nxos'), osKey: 'nx-os',
    links: LINKS, outcome: 'ok', autoplay: false, onDone: () => {}, onCancel: () => {}, ...over,
  })

describe('progress panel', () => {
  it('titles itself with the profile name', () => {
    expect(panel().querySelector('#wld-prog-title').textContent).toBe('NX Core bulk')
  })

  it('counts every link as a total object', () => {
    expect(panel().querySelector('#wld-prog-total').textContent).toBe('3')
  })

  it('renders one card per link, headed by ISP and destination', () => {
    const cards = panel().querySelectorAll('.wld-card')
    expect(cards).toHaveLength(3)
    expect(cards[0].querySelector('.wld-card__head').textContent).toContain('Airtel')
    expect(cards[0].querySelector('.wld-card__head').textContent).toContain('8.8.8.8')
  })

  it('narrates four stages per card, not one', () => {
    expect(panel().querySelectorAll('.wld-card')[0].querySelectorAll('li')).toHaveLength(4)
  })

  it('names the transport in the first stage', () => {
    const first = panel().querySelector('.wld-card li')
    expect(first.textContent).toContain('over SSH')
  })

  it('renders the Search furniture', () => {
    expect(panel().querySelector('#wld-prog-search')).toBeTruthy()
  })
})

describe('progress panel — outcomes', () => {
  it('discovers every link on success', () => {
    const el = panel()
    el.advanceAll()
    expect(el.querySelector('#wld-prog-ok').textContent).toBe('3')
    expect(el.querySelector('#wld-prog-failed').textContent).toBe('0')
    expect(el.querySelector('#wld-prog-next').hasAttribute('disabled')).toBe(false)
  })

  it('fails exactly one link of a bulk run, so results stay mixed', () => {
    const el = panel({ outcome: 'unreachable' })
    el.advanceAll()
    expect(el.querySelector('#wld-prog-ok').textContent).toBe('2')
    expect(el.querySelector('#wld-prog-failed').textContent).toBe('1')
  })

  it('fails the only link of a single run', () => {
    const el = panel({ links: [LINKS[0]], outcome: 'operation' })
    el.advanceAll()
    expect(el.querySelector('#wld-prog-ok').textContent).toBe('0')
    expect(el.querySelector('#wld-prog-failed').textContent).toBe('1')
  })

  it('leaves nothing to provision when every link failed', () => {
    const el = panel({ links: [LINKS[0]], outcome: 'operation' })
    el.advanceAll()
    expect(el.querySelector('#wld-prog-next').hasAttribute('disabled')).toBe(true)
    expect(el.querySelector('#wld-prog-failnote').hidden).toBe(false)
  })

  it('distinguishes a configuration failure from a dead path', () => {
    const op = panel({ links: [LINKS[0]], outcome: 'operation' })
    op.advanceAll()
    const un = panel({ links: [LINKS[0]], outcome: 'unreachable' })
    un.advanceAll()
    const line = (el) => el.querySelector('.wld-card li.is-failed').textContent
    expect(line(op)).toContain('Operation id already in use')
    expect(line(un)).toContain('unreachable')
  })

  it('hands the caller which links verified', () => {
    const onDone = vi.fn()
    const el = panel({ outcome: 'unreachable', onDone })
    el.advanceAll()
    expect(onDone).toHaveBeenCalledOnce()
    const results = onDone.mock.calls[0][0]
    expect(results.filter((r) => r.ok).map((r) => r.link.isp)).toEqual(['Airtel', 'Tata'])
  })
})
