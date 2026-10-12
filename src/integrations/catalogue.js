// Settings -> Integration: the integration list, each Integration Type's profile fields, and the
// seeded Integration Profile rows. No DOM, no DS.

export const SDP = 'ME Service Desk Plus'

// The Integration sub-menu, in the product's order. ME Service Desk Plus is the new entry and sits
// after ServiceNow, beside the other ticketing integration.
export const INTEGRATIONS = [
  'Integration Profile',
  'Motadata ServiceOps',
  'ServiceNow',
  SDP,
  'Atlassian Jira',
  'Microsoft Teams',
  'Slack',
  'LAMA',
  'Geo Map',
]

// What the Create Integration Profile drawer offers as Integration Type.
export const INTEGRATION_TYPES = [
  'ServiceNow',
  'Microsoft Teams',
  'ServiceOps',
  SDP,
  'Syslog Forwarder',
  'SNMP Trap Forwarder',
  'Slack',
]

// The selects a ticketing type adds below Description, as [left, right] rows — the shipped product's
// ServiceNow set. SDP has none of its own: like Jira's Project -> Issue Type, its Request Template
// decides the form (TEMPLATE_FIELDS).
export const TYPE_FIELDS = {
  ServiceNow: [
    ['Category', 'Sub Category'],
    ['Group', 'Technician'],
    ['Impact', 'Urgency'],
    ['Service', 'Service Offering'],
  ],
}

// The fields each SDP Request Template reveals, in order; the drawer packs them two per row. A
// placeholder map agreed with the designer — a real build reads each template's fields from SDP.
// Incident templates carry no service catalogue fields, and Network Outage is routed straight to the
// network team, so it has no Level either.
const SDP_FIELDS = ['Impact', 'Urgency', 'Priority', 'Level', 'Group', 'Technician', 'Category', 'Subcategory', 'Service Category', 'Item']
export const TEMPLATE_FIELDS = {
  'Default Request': SDP_FIELDS,
  'Report an Incident': SDP_FIELDS.slice(0, 8),
  'Network Outage': SDP_FIELDS.filter((f) => !['Level', 'Service Category', 'Item'].includes(f)),
}

// Placeholder pick-lists. With no backend there is no SDP instance to read them from; these are the
// SDP out-of-the-box values where it has them.
export const FIELD_OPTIONS = {
  'Request Template': Object.keys(TEMPLATE_FIELDS),
  Impact: ['High', 'Medium', 'Low', 'Affects User'],
  Urgency: ['High', 'Normal', 'Low', 'Urgent'],
  Priority: ['High', 'Medium', 'Normal', 'Low'],
  Level: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'],
  Group: ['Network', 'Hardware Problems', 'Printer Problems', 'Database'],
  Technician: ['Administrator', 'Heather Graham', 'Howard Stern', 'John Roberts'],
  Category: ['Network', 'Hardware', 'Software', 'Operating System'],
  Subcategory: ['Router', 'Switch', 'Firewall', 'Wireless'],
  'Sub Category': ['Router', 'Switch', 'Firewall', 'Wireless'],
  'Service Category': ['Communication', 'Desktop / Laptop', 'Network Access', 'User Management'],
  Item: ['New Connection', 'Access Request', 'Bandwidth Upgrade'],
  Service: ['Email', 'VPN', 'Network'],
  'Service Offering': ['Gold', 'Silver', 'Bronze'],
}

// Pre-filled the same way the shipped ServiceNow form pre-fills its incident fields.
export const DEFAULT_SUBJECT = '$$$policy.name$$$-$$$object.name$$$($$$object.ip$$$)-$$$counter$$$'
export const DEFAULT_DESCRIPTION = [
  'Object Name: $$$object.name$$$',
  'IP / Host: $$$object.ip$$$',
  'Object Type: $$$object.type$$$',
  'Metric: $$$counter$$$',
  'Metric Value: $$$value$$$',
  'Severity: $$$severity$$$',
  'Policy Name: $$$policy.name$$$',
  'Policy Type: $$$policy.type$$$',
  'Message: $$$policy.message$$$',
].join('\n')

// Example data, not the user's.
const SEED = [
  ['Anantraj-High', 'Anantraj High urgency', 'ServiceOps', 7],
  ['Anantraj-Low', '', 'ServiceOps', 3],
  ['Catagory Check', 'Catagory Mandatory Check', 'ServiceOps', 2],
  ['Critical Alert-ServiceOps', '', 'ServiceOps', 0],
  ['Disk Integration Profile', '', 'ServiceNow', 0],
  ['keertan', '', 'Slack', 1],
  ['metric-alert', 'metric alert', 'Microsoft Teams', 0],
  ['SDP Critical Requests', 'Raise high-priority SDP requests for critical alerts', SDP, 4],
  ['SDP Network Outage', 'Network team requests in Service Desk Plus', SDP, 2],
  ['ServiceNow Event', 'This is the OOTB integration profile for servicenow event', 'ServiceNow', 0],
  ['SERVICEOPS CS', '', 'ServiceOps', 0],
  ['ServiceOps Integration', '', 'ServiceOps', 0],
].map(([name, description, type, used], i) => ({ id: `ip-${i + 1}`, name, description, type, used }))

export function createProfileStore(seed = SEED) {
  const profiles = seed.map((p) => ({ ...p }))
  let seq = profiles.length

  return {
    rows: () => profiles.map((p) => ({ ...p })),

    // Profile Name is "Must be unique" in the product. Compared case-insensitively and trimmed, so
    // "metric-alert " cannot sit beside "metric-alert".
    isTaken: (name) => profiles.some((p) => p.name.toLowerCase() === name.trim().toLowerCase()),

    // New profiles go first, so the row just created is the one in view.
    add({ name, description = '', type }) {
      const profile = { id: `ip-${++seq}`, name: name.trim(), description, type, used: 0 }
      profiles.unshift(profile)
      return { ...profile }
    },
  }
}
