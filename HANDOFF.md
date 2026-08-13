# Handoff — 2026-08-12 11:36

## Read first

`CLAUDE.md` in full, but especially **"How we work — the method that produced all of this"** and
**"Environment gotchas"**. The method is the point: this project's value is as much the DS gap report
as the screen. Then skim `docs/DS-GAPS.md` — the status table at the top tells you what is fixed and
what is still open.

## What we worked on this session

Picked the project up from a hard stop, unblocked it, and completed all 8 planned tasks. Then went
well beyond the plan: rebuilt the bare conformance page into the real Report module screen, and ran
several rounds of *find a DS gap → report it → the DS team ships a fix → re-verify → delete the
workaround*.

## Completed

- **All 8 tasks of the implementation plan.** The plan had stalled at Task 0's gate on the previous
  (Windows) machine; installing the DS packages cleared it in one command.
- **The RBAC feature works end to end** — visibility indicator per row, three-mode settings drawer
  (`create` / `edit-builtin` / `edit-custom`), validation, delete-with-confirm, and a working
  Favorites pseudo-category driven by the table's star.
- **The screen matches the product's Report module** — module rail, app header with the Motadata
  mark and a working user menu, module title strip, tab row, category rail, toolbar, filter bar, and
  a grid with typed cells (star / link / switch / button).
- **20 DS findings documented** (G0–G22) in `docs/DS-GAPS.md`. **13 have been fixed by the DS team**
  across ~8 releases, each re-verified here.
- **Four consumer workarounds deleted** as those fixes landed — a Vite alias, the composed filter
  bar, the table star binding, and the drawer footer inset.
- **Handover prep** — `README.md`, `.gitattributes` (line endings), `.mcp.json`, and
  `.claude/settings.json` so a new machine configures itself.
- 67 tests passing · DS conformance **100/100** · both pages build · 49 commits.

## In progress

Nothing mid-flight. The working tree is clean and every change is committed.

## Next steps

1. **Verify G8 and G14 in a fresh session.** They could not be checked here — the MCP server is
   spawned at session start, so this session ran an eight-release-old build the whole time. G8 =
   `validate_render` rejecting `sidebar`/`app-header`/`icon`, which exist and score 100/100. G14 =
   whether `list_logos` / `resolve_logo` tools now exist.
2. **Decide `globe` vs `lockOpen` for Public.** `globe` was chosen when the icon library had no open
   padlock; four now ship (`lockOpen`, `lockOpenAlt`, `lockAltOpen`, `unlock`). The original design
   spec wanted open-lock/closed-lock. The `globe` reasoning — more distinct at 16px — still holds, so
   this is a genuine choice, not a bug.
3. **Wire search and notifications** the way the user menu now is. They are still plain `actions`
   icon buttons that fire `action` but open nothing; the DS has `obs-command-palette` and
   `obs-notification-menu` for them, and the `module-screen` recipe says to compose them into slots.
4. **Decide the horizontal inset.** The page header sits at the DS's 20px while the tab row is at 8px
   and the content at 12px. `--page-header-padding` is an exposed custom property, so aligning them
   is a one-liner — it just needs a decision on which value wins.
5. **Chase the remaining open gaps** with the DS team: **G21** (no spacing scale — the highest-leverage
   one, and the root cause behind several others), **G20** (480px documented only in the markdown spec),
   **G3**'s remaining half (`unlockAlt` still draws an undo arrow), **G22** (the header avatar's
   `role="button"` with nothing wired).

## Decisions made

- **Use the real DS components over hand-rolled ones, every time one exists.** `obs-side-menu` for
  the rail, `obs-toolbar` for the search row, `obs-filters` for the filter bar, `obs-page-header` for
  the title strip. Several of these replaced code written before the component was found or before it
  became functional.
- **Extend a component only where the DS explicitly leaves room.** `obs-side-menu`'s own known-issue
  says create/delete affordances are the consumer's job, so `augmentSideMenu.js` is sanctioned, not a
  hack. It is still the one fragile spot — it binds to internal class names.
- **Restyle through tokens and slots, never by piercing shadow DOM**, wherever the DS exposes one.
  The Inter switch is one line retargeting `--font-family`; the button hover was one line retargeting
  `--button-transparent-hover-text`. Both cost nothing in conformance.
- **Delete from the RBAC rail; keep it in the drawer.** The row carries only an edit affordance, so it
  stays a navigation target.
- **Keep `categoryRow.js`** though the host page no longer uses it — superseded by `obs-side-menu`,
  but its 13 tests still document the row contract.
- **Inter replaces the DS's Poppins.** A deliberate brand deviation, done through the token so
  reverting is one line.

## Gotchas & notes

- **Why the project stalled before.** The design spec records it: Claude Code's permission classifier
  on the Windows machine *"hard-denies both the `npm install` of this scope and any self-edit of
  permission settings to work around that denial."* The commit history confirms it — the session
  completed exactly the two tasks needing no DS access (Vitest tooling, the data store) and stopped
  at the first one that did. `.claude/settings.json` and the packages now being declared dependencies
  should prevent a repeat, but if Claude still refuses, run `npm install` in a terminal by hand.
- **Vite's cache will lie to you after a DS update.** More than once it reported gaps as "still
  broken" while serving the old pre-bundle. Always `rm -rf node_modules/.vite` and `--force`.
- **The `change` payload of `obs-filters` is a silent breaking change** between DS versions (bare
  array → `{conditions, match}`). An `Array.isArray` guard just yields no conditions, with no error.
  The handler in `main.js` tolerates both shapes.
- **Several plan assumptions were wrong** and are corrected in the component-reference doc — notably
  that organisms "are not shipped" (they are), and that `list_gaps` can declare reproductions (it
  takes no parameters). Do not trust the plan's `⟪PLACEHOLDER⟫` guidance over that doc.
- **The reference screenshots the design spec cites (`ss1.png`–`ss4.png`) are not in the repo** —
  they are at a Windows path from the authoring machine. Not chasing them is what caused the screen to
  be built as a bare fragment at first (gap G0). If you need them, ask.
