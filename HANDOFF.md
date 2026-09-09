# Handoff — 2026-09-09 14:27

## Read first

`CLAUDE.md` in this folder — especially **"How we work — the method that produced all of this"**
and **"Standing constraints"**. This session produced two more demonstrations of why rule 1
(*verify by rendering, never by reading*) exists; both are under "Gotchas & notes", and both got
past a fully green test suite **and** a green render probe.

**Two workstreams share this repo and this branch (`master`).** This handoff covers the SLO one. A
second Claude session has been working on WAN Link Discovery in parallel; its record is at
`.superpowers/sdd/2026-09-03-wan-link-discovery/progress.md` and ends with a
`=== PAUSED BY USER REQUEST ===` block holding its resume instructions. **The handoff this file
replaces was that session's** (dated 2026-09-04, describing work since completed and pushed); it is
preserved in git history at `b103f2b` if you need it.

The authoritative record of the SLO work — every decision taken during execution, with what each
costs if it turns out wrong — is committed at:
**`docs/superpowers/plans/2026-09-08-slo-ds-port-ledger.md`** (27 rulings).

## What we worked on this session

Phase 2 of the Redundancy SLO work: porting the approved wireframe onto the published design system
as two real routed screens. Executed as a ten-task plan with a fresh subagent per task and a review
after each, then a whole-branch review, its fix wave, and publishing.

## Completed

