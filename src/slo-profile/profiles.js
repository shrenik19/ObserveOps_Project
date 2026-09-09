// The SLO profiles behind Settings -> Service Level Objective -> SLO Profile (artboard 6).
// Columns are the shipped set from SLO_setup_1, plus EVALUATION LOGIC beside FREQUENCY so the
// evaluation parameters read together.

const SEED = [
  { id: 'sp-1', type: 'Availability', name: 'Checkout Availability', frequency: 'Daily',
    evaluation: 'Redundancy', warning: '99.5', target: '99', service: 'E-commerce Platform', start: '01-09-2026' },
  { id: 'sp-2', type: 'Availability', name: 'API-Gateway-Availability', frequency: 'Weekly',
    evaluation: 'Strict', warning: '91', target: '90', service: 'SLO FOR MAXIS', start: '30-06-2026' },
  { id: 'sp-3', type: 'Performance', name: 'Storage-Volume-Availability', frequency: 'Daily',
    evaluation: '—', warning: '71', target: '70', service: 'SLO RENASUS', start: '31-05-2027' },
  { id: 'sp-4', type: 'Availability', name: 'Up time', frequency: 'Weekly',
    evaluation: 'Strict', warning: '99.29', target: '99.27', service: 'ABC', start: '30-06-2026' },
  { id: 'sp-5', type: 'Availability', name: 'WANLink SLO', frequency: 'Daily',
    evaluation: 'Redundancy', warning: '99', target: '98', service: 'WANLINK Juhu', start: '15-08-2026' },
]

export function createProfileStore(seed = SEED) {
  const profiles = seed.map((p) => ({ ...p }))

  // Scoped to this store, not the module, the same way src/wan-link-discovery/profileStore.js
  // scopes its ids: the screen recreates its store on remount, and a shared counter would carry
  // ids across instances that are otherwise independent.
  let seq = profiles.length
  const nextId = () => `sp-${++seq}`

  return {
    rows: () => profiles.map((p) => ({ ...p })),

    // The Create form creates (spec §8): a new profile is appended and returned so the table can
    // show it without navigating away and back. `type` defaults to Availability — the Create form
    // (artboard 2) collects no Availability/Performance distinction of its own.
    add(draft) {
      const profile = { id: nextId(), type: 'Availability', ...draft }
      profiles.push(profile)
      return { ...profile }
    },
  }
}
