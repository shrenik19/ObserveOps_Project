# SLO on the design system — phase 2 design

Phase 1 produced `redundancy-slo/wireframe.html` — six artboards, 167 checks, verified in real
Chrome. This is the port of that design onto the published `@mtdt/observeops-ds-*` packages, as
routed screens in this app.

**Companion spec:** `2026-09-01-redundancy-slo-design.md` owns the evaluation model, the copy and
the interaction design. This document owns only the question *how is it built here* — where it
lives, which components it is made of, and what the DS cannot do. Where the two disagree about
behaviour, phase 1 wins.

## 1. Scope

Three artboards, chosen 2026-09-07:

| Artboard | Screen | Built |
|---|---|---|
| 1 | SLO list — the estate, flat and grouped by Business Service | **yes** |
| 2 | Create SLO Profile | **yes** |
| 6 | Settings → SLO Profile — the profile table | **yes** |
| 3, 4, 5 | SLO detail Overview, Configured Entities, the breach | **no** — no prototype required |

Artboards 3–5 stay as wireframe. That has one visible consequence, taken deliberately: **the SLO
tiles on artboard 1 do not navigate.** See D3.

## 2. Module and routes

Two registry entries, mirroring where the shipped product puts these screens:

| Route | Screen module | Artboard |
|---|---|---|
| `#/slo/list` | `src/slo-list/screen.js` | 1 |
| `#/settings/slo-profile` | `src/slo-profile/screen.js` | 6 (table) → 2 (Create form) |

`slo` is a **new top-level module** in `src/app/registry.js`, alongside Monitors and Reports;
`SLO Profile` joins the existing `settings` module. `SLO_1` is a monitoring view in the product and
`SLO_setup_1` is a settings page, and the app should not flatten that distinction.

The profile table and the Create form are **two views of one screen**, the way
`wan-link-discovery/screen.js` holds four. Artboard 6's `Create SLO Profile` button switches views;
it does not change route.

## 3. Screen A — the SLO list

The shipped `SLO_1` tile grid, plus the Evaluation slot, plus the Business Service view.

**Two view states**, from one `bsView` flag:

| State | Head | Body |
|---|---|---|
| off | `SLO` + the Breached / Warning / Ok / Total counters | one tile per SLO |
| on | `Business Services` + `N services · M SLOs` | a heading per service — name, SLO count, **severest status** — with that service's SLO tiles beneath |

The briefcase button (`obs-icon name="businessService"`) toggles between them, sitting immediately
left of the list-view control, where APM puts it (`BS_1`).

**A service takes the severest status among its SLOs** — `critical > warning > up`, never the first
and never an average. Phase 1 §4 explains why an average would be dishonest.

**The tile does not name its business service.** The grouped view names each service once, as a
heading. See phase 1 §4.

**No drilldown.** Every service and every SLO is on one screen, so there is nothing to open.

## 4. Screen B — SLO Profile

### View 1 — the profile table (artboard 6)

`obs-side-menu` for the settings tree, `obs-table` for the list. Columns as shipped —
`SLO TYPE · SLO NAME · FREQUENCY · WARNING · TARGET · BUSINESS SERVICE NAME · START DATE` — plus
**`EVALUATION LOGIC` beside `FREQUENCY`**, so the evaluation parameters read together.

**The Evaluation Logic cell is plain text** — `Strict`, `Redundancy`, or `—` for a Performance SLO.
No icon, no component. This is not a styling preference: **G1** records that `obs-table` cannot put
a component or an icon in a cell — re-found twice since, as **G23** and **G39** — and a plain-text column simply does not need one.

### View 2 — the Create form (artboard 2)

`SLO_setup_2` field for field, with **Evaluation Logic as the only addition**, full width between
`Start Date` and `Tags`.

**Business Service Name is an entity picker, not free text** — `obs-select` with `searchable` and
`can-user-add-options` + `add-label`, which is the search box and the inline `+` from `BS_Setup`.

## 5. Evaluation Logic — Option G, built as designed

Phase 1 §2 approved two selectable rows, each carrying its consequence on the right —
`tolerates N failures`, with the full sentence on hover — the selected row expanding to its rule
and, under `Redundant`, a quorum stepper.

