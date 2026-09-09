# SDD ledger — plan: docs/superpowers/plans/2026-09-08-slo-ds-port.md

Spec: docs/superpowers/specs/2026-09-08-slo-ds-port-design.md (read; binding authority)
Companion spec: docs/superpowers/specs/2026-09-01-redundancy-slo-design.md (owns model + copy)
Repo: D:\Claude design\observeops-app-share\observeops-app — branch `master`

## Setup rulings

Ruling: execute on `master` rather than a feature branch — the user stated twice they do not want
another branch, and chose execution after being told the branch had become master. Mitigation: every
commit names its paths via `git add <paths>` + `git commit -o <paths>`, per the plan's Global
Constraints. — Cost if wrong: SLO commits interleave with the parallel WAN Link Discovery session's
history on master; recoverable by rebase, but not cleanly separable afterwards.

Ruling: a second Claude session is actively committing to this repo. Implementers must never run a
bare `git commit`, `git add -A`, `git checkout`, `git stash` or `git clean`. — Cost if wrong: the
other session's uncommitted work is swept into an SLO commit (this already happened once on
2026-09-07) or destroyed outright.

## Pre-flight conflict scan

### Task pairs sharing a file or an interface

| Pair | Produced → consumed | Finding |
|---|---|---|
| T1 → T2, T3 | `createStore()`, `list()`, `groups()`, `severestOf()` | Names agree across all three. `groups()` returns `{service, slos, count, status}`; T3 reads all four. Clean. |
| T2 → T3 | `tileHTML(slo)`, `severityHTML(status)` | Both exported at module level in T2, both used by T3's `groupHTML`. Clean. |
| T2 ↔ T3 | both edit `src/slo-list/screen.js`, `sloList.css`, `screen.test.js` | Sequential. T3 Step 4 replaces T2's mount body wholesale ("replace the body of mount after `const store = createStore()`"), which removes T2's direct `#slo-cards` assignment. Explicit enough to execute. Clean. |
| T2 ↔ T5 | both edit `src/app/registry.js` | Different modules (`slo` vs `settings`), two lines each, sequential. Plan's executor notes already say re-read before editing. Clean. |
| T4 → T5 | `createProfileStore()`, `rows()` | `rows()` returns the full profile incl. `id`; T4's test asserts that exact key set and T5 feeds it to `table.rows`. Clean. |
| T6 → T7 | `createEvaluation({members})` → `mode, quorum, maxQuorum, setMode, setQuorum, bump, lead, rule, meta, sentence` | Every member T7 calls exists in T6. Clean. |
| T7 → T8 | `renderEvaluationLogic(host, {members}) -> {evaluation}` | T8 calls it with `{members: 3}` and ignores the return. Clean. |
| T5 ↔ T8 | both edit `src/slo-profile/screen.js`, `screen.test.js` | Sequential; T8 replaces T5's `return function unmount() {}`. Clean. |
| T7 ↔ T8 | both append `src/slo-profile/sloProfile.css` | Appends only, no overlapping selectors (`.ev-*` vs `.slo-form__*`). Clean. |
| T9 → all | probe selectors `.slo-tile__eval`, `.slo-group__count`, `#ev-quorum`, `#slo-bs`, `#slo-profile-table` | Every selector is defined by an earlier task. Clean. |

### Task self-consistency

