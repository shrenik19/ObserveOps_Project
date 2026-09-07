# Handoff — 2026-09-04 15:17

## Read first

`CLAUDE.md` in this folder — especially **"How we work — the method that produced all of this"** and
**"Standing constraints"**. This session produced a live demonstration of why rule 1 (*verify by
rendering, never by reading*) exists; see "Gotchas & notes".

Then read the execution ledger, which is the authoritative record of this branch and survives any
lost session:
**`.superpowers/sdd/2026-09-03-wan-link-discovery/progress.md`**

It holds every ruling made on your behalf, with what each costs if wrong. It ends with a
`=== PAUSED BY USER REQUEST ===` block giving the exact resume instructions.

## What we worked on this session

Resumed and drove the **WAN Link Discovery** implementation plan
(`docs/superpowers/plans/2026-09-03-wan-link-discovery.md`) — 12 tasks, executed by dispatching a
fresh implementer per task with an independent review and fix loop after each. The previous session
had ended at a usage limit mid-Task-8. Task 12 was paused mid-flight and then re-dispatched.
**All 12 tasks are now complete.** Task 12 itself is awaiting its review.

## Completed

Branch `feat/wan-link-discovery`, **591 tests across 35 files, all green**, build clean.

| Task | What landed |
|---|---|
| 1–5 | Platform matrix, seeded monitors + credential prefill, CSV contract, four-stage run, profile store |
| 6 | Screen shell, route and the profile list |
| 7 | Create form — Single mode |
| 8 | Create form — CSV mode, plus the Reset fix |
| 9–10 | Progress panel and provision grid |
| 11 | The four views wired into one flow, and the deep link from a device |
| 12 | Verified by rendering (`scripts/probe-wan-link-discovery.mjs`, 80 checks), DS conformance, the colour guard, and the docs |

Every task passed an independent spec-and-quality review; four needed fix rounds, and all of those
came back clean on re-review.

## What Task 12 resolved

The inherited partial work was picked up rather than redone. The `[hidden]` CSS fix was **complete
and correct for both selectors** — confirmed by measuring the painted box, not the property.
`_x.mjs` became section H of `scripts/probe-wan-link-discovery.mjs`; `_x.mjs` and `_xshots/` were
deleted, superseded by the probe's own regenerated `docs/shots/wld-*.png`.

**One Critical defect found by rendering, invisible to the green suite** — `obs-table` reflects
`selected` back as a JSON *string*, so `provisionGrid.js`'s `Array.isArray` guard dropped every
click and **"Add Selected Objects" could never be enabled with the mouse**. Fixed, with two
regression tests that fail against the old code. Filed as DS-GAPS **G41**.

**Two DS-GAPS entries were withdrawn as false** — **G21** (the spacing scale does exist, as
`--padding-xs/sm/md/lg`; only the name `--spacing-*` is absent) and **G40**. Both are kept in place
with the evidence that disproved them. The G21 error had propagated into two source comments, now
corrected.

## Next steps

1. **Task 12's review**, then the **whole-branch review** from merge-base `cad09b6`.
2. **Fix DS-GAPS G44** — `src/wan-link/wanLink.css` uses `var(--secondary-text-color)` eight times
   and that token does not exist, so eight de-emphasised elements render at full strength on the
   already-shipped WAN Link screen. The DS's real token is `--text-color-common-secondary`. Left out
   of Task 12's commit on purpose: it changes a different, already-reviewed screen's appearance and
   needs its own visual review (`node scripts/verify-wan-link.mjs`).
3. Decide how to finish the branch. It is **not** on `master`, and CI publishes from `master`, so
   nothing here is live yet.

## Decisions made

Every ruling is in the ledger with its cost-if-wrong. The ones that changed the shipped result:

- **Kept the interrupted implementer's uncommitted Task 8 work** instead of reverting to a clean
  base. Its tests were transcribed verbatim from the brief, so they could not be shaped to fit the
  code — 27 of 31 passed against the untouched tree, confirming the inherited work was correct.