**The DS cannot express it.** `obs-radio` renders the choice and nothing else: its shadow root
contains **zero `<slot>` elements**, and a light-DOM child placed inside it is present in the DOM
and paints nothing. No per-option content, no expansion, nowhere to host the stepper.

**Decision, 2026-09-08 — build Option G as designed; the DS absorbs it later.** The control is
composed at the app level rather than reduced to what `obs-radio` can currently show. The design
leads and the component follows it, not the other way round.

```
Evaluation Logic *
Decides how the 3 monitors you added under Source combine into a single SLO result — whether
every one of them has to stay up, or whether they can cover for each other.

┌────────────────────────────────────────────────────────────────────┐
│ ○  Strict                                     tolerates 0 failures │
└────────────────────────────────────────────────────────────────────┘
┌────────────────────────────────────────────────────────────────────┐
│ ●  Redundant                                   tolerates 1 failure │
│    Members back each other up. Only a drop below your threshold    │
│    degrades the SLO.                                               │
│    [ at least │ 2 │ of 3 must stay up ]                            │
└────────────────────────────────────────────────────────────────────┘
```

What that means in practice:

- **The row is app markup, and its semantics are ours to provide.** `role="radiogroup"` /
  `role="radio"`, `aria-checked`, and Enter/Space activation — everything `obs-radio` would have
  given us for free. It is tested because it is no longer someone else's guarantee.
- **Anything inside the row that the DS already has, comes from the DS.** `obs-input
  type="number"` with `addon-before` / `addon-after` for the quorum — which renders the
  `at least │ 2 │ of 3 must stay up` group almost exactly as drawn — and `obs-tooltip` for the
  full sentence.
- **Colour stays tokens only.** The *no hardcoded colours* rule is not relaxed. Only *no invented
  components* is, deliberately, in this one place, and it is recorded here rather than assumed.
- **The consequence sits on both rows**, as phase 1 requires: the mode you are not on still states
  what it would cost, and `Redundant` advertises its ceiling from inside `Strict`.
- **`N` runs `1..M-1`.** `N = M` remains unrepresentable — phase 1 **D9**, enforced in
  `evaluation.js`, not in the input.
- **No shield glyph exists** (**G46**), so the consequence carries its tone through a token rather
  than an icon.

**Why this rather than composing around `obs-radio`.** A reference app that quietly downgrades a
design to fit the DS reports nothing except its own compromise. Building the control as designed
leaves **G45 holding a working proposal instead of a description** — the DS team gets markup,
behaviour and tests to lift, not a paragraph about what was wanted. That is the stronger version
of the gap, and this project exists as much for the gap report as for the screens.

**The cost, named.** Conformance counts only light-DOM DS elements, so this screen will score
lower than a component-heavy one (**PQ1**); the radio semantics and their accessibility are ours
to keep correct; and **when the DS ships the component this is the first thing to delete** — the
precedent is the four shadow-DOM patches already retired that way.

**Rejected: the segmented control.** `obs-radio as-button block` is natively supported and is the
Card layout retired on 2026-09-07 for the reason that produced Option G.

## 6. The component mapping, and how it was established

| Need | Component | Verified |
|---|---|---|
| Status pill — Ok / Warning / Breached | `obs-severity shape="bg"` + `value`, severity `up` / `warning` / `critical` | **rendered** |
| Page head, counts, back chevron | `obs-page-header` — `heading`, `count`, `meta`, `back` | manifest |
| Business Service affordance | `obs-icon name="businessService"` — it is a briefcase | **rendered** |
| Search | `obs-input prefix-icon="search"` | manifest |
| Quorum stepper | `obs-input type="number" addon-before addon-after` | **rendered** |
| Strict / Redundant | app markup — `role="radio"` rows (§5). `obs-radio` was rendered and rejected: no per-option content | **rendered** |
| Profile table | `obs-table` | manifest |
| Business Service picker | `obs-select searchable can-user-add-options add-label` | manifest |
| Settings tree | `obs-side-menu` | manifest |
| Full sentence on hover | `obs-tooltip` | manifest |
| SLO tiles | app markup on tokens, following `src/app/cardList.js` | — |