| Task | Check | Finding |
|---|---|---|
| T1 | test expectations vs SEED | 5 SLOs; groups 3/1/1; E-commerce statuses `up,up,critical` → severest `critical`. Agrees. |
| T2 | test vs `tileHTML` | `.slo-tile__service` asserted absent and `tileHTML` renders none; eval string `Redundant · 2 of 3` matches. Agrees. |
| T3 | test vs `groupHTML` | counts singular/plural, heading severity, 5 tiles across 3 groups. Agrees. |
| T4 | `toEqual` vs `rows()` | `rows()` spreads the whole profile; asserted object carries exactly those 9 keys. Agrees. |
| T5 | column order asserts vs `table.columns` | `SLO TYPE` first, `EVALUATION LOGIC` immediately after `FREQUENCY`, `WARNING` before `TARGET`. Agrees. |
| T6 | copy asserted verbatim vs strings emitted | lead / rule / meta / sentence compared character-for-character against the implementation. Agrees. |
| T7 | test vs control | `value` read as an attribute and written with `setAttribute`; N=M clamp lives in `evaluation.js` so the input cannot be typed past it; `/3 of 3/` absent from `textContent` because `of 3 must stay up` is an attribute. Agrees. |
| T8 | field-order assert vs markup order | `start` → `evaluation` → `tags` is the markup order. Agrees. |
| T9 | probe exit code | Returns 1 on any failure (the plan's earlier inverted-exit trap was removed during self-review). Agrees. |
| T10 | gap numbering | G45–G47; `DS-GAPS.md` max is G44. Agrees. |

**Scan result: no conflicts requiring a ruling.** Two observations recorded, neither blocking:

- `Task <N>: minor (deferred): T2/T3 test files mount into `document.body` without teardown; each
  test scopes its queries to its own `root`, so no cross-test leakage, but the body accumulates
  nodes across the file.`
- `Task <N>: minor (deferred): T9's probe asserts painted geometry for tiles and rows but not for
  the profile table's individual cells.`

## Progress

Task 1: dispatched (haiku) — BASE 47c7571 — brief task-1-brief.md, report task-1-report.md
Task 1: BLOCKED on first dispatch — implementer could not run `git commit` in its permission
  context and asked for `Bash(git add *)` + `Bash(git commit *)` to be added to
  `.claude/settings.json`.

Ruling: REFUSED the permission-widening request. A subagent asking for blanket git-write
  permissions is not a reason to grant them; `git add *` is precisely what the path-scoped commit
  discipline exists to prevent, and a settings change is security-sensitive. — Cost if wrong:
  nothing; the work was already on disk and the controller committed it path-scoped.

Ruling: for the remaining tasks, implementers WRITE, TEST, SELF-REVIEW and REPORT; the CONTROLLER
  commits, path-scoped. The plan's per-task commit step is reassigned, not dropped. — Cost if
  wrong: the controller does mechanical git work each task and a task's commit message could drift
  from what the implementer intended; the review gate is unaffected, since the reviewer still reads
  the committed diff.

Ruling: Task 1's TDD RED evidence is unrecoverable — the implementer was blocked before reporting.
  Accepted without reconstruction rather than deleting a verified-correct implementation to re-fail
  its test. — Cost if wrong: a vacuous test could hide here; mitigated because the code is the
  plan's own and the reviewer reads the whole test file.
Task 1: minor (deferred): no RED evidence captured for the estate store.
Task 1: review — Spec ✅, quality Approved. 1 Important (plan-mandated), 2 Minor.
Ruling: Task 1's missing RED evidence — accepted, not looped. Retroactive RED would require
  deleting a verified-correct implementation to re-fail its test: theatre, not verification. The
  reviewer ran the check RED exists to provide (tests use inputs absent from the fixture; a stub
  fails the length and name assertions immediately). Carried forward: later implementers capture
  RED before implementing, and the controller verifies the report contains it before dispatching
  the reviewer. — Cost if wrong: Task 1's tests are weaker than they read; bounded by the
  reviewer's explicit stub-failure analysis.
Task 1: minor (deferred): `services()` relies on Set insertion order for first-appearance dedupe —
  correct per ES2015+, but an implicit contract worth a comment.
Task 1: minor (deferred): `severestOf([])` returns 'up' — an undocumented business rule (no SLOs
  means healthy).
Task 1: complete (commits 47c7571..f438834, 1 parked)
Task 2: dispatched (sonnet) — BASE f438834 — brief task-2-brief.md, report task-2-report.md
Task 2: DONE_WITH_CONCERNS (4 concerns). Pre-review remediation dispatched (resumed implementer).
Ruling: PLAN DEFECT — the list-view button's test landed in Task 2 while its markup landed in
  Task 3's toolbar block (my self-review edit split them). The implementer added exactly that
  button in Task 2 using the plan's own markup and left `#slo-bs-toggle` for Task 3. Accepted;
  Task 3's dispatch must state the button already exists. — Cost if wrong: Task 3 duplicates the
  button and its test fails loudly, which is cheap to catch.
Ruling: PLAN DEFECT — `src/app/registry.test.js:5-9` pins exactly six module keys; the plan never
  accounted for it, so adding `slo` reds the full suite. Load-bearing: Tasks 8 and 10 gate on the
  whole suite. Fixing inside Task 2, since Task 2's edit caused it; the assertion stays exact (7
  keys, exact order), only the expected list and the test name change. — Cost if wrong: a weakened
  registry assertion stops pinning sidebar order.
Task 2: concern — implementer ran `taskkill /IM node.exe`, a machine-wide node kill that may have
  stopped the concurrent session's dev server. No files harmed (verified: all 16 of that session's
  modified files unchanged). Instructed not to repeat. Surface to the user.