- **`#/slo/list`** — the SLO estate as tiles with live status counters, and a briefcase toggle that
  regroups it under Business Services. Each service heading carries the **severest** status among
  its SLOs (`E-commerce Platform` reads *Breached* while two of its three SLOs read *Ok* — that
  case exists precisely to prove the rule isn't "first wins").
- **`#/settings/slo-profile`** — the shipped profile table (Evaluation Logic beside Frequency,
  plain text per **G1**), and behind it the Create SLO Profile form. Create **persists**, and the
  new row appears in the table.
- **The Option G Evaluation Logic control** — `src/slo-profile/evaluationLogic.js`, the one
  deliberately invented component in this app (spec **P4**). `obs-radio` has no slot, so rather
  than downgrade an approved design it was built and filed as **G45** with working code the DS team
  can lift. Full WAI-ARIA radiogroup: roving tabindex, arrow keys, Enter/Space.
- **`docs/DS-GAPS.md` gained G45–G49**, each verified by rendering, plus two corrections retiring
  claims that turned out to be false (see Gotchas).
- **679 tests across 42 files. `scripts/probe-slo.mjs` at 29/29** — and it passes against the
  **live** site, not only localhost.
- **Published:** https://shrenik19.github.io/ObserveOps_Project/

## In progress

Nothing mid-flight in the SLO work. The plan is complete, reviewed, fixed and pushed.

Two things are **deliberately reserved** rather than unfinished:

- **`.slo-create__help` in `src/slo-profile/createForm.js`** — the Help Card column exists at the
  wireframe's 56/44 split, titled *"SLO Help card"*, with an intentionally **empty** body. A test
  asserts it is empty, so a placeholder cannot quietly become the deliverable. The real card (the
  worked five-day matrix and the "recovered N percentage points" note) is fully designed in
  `redundancy-slo/wireframe.html` artboard 2 and lands here when the designer calls for it.
- **Artboards 3–5** (SLO detail Overview, Configured Entities, the breach) stay wireframe-only, by
  the designer's decision. Consequently the SLO tiles **do not navigate** — spec **P3**.

## Next steps

1. **Place the real Help Card** into `.slo-create__help` when asked — source is artboard 2 of
   `redundancy-slo/wireframe.html`. Delete the "body is empty" assertion in `createForm.test.js` as
   part of that change; it is the handover marker.
2. **Decide whether `docs/DS-GAPS.md` should be public.** The repo is public and that file is now a
   49-entry critique of the internal `@mtdt/observeops-ds-*` packages, naming exact versions. It
   predates this session, but it deserves a conscious decision rather than an inherited one.
3. **Hand G45–G49 to the DS team.** G45 ships with a working reference implementation; G49 shipped
   a real bug in this build and is the strongest case in the file.
4. **PQ2 — the model split — is still unresolved.** Artboard 2 models one redundancy group;
   artboards 3–5 model several plus an ungrouped remainder. Nothing built here exposes it, so it
   stayed deferred. It becomes blocking the day someone builds the detail screen.

## Decisions made

Full list with costs-if-wrong is in the ledger. The ones that shaped the product:

- **Option G was built as designed rather than composed around `obs-radio`.** A reference app that
  quietly downgrades a design to fit the DS reports nothing except its own compromise.
- **`N = M` is unreachable, enforced in `evaluation.js`, not as an input `min`/`max`.** Asking for
  all M members is what Strict *means*. The factory throws below 2 members, and the quorum rounds
  and rejects non-finite values.
- **Create persists.** Originally parked as deliberate ("the wireframe doesn't persist either"),
  then **overturned** by the final review: `src/lama/screen.js` and
  `src/wan-link-discovery/profileStore.js` both write to their stores, so SLO Profile would have
  been the only Create form in this app that discards its input.
- **Selection is signalled by surface, not colour** (`--neutral-lighter`, not the blue
  `--default-tag-bg`), and the consequence carries no shield glyph — both at the designer's
  direction on 2026-09-09.

## Gotchas & notes

- **Two defects reached this branch past a fully green test suite AND a green render probe.** Both
  were caught only by opening a screenshot:
  1. **Four form fields rendered with no label at all.** `obs-select` and `obs-tags` have no
     `label` attribute; `obs-input` does. The unit test asserted the attribute was *present* — it
     was, and the component ignored it. Now **G49**. `src/wan-link-discovery/createForm.js:28`
     already carried a comment saying exactly this, so the codebase knew and the plan ignored it.
  2. **Tile text painted outside its card border**, then over-corrected into truncating the quorum
     away entirely. Settled with `.slo-tile__slot:last-child { flex: 1.8 }`.
  **The lesson now encoded in `scripts/probe-slo.mjs`: when a claim is visual, assert geometry, not
  DOM presence.** It pins the label count at 12 and measures painted heights and edges.
- **Two gap entries were filed as fact and were false**, and are corrected in place using the
  file's withdrawn-claim convention: a shield glyph *does* exist (`shield-check` — the original
  probe tried only `shield`, `shieldAlt`, `security`, `protect`), and the manifest *does* document
  slots, for 16 components. **`elements-api.json` is a starting point, never proof.**
- **Playwright pierces open shadow roots by default**, and `obs-icon` reflects its host class onto
  its internal `<svg>` — an unqualified `.some-class` selector matches twice per icon.
  Tag-qualify it (`obs-icon.some-class`).
- **A probe with no DS CSS loaded reports false negatives:** components coloured through
  `--severity-*` render *invisibly* rather than failing, and read as "not rendered". Inject
  `@mtdt/observeops-ds-css` alongside the elements bundle.
- **Sharing `master` with another session:** never run a bare `git commit` or `git add -A` here —
  use `git add <paths>` then `git commit -o <paths>`. A bare commit swept that session's work into
  the wrong commit once, on 2026-09-07. Never run process-wide kills (`taskkill /IM node.exe`) — an
  implementer did, and it would have killed the other session's dev server. Use a distinct port
  (5199) for probe runs; 5173 is theirs.
- **`npm test` can report a wildly low count** (once: 531 across 37 files instead of 679 across 42)
  if the other session is writing files during collection. Re-run before believing it.
- **Conformance scores 68/100 on `#/slo/list`** — expected, not a defect: the tile grid is
  hand-rolled because the DS has no card component (**G47**), and the checker counts DS elements.
  `#/settings/slo-profile` scores 100/100, and the Create form is never scored at all, because
  conformance only ever sees a screen's first view.
