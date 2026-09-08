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
  return {
    list: () => profiles.map((p) => ({ ...p })),
    rows: () => profiles.map((p) => ({ ...p })),
  }
}
