import { describe, it, expect } from 'vitest'
import { modules, findModule, findScreen, allScreens } from './registry.js'

describe('registry data', () => {
  it('lists the six product modules in sidebar order', () => {
    expect(modules.map((m) => m.key)).toEqual([
      'dashboard', 'monitors', 'alerts', 'topology', 'reports', 'settings',
    ])
  })

  it('gives every module a label and an icon', () => {
    for (const m of modules) {
      expect(m.label, `${m.key} label`).toBeTruthy()
      expect(m.icon, `${m.key} icon`).toBeTruthy()
      expect(Array.isArray(m.screens), `${m.key} screens`).toBe(true)
    }
  })

  it('has no duplicate module keys', () => {
    const keys = modules.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('has no duplicate screen keys within a module', () => {
    for (const m of modules) {
      const keys = m.screens.map((s) => s.key)
      expect(new Set(keys).size, `${m.key} screen keys`).toBe(keys.length)
    }
  })

  it('gives every screen a label, a description and a loader', () => {
    for (const { module, screen } of allScreens(modules)) {
      expect(screen.label, `${module.key}/${screen.key} label`).toBeTruthy()
      expect(screen.description, `${module.key}/${screen.key} description`).toBeTruthy()
      expect(typeof screen.load, `${module.key}/${screen.key} load`).toBe('function')
    }
  })
})

const fixture = [
  { key: 'empty', label: 'Empty', icon: 'dashboard', screens: [] },
  {
    key: 'one', label: 'One', icon: 'report',
    screens: [{ key: 'solo', label: 'Solo', description: 'd', load: async () => ({}) }],
  },
]

describe('findModule', () => {
  it('finds a module by key', () => {
    expect(findModule(fixture, 'one').label).toBe('One')
  })

  it('returns undefined for an unknown key', () => {
    expect(findModule(fixture, 'nope')).toBeUndefined()
  })
})

describe('findScreen', () => {
  it('finds a screen inside its module', () => {
    expect(findScreen(fixture, 'one', 'solo').label).toBe('Solo')
  })

  it('returns undefined when the module is unknown', () => {
    expect(findScreen(fixture, 'nope', 'solo')).toBeUndefined()
  })

  it('returns undefined when the screen is unknown', () => {
    expect(findScreen(fixture, 'one', 'nope')).toBeUndefined()
  })

  it('returns undefined when the module has no screens', () => {
    expect(findScreen(fixture, 'empty', 'anything')).toBeUndefined()
  })
})

describe('allScreens', () => {
  it('pairs each screen with its module, skipping empty modules', () => {
    expect(allScreens(fixture)).toEqual([
      { module: fixture[1], screen: fixture[1].screens[0] },
    ])
  })
})
