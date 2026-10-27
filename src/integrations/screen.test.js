import { describe, it, expect, beforeEach } from 'vitest'
import { mount } from './screen.js'
import { SDP } from './catalogue.js'

const setup = (view = '') => {
  // Each mount re-uses the same ids; clear the body so a selector never reads a previous mount.
  document.body.replaceChildren()
  history.replaceState(null, '', '#/settings/integration')
  const overlay = document.createElement('div')
  overlay.id = 'overlay-root'
  const root = document.createElement('div')
  document.body.append(root, overlay)
  const unmount = mount(root, { view })
  return { root, overlay, unmount }
}

describe('integration landing', () => {
  let ctx
  beforeEach(() => { ctx = setup() })

  it('shows a card per integration', () => {
    expect(ctx.root.querySelectorAll('.integration-card')).toHaveLength(9)
  })

  it('draws no menu of its own — the Settings layout owns it', () => {
    expect(ctx.root.querySelector('obs-side-menu')).toBeNull()
  })

  it("routes a card to that integration's own menu item", () => {
    ctx.root.querySelector('[data-integration="Integration Profile"]').click()
    expect(window.location.hash).toBe('#/settings/integration-profile')
    ctx.root.querySelector(`[data-integration="${SDP}"]`).click()
    expect(window.location.hash).toBe('#/settings/me-service-desk-plus')
    ctx.root.querySelector('[data-integration="LAMA"]').click()
    expect(window.location.hash).toBe('#/settings/lama')
  })
})

describe('integration views', () => {
  it('opens the profile table for Integration Profile', () => {
    const { root } = setup('Integration Profile')
    expect(root.querySelector('#integration-table').rows).toHaveLength(12)
    expect(root.querySelector('.integration-card')).toBeNull()
  })

  it('opens the connection form for ME Service Desk Plus', () => {
    const { root } = setup(SDP)
    expect(root.querySelector('[data-role="sdp-connection"]')).not.toBeNull()
  })

  it('creates a profile from the drawer and closes it', () => {
    const { root, overlay } = setup('Integration Profile')
    root.querySelector('[data-role="create-profile"]').click()
    const drawer = overlay.querySelector('[data-role="integration-profile-drawer"]')
    drawer.querySelector('[data-role="profile-name"]').value = 'SDP P1'
    drawer.querySelector('[data-role="integration-type"]').value = SDP
    drawer.selectType(SDP)
    drawer.selectTemplate('Default Request')
    drawer.querySelector('[data-role="create"]').click()
    expect(overlay.children).toHaveLength(0)
    expect(root.querySelector('#integration-table').rows.find((r) => r.name === 'SDP P1')?.type).toBe(SDP)
  })

  it('clears the overlay on unmount', () => {
    const { root, overlay, unmount } = setup('Integration Profile')
    root.querySelector('[data-role="create-profile"]').click()
    unmount()
    expect(overlay.children).toHaveLength(0)
  })
})