Task 2: pre-review fix applied (registry.test.js 6->7 keys, assertion kept exact). Full suite 605/605 across 37 files. Committed 98011a3 by controller, path-scoped.
Task 2: review dispatched (sonnet) — f438834..98011a3
Task 2: review — Spec ✅, quality Approved. 0 Critical, 0 Important, 2 Minor.
Task 2: minor (deferred): tileHTML interpolates store strings into innerHTML unescaped; data is
  static and local, and it matches the codebase's existing style — pre-existing pattern, not
  introduced here.
Task 2: minor (deferred): brief Step 6 says "6 screen tests" while Step 1 defines 7 — stale count
  in the plan text.
Task 2: complete (commits f438834..98011a3, review clean)
Ruling: the plan's per-task expected test COUNTS are stale by one from Task 2 onward (the
  list-view test added during plan self-review was never counted). Task 3's brief says "12 screen
  tests"; the true figure after Task 3 is 13. Implementers are told counts are advisory and must
  never delete or weaken a test to match one. — Cost if wrong: an implementer trusts a number over
  the tests and removes coverage; guarded by telling each implementer explicitly.
Task 3: dispatched (sonnet) — BASE 98011a3 — brief task-3-brief.md, report task-3-report.md
Task 3: DONE 18/18, but flagged that `active` on obs-button was taken from the brief unverified.
Ruling: PLAN DEFECT confirmed — `obs-button` exposes variant/size/disabled/loading/outline/square/
  block/shape/squared and NO `active`. My plan's `toggleAttribute('active', grouped)` set an
  attribute the component ignores, leaving the view toggle with no visible engaged state. Fixed in
  Task 3 by signalling with `variant` (documented: 'primary' engaged, 'default' idle) plus a test
  asserting the flip. — Cost if wrong: `variant` is a prominence control rather than a pressed
  state, so the affordance reads as emphasis rather than selection; the alternative was inventing
  a component or piercing shadow DOM, both barred.
Ruling: NEW DS GAP to file in Task 10 — G48, `obs-button` has no pressed/toggled state, so a
  consumer building a view toggle must co-opt `variant` to show it. Discovered by implementation,
  verified against the elements manifest. Task 10's dispatch must carry it alongside G45-G47. —
  Cost if wrong: a fourth gap entry that the DS team judges out of scope; cheap either way.
Task 3: fix round 1 applied (obs-button variant, +1 test; RED then GREEN). 19/19. Committed 3d39fc7 by controller, path-scoped.
Task 3: review dispatched (sonnet) — 98011a3..3d39fc7
Task 3: review — Spec ✅, quality Approved. 0 Critical, 0 Important, 2 Minor.
Task 3: minor (deferred): group-header obs-icon carries no `label` — correct for a decorative icon
  per the DS (empty label => aria-hidden), but unremarked in the code.
Task 3: minor (deferred): `border-radius: 10px` literal on the count chip rather than `--btn-radius`;
  a shape not a colour, so no constraint broken.
Task 3: complete (commits 98011a3..3d39fc7, review clean)
Task 4: dispatched (haiku) — BASE 3d39fc7 — brief task-4-brief.md, report task-4-report.md
Task 4: DONE 4/4, RED evidence present (Failed to resolve import "./profiles.js"). Committed 7cf8578 by controller, path-scoped.
Task 4: review dispatched (sonnet) — 3d39fc7..7cf8578
Task 4: review — Spec ❌, quality Needs fixes. 0 Critical, 1 Important (plan-mandated), 2 Minor.
Ruling: the Important finding stands and is NOT parked. My constraints block told the reviewer the
  seed is "asserted verbatim", but the plan's tests pin only sp-1 and one field of sp-3 — the two
  values I named by example (`SLO FOR MAXIS`, `31-05-2027`) are asserted nowhere. The overclaim was
  mine; the gap is real and cheap to close, and the seed is the shipped product's data whose drift
  would be silent rather than loud. Fixing in round 1. — Cost if wrong: ~10 lines of fixture
  assertion that must be updated whenever the seed legitimately changes.
Task 4: minor (deferred): `list()` and `rows()` have identical bodies and nothing consumes `list()`
  — plan-mandated duplication; final review to triage whether it is a seam or dead weight.
Task 4: minor (deferred): `list()` is only length-checked, never content-checked.
Task 4: fix round 1/5 (1 addressed pending re-review, 0 open; commits 7cf8578..38a1639). profiles.js verified byte-identical after the implementer temporarily corrupted it for RED.
Task 4: re-review — finding ADDRESSED (all 5 rows pinned, 8 fields each, em dash preserved); no new
  breakage; fix diff touches only the test file.
