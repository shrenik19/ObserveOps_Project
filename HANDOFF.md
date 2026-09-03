# Handoff — 2026-09-01 18:51

## Read first

`CLAUDE.md` in full — especially the new **"Design source material lives outside the repo"** section,
which tells you where the SLO sketch and screenshots are and how to unpack the sketch.

**This session wrote no code.** It was a design session for a new feature — **Redundancy SLO inside
Availability SLO** — taken through `superpowers:brainstorming` on the architectural path. The design
is settled and approved in conversation but **the spec was never written to disk**, so the section
"The design, in full" below *is* the spec until it is transcribed. Do not lose it.

Then read **"Open challenges"** before writing that spec. Six things the design asserts rather than
answers are listed there — one of them (the ungrouped-monitor noise floor) is worth re-testing
against a real customer estate *before* the canvas is built, because it gets expensive to revisit
afterwards.

## What we worked on this session

Designing an end-to-end scenario for **Redundancy SLO** — letting an Availability SLO treat groups of
monitors as backing each other up, so a single node failure no longer degrades the SLO. Two halves:
the **settings** side (a rough sketch existed) and the **visualization** side (nothing existed, but
the shipped product screens do).

## Completed

- **Read and understood the existing material.** The sketch at
  `D:\Claude design\Create SLO Profile (standalone) (1).html` was unpacked and read in full — markup
  *and* its `DCLogic` component. The five shipped SLO screens in `D:\Claude design\Screenshots\SLO\`
  were read and mapped widget by widget.
- **The design is complete and approved** across all eight sections — evaluation model, settings,
  Help Card, list differentiation, detail-page restructure, drawer + History, canvas artboards,
  and the phase-2 port.
- **One real gap was found by the teammate and fixed** — see "The 50-device problem" below. This
  changed the core model, not just the UI.
- **CLAUDE.md brought back in line with reality**: renamed off "Report / Category RBAC" (the app has
  three screens now), `src/wan-link/` added to the structure, test counts corrected to a verified
  **456 across 26 files**, design-source-material and project-root sections added.

## In progress

**Nothing is mid-flight in code.** The next artefact to produce is the spec file:
`docs/superpowers/specs/2026-09-01-redundancy-slo-design.md`, transcribed from the design below.
The teammate ran `/tata` at exactly the point where they were about to approve writing it.

## Next steps

1. **Settle the two questions that change the design**, from "Open challenges": whether the strict
   ungrouped remainder survives contact with a real 50-device estate (§1), and what `Warning` means
   under redundancy (§2). Everything else can be resolved inside the spec.
2. **Write the spec** to `docs/superpowers/specs/2026-09-01-redundancy-slo-design.md` from "The
   design, in full" below, carrying the open challenges into it as explicit open questions rather
   than quietly resolving them. Self-review, then get the teammate's read.
3. **Build the canvas** — 5 artboards, phase 1 of the agreed two-phase plan (see "Decisions"). Six if
   the alert/notification moment is reopened (Open challenges §5).
4. **Then, and only then**, a separate spec + plan for phase 2: porting the approved screens into
   this app as an SLO module.
5. Unrelated but open: **G31** (Overview scores 70/100 — no DS card component) and the unmerged
   branches, both carried forward below.

## Decisions made

### The five design forks, and what was chosen

| Fork | Chosen | Why |
|---|---|---|
| Where to build | **Canvas first, then port to the app** | Lock the visuals cheaply before paying DS/test cost. |
| Redundancy model depth | **Redundancy groups, N-of-M per group, ANDed** — not flat N-of-M | Models a real service tier, and makes breaches *attributable* to a group, which is what makes the visualization worth building. |
| Visualization approach | **Group-first restructure of the Overview** — not a bolt-on widget, not a separate tab | See "the core tension" below. |
| The 50-device gap | **A monitor outside a group is a group of one** | Removes the absurd "assign all 50" rule entirely. |
| Ungrouped monitor policy | **Always strict, not configurable** | Simplest to build and explain; the escape hatch is "make a group for them". |

### The core tension this feature has to resolve

The shipped SLO design assumes **monitor breached ⇒ SLO breached**. `SLO Monitor Overview` reads
*112 Breached / 119 Ok* and that arithmetic *is* the SLO. Once redundancy groups exist a monitor can
be Breached while its group holds quorum and the SLO stays perfectly Ok — so that headline stops
meaning anything on its own. **Every change in the design is about separating *a monitor is down*
from *the SLO is hurt*.** If a future change loses that, it has lost the point.

### The 50-device problem — and why the first model was wrong

The teammate raised it: a customer attaches **50 devices** to one SLO with three redundancy groups of
2, 3 and 4 members. That leaves **41 devices in no group**. The original rule — *every member must
belong to exactly one group, unassigned monitors block Create* — would have meant hand-assigning 41
devices to satisfy a validation error. **That rule is scrapped.** Consequences that fell out:

- **The fault-tolerance readout had to be rethought.** `min(M − N)` across all groups now always
  returns 0, because 41 singletons have zero slack. It splits into an honest two-liner instead —
  and the second line is the most valuable sentence on the screen.
- **Chip-based member pickers die at 50.** Groups collapse to `4 members ▸`; adding members opens a
  searchable, filterable picker that shows already-taken monitors with their group name.
- **41 silently-strict monitors must still be visible**, hence the read-only remainder row.

## The design, in full — this is the spec until it is written

### 1. Evaluation model

> The SLO is satisfied at an instant when **every redundancy group holds its quorum** *and* **every
> ungrouped monitor is up**. A monitor outside a group is a group of one. **Strict = zero groups
> defined.**

`SLO Achieved %` = satisfied time ÷ elapsed time. Target, Warning, Violated Time, Error Budget, Burn
Rate and MTTR keep their current formulas — they just consume the new number.

Quorum is evaluated **per sample instant, then time-aggregated** — *not* by averaging each monitor's
Achieved %. Averaging would let two monitors that were never down *simultaneously* look like a
quorum loss. This is load-bearing; do not "simplify" it.

Because Strict is "zero groups", there is no separate Strict code path and no existing SLO changes
behaviour.

### 2. Settings — the Evaluation Logic card

Keeps the sketch's frame: the card, the `Strict | Redundant` segmented control, the mode hint, and
the reactive Help Card. What changes is the body when **Redundant** is picked:

```
┌ Redundancy Groups ─────────────────────────────────────────────────┐
│ ⠿ Edge Firewalls    2 members ▸     at least [− 1 +] of 2   slack 1 │
│ ⠿ App Tier          3 members ▸     at least [− 2 +] of 3   slack 1 │
│ ⠿ Storage Nodes     4 members ▸     at least [− 3 +] of 4   slack 1 │
│                                                    [ + Add group ] │
├────────────────────────────────────────────────────────────────────┤
│ 🔒 Everything else          41 monitors · all must be up         ▸ │
│    Not in a redundancy group. Any one of these going down          │
│    breaches the SLO.                          [+ Group] per row    │
├────────────────────────────────────────────────────────────────────┤
│ 🛡 Your 3 redundant tiers each survive 1 simultaneous failure.      │
│ ⚠ 41 monitors sit outside any group — any one going down breaches. │
└────────────────────────────────────────────────────────────────────┘
```

- Members come from the Source / Source Filter selection above. `of M` is **derived, never typed**.
- The remainder row is **read-only** — a summary, not a control. Expanding lists the monitors, each
  with a `[+ Group]` affordance. That one click is the whole escape hatch.
- Toggling Redundant → Strict **keeps groups in state**, so switching back destroys no work.

**Validation rules** (these replace the scrapped "assign everything" rule):

- A group needs **≥ 2 members**. A group of one is identical to leaving the monitor ungrouped, so
  the builder refuses it rather than pretending.
- Selecting **Redundant** requires **≥ 1 group**. Otherwise the list would show a `Redundant` chip
  on an SLO with no redundancy — the exact mislabelling the list differentiation exists to prevent.
- `N = M` is allowed but warns: *"Requires all members up — same as leaving them ungrouped."*

**The Strict/Redundant toggle is kept** even though the model no longer needs it: it is an explicit
opt-in that protects existing SLOs, it drives the list chip, and it gives the Help Card a clean
two-state story. It is a statement of intent, not a code path.

### 3. Help Card

The sketch's live explainer survives intact; its 5-day matrix becomes group-aware — rows nest under
group headers, with a per-group quorum row above the Overall Status row. **Keep the
Strict-vs-Redundant comparison note** ("Redundancy recovered N percentage points") — it is the
clearest sentence in the sketch and it is what sells the feature.

### 4. SLO list differentiation (screen `SLO_1`)

On the card, a third labelled slot beside Type and Frequency:

```
 Type            Frequency        Evaluation
 Availability    Daily            🛡 Redundant · 3 groups