**Rendered** means driven in real Chrome and observed, not read from `elements-api.json`. The rest
must be confirmed the same way during implementation, per the standing rule; the manifest has been
wrong before, and it documents no slots for any component at all (**G10**), so it cannot be used to
prove a component *lacks* something.

### Two facts worth recording for the next consumer

- **`obs-severity` renders 9 levels × 5 shapes, all 45 combinations.** Levels: `up · clear ·
  warning · major · critical · down · unreachable · unknown · disable`. Shapes: `dot · chip · text ·
  bg · stripe`. `shape="bg"` is the tinted outlined pill; `value` overrides the label, which is how
  `critical` displays as `Breached`.
- **A probe that does not load `@mtdt/observeops-ds-css` reports false negatives.** Components
  coloured through `--severity-*` and similar tokens render *invisibly* rather than failing, so
  they read as "not rendered". This cost a false finding during this design; every probe must inject
  the stylesheet as well as the elements bundle.

## 7. State, and where the tests live

Stores hold no DOM and no DS, as `profileStore.js` and `monitors.js` already do:

| Module | Owns | Tested |
|---|---|---|
| `src/slo-list/sloStore.js` | the estate, grouping by service, the severest-status rule | Vitest |
| `src/slo-profile/evaluation.js` | mode, quorum, the `1..M-1` clamp, the consequence sentences | Vitest |
| `src/slo-profile/profiles.js` | the seeded SLO profiles behind artboard 6's table | Vitest |
| `screen.js` (both) | wiring only — store ↔ components ↔ view state | thin |

`evaluation.js` is the important one: the `1..M-1` rule and the two consequence sentences are
behaviour, not presentation, and they are the part a later DS fix must not silently change.

**Verification is a probe, not the unit suite.** `scripts/probe-slo.mjs` drives all three views in
real Chrome and writes `docs/shots/slo-*.png`. On this project a green jsdom suite has never been
sufficient — `obs-select` rendering `[object Object]` and `obs-tabs` rendering an empty bar were
both invisible to it.

## 8. Out of scope

- Artboards 3, 4, 5 — the SLO detail Overview, Configured Entities and the breach.
- A backend. Data is seeded in memory, as everywhere else in this app.
- The list-view (table) alternative to artboard 1's tiles. The control is drawn, as shipped, and
  does nothing.
- Editing an existing SLO profile. The Create form creates.

## 9. Decisions taken, and what was rejected

| | Decision | Rejected, and why |
|---|---|---|
| P1 | **Artboards 1, 2 and 6 only.** | Porting all six. 3–5 are the visualisation story and are settled as wireframe; a prototype adds nothing to a design already verified. |
| P2 | **A new `slo` module for the list; `SLO Profile` under Settings.** | One module holding all three — it would put a monitoring view inside Settings, which is neither where the product puts it nor where artboard 6 does. |
| P3 | **SLO tiles do not navigate.** | A stub detail screen, or a cut-down artboard 3. A dead route explains nothing; a half-built detail screen is scope that was explicitly declined. |
| P4 | **Option G is built as designed, at the app level; the DS absorbs it afterwards.** *(2026-09-08)* | Composing around `obs-radio` — it downgrades the design to fit the tool and reports only the compromise. The segmented control — reverses a decision taken on the merits. *No invented components* is suspended here knowingly, and only here. |
| P5 | **The consequence sits on both rows**, the unselected one included. | Naming only the selected mode. The standing comparison — seeing what the mode you did not pick would cost — is the reason Option G was chosen over a toggle. |
| P6 | **The Evaluation Logic table cell is plain text.** | An icon or a severity chip in the cell — **G1**: `obs-table` cannot host one. |
| P7 | **Tiles are app markup on tokens.** | Waiting for a DS card. There is none among the 47 elements, and `src/app/cardList.js` already sets the precedent. |

## 10. DS gaps this build expects to file

