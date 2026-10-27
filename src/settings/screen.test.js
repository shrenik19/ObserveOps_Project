import { describe, it, expect, afterEach } from 'vitest'
import { mount, meta } from './screen.js'
import { modules } from '../app/registry.js'
import { parse, resolve } from '../app/router.js'
import { STUB_LABEL } from './menu.js'

const setup = async (hash = '#/settings') => {
  document.body.replaceChildren()
  history.replaceState(null, '', hash)
  const overlay = document.createElement('div')
  overlay.id = 'overlay-root'
  const root = document.createElement('div')
  document.body.append(root, overlay)
  const screen = mount(root)
  await screen.ready
  const menu = () => root.querySelector('#settings-menu')
  const pane = () => root.querySelector('[data-role="settings-pane"]')
  const pick = (label) => menu().dispatchEvent(new CustomEvent('select', { detail: [{ label }] }))
  return { root, overlay, screen, menu, pane, pick }
}

let ctx
afterEach(() => ctx?.screen.unmount())

describe('routing into Settings', () => {
  it('sends every #/settings route to the layout — no card grid', () => {
    for (const hash of ['#/settings', '#/settings/lama', '#/settings/metric-policy']) {
      expect(resolve(parse(hash), modules).kind).toBe('layout')
    }
  })

  it('declares its page header', () => {
    expect(meta.pageHeader.heading).toBe('Settings')
  })
})

describe('the Settings layout', () => {
  it('opens on My Profile, with My Account open', async () => {
    ctx = await setup('#/settings')
    expect(ctx.pane().dataset.item).toBe('my-profile')
    expect(ctx.pane().querySelector('[data-role="my-profile"]')).not.toBeNull()
    expect(ctx.menu().getAttribute('active')).toBe('My Profile')
    expect(JSON.parse(ctx.menu().getAttribute('items')).map((s) => s.label)).toEqual(['My Account'])
  })

  it('has exactly one page header — embedded screens no longer draw their own', async () => {
    for (const hash of ['#/settings/lama', '#/settings/slo-profile', '#/settings/discovery-profile', '#/settings/integration-profile']) {
      ctx = await setup(hash)
      expect(ctx.root.querySelectorAll('obs-page-header'), hash).toHaveLength(1)
      ctx.screen.unmount()
    }
  })

  it('mounts an existing screen into the pane', async () => {
    ctx = await setup('#/settings/slo-profile')
    expect(ctx.pane().querySelector('#slo-profile-table')).not.toBeNull()
    expect(ctx.menu().getAttribute('active')).toBe('SLO Profile')
  })

  it('shows a placeholder for an item with no design work', async () => {
    ctx = await setup('#/settings/trap-policy')
    const placeholder = ctx.pane().querySelector('[data-role="settings-placeholder"]')
    expect(placeholder.querySelector('h2').textContent).toBe('Policy Settings / Trap Policy')
    expect(placeholder.querySelector('obs-banner').textContent).toContain('Trap Policy')
  })

  it('opens nothing for the stand-in row of an untouched section, and keeps the highlight', async () => {
    ctx = await setup('#/settings/slo-profile')
    ctx.pick(STUB_LABEL)
    expect(window.location.hash).toBe('#/settings/slo-profile')
    expect(ctx.pane().querySelector('#slo-profile-table')).not.toBeNull()
    await new Promise((r) => setTimeout(r))
    expect(ctx.menu().getAttribute('active')).toBe('SLO Profile')
  })

  it('routes a menu pick, and keeps the same menu when the route catches up', async () => {
    ctx = await setup('#/settings')
    const before = ctx.menu()
    ctx.pick('SLO Profile')
    expect(window.location.hash).toBe('#/settings/slo-profile')
    await ctx.screen.update()
    expect(ctx.menu()).toBe(before)
    expect(ctx.pane().querySelector('#slo-profile-table')).not.toBeNull()
  })

  it('rebuilds the menu on Back / a pasted link, so the right section opens', async () => {
    ctx = await setup('#/settings')
    const before = ctx.menu()
    history.replaceState(null, '', '#/settings/snmp-trap-listener')
    await ctx.screen.update()
    expect(ctx.menu()).not.toBe(before)
    expect(JSON.parse(ctx.menu().getAttribute('items')).map((s) => s.label)).toEqual(['SNMP Trap'])
    expect(ctx.menu().getAttribute('active')).toBe('SNMP Trap Listener')
  })

  it('ignores a pick of the item already open', async () => {
    ctx = await setup('#/settings/my-profile')
    ctx.pick('My Profile')
    expect(window.location.hash).toBe('#/settings/my-profile')
  })

  it('passes the view to Integration', async () => {
    ctx = await setup('#/settings/me-service-desk-plus')
    expect(ctx.pane().querySelector('[data-role="sdp-connection"]')).not.toBeNull()
    expect(ctx.menu().getAttribute('active')).toBe('ME Service Desk Plus')
  })

  it('opens the Integration landing with no item highlighted', async () => {
    ctx = await setup('#/settings/integration')
    expect(ctx.pane().querySelectorAll('.integration-card')).toHaveLength(9)
    expect(ctx.menu().hasAttribute('active')).toBe(false)
  })

  it('runs the pane teardown and clears the overlay when the pane changes', async () => {
    ctx = await setup('#/settings/integration-profile')
    ctx.pane().querySelector('[data-role="create-profile"]').click()
    expect(ctx.overlay.children).toHaveLength(1)
    ctx.pick('Log Policy')
    await ctx.screen.update()
    expect(ctx.overlay.children).toHaveLength(0)
    expect(ctx.pane().dataset.item).toBe('log-policy')
  })

  it('drops a slow pane that a newer pick has overtaken', async () => {
    ctx = await setup('#/settings')
    history.replaceState(null, '', '#/settings/slo-profile')
    const slow = ctx.screen.update()
    history.replaceState(null, '', '#/settings/penalty-profile')
    await ctx.screen.update()
    await slow
    expect(ctx.pane().dataset.item).toBe('penalty-profile')
    expect(ctx.pane().querySelector('#slo-profile-table')).toBeNull()
  })
})