```

A Strict SLO shows `🔗 Strict` in the same slot, so it is a genuine either/or you can scan and sort,
not a badge that only sometimes appears. In the list-view toggle it becomes a sortable **Evaluation
Logic** column. A `Redundant` filter beside the Breached/Warning/Ok/Total counters is **optional**.

### 5. SLO detail Overview — group-first restructure (screen `SLO_2`)

| Widget | Change |
|---|---|
| `SLO Summary` | New row: **Evaluation Logic — Redundant · 3 groups · quorum 1/2, 2/3, 3/4**. |
| `SLO Monitor Overview` | Keeps its counts, gains a companion readout: *3 of 3 groups holding quorum · 41 ungrouped, 2 down*. This is the fix for the misleading headline. |
| `SLO Achieved` | Second, ghosted marker on the bar: **Strict would be 71.4%**, beside the existing Target marker. |
| `SLO Trend` | The single 24h bar becomes a small stack of lanes on one time axis: **Overall · Edge Firewalls · App Tier · Storage Nodes · Ungrouped (41)**. Red on a group lane = that group lost quorum, so every breach is attributable by eye. The Ungrouped lane is always strict and will carry most of the red — that is the honest signal. |
| `Configured Entities` | Rows nest under collapsible group headers carrying the quorum (`App Tier — 1/3 ≥ 2 · BREACH`). The remainder section is **collapsed by default**. New **IMPACT** column: *Absorbed by redundancy* / *Caused breach* / *—*. A monitor reading `Breached 41%` with impact `Absorbed` is the state today's design cannot express. |
| `Error Budget` · `Burn Rate` · `MTTR` | Untouched. |

### 6. Monitor drawer and SLO History

- **Drawer (`SLO_3`)** — a context strip under the monitor title: *Member of **App Tier** · quorum
  ≥ 2 of 3*, and its trend lane annotated as absorbed or causal.
- **SLO History (`SLO_4`)** — one new **CAUSE** column: `App Tier lost quorum`.
- **Historical instance (`SLO_5`)** — inherits every Overview change. Correction/Penalty fields
  untouched.

### 7. The canvas — 5 artboards, one story

Scenario: **E-commerce Platform** — Edge Firewalls (FW-A, FW-B, ≥1), App Tier (APP-1/2/3, ≥2),
Storage Nodes (4, ≥3), plus ungrouped remainder.

1. **SLO List** — the estate, Strict and Redundant side by side.
2. **Create SLO Profile** — the sketch polished: group builder, reactive Help Card, the
   ungrouped-monitors warning firing.
3. **SLO Detail / Overview** — the day it paid off: APP-2 down 09:00–11:00, **absorbed**, SLO Ok.
4. **Configured Entities + monitor drawer** — same day one level down: APP-2 reads Breached, impact
   Absorbed.
5. **The breach** — 14:00 APP-3 also fails, App Tier drops to 1 of 3, quorum lost, **47 minutes
   breached**, attributed on the group lane and in History.

Artboards 3–5 are the same SLO at increasing depth — that is what makes it a scenario rather than
five screens.

### 8. Phase 2

The canvas is the contract. Porting into this app (obs-* components, a registry entry, Vitest,
no hardcoded colours) gets its own spec and plan **after** the canvas is signed off.

## Open challenges

Nothing below is blocking the spec, but every item is a thing the design currently **asserts rather
than answers**. Ordered by how much damage each does if it stays unanswered.

### 1. The ungrouped remainder is a permanent noise floor — the biggest open risk

We chose *ungrouped = always strict, not configurable*. In the 50-device case that means **41
monitors, each of which breaches the SLO on its own**. In any real estate that SLO breaches more or
less continuously, and redundancy groups on the other 9 devices change nothing about the headline
number.

The stated escape hatch is "make a group for them" — but for 41 devices that means one 41-member
group with `N = 40`, which the builder permits and which is a strange artifact of a workaround, not
a design. **The customer pain that started this conversation — one flapping edge switch breaching a
business-service SLO — is currently unaddressed for everything outside a group.**

This was a deliberate choice for simplicity and it may well be the right one. But it should be
re-tested against a real customer estate before the canvas is signed off, because the cheapest fix
(the N-of-M remainder policy we rejected) gets expensive once the settings UI is built without it.

### 2. Undefined semantics — spec gaps, not opinions

| Gap | Why it matters |
|---|---|
| **What does `Warning` mean under redundancy?** | The form has both Target and Warning. We defined how `Achieved %` is computed and never said what Warning measures. A group sitting at *exactly* its quorum has **no spare** — one more failure breaches. That is a genuinely valuable state and arguably the single most useful thing redundancy can tell an operator, and it is completely unspecified. |
| **Attribution when several monitors fail at once** | The `IMPACT` column claims *Caused breach* vs *Absorbed*. If two monitors in a `2 of 3` group go down together, which one caused it? Both? The later one? The design asserts attribution as if it were obvious. It isn't. |
| **Membership changes mid-period** | Move a monitor into a group on day 3 of a monthly SLO — do days 1–2 recompute, freeze, or split? The product already keeps per-period history (`SLO_4`), so this has a visible, wrong-looking answer if we don't pick one. |
| **MTTR / MTBF under redundancy** | `SLO Reliability Metrics` is monitor-derived today. A monitor that failed and recovered while *absorbed* caused no SLO incident. Does it count? Undefined. |
| **Burn-rate attribution** | The trend lanes show *which group lost quorum*; the error budget does not show *which group spent it*. Those are different questions and only the first is answered. |

### 3. Feasibility risks nobody has priced

- **The "Strict would be 71.4%" ghost marker requires evaluating every SLO twice** — the real result
  and a counterfactual. It is the most persuasive element in the whole design and quite possibly the
  most expensive. **No engineer has confirmed it is affordable.** If it is not, the
  Strict-vs-Redundant comparison story loses its evidence and the Help Card note becomes the only
  place it survives.
- **`SLO Trend` lane count is unbounded.** Three groups plus a remainder is legible. Twelve groups
  is not. No decision on a lane cap, collapsing, or showing only the offending groups.
- **Group membership is entirely manual.** At 50+ devices there is no tag- or rule-based assignment,
  so a device newly matching the Source Filter lands silently in the strict remainder — and by §1
  that means it can breach the SLO the day it is added, with no notification that it happened.

### 4. Phase-2 DS risk, unmeasured

The group builder needs a repeater hosting a nested multi-select and a stepper; the grouped
`Configured Entities` table needs **collapsible group header rows**. `obs-table` already cannot host
a dropdown (**G23**, recorded), and there is no evidence it supports group headers at all. Expect at
least one new DS gap here. **The canvas will not surface this** — it is hand-written HTML and can
draw anything. The cost only appears at the port.

### 5. One scope question never actually got answered

The scope question offered a fifth artboard: **the alert/notification moment** — what fires, and
what no longer fires, when a quorum breaks. That answer came back as notes about the list, create
and visualization screens, and the option was never picked. The current plan has **5 artboards and
no alert screen**.

Worth reopening, because *"a single node going down no longer pages anyone at 3 a.m."* is arguably
the real operational win of this feature, and right now it is the one part of the story with no
screen behind it.

### 6. Nothing has been verified by rendering

Per this project's own standing rule — **verify by rendering, never by reading** — the entire design
is currently unvalidated. No canvas exists, no screenshot has been taken, and the backward-compatibility
claim (*"Strict = zero groups, so no existing SLO changes behaviour"*) is reasoning, not evidence.
Treat every visual claim in "The design, in full" as a proposal until an artboard renders it.

## Gotchas & notes

- **The sketch is a bundled Claude Design canvas, not plain HTML.** 4.2 MB, 187 lines, and reading it
  directly tells you nothing. The real markup is JSON inside
  `<script type="__bundler/template">`; `JSON.parse` that tag's text content to get ~200 KB of
  readable HTML. The logic lives in a `<script type="text/x-dc">` block as a `class Component
  extends DCLogic`.
- **`CLAUDE.md` and `HANDOFF.md` were read stale at the start of this session** — the on-disk files
  had been updated (18:06 and 18:11) after an earlier read returned the previous versions. If
  anything in them looks inconsistent with the repo, **re-read them before acting**.
- **The branch is `feat/nxos-wan-link`, not `feat/app-shell-router`.** The previous HANDOFF.md
  described the router work while five WAN Link commits sat on top of it; that work never got a
  handoff of its own. Working tree is clean.
- Test suite verified this session: **456 passed across 26 files** in ~11 s.

### Carried forward from earlier sessions — still open

- **G31 — the Overview scores 70/100** and is the only screen that cannot reach 100, because the DS
  has no card or tile component. Recorded in `docs/DS-GAPS.md` with repro and ask. Making only the
  "Open screen" text an `obs-link` would score 100 and shrink the click target from the whole card
  to a few words; **that trade was deliberately not taken.**
- **Nothing is pushed or merged.** `master` is the deploy branch, so merging publishes.
  `feat/nxos-wan-link`, `feat/app-shell-router` and `feat/category-delete-flow` are all unmerged;
  only `feat/app-shell-router` and `master` exist on the remote.
- The full detail of the app-shell-router session — the routing decisions table, the three defects
  only rendering caught, and the conformance-sampling caveat — is preserved in
  `docs/superpowers/specs/2026-08-31-app-shell-router-design.md` and its plan, and the decisions
  themselves are now reflected in `CLAUDE.md`.
