// Owns one screen at a time. Separated from shell.js so the lifecycle can be tested with plain
// objects, and the shell tested without a router — neither needs the other to be exercised.
export function createScreenHost({ content, overlay }) {
  let unmount = null

  function teardown() {
    if (typeof unmount === 'function') unmount()
    unmount = null
    content.replaceChildren()
    // Dialogs and drawers outlive their trigger, so a screen can leave one open. Clearing here
    // means no screen has to remember to close itself on the way out.
    overlay.replaceChildren()
  }

  async function show(loader) {
    teardown()
    const screen = await loader()
    unmount = screen.mount(content) ?? null
  }

  return { show, teardown }
}
