import { describe, it, expect, vi } from 'vitest'
import { createScreenHost } from './screenHost.js'

const setup = () => {
  const content = document.createElement('div')
  const overlay = document.createElement('div')
  return { content, overlay, host: createScreenHost({ content, overlay }) }
}

describe('createScreenHost', () => {
  it('mounts a screen into the content region', async () => {
    const { content, host } = setup()
    await host.show(async () => ({ mount: (root) => { root.innerHTML = '<p>hi</p>' } }))
    expect(content.textContent).toBe('hi')
  })

  it('runs the previous screen teardown before mounting the next', async () => {
    const { host } = setup()
    const order = []
    await host.show(async () => ({ mount: () => () => order.push('unmount-a') }))
    await host.show(async () => ({ mount: () => { order.push('mount-b') } }))
    expect(order).toEqual(['unmount-a', 'mount-b'])
  })

  it('clears the overlay root between screens', async () => {
    const { overlay, host } = setup()
    await host.show(async () => ({ mount: () => { overlay.innerHTML = '<dialog></dialog>' } }))
    expect(overlay.children).toHaveLength(1)
    await host.show(async () => ({ mount: () => {} }))
    expect(overlay.children).toHaveLength(0)
  })

  it('empties the content region before mounting', async () => {
    const { content, host } = setup()
    await host.show(async () => ({ mount: (root) => { root.innerHTML = '<p>first</p>' } }))
    await host.show(async () => ({ mount: (root) => { root.innerHTML = '<p>second</p>' } }))
    expect(content.querySelectorAll('p')).toHaveLength(1)
    expect(content.textContent).toBe('second')
  })

  it('tolerates a screen that returns no teardown', async () => {
    const { host } = setup()
    await host.show(async () => ({ mount: () => undefined }))
    await expect(host.show(async () => ({ mount: () => {} }))).resolves.not.toThrow()
  })

  it('teardown() unmounts the current screen and clears both regions', async () => {
    const { content, overlay, host } = setup()
    const unmount = vi.fn()
    await host.show(async () => ({
      mount: (root) => { root.innerHTML = '<p>x</p>'; overlay.innerHTML = '<b></b>'; return unmount },
    }))
    host.teardown()
    expect(unmount).toHaveBeenCalledTimes(1)
    expect(content.children).toHaveLength(0)
    expect(overlay.children).toHaveLength(0)
  })
})
