// Example SLO profiles behind the SLO report preview. No DOM and no DS. The first five are the app's
// SLO estate (src/slo-list/sloStore.js); the rest are Performance SLOs, so both Source Filter kinds
// have members. Not the user's data.

export const SLO_PROFILES = [
  { id: 1, name: 'Checkout Availability', kind: 'Availability', service: 'E-commerce Platform', tags: ['checkout', 'tier-1'], frequency: 'Daily', target: 99, achieved: 100 },
  { id: 2, name: 'Payment Gateway Uptime', kind: 'Availability', service: 'E-commerce Platform', tags: ['payments'], frequency: 'Daily', target: 99, achieved: 99.8 },
  { id: 3, name: 'Search & Catalogue', kind: 'Availability', service: 'E-commerce Platform', tags: [], frequency: 'Daily', target: 99, achieved: 91.2 },
  { id: 4, name: 'Core Switching Availability', kind: 'Availability', service: 'Network Core', tags: ['network', 'core', 'datacenter'], frequency: 'Daily', target: 95, achieved: 23.9 },
  { id: 5, name: 'Branch WAN Links', kind: 'Availability', service: 'Branch Connectivity', tags: ['wan'], frequency: 'Daily', target: 98, achieved: 98.4 },
  { id: 6, name: 'Checkout API Latency', kind: 'Performance', service: 'E-commerce Platform', tags: ['api', 'latency'], frequency: 'Weekly', target: 95, achieved: 97.1 },
  { id: 7, name: 'Database Response Time', kind: 'Performance', service: 'Core Banking', tags: ['database'], frequency: 'Daily', target: 90, achieved: 86.5 },
  { id: 8, name: 'Firewall Throughput', kind: 'Performance', service: 'Network Core', tags: ['firewall'], frequency: 'Monthly', target: 80, achieved: 92.3 },
]

// Two example instances per profile for each instance-level SLO type.
export const INSTANCE_NAMES = {
  Metric: ['core-sw-01', 'core-sw-02', 'edge-rtr-01', 'db-node-01', 'fw-01', 'branch-rtr-07', 'web-01', 'web-02'],
  APM: ['checkout-service', 'payment-service', 'search-service', 'inventory-service', 'auth-service', 'order-service', 'cart-service', 'pricing-service'],
  RUM: ['/checkout', '/cart', '/search', '/login', '/home', '/account', '/product', '/orders'],
  NetRoute: ['HQ → AWS us-east-1', 'HQ → Azure West', 'Branch 7 → HQ', 'DC1 → DC2', 'HQ → SaaS CRM', 'DC2 → DR', 'Branch 3 → HQ', 'HQ → Office 365'],
}