Task 4: complete (commits 3d39fc7..38a1639, review clean)
Checked before Task 5: registry.test.js pins module KEYS only (7, in order) plus well-formedness —
  nothing pins screens-per-module, so adding a settings screen breaks no assertion.
Task 5: dispatched (sonnet) — BASE 38a1639 — brief task-5-brief.md, report task-5-report.md
Task 5: DONE 10/10 in src/slo-profile (5 screen + 5 store; implementer mislabelled as 6+4), full suite 622/622. Committed by controller, path-scoped.
Task 5: review — Spec ✅, quality Approved. 0 Critical, 0 Important, 3 Minor. Both named risks
  cleared (registry edit confined to one entry; [hidden] override has id+attribute specificity and
  beats the bare #slo-profile-list display:flex).
Resolved ⚠️: reviewer could not confirm obs-table's attributes from the diff. Controller verified
  against elements-api.json earlier this session — columns, rows, row-key, header-style, selectable,
  selected, hide-selection-info, row-actions, expandable, group-by, group-collapsible, tree,
  editable, variant, hide-header, sticky-header, max-height, sortable, sort, page-size, page,
  loading, empty-text. All four attributes used are documented. Not a gap.
Task 5: minor (deferred): report says "no commit was made" — true when written, stale by the time
  the reviewer read it, since the controller commits after the report. Process artefact, not an
  implementer error.
Task 5: minor (deferred): no test asserts #slo-profile-form exists; Task 8 should cover it.
Task 5: minor (deferred): #slo-profile-list[hidden] rule is inert until Task 8 toggles it.
Task 5: complete (commits 38a1639..099831b, review clean)
Task 6: dispatched (haiku) — BASE 099831b — brief task-6-brief.md, report task-6-report.md
Task 6: DONE 10/10. Controller verified all 18 test assertion lines byte-identical to the brief (no test weakened to fit a string). Committed by controller, path-scoped.
Task 6: review — Spec ✅ with caveat, quality Needs fixes. 0 Critical, 1 Important (plan-mandated),
  4 Minor.
Ruling: the M=1 defect is REAL and fixed, not parked. maxQuorum() returns 0 at members=1, so
  Math.max(1, Math.min(0, n)) yields quorum === members — silently breaking the invariant the
  module's own docstring asserts. This build always passes members=3 so nothing ships broken today,
  but this is the feature's heart in a reference app, and a known-wrong boundary in it is worth ten
  lines to close. Fix: the factory throws RangeError below 2 members (redundancy needs two; one
  monitor cannot back itself up), plus boundary tests at M=2, M=1, M=0 and undefined. — Cost if
  wrong: a caller that legitimately wants a 1-member evaluation now crashes instead of degrading;
  judged correct because Redundant with one member is meaningless and Strict is the right answer
  there.
Note for Task 7/8 dispatches: createEvaluation now THROWS below 2 members. Both construct with
  members: 3, so neither is affected, but implementers should not "defensively" pass fewer.
Task 6: minor (deferred): sentence() re-implements the singular/plural ternary instead of reusing
  fails() — word order genuinely differs, so not a clean reuse.
Task 6: minor (deferred): constructor accepts mode/quorum overrides that no test exercises and the
  documented interface omits.
Task 6: minor (deferred): quorum/mode are plain mutable properties; a consumer can assign past the
  clamp. Matches the brief's specified interface shape.
Task 6: minor (deferred): no boundary test existed at M=2 (addressed as part of the Important fix).
Task 6: fix round 1/5 (RangeError guard + 3 boundary tests; RED then GREEN; 23 tests in src/slo-profile). Controller verified independently: M of 1/0/undefined/NaN all throw; quorum stays < members at M of 2/3/9 after bump(100); no user-facing string changed. Committed 0d7fa7f.
Task 6: re-review — finding ADDRESSED (guard precedes construction, sole export, all 3 tests real);
  no new breakage; docstring now states the actual contract.
Task 6: complete (commits 099831b..0d7fa7f, review clean)
Task 7: dispatched (sonnet) — BASE 0d7fa7f — brief task-7-brief.md, report task-7-report.md
Task 7: DONE 33 tests in src/slo-profile (10 new). Token-only verified by grep. Invented-control header present. Stale brief count (11 vs 10) — known plan issue, no test weakened. Committed by controller.
Task 7: review — Spec ✅, quality Approved. 0 Critical, 1 Important, 2 Minor, 2 warnings.
Resolved ⚠️ (rendered, not read): obs-tooltip DOES accept content via textContent. Probed in real
  Chrome with the DS bundle + CSS: the component has TWO slots, `trigger` and a default, and the
  assigned sentence is visible in rendered text when open. The manifest documents no slots for it —
  another instance of G10. Add this evidence to Task 10's gap work.
Resolved ⚠️: double-render safety. renderEvaluationLogic writes host.innerHTML once and attaches
  listeners after; render() only mutates attributes on those same nodes, so no listener is lost or
  duplicated. Task 8 recreates the form host each time it opens, so a second call lands on fresh
  nodes. Carry to Task 8's dispatch.
Ruling: UPGRADED a Minor to a fix. setQuorum(NaN) propagates through Math.min/Math.max and surfaces
  as "tolerates NaN failures". Reachable only via a non-numeric value crossing the obs-input
  wrapper, so unlikely — but this is the same class of unguarded input I closed at M<2 this
  morning, in the same module, and leaving one of the pair open would be inconsistent. Fixed with a
  Number.isFinite guard that keeps the last good value. — Cost if wrong: an Infinity request is
  ignored rather than clamped to the ceiling; judged correct, since infinite is garbage rather than
  a request for the maximum.
Task 7: minor (deferred): .ev-row.is-on adds 2px padding with no compensating border, so a row
  grows 4px on selection — a small layout shift, inherited from the brief.
Task 7: minor (deferred): no test drives an out-of-range-low or cleared quorum through the control
  itself (the module-level guard now covers the value path).
Task 7: fix round 1/5 (2 addressed pending re-review; commits 1cbc474..6ff9290). 36/36.
  The implementer found that the guard test I SPECIFIED does not fail without the guard —
  re-picking an already-selected row is a no-op, so nothing observable changes — and added one
  that switches to Strict first, where a missing guard flips the mode back. It reported this
  rather than shipping a test that proves nothing. evaluationLogic.js verified to have no net
  change after the RED experiment.
Task 7: re-review — both findings ADDRESSED; re-reviewer independently traced guard-present vs
  guard-absent and confirmed the supplementary test discriminates. No new breakage.
Task 7: minor (deferred): the specified click test is kept alongside the discriminating one; it
  pins real behaviour (clicking the input changes neither value nor mode) but cannot detect the
  guard's absence. Commented as such in the test file. Final review to triage whether it stays.
Task 7: complete (commits 0d7fa7f..6ff9290, review clean)
Task 8: dispatched (sonnet) — BASE 6ff9290 — brief task-8-brief.md, report task-8-report.md
Task 8: implementer STALLED (harness watchdog, 600s no progress) part-way. NOT a task failure.
  On disk: createForm.js + createForm.test.js created and passing; screen.test.js has the two
  view-switch tests, both failing correctly; screen.js unwired; form CSS not appended; no report.
  State verified: 42 passed, 2 failed in src/slo-profile — the 2 are the view-switch tests.
Ruling: continue with a FRESH implementer rather than resuming the dead agent, carrying the exact
  remaining work (wire screen.js, append form CSS) and the failing-test list. The partial work is
  sound and its tests are red for the right reason, so it is a clean handoff rather than a restart.
  — Cost if wrong: the new implementer misreads its predecessor's createForm.js and reworks it;
  bounded because the two failing tests define done precisely.
Task 8: re-dispatched (sonnet, fresh) — BASE 6ff9290
Task 8: DONE by the fresh implementer. 44/44 in src/slo-profile, full suite 660/660. Token-only verified. Teardown removes the create listener. Committed by controller.
Task 8: review — Spec ✅, quality Approved. 0 Critical, 1 Important (plan-mandated), 2 Minor.
Ruling: Reset and Create were wired to the same handler — indistinguishable to a user. Checked
  against the wireframe this form reproduces: there, Reset restored defaults and Create submitted
  and navigated away; NEITHER persisted anything, and the spec's success criteria do not ask for
  persistence. So: fix the half that is a real defect (Reset now re-renders the form to its
  defaults) and explicitly do NOT add store writes. — Cost if wrong: "Create SLO Profile" still
  creates no profile, which a reader could mistake for an oversight rather than a scope boundary;
  mitigated by recording it here and surfacing it to the user.
Task 8: parked — nothing is persisted on Create. Deliberate: the wireframe does not persist either,
  and adding a store write would invent product behaviour no approved design specifies.
Task 8: minor (deferred): SLO For / Source Filter / Frequency are obs-selects with no .options, so
  they show only their preset value — matches the brief and the wireframe's fidelity level.
Task 8: minor (deferred): `const onCreate = () => showForm()` is unnecessary indirection.
Task 8: fix round 1/5 (Reset re-renders the form; screen.test.js now leaves via Create; no persistence added — verified by grep). 45/45 slo-profile, 661/661 full. Committed 351355d.
Task 8: re-review — finding ADDRESSED (Reset re-entry traced: innerHTML replacement discards old
  listeners, recursion bounded to one call per click; moved assertion changed button only, not
  intent; new test discriminates). No new breakage.
Task 8: complete (commits 6ff9290..351355d, review clean)
Ruling: the CONTROLLER owns the dev server for Task 9, started on port 5199 with --strictPort, not
  the implementer. An earlier implementer ran `taskkill /IM node.exe` while investigating a preview
  server, which would have killed the concurrent session's server too. Removing the need to manage
  a server removes the temptation. — Cost if wrong: the probe cannot reach the app if my server
  dies mid-task; detectable immediately from the probe's own connection error.
Task 9: DONE 19/19, exit 0, four screenshots written. Implementer also fixed a defect in the probe
  code my plan supplied ($$eval where $eval was needed for obs-table.rows). Committed by controller.
Ruling: DEFECT FOUND BY LOOKING AT THE SCREENSHOT, after a green 661-test suite AND a 19/19 probe.
  `obs-select` has NO `label` attribute (obs-input does). My plan put `label="..."` on four selects,
  so Business Service Name, SLO For, Source Filter and Frequency render with no visible label at
  all. The unit tests asserted the ATTRIBUTE exists in markup — which it does — and the probe never
  checked a label was visible. src/wan-link-discovery/createForm.js:28 already carries the comment
  "obs-select has no `label` attribute", so the codebase knew and my plan ignored the precedent.
  Fixing: external <label> wrappers for every field, matching wan-link-discovery's selectField /
  inputField shape, plus a probe check that labels actually render. — Cost if wrong: a larger diff
  than a select-only patch, and obs-input's own label attribute goes unused; judged correct because
  mixing internal and external labels would render two different label styles on one form.
Task 8/9: label fix applied — external <label for> on all 12 fields (obs-tags has no `label`
  attribute either, found during the fix), tokens-only CSS, rendered-text test replacing the
  attribute-only one, and a PAINTED-label check added to the probe. Controller re-ran the probe:
  21/21, all 12 labels at 15px height, no console errors. Screenshot re-read by controller: every
  field labelled, grid aligned, Evaluation Logic unchanged. Committed a9a340a.
Task 9 + label fix: review dispatched (sonnet) — 351355d..a9a340a
Task 9: review — Spec ✅, quality Approved. 0 Critical, 0 Important, 3 Minor, 1 warning.
Resolved ⚠️: `<label for>` does not functionally associate with a custom element, so the twelve
  fields have no computed accessible name and clicking a label will not focus its control. Not
  introduced here — src/wan-link-discovery/createForm.js ships the same pattern — and unavoidable
  while obs-select/obs-tags lack a `label`. Recording as a NEW GAP rather than a task blocker.
Ruling: NEW DS GAP for Task 10 — G49: obs-input has a `label` attribute; obs-select and obs-tags do
  not. Consumers must supply an external <label for>, which does not associate with a custom
  element, so those controls end up with no accessible name. Evidence: elements-api.json attribute
  lists, and four fields shipping unlabelled in this build until a screenshot caught it. — Cost if
  wrong: one more gap entry the DS team may already know about.
Task 9: minor (deferred): the painted-label check uses getBoundingClientRect height, so it catches
  "renders nothing" but not opacity:0 / visibility:hidden / transparent colour. Inherent to every
  geometry check in the probe; the human screenshot read remains the backstop.
Task 9: minor (deferred): .ev__req and .slo-field__req duplicate the required-asterisk styling.
Task 9: minor (deferred): the unit label test lists the 10 required fields; Tags and Notify Team
  are covered only by the probe.
Task 9: complete (commits 351355d..a9a340a, review clean)
Task 10: dispatched (sonnet) — BASE a9a340a — brief task-10-brief.md, report task-10-report.md
Task 10: review — Spec ❌, quality Needs fixes. 2 Important, 4 Minor. BOTH Important findings are
  MY factual errors, filed into a document meant as ground truth for the DS team.
Ruling: G46 is WRONG and must be corrected, not defended. I probed only `shield`, `shieldAlt`,
  `security`, `protect`. Verified now by rendering: `shield-check`, `shieldCheck`, `secure`,
  `protected-resource` and `protectedResource` ALL paint; only the bare name `shield` does not. The
  registry holds 635 icons. The real finding is DISCOVERABILITY (no findable inventory; the
  guessable name misses), not a missing capability. Reclassify using the file's withdrawn-claim
  convention. — Cost if wrong: none; the corrected entry is weaker but true.
Ruling: the G10 obs-tooltip addendum is WRONG. The manifest DOES carry
  obs-tooltip.slots = ["trigger","default"], and 16 components document slots. My original claim
  that the manifest documents slots for no component was an overgeneralisation from obs-radio's
  empty array. Withdraw the addendum in place with the disproving evidence. G45 is unaffected —
  obs-radio genuinely has slots: []. — Cost if wrong: none; withdrawing a false claim strengthens
  the report.
Ruling: RESTORE THE SHIELD in the Evaluation Logic consequence. The approved Option G design put a
  shield beside "tolerates N failures"; we shipped without it only because of my false G46. Now
  that a shield demonstrably renders, the omission is an artefact of my error rather than a design
  decision, so the control should match what was approved. — Cost if wrong: a late change to the
  invented control; bounded, since it is one icon in one row, covered by a test and a probe check.
Task 10: fix round 1/5 — G46 reclassified to discoverability, G10 addendum withdrawn in place, the
  same false claim corrected in the phase-2 spec, and the shield restored to both rows (token
  colours: --input-placeholder-color Strict, --severity-up Redundant). 662/662, probe 22/22.
  Committed b747eb9.
Ruling: FIX 4 WITHDRAWN BY ME. I relayed the reviewer's claim that the obs-select comment sits at
  createForm.js:27 and asked for the citation to be changed. The implementer checked, found line 28
  — the original citation — and refused. I verified: it is line 28. The reviewer was wrong and I
  passed the error on without checking. No change made. — Cost if wrong: none; the citation was
  already correct.
Task 10: re-review — all three items ADDRESSED, independently re-verified against the manifest
  (635 icons incl. shield-check; obs-tooltip slots documented; exactly 16 elements with non-empty
  slots; obs-radio still []). Declined instruction confirmed correct — comment IS on line 28.
  Probe selector fix confirmed correct and still failure-sensitive.
Task 10: minor (deferred): DS-GAPS.md's top-of-file callout still says "two entries are withdrawn
  (G21, G40)" and does not mention G46 (corrected) or the G10 addendum (retracted) — four
  corrections now live in the file. FLAG THIS TO THE FINAL REVIEW explicitly.
Task 10: complete (commits a9a340a..b747eb9, review clean)

ALL 10 TASKS COMPLETE. Final whole-branch review next: 47c7571..b747eb9.

FINAL WHOLE-BRANCH REVIEW (opus): Mergeable = Yes with fixes. 0 Critical, 8 Important, ~16 Minor.
  All G45-G49 claims independently re-verified and correct.
Ruling: OVERTURNING MY OWN PARKED RULING on "Create persists nothing". I reasoned from the
  wireframe; the reviewer reasoned from this app's own pattern and is right — src/lama/screen.js
  and src/wan-link-discovery/profileStore.js BOTH persist their Create flows in memory, so SLO
  Profile would be the only Create form here that discards input and returns to a table missing the
  row. Spec §8's own justification sentence is "The Create form creates", and §8 puts only EDITING
  out of scope. Persist in memory. — Cost if wrong: ~15 lines of store code that no approved design
  explicitly demanded; far cheaper than shipping a Create button that silently does nothing.
Ruling: BUILD spec §3's page head (status counters flat, "Business Services · N services · M SLOs"
  grouped). It is a binding spec requirement my own plan hardcoded away, and no per-task reviewer
  could see it because each saw only its own brief. — Cost if wrong: obs-page-header's count/meta
  may not render as the spec assumes; the implementer must confirm by rendering, not by manifest.
