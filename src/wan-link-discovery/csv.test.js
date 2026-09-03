// src/wan-link-discovery/csv.test.js
import { describe, it, expect } from 'vitest'
import { CSV_COLUMNS, sampleCsv, parseCsv } from './csv.js'
import { findMonitor } from './monitors.js'

describe('csv contract', () => {
  it('carries exactly the per-link fields the Single form asks for', () => {
    expect(CSV_COLUMNS).toEqual([
      'wan_probe', 'isp', 'source_interface', 'source_router_location',
      'destination_ip', 'destination_router_location', 'udp_port',
    ])
  })

  it('writes a sample whose header is the contract', () => {
    const text = sampleCsv(findMonitor('m-nxos'), 'nx-os')
    expect(text.split('\n')[0]).toBe(CSV_COLUMNS.join(','))
  })

  it('samples only probes the chosen platform actually has', () => {
    const rows = parseCsv(sampleCsv(findMonitor('m-juniper'), 'rpm')).rows
    expect(rows.every((r) => r.probe === 'ICMP Ping')).toBe(true)
  })

  it('leaves udp_port blank on rows whose probe is not a UDP probe', () => {
    const rows = parseCsv(sampleCsv(findMonitor('m-nxos'), 'nx-os')).rows
    const icmp = rows.find((r) => r.probe === 'ICMP Echo')
    const udp = rows.find((r) => r.probe === 'UDP Echo')
    expect(icmp.port).toBe('')
    expect(udp.port).not.toBe('')
  })
})

describe('csv parsing', () => {
  const HEADER = CSV_COLUMNS.join(',')

  it('parses one row per link', () => {
    const { rows, errors } = parseCsv(
      `${HEADER}\nUDP Echo,Airtel,Ethernet1/1,Pune DC,8.8.8.8,Mumbai DC,5000`,
    )
    expect(errors).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toEqual({
      probe: 'UDP Echo', isp: 'Airtel', iface: 'Ethernet1/1', srcLocation: 'Pune DC',
      dip: '8.8.8.8', dstLocation: 'Mumbai DC', port: '5000',
    })
  })

  it('ignores blank lines and trims cells', () => {
    const { rows } = parseCsv(`${HEADER}\n\n  ICMP Echo , Jio ,Eth1/2,,1.1.1.1,, \n\n`)
    expect(rows).toHaveLength(1)
    expect(rows[0].probe).toBe('ICMP Echo')
    expect(rows[0].isp).toBe('Jio')
    expect(rows[0].port).toBe('')
  })

  it('rejects a file whose header is not the contract', () => {
    const { rows, errors } = parseCsv('probe,isp\nICMP Echo,Airtel')
    expect(rows).toEqual([])
    expect(errors[0]).toContain('header')
  })

  it('reports the row number when a UDP row has no port', () => {
    const { errors } = parseCsv(`${HEADER}\nUDP Jitter,Tata,Eth1/1,,9.9.9.9,,`)
    expect(errors).toHaveLength(1)
    expect(errors[0]).toContain('row 1')
    expect(errors[0]).toContain('udp_port')
  })

  it('reports a row missing a mandatory cell', () => {
    const { errors } = parseCsv(`${HEADER}\nICMP Echo,,Eth1/1,,8.8.8.8,,`)
    expect(errors.some((e) => e.includes('isp'))).toBe(true)
  })

  it('accepts a file that mixes probe types', () => {
    const { rows, errors } = parseCsv(
      `${HEADER}\nICMP Echo,Airtel,Eth1/1,,8.8.8.8,,\nUDP Echo,Jio,Eth1/2,,1.1.1.1,,5000`,
    )
    expect(errors).toEqual([])
    expect(rows.map((r) => r.probe)).toEqual(['ICMP Echo', 'UDP Echo'])
  })
})
