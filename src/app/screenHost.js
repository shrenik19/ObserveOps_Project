// Owns one screen at a time. Separated from shell.js so the lifecycle can be tested with plain
// objects, and the shell tested without a router — neither needs the other to be exercised.
//
// `mount` returns either its teardown function, or `{ unmount, update }`. A screen shown with a
// `key` that is already mounted and has an `update` is updated in place instead of remounted —
// which is how the Settings layout keeps its menu while its pane changes.
export function createScreenHost({ content, overlay }) {
  let current = null

  function teardown() {
    if (typeof current?.unmount === 'function') current.unmount()
    current = null
    content.replaceChildren()
    // Dialogs and drawers outlive their trigger, so a screen can leave one open. Clearing here
    // means no screen has to remember to close itself on the way out.
    overlay.replaceChildren()
  }

  async function show(loader, { key } = {}) {
    if (key && current?.key === key && typeof current.update === 'function') {
      current.update()
      return
    }
    teardown()
    const screen = await loader()
    const result = screen.mount(content)
    current = typeof result === 'function' ? { key, unmount: result } : { key, ...(result ?? {}) }
  }

  return { show, teardown }
}
