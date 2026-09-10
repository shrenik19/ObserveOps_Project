// The Create Discovery Profile drawer's first and third columns — the 2 and the 4 of the DS's
// 2 : 6 : 4 large / full-screen tier. The 6 is createForm.js, unchanged.

import { renderNavRail, renderHelpPanel } from '../app/paneDrawer.js'

// The Discovery Profile tree, in the product's own order, with WAN Link between Service Check and
// Wireless — exactly where the wireframe puts it and what the spec's first decision fixes:
// "WAN Link is its own category in the tree", rejecting "a sub-node under Network".
//
// Every other category is SHOWN but disabled. The rail has to read as the real Discovery tree — that
// is the whole claim of this feature — while this build only serves WAN Link, and a category that
// silently vanished would misrepresent where WAN Link sits among its siblings.
export const CATEGORIES = [
  'Server', 'Cloud', 'Network', 'SDN', 'Virtualization', 'HCI', 'Storage', 'Database',
  'Service Check', 'WAN Link', 'Wireless', 'Container Orchestration', 'Other',
]

export function renderDiscoveryRail() {
  return renderNavRail({
    heading: 'Create Discovery Profile',
    search: true,
    items: CATEGORIES.map((label) => ({
      key: label,
      label,
      disabled: label !== 'WAN Link',
    })),
    selected: 'WAN Link',
  })
}

// The product's Discovery Help Card is four collapsible rows plus a documentation link. The copy is
// the spec's own, not invented: the platform matrix from Block 2, the derived method from
// "Method derived and not shown", and declare → push → verify from the decisions table.
export function renderDiscoveryHelp() {
  return renderHelpPanel({
    title: 'Discovery Help Card',
    sections: [
      {
        heading: 'Supported Platforms',
        open: true,
        content: `
          <ul>
            <li><b>Cisco Systems</b> — IOS XE, IOS XR, NX-OS (IP SLA)</li>
            <li><b>Juniper</b> — RPM</li>
          </ul>
          <p>Vendor is read from the monitor and cannot be changed here. Device OS is filled in from
          the same place but stays editable, and the available WAN probes follow it.</p>
        `,
      },
      {
        // Set through textContent, so this is a literal ampersand, not an entity.
        heading: 'Network & Connectivity Requirements',
        content: `
          <p>The source router must already be monitored — the profile targets a <b>monitor</b>, not a
          bare IP, which is how the platform knows the vendor, the OS and the interface list.</p>
          <p>The destination must be reachable from the source interface you pick, and for
          <b>UDP Echo</b> and <b>UDP Jitter</b> the responder must be listening on the UDP port the
          form collects.</p>
        `,
      },
      {
        heading: 'Credential Requirements and Permissions',
        content: `
          <p>A Credential Profile is required. The list is filtered to the platform's protocol, and is
          prefilled with the monitor's own credential when that credential matches — otherwise it is
          empty and you must choose one.</p>
          <p>The credential needs enough privilege to <b>configure and read an IP SLA operation</b>,
          because discovery writes the operation to the device rather than only reading it.</p>
        `,
      },
      {
        heading: 'Discovery Mechanisms',
        content: `
          <p><b>Declare → push → verify.</b> You declare the link, the profile pushes the IP SLA
          operation to the router, and only what verifies is provisioned as a WAN Link monitor.</p>
          <p>The method — SSH or SNMP — is <b>derived from the platform</b> and is not asked for. The
          old SNMP / SSH cards are gone, matching the Juniper flow, which never had them.</p>
        `,
      },
    ],
    footer: 'For more information: <a href="#/settings/wan-link-discovery">Discovery Profile</a>',
  })
}
