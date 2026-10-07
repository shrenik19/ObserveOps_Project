import { describe, it, expect, beforeEach } from 'vitest'
import { mount, viewFromHash, MENU_ITEMS } from './screen.js'
import { SDP } from './catalogue.js'

const setup = (hash = '#/settings/integration') => {
  // Each mount re-uses the same ids; clear the body so a selector never reads a previous mount.
  document.body.replaceChildren()
  history.replaceState(null, '', hash)
  const overlay = document.createElement('div')
  overlay.id = 'overlay-root'
  const root = document.createElement('div')
  document.body.append(root, overlay)
  const unmount = mount(root)
  return { root, overlay, unmount }
}

describe('viewFromHash', () => {
  it('reads a known integration from ?view=', () => {
    expect(viewFromHash(`#/settings/integration?view=${encodeURIComponent(SDP)}`)).toBe(SDP)
  })

  it('ignores anything that is not an integration', () => {
    expect(viewFromHash('#/settings/integration?view=Nope')).toBe('')
    expect(viewFromHash('#/settings/integration')).toBe('')
  })
})

describe('settings menu', () => {
  it('ends with the Integration section, SDP tagged NEW', () => {
    const integration = MENU_ITEMS.at(-1)
    expect(integration.label).toBe('Integration')
    expect(integration.children.find((c) => c.label === SDP).count).toBe('NEW')
  })

  // obs-side-menu opens its first section with children at setup (G53): the markup must carry
  // only Integration, or Log Settings opens too.
  it('seeds the markup with the Integration section only', () => {
    const { root } = setup()
    const seeded = JSON.parse(root.querySelector('#settings-menu').getAttribute('items'))
    expect(seeded.map((s) => s.label)).toEqual(['Integration'])
  })
})

describe('integration screen', () => {
  let ctx
  beforeEach(() => { ctx = setup() })

  it('lands on a card per integration', () => {
    expect(ctx.root.querySelectorAll('.integration-card')).toHaveLength(9)
  })

  it('opens the profile table from its card', () => {
    ctx.root.querySelector('[data-integration="Integration Profile"]').click()
    expect(ctx.root.querySelector('#integration-table').rows).toHaveLength(12)
    expect(window.location.hash).toBe('#/settings/integration?view=Integration%20Profile')
  })

  it('opens the SDP form from the menu', () => {
    ctx.root.querySelector('#settings-menu').dispatchEvent(new CustomEvent('select', { detail: [{ label: SDP }] }))
    expect(ctx.root.querySelector('[data-role="sdp-connection"]')).not.toBeNull()
  })

  it('ignores menu picks outside Integration', () => {
    ctx.root.querySelector('#settings-menu').dispatchEvent(new CustomEvent('select', { detail: [{ label: 'APM settings' }] }))
    expect(ctx.root.querySelectorAll('.integration-card')).toHaveLength(9)
  })

  it('creates a profile from the drawer and closes it', () => {
    ctx.root.querySelector('[data-integration="Integration Profile"]').click()
    ctx.root.querySelector('[data-role="create-profile"]').click()
    const drawer = ctx.overlay.querySelector('[data-role="integration-profile-drawer"]')
    drawer.querySelector('[data-role="profile-name"]').value = 'SDP P1'
    drawer.querySelector('[data-role="integration-type"]').value = SDP
    drawer.selectType(SDP)
    drawer.querySelector('[data-role="create"]').click()
    expect(ctx.overlay.children).toHaveLength(0)
    expect(ctx.root.querySelector('#integration-table').rows.find((r) => r.name === 'SDP P1')?.type).toBe(SDP)
  })

  it('clears the overlay on unmount', () => {
    ctx.root.querySelector('[data-integration="Integration Profile"]').click()
    ctx.root.querySelector('[data-role="create-profile"]').click()
    ctx.unmount()
    expect(ctx.overlay.children).toHaveLength(0)
  })
})

describe('deep link', () => {
  it('opens the view the hash names', () => {
    const { root } = setup(`#/settings/integration?view=${encodeURIComponent(SDP)}`)
    expect(root.querySelector('[data-role="sdp-connection"]')).not.toBeNull()
    expect(root.querySelector('#settings-menu').getAttribute('active')).toBe(SDP)
  })
})