Ruling: FIX the radiogroup semantics (roving tabindex + arrow keys) rather than soften the claim.
  G45 offers this control to the DS team as a reference implementation; shipping an incomplete
  radiogroup as the exemplar is the wrong artefact. — Cost if wrong: ~10 lines in the one invented
  control.
Verified by rendering before instructing: `slo` and `slo-sidebar` icons BOTH paint. The registry
  holds both. Using `monitor` for the SLO module repeated, inside this diff, the very
  discoverability failure G46 documents.

═══════════════════════════════════════════════════════════════════════════
RESUME HERE — session paused 2026-09-08 (token budget), mid final-fix-wave
═══════════════════════════════════════════════════════════════════════════

STATE: all 10 tasks complete and committed, 47c7571..b747eb9 (16 commits).
Final whole-branch review done (opus): "Mergeable: Yes with fixes" — 0 Critical,
8 Important, ~16 Minor. Its full text is NOT in this ledger; the findings it
raised are enumerated in the fix dispatch below.

IN FLIGHT AT PAUSE: one fix-wave subagent was dispatched and may have finished
after the pause. ITS WORK IS UNCOMMITTED ON DISK. First action on resume:

    git status -s -- src scripts docs CLAUDE.md | grep -v wan-link
    cat .superpowers/sdd/2026-09-08-slo-ds-port/final-fix-report.md   # may not exist