| | Class | Finding |
|---|---|---|
| **G45** | DS — capability | **`obs-radio` cannot carry per-option content.** No `<slot>` in its shadow root; a light-DOM child is present and unpainted. A radio whose options each carry a consequence, an expandable body and an embedded control cannot be built. **This build ships that control as app markup, so the gap comes with a working reference implementation** — markup, behaviour and tests — rather than a description. Ask: a per-option slot, or an option `description` / `suffix`. |
| **G46** | DS — capability | **No shield or protection glyph.** `shield`, `shieldAlt`, `security`, `protect` do not paint; `businessService`, `service`, `link`, `search`, `plus`, `minus`, `check` do. Same shape as **G3**'s open-lock finding. |
| **G47** | DS — capability | **No card component.** 47 elements, none of them a card, so any tile-based screen hand-rolls its grid. |
| — | — | **OQ5 is partly answered, in the DS's favour:** `obs-table` does have `group-by` and `group-collapsible`, along with `sticky-header`, `max-height`, `sort` and `sortable`. Phase 1 §8 guessed it had no collapsible group rows. Record the correction rather than the guess. |

Each is provisional until re-confirmed by rendering during implementation, and each is written up in
`docs/DS-GAPS.md` in the house format: repro, evidence, workaround, ask.

## 11. Open questions

### PQ1 — Conformance on a tile screen · *unmeasured*

The conformance checker counts light-DOM `obs-button/input/select/switch/checkbox/radio/link`.
Artboard 1 is mostly hand-rolled tiles, so it may score low while being entirely correct. The score
is not the verification (`CLAUDE.md`), but a low number needs an explanation recorded rather than
discovered later.

### PQ2 — The model split, inherited and still open

Artboard 2 models **one** redundancy group — the Source member set. Phase 1 §1 and artboards 3–5
model several groups plus an ungrouped remainder. Building only 1, 2 and 6 means this port never has
to resolve it, because nothing built here shows a multi-group SLO. **It is deferred, not settled**,
and it becomes blocking the moment a detail screen is built.

### PQ3 — Two sessions, one branch

This lands in `observeops-app` alongside active WAN Link Discovery work on the same branch. New
directories do not collide; `src/app/registry.js` is shared and the edit is two lines. Commits must
name their paths (`git commit -o`) so a parallel session's staged work is never swept in — this has
already happened once, on 2026-09-07.

## 12. Success criteria

Each verified by rendering, in real Chrome.

1. `#/slo/list` renders the estate as tiles, with Evaluation reading a quorum (`Redundant · 2 of 3`)
   and never a group count.
2. The briefcase regroups the estate under its Business Services, each heading carrying its SLO
   count and the **severest** status among its SLOs — demonstrated by a service whose heading is
   worse than some of its members.
3. `#/settings/slo-profile` renders the shipped column set plus `EVALUATION LOGIC` beside
   `FREQUENCY`, with `—` on a Performance SLO.
4. Its `Create SLO Profile` opens artboard 2 without changing route.
5. Evaluation Logic renders as two rows: the selected one expands to its rule and, under
   `Redundant`, its quorum control; `N = M` cannot be reached.
6. **Both** rows state what they tolerate — the unselected one included — and the rows are
   operable by keyboard alone.
7. Business Service Name is a searchable picker that can add a value inline — not a text field.
8. No hardcoded colour anywhere in the new CSS.
9. Every gap in §10 is either filed with rendered evidence or withdrawn with the evidence that
   disproved it.

## 13. Source material

- **Phase 1 design:** `docs/superpowers/specs/2026-09-01-redundancy-slo-design.md`.
- **The wireframe:** `D:\Claude design\observeops-app-share\redundancy-slo\wireframe.html` — six
  artboards, `verify.mjs`, 167 checks. Not in git.
- **The shipped screens:** `D:\Claude design\Screenshots\SLO\` — `SLO_1` list, `SLO_setup_1`
  settings table, `SLO_setup_2` create form, and `BS\BS_1`–`BS_3` for the APM business-service flow.
- **The Evaluation Logic reference:** `D:\Claude design\OptionG-html.zip`.
- **The DS:** `@mtdt/observeops-ds-elements` · `-ds-css` · `-ds-spec`, and `elements-api.json` —
  read as a starting point, never as proof.
