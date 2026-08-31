import { describe, it, expect } from 'vitest'
import { meta, mount } from './overviewScreen.js'
import { modules, allScreens } from './registry.js'

describe('overviewScreen', () => {
  it('declares a page header', () => {
    expect(meta.pageHeader.heading).toBeTruthy()
    expect(meta.pageHeader.icon).toBeTruthy()
  })

  it('renders one card per registered screen', () => {
    const root = document.createElement('div')
    mount(root)
    expect(root.querySelectorAll('.card')).toHaveLength(allScreens(modules).length)
  })

  it('returns a teardown function', () => {
    const root = document.createElement('div')
    expect(typeof mount(root)).toBe('function')
  })
})
