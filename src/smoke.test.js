import { describe, it, expect } from 'vitest'

describe('test tooling', () => {
  it('runs in a jsdom environment', () => {
    expect(typeof document).toBe('object')
    expect(document.createElement('div').tagName).toBe('DIV')
  })
})
