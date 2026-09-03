// src/wan-link-discovery/runner.js
// Declare -> push -> verify. The profile declares a link; the run pushes that operation to the
// router and waits for its first result.
//
// A device discovery card narrates one line ("Ping successful"). A WAN link push has four stages
// that fail DIFFERENTLY, and the difference is the diagnosis: a stage-3 failure is bad
// configuration, a stage-4 failure is a dead path. One generic "failed" hides that.

import { PLATFORMS } from './platforms.js'

export const OUTCOMES = ['ok', 'auth', 'operation', 'unreachable']

export const stagesFor = ({ monitorName, method, vendor }) => [
  `Connecting to ${monitorName} over ${method}`,
  'Credential validated',
  `Creating ${vendor === 'Juniper' ? 'RPM probe' : 'IP SLA operation'}`,
  'Waiting for first result…',
]

const FAILURES = {
  auth: {
    index: 0,
    text: (method) =>
      method === 'SSH' ? 'SSH authentication failed' : 'SNMP timeout — no response from device',
  },
  operation: { index: 2, text: () => 'Operation id already in use' },
  unreachable: { index: 3, text: () => 'Destination unreachable — no result within timeout' },
}

/**
 * Everything the progress panel needs to animate one link, with no timing in it.
 * `index` is the link's position in the run, used only to vary the reported RTT.
 */
export function planRun({ monitor, osKey, outcome, index = 0 }) {
  const platform = PLATFORMS[osKey]
  const stages = stagesFor({
    monitorName: monitor.name, method: platform.method, vendor: platform.vendor,
  })
  const failure = FAILURES[outcome]
  return {
    stages,
    failIndex: failure ? failure.index : -1,
    failText: failure ? failure.text(platform.method) : '',
    successText: `First result received — RTT ${2 + index} ms`,
    ok: !failure,
  }
}
