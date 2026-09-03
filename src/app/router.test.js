import { describe, it, expect } from 'vitest'
import { parse, resolve, href } from './router.js'

const screen = (key) => ({ key, label: key, description: 'd', load: async () => ({}) })

const fixture = [
  { key: 'empty', label: 'Empty', icon: 'dashboard', screens: [] },
  { key: 'one', label: 'One', icon: 'report', screens: [screen('solo')] },
  { key: 'many', label: 'Many', icon: 'settings', screens: [screen('a'), screen('b')] },
]

describe('parse', () => {
  it('reads an empty hash as no route', () => {
    expect(parse('')).toEqual({ module: null, screen: null })
  })

  it('reads a bare hash as no route', () => {
    expect(parse('#')).toEqual({ module: null, screen: null })
  })

  it('reads the root route as no route', () => {
    expect(parse('#/')).toEqual({ module: null, screen: null })
  })

  it('reads a module-only route', () => {
    expect(parse('#/reports')).toEqual({ module: 'reports', screen: null })
  })

  it('reads a module and screen route', () => {
    expect(parse('#/reports/categories')).toEqual({ module: 'reports', screen: 'categories' })
  })

  it('tolerates a trailing slash', () => {
    expect(parse('#/reports/')).toEqual({ module: 'reports', screen: null })
  })

  it('ignores segments beyond the second', () => {
    expect(parse('#/reports/categories/extra')).toEqual({ module: 'reports', screen: 'categories' })
  })
})

describe('href', () => {
  it('builds the root href with no arguments', () => {
    expect(href()).toBe('#/')
  })

  it('builds a module href', () => {
    expect(href('reports')).toBe('#/reports')
  })

  it('builds a module and screen href', () => {
    expect(href('reports', 'categories')).toBe('#/reports/categories')
  })

  it('round-trips through parse', () => {
    expect(parse(href('reports', 'categories'))).toEqual({ module: 'reports', screen: 'categories' })
  })
})

describe('resolve', () => {
  it('sends no route to the overview', () => {
    expect(resolve({ module: null, screen: null }, fixture)).toEqual({ kind: 'overview' })
  })

  it('sends an unknown module to the overview', () => {
    expect(resolve({ module: 'nope', screen: null }, fixture)).toEqual({ kind: 'overview' })
  })

  it('ignores a module with no screens', () => {
    expect(resolve({ module: 'empty', screen: null }, fixture)).toEqual({ kind: 'ignore' })
  })

  it('ignores a module with no screens even when a screen is named', () => {
    expect(resolve({ module: 'empty', screen: 'ghost' }, fixture)).toEqual({ kind: 'ignore' })
  })

  it('opens the only screen of a single-screen module', () => {
    expect(resolve({ module: 'one', screen: null }, fixture)).toEqual({
      kind: 'screen', module: fixture[1], screen: fixture[1].screens[0],
    })
  })

  it('shows a module index for a multi-screen module', () => {
    expect(resolve({ module: 'many', screen: null }, fixture)).toEqual({
      kind: 'moduleIndex', module: fixture[2],
    })
  })

  it('opens a named screen', () => {
    expect(resolve({ module: 'many', screen: 'b' }, fixture)).toEqual({
      kind: 'screen', module: fixture[2], screen: fixture[2].screens[1],
    })
  })

  it('falls back to the module rules when the named screen is unknown', () => {
    expect(resolve({ module: 'one', screen: 'nope' }, fixture)).toEqual({
      kind: 'screen', module: fixture[1], screen: fixture[1].screens[0],
    })
    expect(resolve({ module: 'many', screen: 'nope' }, fixture)).toEqual({
      kind: 'moduleIndex', module: fixture[2],
    })
  })
})
