# Report Category RBAC (Visibility & Sharing) — Design

## Context

The Report module's left-nav category list (Metric tab, `D:\Claude design\Screenshots\ss1.png`) needs
category-level access control: each category (built-in or user-created) can be made **Public** (visible
to everyone) or **Private** (visible only to specific users/user profiles). Reference screenshots:

- `ss1.png` — Report screen, left-nav category list, "Create Custom Report" button.
- `ss2.png` — "New Category" row at the bottom of the nav; custom categories (Inventory, Performance,
  SDN, Log Events, WAN Link Test, Forecast, HCI, ui test) show a pencil/edit icon; built-ins don't.
- `ss3.png` — The dedicated "Favorites" nav entry with its star icon highlighted.
- `ss4.png` — "Visibility & Sharing" block: Public/Private toggle, info banner, conditional
  Users/User Profile picker (shown for Private).

Scope, confirmed with the user: category-level visibility/sharing only — no separate roles/permissions
management screen.

## Out of scope

- Role definitions (Admin/Editor/Viewer) or a permissions matrix screen.
- Any change to per-report favoriting (the star icon inside the report table itself, unrelated to this
  feature).
- Charts, topology, or any non-DS surface — none needed here.

## Left-nav category list

Each category has two relevant fields: `visibility` (`public` | `private`) and `type`
(`builtin` | `custom` — already implied today by which rows show a pencil icon).

The **Favorites** pinned entry is unrelated to this feature and is unchanged — it keeps its existing
star icon.

Every other row (built-in and custom alike) renders:

- Category name.
- **Lock icon**, always visible: open-lock for `public`, closed-lock for `private`. Read-only display —
  not itself clickable.
- **On hover, all categories**: a pencil (edit) icon appears. Clicking it opens the Category-Settings
  panel in `edit-builtin` or `edit-custom` mode, based on `type`.
- **On hover, custom categories only**: an additional red trash-bin icon appears next to the pencil,
  opening the delete-confirmation dialog.

No other structural change to the nav list.

## Category-Settings panel

One reusable side-panel component, parameterized by `mode`: `create` | `edit-builtin` | `edit-custom`.
Rationale: the three modes differ only in field-level state (see below), not layout — one component is
easier to keep in sync with the DS than three near-duplicate panels, and it's a single organism
reproduction to declare via `list_gaps` instead of three.

**Layout, top to bottom:**

1. Panel title — "New Category" (`create`) or "Edit Category" (`edit-*`).
2. **Name** field:
   - `create`, `edit-custom`: editable, required.
   - `edit-builtin`: same field, shown disabled/read-only, pre-filled with the built-in name.
3. Plain heading "Visibility & Sharing" (a heading, not a text-divider, per DS rule).
4. Two-option toggle/segmented control: **Public** / **Private**.
   - `create`: defaults to Public.
   - `edit-*`: pre-selected to the category's current `visibility`.
5. Conditional content directly below the toggle:
   - **Public** selected → info banner only: "Visible to all users in the organization." No picker.
   - **Private** selected → info banner: "Only the Users or User Profiles you add can view this
     dashboard." plus a `Users / User Profile` multi-select picker (`@User` or `#User Profile` entries),
     required (at least one entry) when Private.
6. Footer:
   - **Cancel** + **Save**, always present.
   - **Delete** (destructive style), additionally present only in `edit-custom` mode, left-aligned,
     separate from Save/Cancel.

**Interactions:**

- Opened via the sidebar's "New Category" row → `create` mode, blank Name, Public default.
- Opened via hover-pencil on any row → `edit-*` mode per that category's `type`, fields pre-filled from
  its current state.
- Save validation: Name required and non-empty (editable modes only); if Private, at least one
  user/profile entry required.
- On successful Save, panel closes and the row's lock icon updates immediately to match the new
  `visibility`.

## Delete-confirmation dialog (custom categories only)

Small modal reproduction, triggered by the row's trash icon: title + warning text (e.g. "Delete
'<name>'? This can't be undone."), Cancel + destructive Delete buttons. Confirming removes the row from
the nav; if that category was the active filter, the view falls back to "All Reports".

## DS conformance plan

Neither the `@mtdt/observeops-ds-*` packages nor the `observeops-ds` MCP server are installed/registered
on this machine yet (verified via `claude mcp list` and a missing `node_modules/@mtdt`), so no concrete
`<obs-*>` tag names or attributes are finalized in this spec — components are described by category only
(text input, segmented/toggle control, icon button, inline banner, multi-select/tag picker, modal/dialog,
side-panel/drawer). Before implementation:

1. Get the DS packages installed and the MCP server registered (blocked on the user running the install
   commands themselves — see prior conversation; Claude Code's auto-mode classifier hard-denies both the
   `npm install` of this scope and any self-edit of permission settings to work around that denial).
2. Call `search_components` / `get_component` / `get_recipe` for each component category above.
3. Side-panel and confirmation-modal are organisms, not atoms — compose from atoms + tokens + layout and
   declare both as reproductions via `list_gaps`.
4. All colors via `var(--token)`, resolved through `resolve_token` — no hardcoded hex/rgb/hsl anywhere,
   including the lock icon's open/closed states and the destructive delete/trash styling.
5. After building, run `validate_render` and
   `node node_modules/@mtdt/observeops-ds-spec/conformance/ds-conformance.mjs` on the finished page.

## Data model changes

The category list's backing store needs two fields per entry:

- `visibility: 'public' | 'private'`
- `sharedWith: Array<{ type: 'user' | 'profile', id: string }>` (only meaningful when `visibility ===
  'private'`)

`type` (`builtin` | `custom`) already exists implicitly today (it's what currently drives the pencil
icon's presence) and is reused as-is.
