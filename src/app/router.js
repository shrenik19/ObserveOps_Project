// Hash routing, chosen over history routing because it needs no server co-operation: it behaves
// identically on the Vite dev server and on GitHub Pages under the /<repo>/ base path, with no
// history fallback and no 404.html copy trick.
//
// Pure by design — `resolve` takes the modules array rather than importing the registry, so the
// rules can be tested against fixtures and the registry can grow without touching this file.

/** '#/reports/categories' -> { module: 'reports', screen: 'categories' } */
export function parse(hash) {
  const [module = null, screen = null] = String(hash || '')
    .replace(/^#/, '')
    .split('/')
    .filter(Boolean)
  return { module, screen }
}

/** href() -> '#/'  ·  href('reports') -> '#/reports'  ·  href('r', 'c') -> '#/r/c' */
export function href(moduleKey, screenKey) {
  if (!moduleKey) return '#/'
  return screenKey ? `#/${moduleKey}/${screenKey}` : `#/${moduleKey}`
}

/**
 * A parsed route + the registry -> what to render.
 *
 *   overview     the default screen; also the fallback for anything unrecognised, so a stale
 *                shared link lands somewhere useful instead of erroring
 *   screen       mount this screen
 *   moduleIndex  the module holds several screens: show its card grid
 *   ignore       the module holds none: do nothing at all, leaving the URL and the sidebar
 *                highlight exactly as they were
 */
export function resolve({ module: moduleKey, screen: screenKey }, modules) {
  if (!moduleKey) return { kind: 'overview' }

  const module = modules.find((m) => m.key === moduleKey)
  if (!module) return { kind: 'overview' }
  if (module.screens.length === 0) return { kind: 'ignore' }

  const named = screenKey && module.screens.find((s) => s.key === screenKey)
  if (named) return { kind: 'screen', module, screen: named }

  // No screen named, or one named that does not exist: fall back to the module's own rules.
  return module.screens.length === 1
    ? { kind: 'screen', module, screen: module.screens[0] }
    : { kind: 'moduleIndex', module }
}
