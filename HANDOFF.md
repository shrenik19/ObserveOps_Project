# Handoff — 2026-08-31

## Read first

`CLAUDE.md` in full, especially **"How we work"** and **"Environment gotchas"**. Then the status
table at the top of `docs/DS-GAPS.md`.

This session's work has its own spec and plan:

- `docs/superpowers/specs/2026-08-31-app-shell-router-design.md`
- `docs/superpowers/plans/2026-08-31-app-shell-router.md`

Branch: **`feat/app-shell-router`**, off `master` at `a529420`.

## What changed, in one sentence

The two screens were two standalone pages, each with its own copy of the app shell; they are now
**two routes inside one shell**, and a third screen costs one module file plus one registry line.

## Why

Adding a screen used to cost five edits, three of them copy-paste: a new `.html` with the whole
shell re-pasted, a new `vite.config.js` input, a new `main.js` with the shell *wiring* re-pasted
(the six-item module list, the header actions and the user-menu items appeared verbatim in both
`main.js` files), a hand-written card on the landing page, and a new path in the CI colour guard.

## The shape now

```
index.html            an empty shell; shell.js fills <body>, the router fills #screen-root
src/app/
  registry.js         modules -> screens.  THE file you edit to add a screen
  router.js           parse / resolve / href.  Pure: no DOM, no registry import
  shell.js            chrome only: sidebar, app header, user menu, #overlay-root
  screenHost.js       lifecycle only: unmount -> clear -> load -> mount
  overviewScreen.js   the default route, generated from the registry
  cardList.js         the card grid, shared by Overview and any module index
  pageHeader.js       obs-page-header from { heading, icon }
  main.js             composition root, and the ONLY DS import in the app
src/report-categories/screen.js
src/lama/screen.js
```

**The screen contract is one function in, one function out:** `mount(root)` gets the content region
and returns its own teardown. A screen can be read without reading the shell, and the shell without
reading any screen.

Routes: `#/reports/categories`, `#/settings/lama`, `#/` for the Overview. A module with several
screens would show a card grid filtered to itself — no new UI, just `cardList` with a filter. A
module with **no** screens is inert: `obs-sidebar` never writes its own `active`, so ignoring its
`navigate` event is the entire implementation.

## Decisions, so they are not relitigated

| Decision | Why |
|---|---|
| Hash routes, not pretty paths | No dev-server history fallback and no Pages `404.html` trick needed. Behaves identically at a root and under `/ObserveOps_Project/` |
| `report-categories.html` / `lama.html` kept as redirect stubs | Every URL in the docs and anything already shared keeps working. Redirects are **relative**, verified against a `BASE_PATH` build |
| Modules hold *many* screens | Two-level registry, so the seventh screen never forces a nav redesign |
| Empty modules do nothing on click | No placeholder screens, no disabled state — and it costs no code |
| The page header belongs to the screen, not the shell | It also exposes `count`, `back`, `meta`, `accent` and five slots; hoisting it into shell metadata means extending that schema forever |
| Overview is reached by clicking the brand | Our own slotted markup, so it needed no DS co-operation. `obs-sidebar`'s logo is an `<a>` with `@click.prevent` that emits nothing |
| One `#overlay-root` replaces `#panel-root` / `#dialog-root` / `#drawer-root` | The host clears it between screens, so no screen has to remember to close itself |

## Verification

- **416 tests across 21 files**, all passing. 53 of those are new (`src/app/`). No pre-existing test
  needed changing — every one targets a module this work did not touch.
- **Build clean**, and the lazy `import()` genuinely split: `overviewScreen` 0.63 kB and two `screen`
  chunks at 25.5 kB and 34 kB, each with its own CSS.
- **Both redirect stubs verified in a browser at the root AND under `/ObserveOps_Project/`.**
- **Conformance 100/100 on both real screens.** See the caveat below.
- **The scaling claim was proved, not asserted:** a throwaway third screen was added with one file
  and one registry line, confirmed to appear in the sidebar, on the Overview and at its own route,
  then removed.
- **The report screen was driven end to end**: 15 categories with 8 open / 7 closed padlocks and 5
  custom cogs; the settings drawer in edit-builtin mode; the delete flow from confirm through an
  empty-category delete (15 → 14) and on to the reassign step for a category holding reports.
- **The LAMA screen is pixel-identical to the pre-refactor page**, drawer included.

### Three defects that only rendering caught

The suite was green for all three.

1. **The CSS lift left `.app-shell__content` unclosed** — a `sed` range that stopped one line short
   of its `}`. Every rule after it was swallowed, so the whole Overview layout silently did nothing.
   There is now a brace-balance check; use it after any CSS move.
2. **`.landing` needed `width: 100%`.** It was a plain block on the old standalone page and is a
   flex item now, so `margin: 0 auto` made it shrink-to-fit and collapsed the card grid to one
   narrow column.
3. **The report markup contains HTML comments with backticks** (`` `fields` ``, `` `start` ``).
   Moved into a template literal they closed the string early and the entire screen threw
   `Unexpected identifier 'start'`. They are escaped now — **watch for this when moving any more
   markup into a template literal**, since this codebase comments heavily in backticks.

### The conformance caveat, and how it was settled

Screens load by dynamic `import()`, so the checker could sample before a screen has mounted and hand
back a high score for a nearly empty page. It does not: running it against three routes gives three
distinct measurements (`/` 70/100 · 0 DS components, `#/settings/lama` 100/100 · 5, and
`#/reports/categories` 100/100 · 6), which proves it is routing and sampling the mounted screen.
**Re-do that differential rather than trusting a single number.**

## One thing left open — G31

The **Overview scores 70/100** (component 0, 2 raw controls) and is the only screen that cannot
reach 100. Its cards are hand-composed `<a class="card">` because **the DS has no card or tile
component** — `obs-layout-panels` is `referenceOnly`, `obs-metric-list` has no documented API, and
`obs-link` is an inline link, not a card-sized target. This is recorded as **G31** in
`docs/DS-GAPS.md` with the repro and the ask.

The markup is carried over verbatim from the old landing page, so this is not a regression — it is
newly *visible*, because the Overview is now a route the checker can measure. Making only the "Open
screen" text an `obs-link` would score 100 and shrink the click target from the whole card to a few
words; that trade was deliberately not taken. **If you would rather have the score, that is the
one-line change.**

## Not done

Not pushed, and not merged to `master`. `master` is the deploy branch, so merging publishes.
