# Handoff — 2026-10-12

## Read first

`CLAUDE.md` in this folder — especially **"How we work"** and **"Standing constraints"**. The
previous handoff (the first SDP session, 2026-10-07) is preserved in git at `f2e6126`; its "Next
steps" still stand except where this one supersedes them.

## What we worked on this session

**SDP Create Integration Profile drawer — step-by-step reveal, like the product's Jira.** The user
supplied three product screenshots of the Jira drawer (Integration Type → Project → Issue Type →
full form) and asked for the same pattern for ME Service Desk Plus, with Request Template as the
deciding field, and Mode removed.

## Completed

- **Picking ME Service Desk Plus now adds only Request Template\*** (with ⓘ), alone in the left
  half of its row and unset — as Jira shows only Project.
- **Picking a template reveals that template's fields**, packed two per row, then Auto Close
  Ticket\*, Request Subject\*, Request Description\*. Changing the template rebuilds them; changing
  the type or Reset clears them.
- **Template → fields map** (`catalogue.js` `TEMPLATE_FIELDS`) — placeholder, proposed by Claude
  and approved by the user:
  - Default Request — Impact, Urgency, Priority, Level, Group, Technician, Category, Subcategory,
    Service Category, Item
  - Report an Incident — the same minus Service Category, Item
  - Network Outage — the same minus Level, Service Category, Item
- **Mode removed** from the SDP fields and from `FIELD_OPTIONS`.
- **Create without a template is refused** ("Select a Request Template"); the error clears on pick.
  The draft passed to `onCreate` carries `template` for SDP (the store ignores it).
- SDP no longer has a `TYPE_FIELDS` entry; ServiceNow is unchanged.
- **Tests:** integrations 39/39 (was 29); full suite **774 / 774 across 48 files**.
- **Probe: 47/47 in real Chrome** (was 38). It caught a defect jsdom did not — the template error
  stayed painted after a pick — now fixed with a unit test to match. New shots:
  `docs/shots/integration-3a-drawer-sdp-type.png`, `integration-3b-drawer-sdp-network-outage.png`;
  `integration-3-drawer-sdp.png` now shows Default Request.
- Colour guard clean; `npm run build` clean.

### Later the same day — layout review fixes (SDP connection form + drawer)

The user reviewed the SDP connection form and set three rules for every form, now in CLAUDE.md
"Standing constraints": product-measured gaps (24px between columns), edges aligned across rows,
and the plainest control (URL Time Out is plain text — no spinner, no "sec"). Applied:
24px column gap (form + drawer); Create Credential Profile starts the right column; the form is
exactly two columns wide so Save ends on the field edge; captions fixed at 16px so an ⓘ no longer
drops its field 2px. The probe now measures all of it. New `connectionForm.test.js`.

## In progress

Both commits are pushed. **A parallel session has an uncommitted Settings-layout restructure** in
this working tree (`src/settings/`, router, screens). Its changes overlap `CLAUDE.md`,
`integrations.css`, `screen.js`/`screen.test.js` — this session committed only its own hunks.
Three probe checks (menu sections, `?view=` hashes) fail against that work until it updates them.

## Next steps

1. **Designer review of the template → fields map** and the placeholder pick-lists. A real build
   reads both from the SDP instance.

## Gotchas & notes

- **Port 5199 may already be held by a Vite from an earlier session** serving this same folder —
  `--strictPort` then fails, but the probe still runs against current code. Check with
  `netstat -ano | grep :5199` before assuming the server is stale.
- `drawer.selectTemplate(name)` is the test hook beside `drawer.selectType(name)`; neither sets the
  select's displayed value — the probe drives the real selects.