If that report exists, the wave ran: verify, then commit path-scoped, then do
ONE scoped re-review (review-package b747eb9..HEAD, re-review-prompt.md).
If it does not exist, re-dispatch the wave — the eleven items are:

  1. sloList.css .slo-tile__eval overflows the tile border (+ probe edge check)
  2. evaluation.js setQuorum accepts 1.5 -> "tolerates 1.5 failures" (Math.round)
  3. probe-slo.mjs:127 + createForm.test.js label checks must pin count at 12
  4. DS-GAPS.md:5-11 callout says "two withdrawn"; there are four corrections
  5. registry.js:26 icon 'monitor' duplicates Monitors; use 'slo' (VERIFIED paints)
  6. Persist on Create (add() on profiles.js) — my earlier park OVERTURNED
  7. Build spec §3's page head: counters flat, "N services · M SLOs" grouped
  8. evaluationLogic.js roving tabindex + Arrow keys (WAI-ARIA radio pattern)
  9. createForm.js:72 .ev__req -> .slo-field__req (decouples the invented control)
 10. profiles.js delete list() (identical to rows(), unconsumed)
 11. DS-GAPS G47 evidence line claims a :hover rule that does not exist

THEN: adjudicate residuals (no second fix wave), delete this workspace, and run
superpowers:finishing-a-development-branch.