- **Rejected DS-GAPS entry G40 and rewrote the mode toggle on `obs-radio as-button`.** An implementer
  filed G40 claiming `obs-button` has no selected state. The DS spec's own decision tree names
  `as-button` for exactly this shape (a 2–5 option segmented control, 255× usage), and **this
  codebase already used it** in `report-categories/categorySettingsPanel.js`. `DS-GAPS.md` is handed
  to the DS team as a deliverable; one false entry costs more than the rewrite did. G40 was deleted
  outright, not marked resolved.
- **Kept Frequency and Operation Timeout required in CSV mode**, against the brief's own code
  snippet. They are per-profile parameters, not CSV columns — the brief's tests contradicted its
  snippet, and the tests won.
- **Accepted a scope expansion into `src/app/router.js`.** `parse()` was not stripping the query
  string off the screen segment, so the new deep link resolved to nothing and would have dropped the
  user on the Settings module index. The reviewer signed it off after auditing every call site.
- **Routed seven findings into Task 12 as requirements C1–C7** rather than fixing them blind —
  including driving a discovery run on the *real* timer path, and following the device deep link in
  a real browser. Neither had ever been exercised.

## Gotchas & notes

- **The `[hidden]` trap — the most valuable finding on this branch, and the reason Task 12 exists.**
  The UA's `[hidden] { display: none }` is the weakest rule in the cascade, so **any** id- or
  class-selector that sets `display` beats it: the element stays *painted* while `el.hidden` reads
  `true`. jsdom reads the property, so every unit test saw "hidden" and passed while the browser
  showed the element. Rendered proof: with the Create form open, `#wld-list` still measured
  1351×506 — the profile table was sitting above the form, the progress panel and the provision
  grid. Eleven tasks, four task reviews and four re-reviews all passed over it. **If you add a rule
  that sets `display` on anything this screen toggles, add the `[hidden]` override with it.**
  Task 12 re-checked all ten elements this screen toggles, in every state, by measuring the painted
  box — `#wld-list`, `#wld-port-field` and eight others are all correctly unpainted when hidden, and
  `scripts/probe-wan-link-discovery.mjs` now asserts that on every run. The cascade rule is broader
  than "id- or class-selector": author origin beats the UA stylesheet at *any* specificity, so a bare
  `obs-button { display: … }` would do it too. DS components are safe — they ship
  `:host([hidden]){display:none!important}` themselves.
- **The DS-GAPS bar is high.** Before filing an entry, search `ds-spec/components/registry/*.json`
  *and* `registry/elements-api.json`, including components you did not think to look at. G40 was
  filed and withdrawn on this branch for exactly that failure.
- **The rendering probes are the verification, not conformance.** `node
  scripts/probe-wan-link-discovery.mjs` (80 checks, all four views, the real timers, the deep link)
  and `node scripts/verify-wan-link.mjs`. Both need `npm run dev` and `CHROME` set to
  `C:\Program Files\Google\Chrome\Application\chrome.exe` — the tooling otherwise looks for a macOS
  path. `ORIGIN` and `SHOTS` override the dev server and the screenshot directory.
- **The conformance checker exits 2 after one line if `playwright-core` is missing — which reads like
  a pass.** And screens load by dynamic `import()`, so Chromium can sample before the screen mounts
  and score an almost-empty page very highly. Check the element count against a known-good run —
  but note the count is only light-DOM `obs-button/input/select/switch/checkbox/radio/link`, so a
  spare screen scores low legitimately. The discovery screen's **100/100 on 2 components** was
  verified genuine by replicating the checker's own timing and confirming the screen had mounted
  (`#wld-content` present, table rendering 2 rows, 11 distinct `obs-*` tags). Conformance only ever
  sees a screen's first view — the Create form, progress panel and provision grid are never scored.
- Three deferred minor findings are logged in the ledger for the whole-branch review to triage. None
  block merge on their own.
