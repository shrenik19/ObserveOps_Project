import { describe, it, expect } from 'vitest'
import { PROBES, LINKS, availabilityWindows, tilesFor, chartsFor } from './probes.js'

describe('probes', () => {
  it('defines exactly the three NX-OS probes', () => {
    expect(Object.keys(PROBES)).toEqual(['icmp-echo', 'udp-echo', 'udp-jitter'])
  })

  it('needs a destination port only for the UDP probes', () => {
    expect(PROBES['icmp-echo'].needsPort).toBe(false)
    expect(PROBES['udp-echo'].needsPort).toBe(true)
    expect(PROBES['udp-jitter'].needsPort).toBe(true)
  })

  it('seeds every probe several times', () => {
    for (const key of Object.keys(PROBES)) {
      expect(LINKS.filter((l) => l.probe === key).length).toBeGreaterThanOrEqual(4)
    }
  })

  it('leaves RTT blank on links that are down', () => {
    const down = LINKS.filter((l) => l.status === 'down')
    expect(down.length).toBeGreaterThan(0)
    expect(down.every((l) => l.rtt === '')).toBe(true)
  })

  it('uses NX-OS interface names', () => {
    expect(LINKS.every((l) => /^Eth\d+\/\d+$/.test(l.sourceInterface))).toBe(true)
  })

  it('uses the jitter availability windows only for jitter', () => {
    expect(availabilityWindows('icmp-echo')).toEqual(['Last Day', 'Last 7 Days', 'Last 15 Days'])
    expect(availabilityWindows('udp-jitter')).toEqual(['7 Days', '15 Days', '30 Days'])
  })

  it('gives the echo probes no tiles and three charts', () => {
    for (const key of ['icmp-echo', 'udp-echo']) {
      expect(tilesFor(key)).toEqual([])
      expect(chartsFor(key)).toHaveLength(3)
    }
  })

  it('gives the echo probes one RTT series, since NX-OS reports no min or max', () => {
    const rtt = chartsFor('icmp-echo').find((c) => c.title === 'RTT History')
    expect(rtt.series).toEqual(['ipsla.latency.ms.avg'])
  })

  it('caps the jitter tile row at six and gives it ten charts', () => {
    expect(tilesFor('udp-jitter')).toHaveLength(6)
    expect(chartsFor('udp-jitter')).toHaveLength(10)
  })

  it('has no MOS or ICPIF tile', () => {
    const titles = tilesFor('udp-jitter').map((t) => t.title)
    expect(titles).not.toContain('MOS')
    expect(titles).not.toContain('ICPIF')
  })

  it('splits loss periods by direction, both halves of each pair', () => {
    const loss = chartsFor('udp-jitter').filter((c) => c.title.endsWith('Loss Periods'))
    expect(loss).toHaveLength(2)
    expect(loss[0].series).toEqual([
      'Loss Periods', 'Period Length Min', 'Period Length Max',
      'Inter-Loss Length Min', 'Inter-Loss Length Max',
    ])
  })

  it('drops the Average Jitter and Avg Latency charts', () => {
    const titles = chartsFor('udp-jitter').map((c) => c.title)
    expect(titles).not.toContain('Average Jitter')
    expect(titles).not.toContain('Avg Latency')
  })

  it('fills each chart row to twelve columns', () => {
    const rows = {}
    for (const c of chartsFor('udp-jitter')) (rows[c.row] = rows[c.row] || []).push(c.span)
    for (const spans of Object.values(rows)) {
      expect(spans.reduce((a, b) => a + b, 0)).toBe(12)
    }
  })
})
