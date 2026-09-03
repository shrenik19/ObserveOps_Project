// src/wan-link-discovery/runner.test.js
import { describe, it, expect } from 'vitest'
import { OUTCOMES, stagesFor, planRun } from './runner.js'
import { findMonitor } from './monitors.js'

describe('run stages', () => {
  it('narrates four stages, not one', () => {
    const stages = stagesFor({ monitorName: 'CORE-NX-01', method: 'SSH', vendor: 'Cisco Systems' })
    expect(stages).toHaveLength(4)
  })

  it('names the transport in the first stage', () => {
    expect(stagesFor({ monitorName: 'A', method: 'SSH', vendor: 'Cisco Systems' })[0])
      .toBe('Connecting to A over SSH')
    expect(stagesFor({ monitorName: 'B', method: 'SNMP', vendor: 'Juniper' })[0])
      .toBe('Connecting to B over SNMP')
  })

  it('names what it creates after the vendor', () => {
    expect(stagesFor({ monitorName: 'A', method: 'SSH', vendor: 'Cisco Systems' })[2])
      .toBe('Creating IP SLA operation')
    expect(stagesFor({ monitorName: 'B', method: 'SNMP', vendor: 'Juniper' })[2])
      .toBe('Creating RPM probe')
  })
})

describe('run outcomes', () => {
  it('offers the four outcomes', () => {
    expect(OUTCOMES).toEqual(['ok', 'auth', 'operation', 'unreachable'])
  })

  it('succeeds with no failing stage', () => {
    const plan = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'ok', index: 0 })
    expect(plan.ok).toBe(true)
    expect(plan.failIndex).toBe(-1)
    expect(plan.successText).toContain('RTT')
  })

  it('fails auth at stage 1, and words it per transport', () => {
    const ssh = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'auth', index: 0 })
    expect(ssh.failIndex).toBe(0)
    expect(ssh.failText).toBe('SSH authentication failed')

    const snmp = planRun({ monitor: findMonitor('m-xe'), osKey: 'ios-xe', outcome: 'auth', index: 0 })
    expect(snmp.failText).toContain('SNMP')
  })

  it('separates a configuration failure from a dead path', () => {
    const op = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'operation', index: 0 })
    const un = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'unreachable', index: 0 })
    expect(op.failIndex).toBe(2)
    expect(un.failIndex).toBe(3)
    expect(op.failText).not.toBe(un.failText)
    expect(op.ok).toBe(false)
    expect(un.ok).toBe(false)
  })

  it('varies the reported RTT per link so a bulk run does not read as copied', () => {
    const a = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'ok', index: 0 })
    const b = planRun({ monitor: findMonitor('m-nxos'), osKey: 'nx-os', outcome: 'ok', index: 1 })
    expect(a.successText).not.toBe(b.successText)
  })
})
