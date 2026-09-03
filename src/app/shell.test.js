import { describe, it, expect, vi } from 'vitest'
import { createShell } from './shell.js'

const fixture = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard', screens: [] },
  {
    key: 'reports', label: 'Reports', icon: 'report',
    screens: [{ key: 'c', label: 'C', description: 'd', load: async () => ({}) }],
  },
]

const build = () => {
  const host = document.createElement('div')
  return { host, shell: createShell({ host, modules: fixture }) }
}

describe('createShell', () => {
  it('builds the sidebar items from the registry, dropping the screens', () => {
    const { host } = build()
    expect(host.querySelector('#module-nav').items).toEqual([
      { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
      { key: 'reports', label: 'Reports', icon: 'report' },
    ])
  })

  it('exposes the content region and the overlay root', () => {
    const { host, shell } = build()
    expect(shell.content).toBe(host.querySelector('#screen-root'))
    expect(shell.overlay).toBe(host.querySelector('#overlay-root'))
  })

  it('wires the header actions and the user menu', () => {
    const { host } = build()
    expect(host.querySelector('#app-header').actions).toHaveLength(2)
    expect(host.querySelector('#user-menu').items).toHaveLength(3)
  })

  it('links the brand at the overview route', () => {
    const { host } = build()
    expect(host.querySelector('.app-brand').getAttribute('href')).toBe('#/')
  })

  it('setActive highlights a module', () => {
    const { host, shell } = build()
    shell.setActive('reports')
    expect(host.querySelector('#module-nav').getAttribute('active')).toBe('reports')
  })

  it('setActive with no key clears the highlight, because Overview is not a module', () => {
    const { host, shell } = build()
    shell.setActive('reports')
    shell.setActive(null)
    expect(host.querySelector('#module-nav').getAttribute('active')).toBe('')
  })

  it('reports a navigate event as the module key', () => {
    const { host, shell } = build()
    const seen = vi.fn()
    shell.onNavigate(seen)
    host.querySelector('#module-nav').dispatchEvent(
      new CustomEvent('navigate', { detail: { key: 'reports', label: 'Reports' } }),
    )
    expect(seen).toHaveBeenCalledWith('reports')
  })

  it('unwraps a navigate detail delivered as an array, as some DS events do', () => {
    const { host, shell } = build()
    const seen = vi.fn()
    shell.onNavigate(seen)
    host.querySelector('#module-nav').dispatchEvent(
      new CustomEvent('navigate', { detail: [{ key: 'reports' }] }),
    )
    expect(seen).toHaveBeenCalledWith('reports')
  })
})