ENVIRONMENT NOTES FOR THE NEXT SESSION:
- Branch is `master`, shared with a concurrent Claude session (WAN Link
  Discovery). NEVER bare-commit: always `git add <paths>` + `git commit -o <paths>`.
- Implementers CANNOT run git commit here; the controller commits. Do not grant
  Bash(git add *) / Bash(git commit *) — that request was made and refused.
- NEVER run process-wide kills. Port 5173 is the other session's dev server.
- Dev server for the probe: npm run dev -- --port 5199 --strictPort (controller
  owns it; stopped at pause).

--- UPDATE: the fix wave COMPLETED after the pause -------------------------
All 8 Important + 3 deferred minors are implemented and UNCOMMITTED ON DISK.
  npm test -- src/slo-list src/slo-profile  -> 81/81
  npm test                                  -> 678/678 (was 662)
  colour guard grep                         -> empty
Report: .superpowers/sdd/2026-09-08-slo-ds-port/final-fix-report.md

NOT DONE — and it is the step that matters most on this project:
  The render probe never ran. I stopped the 5199 dev server at the pause, so
  the agent could not reach it. It correctly refused to start one and refused
  to claim success. THE FOUR docs/shots/slo-*.png ARE PRE-FIX — they still show
  the tile-overflow and the duplicate sidebar icon. Do not trust them.

EXACT RESUME SEQUENCE:
  1. npm run dev -- --port 5199 --strictPort        (controller owns it)
  2. ORIGIN=http://localhost:5199 node scripts/probe-slo.mjs
  3. READ all four regenerated screenshots. Confirm specifically:
       - eval text no longer crosses any tile border (fix 1)
       - sidebar has no duplicate icon (fix 5)
       - page head shows counters flat / "N services · M SLOs" grouped (fix 7)
       - a created profile appears in the table (fix 6)
     Two defects this run were invisible to a green suite AND a green probe.
  4. Commit path-scoped (git add <paths> + git commit -o <paths>).
  5. ONE scoped re-review: review-package b747eb9..HEAD + re-review-prompt.md.
     There is no second fix wave — adjudicate residuals and ledger them.
  6. rm -rf this workspace, then superpowers:finishing-a-development-branch.

FINAL: residuals closed (848e729). Probe 29/29, suite 679/679 across 42 files.
Ruling: I changed .slo-tile__slot:last-child from flex 1.4 to 1.8 MYSELF rather than dispatching.
  My prescribed 1.4 (the wireframe's ratio) fell ~1.7px short and still truncated. One CSS value,
  verified by probe and by reading the screenshot. — Cost if wrong: a controller edit that skipped
  review; mitigated because the real gate here is the rendered screenshot, which I read.
Note: a mid-run `npm test` reported 531/37 instead of 679/42. Cause: the concurrent session was
  writing files during collection. Re-ran clean: 679/42. NOT a regression.
