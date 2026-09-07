# Redundancy SLO — design

**Date:** 2026-09-01 (designed) · 2026-09-03 (transcribed)
**Status:** approved in conversation; canvas to follow
**Scope:** phase 1 only — a 5-artboard canvas. Porting into this app gets its own spec.
**Source:** transcribed from `HANDOFF.md` (2026-09-01), which until now held the only copy.

## Problem

An Availability SLO today assumes **monitor breached ⇒ SLO breached**. Every monitor attached to the
SLO must be up, always. `SLO Monitor Overview` reads *112 Breached / 119 Ok* and that arithmetic
**is** the SLO.

That is wrong for any service built with redundancy. A customer runs two edge firewalls precisely so
that one can fail; when one flaps, the business service is fine and the SLO says it is breached. The
SLO measures the infrastructure, not the service.

**Redundancy SLO** lets an Availability SLO treat groups of monitors as backing each other up, so a
single node failure no longer degrades the SLO.

### The core tension — the one thing not to lose

Once redundancy groups exist, a monitor can be **Breached** while its group holds quorum and the SLO
stays perfectly **Ok**. The *112 Breached / 119 Ok* headline stops meaning anything on its own.

> **Every change in this design exists to separate *a monitor is down* from *the SLO is hurt*.**

If a future change collapses those two back together, it has lost the point of the feature.

## 1. Evaluation model

> The SLO is satisfied at an instant when **every redundancy group holds its quorum** *and* **every
> ungrouped monitor is up**. A monitor outside a group is a group of one.
> **Strict = zero groups defined.**

`SLO Achieved %` = satisfied time ÷ elapsed time. **Target, Warning, Violated Time, Error Budget,
Burn Rate and MTTR keep their current formulas** — they consume the new number, they do not change.

### Quorum is evaluated per sample instant, then time-aggregated

Not by averaging each monitor's Achieved %. Averaging would let two monitors that were never down
*simultaneously* look like a quorum loss.

```
per instant t:   satisfied(t) = AND over groups[ up_members(g, t) >= N(g) ]
                                AND over ungrouped[ up(m, t) ]

over a period:   Achieved %   = |{ t : satisfied(t) }| / |{ t }|
```

**This is load-bearing. Do not "simplify" it to an average of per-monitor percentages.**

### Backward compatibility

Because Strict is defined as *zero groups*, there is no separate Strict code path and **no existing
SLO changes behaviour**. Note this is reasoning, not evidence — see OQ6.

## 2. Settings — Evaluation Logic

### The control — two mode rows *(2026-09-07, supersedes the segmented card)*

The mode is asked as a **two-row radio group**, not a segmented control and not an ordinary
field. It sits full width between `Start Date` and `Tags` on the shipped Create SLO Profile
form, and it is the only thing that form gains.

```
Evaluation Logic *
Decides how the 3 monitors you added under Source combine into a single SLO
result — whether every one of them has to stay up, or whether they can cover
for each other.

┌──────────────────────────────────────────────────────────────────────┐
│ ○  Strict                                       tolerates 0 failures │
└──────────────────────────────────────────────────────────────────────┘
┌──────────────────────────────────────────────────────────────────────┐
│ ●  Redundant                                 🛡 tolerates 1 failure  │
│    Members back each other up. Only a drop below your threshold      │
│    degrades the SLO.                                                 │
│    [ at least │ 2 │ of 3 must stay up │ − │ + ]                      │
└──────────────────────────────────────────────────────────────────────┘
```

- **The consequence reads on both rows.** The selected row carries a shield and its slack,
  with the full sentence on hover. The row you are *not* on still states what it would cost:
  `Strict` reads `tolerates 0 failures` from inside `Redundant`, and `Redundant` advertises
  its ceiling — `tolerates up to M-1 failures` — from inside `Strict`. **This standing
  comparison is the reason for the pattern**; a toggle can only describe the state you are in.
- **Only the selected row expands**, to its rule and — under `Redundant` — the quorum stepper.
- **`N` runs `1..M-1`.** `N = M` is not expressible: asking for all of them is what `Strict`
  is for, and the row above it says so. See D9.
- **Switching modes keeps the quorum**, so changing your mind destroys no work.
- Rows are keyboard-operable (`Tab` to a row, `Enter` to choose) and carry `role="radio"`.

Reference design: `D:\Claude design\OptionG-html.zip` (§12). Values were replicated in the
wireframe's own tokens rather than copied, so the block sits inside the deck's house style.

### The group builder

Keeps the sketch's frame: the card, the mode hint, and the reactive Help Card. What changes is the body when **Redundant** is selected:

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

- **Members come from the Source / Source Filter selection above.** `of M` is **derived, never
  typed**.
- **The remainder row is read-only** — a summary, not a control. Expanding it lists the monitors,
  each with a `[+ Group]` affordance. That one click is the whole escape hatch.
- **Toggling Redundant → Strict keeps groups in state**, so switching back destroys no work.
- **Member pickers are not chips.** At 50 monitors chips are unusable; a group collapses to
  `4 members ▸`, and adding members opens a **searchable, filterable picker that shows
  already-taken monitors annotated with their group name**.

### The two-line fault-tolerance readout

`min(M − N)` across all groups always returns 0 once singletons exist, so a single
"survives N failures" number is dishonest. It splits in two:

1. **🛡 Your 3 redundant tiers each survive 1 simultaneous failure.** — what redundancy bought.
2. **⚠ 41 monitors sit outside any group — any one going down breaches.** — what it did not.

**Line 2 is the most valuable sentence on the screen.** It is the only place the SLO admits its own
noise floor. It must not be demoted to a tooltip or hidden behind the collapsed remainder row.

### Validation rules

| Rule | Message / behaviour |
|---|---|
| A group needs **≥ 2 members** | A group of one is identical to leaving the monitor ungrouped, so the builder refuses it rather than pretending. |
| Selecting **Redundant** requires **≥ 1 group** | Otherwise the list would show a `Redundant` chip on an SLO with no redundancy — the exact mislabelling §4 exists to prevent. |
| `N = M` is **unrepresentable** | The stepper stops at `M-1`. Superseded the 2026-09-03 warning *"Requires all members up — same as leaving them ungrouped."* — an invalid state removed rather than explained. See D9. |
| A monitor belongs to **at most one** group | Enforced in the picker by annotation, not by a post-hoc error. |

There is **no** "every monitor must be assigned" rule. See Decision D4.

### Why the explicit Strict / Redundant choice survives

The model no longer needs it — zero groups already means strict. It is kept because it is:

- an **explicit opt-in** that protects existing SLOs from acquiring new semantics silently,
- what drives the **list chip** (§4),
- what gives the **Help Card** a clean two-state story.

**It is a statement of intent, not a code path.**

## 3. Help Card

The sketch's live explainer survives intact. Two changes:

- Its **5-day matrix becomes group-aware** — rows nest under group headers, with a per-group quorum
  row above the Overall Status row.
- The **Strict-vs-Redundant comparison note is kept**: *"Redundancy recovered N percentage points."*
  It is the clearest sentence in the sketch and it is what sells the feature.

## 4. SLO list differentiation (screen `SLO_1`)

On the card, a third labelled slot beside Type and Frequency:

```
 Checkout Availability                                    [ Ok ]

 Type            Frequency        Evaluation
 Availability    Daily            🛡 Redundant · 2 of 3
```

A Strict SLO shows **`🔗 Strict`** in the same slot. It is a genuine either/or you can scan and
sort — **not a badge that only sometimes appears**.

- **The slot states the quorum, never a group count** *(2026-09-07)*. It read `Redundant · 3 groups`
  until a group count became meaningless: one SLO profile carries one redundancy group or is Strict,
  so `2 of 3` is the only honest summary. It is also what artboard 2’s stepper says.
- In the list-view toggle it becomes a sortable **Evaluation Logic** column.
- A `Redundant` filter beside the Breached / Warning / Ok / Total counters is **optional**.

### The Business Service view *(2026-09-07)*

The briefcase sits top right, immediately left of the list-view toggle — where APM puts it, and
where the product already teaches the gesture (`BS_1`):

| | State | What the list shows |
|---|---|---|
| **off** | SLOs | the shipped tiles (`SLO_1`), plus the Evaluation slot |
| **on** | Business Services | a heading per service — name, SLO count, **severest status** — with that service’s SLOs as full tiles beneath |

**The tile does not name its business service.** It was added there on 2026-09-07 and removed the
same day: the grouped view names each service once, as a heading over its SLOs, which is where the
question *“what is linked to this service?”* is actually answered. Repeating it on every tile only
restates the heading.

**A service takes the severest status among its SLOs**, by `Breached > Warning > Ok` — never the
first, and never an average. `E-commerce Platform` carries three SLOs, two of them `Ok`, and its
heading reads **Breached**; a heading that could be read as *"first"* or *"most common"* would be a
different and wrong claim.

**No drilldown.** An intermediate screen listing a service’s SLO *names* was built and cut on
2026-09-07: once every service and every SLO is on one screen, opening one to “see only its SLOs”
reveals nothing that was not already visible.

This also satisfies the 2026-09-03 requirement that **a drilldown shows only its own SLO’s data**.

## 5. SLO detail Overview — group-first restructure (screen `SLO_2`)

Not a bolt-on widget and not a separate tab. The Overview is restructured so groups are the primary
unit, because a bolt-on would leave the misleading headline intact.

| Widget | Change |
|---|---|
| `SLO Summary` | New row: **Evaluation Logic — Redundant · 3 groups · quorum 1/2, 2/3, 3/4**. |
| `SLO Monitor Overview` | Keeps its counts, gains a companion readout: *3 of 3 groups holding quorum · 41 ungrouped, 2 down*. **This is the fix for the misleading headline.** |
| `SLO Achieved` | Second, ghosted marker on the bar: **Strict would be 71.4%**, beside the existing Target marker. |
| `SLO Trend` | The single 24h bar becomes a small stack of lanes on one time axis: **Overall · Edge Firewalls · App Tier · Storage Nodes · Ungrouped (41)**. Red on a group lane = that group lost quorum, so **every breach is attributable by eye**. The Ungrouped lane is always strict and will carry most of the red — that is the honest signal, not a defect. |
| `Configured Entities` | Rows nest under collapsible group headers carrying the quorum (`App Tier — 1/3 ≥ 2 · BREACH`). The remainder section is **collapsed by default**. New **IMPACT** column: *Absorbed by redundancy* / *Caused breach* / *—*. |
| `Error Budget` · `Burn Rate` · `MTTR` | Untouched. |

> A monitor reading `Breached 41%` with impact `Absorbed by redundancy` is **the state today's
> design cannot express**. It is the single clearest demonstration of the feature.

## 6. Monitor drawer and SLO History

- **Drawer (`SLO_3`)** — a context strip under the monitor title: *Member of **App Tier** · quorum
  ≥ 2 of 3*, and its trend lane annotated as absorbed or causal.
- **SLO History (`SLO_4`)** — one new **CAUSE** column: `App Tier lost quorum`.
- **Historical instance (`SLO_5`)** — inherits every Overview change. Correction / Penalty fields
  untouched.

## 7. The canvas — 6 artboards, one story

**Scenario: E-commerce Platform.** Edge Firewalls (FW-A, FW-B, ≥ 1) · App Tier (APP-1/2/3, ≥ 2) ·
Storage Nodes (4 nodes, ≥ 3) · plus an ungrouped remainder.

| # | Artboard | What it shows |
|---|---|---|
| 1 | **SLO List** | The estate, Strict and Redundant SLOs side by side. |
| 2 | **Create SLO Profile** | The sketch polished: group builder, reactive Help Card, the ungrouped-monitors warning firing. |
| 3 | **SLO Detail / Overview** | The day it paid off: APP-2 down 09:00–11:00, **absorbed**, SLO Ok. |
| 4 | **Configured Entities + monitor drawer** | The same day one level down: APP-2 reads Breached, impact **Absorbed**. |
| 5 | **The breach** | 14:00, APP-3 also fails. App Tier drops to 1 of 3, quorum lost, **47 minutes breached**, attributed on the group lane and in History. |
| 6 | **Settings · SLO Profile** | *(added 2026-09-03)* Where the SLO lives — `Settings → Service Level Objective → SLO Profile`, the shipped list with `EVALUATION LOGIC` added beside `FREQUENCY`. A Performance SLO reads `—`, not Strict. |

**Artboards 3–5 are the same SLO at increasing depth** — that is what makes it a scenario rather
than five screens.

**No alerting artboard.** Decided 2026-09-03; see Decision D7.

### The scenario, pinned down

Built 2026-09-03 as `redundancy-slo/wireframe.html`. The outline above left the timings loose, and
they do not survive contact with arithmetic: for App Tier to fall to 1 of 3 at 14:00, **APP-2 must
still be down** when APP-3 fails. The day is therefore:

| Monitor | Down | For | Group state | Effect |
|---|---|---|---|---|
| STOR-2 | 04:00–05:05 | 1 h 05 m | Storage Nodes 3 of 4 ≥ 3 | absorbed |
| APP-2 | 09:00–14:47 | 5 h 47 m | App Tier 2 of 3 ≥ 2 | absorbed until 14:00 |
| APP-3 | 14:00–14:47 | 47 m | App Tier **1 of 3 < 2** | **quorum lost** |

- **Redundant** — violated 47 m → 1393/1440 = **96.736%**, breached against the 99% target.
- **Strict** — violated 65 + 347 = 412 m → 1028/1440 = **71.4%**, the ghost marker on artboard 5.
- **At 13:00** (artboards 3 and 4) — redundant violated 0 → **100% · Ok**; strict 305/780 → **60.9%**.

So the ghost marker reads **60.9%** on artboard 3 and **71.4%** on artboard 5. Both are the same
counterfactual at different points in the period; only the full-day figure is the 71.4% quoted
above. **6 h 05 m of member downtime cost the SLO nothing; 47 minutes of it cost everything.**

## 8. Out of scope

- **Phase 2 — porting into this app.** obs-* components, a registry entry, Vitest, no hardcoded
  colours. Gets its own spec and plan *after* the canvas is signed off. The canvas is the contract.
- **The alert / notification moment.** No screen in phase 1.
- **Any change to Error Budget, Burn Rate or MTTR formulas.**
- **Tag- or rule-based group membership.** Membership is manual in phase 1 (see OQ4).
- **Non-Availability SLO types.** Redundancy applies to Availability SLOs only.

## 9. Decisions taken, and what was rejected

| # | Decision | Rejected alternative, and why |
|---|---|---|
| D1 | **Canvas first, then port to the app.** | Building on the DS first — locks visuals only after paying DS and test cost. |
| D2 | **Redundancy groups, N-of-M per group, ANDed.** | Flat N-of-M across all monitors — does not model a real service tier and makes breaches **unattributable**, which is what makes the visualization worth building at all. |
| D3 | **Group-first restructure of the Overview.** | A bolt-on widget, or a separate Redundancy tab — either leaves the misleading *112 Breached* headline standing. |
| D4 | **A monitor outside a group is a group of one.** | *Every member must belong to exactly one group; unassigned monitors block Create.* Scrapped — see below. |
| D5 | **Ungrouped monitors are always strict, not configurable.** | A remainder quorum, or a "tolerate K ungrouped failures" field. Rejected 2026-09-03 for simplicity; the escape hatch stays *"make a group for them"*. **Re-confirmed with the risk in OQ1 accepted.** |
| D6 | **Keep the Strict / Redundant toggle** despite the model not needing it. | Deriving the mode from group count — loses the explicit opt-in, the list chip and the Help Card's two-state story. |
| D7 | **5 artboards, no alerting screen.** | A 6th artboard for the alert moment. Reopened 2026-09-03 and declined; the alert story stays a claim in this spec until phase 2. |
| D8 | **Evaluation Logic is two mode rows, not a segmented card or a form field.** *(2026-09-07)* | Carrying the Card and Compact layouts side by side for comparison — resolved in favour of the `OptionG` reference, whose per-row consequence shows the cost of the mode you did **not** pick. Both earlier layouts are kept in `redundancy-slo/archive/`. |
| D9 | **`N = M` is unrepresentable — the quorum stepper stops at `M-1`.** *(2026-09-07)* | Allowing `N = M` with a *"same as Strict"* warning. Rejected: the two rows sit inches apart, so the invalid state can be removed instead of explained. |
| D10 | **The SLO list gains APM’s business-service view: services as headings, their SLOs as tiles beneath.** *(2026-09-07)* | (a) a Business Service filter or column — APM already teaches the briefcase, so reuse costs nothing to learn; (b) naming the service on every tile — the heading says it once; (c) an intermediate screen listing SLO names per service, and (d) rolling member percentages up into a service average — two SLOs with different Targets have no honest average, so a service claims only its SLO count and its severest status. |

### D4 in full — the 50-device problem

The teammate raised it during design: a customer attaches **50 devices** to one SLO with three
redundancy groups of 2, 3 and 4 members. That leaves **41 devices in no group**. The original rule
would have meant hand-assigning 41 devices to clear a validation error. Three consequences fell out
of scrapping it:

1. **The fault-tolerance readout had to be rethought** — `min(M − N)` now always returns 0. It became
   the honest two-liner in §2.
2. **Chip-based member pickers die at 50** — groups collapse to `4 members ▸` and adding opens a
   searchable picker.
3. **41 silently-strict monitors must still be visible** — hence the read-only remainder row.

## 10. Open questions

Carried forward from the design session. Nothing here blocks the canvas, but each is a thing this
spec **asserts rather than answers**, ordered by damage done if it stays unanswered.

### OQ1 — The ungrouped remainder is a permanent noise floor · *risk accepted, re-test before sign-off*

With 41 ungrouped monitors, each of which breaches the SLO on its own, a real estate breaches more or
less continuously, and redundancy on the other 9 devices changes nothing about the headline number.
The stated escape hatch — *"make a group for them"* — means one 41-member group with `N = 40`, which
the builder permits and which is an artifact of a workaround, not a design.

**The customer pain that started this conversation — one flapping edge switch breaching a
business-service SLO — remains unaddressed for everything outside a group.**

Decision (2026-09-03): **keep strict, ship the design as approved, accept the risk.**
Condition: **re-test against a real customer estate before the canvas is signed off.** The cheapest
fix (the N-of-M remainder policy that was rejected) gets expensive once the settings UI is built
without it.

### OQ2 — What does `Warning` mean under redundancy? · *deliberately unresolved*

The form has both Target and Warning. This design defines how `Achieved %` is computed and never says
what Warning measures. Two candidate answers, **neither chosen** (decided 2026-09-03):

- **(a)** Warning stays a second threshold on `Achieved %`, unchanged and backward compatible, and a
  separate *"At risk — no spare"* signal covers redundancy state.
- **(b)** Warning is redefined for Redundant SLOs as *any group sitting exactly at its quorum*.

A group at exactly quorum has **no spare** — one more failure breaches. That is arguably the single
most useful thing redundancy can tell an operator, and it is currently unspecified. **The canvas
should draw neither and must not imply an answer**; artboards 3–5 will force the decision, and it
should be taken then, with the artboards in hand.

### OQ3 — Undefined semantics

| Gap | Why it matters |
|---|---|
| **Attribution when several monitors fail at once** | The `IMPACT` column claims *Caused breach* vs *Absorbed*. If two monitors in a `2 of 3` group go down together, which one caused it — both, or the later one? The design asserts attribution as if it were obvious. It isn't. |
| **Membership changes mid-period** | Move a monitor into a group on day 3 of a monthly SLO — do days 1–2 recompute, freeze, or split? The product keeps per-period history (`SLO_4`), so this has a visible, wrong-looking answer if we don't pick one. |
| **MTTR / MTBF under redundancy** | `SLO Reliability Metrics` is monitor-derived today. A monitor that failed and recovered while *absorbed* caused no SLO incident. Does it count? Undefined. |
| **Burn-rate attribution** | The trend lanes show *which group lost quorum*; the error budget does not show *which group spent it*. Different questions; only the first is answered. |

### OQ4 — Feasibility risks nobody has priced

- **The "Strict would be 71.4%" ghost marker requires evaluating every SLO twice** — the real result
  and a counterfactual. It is the most persuasive element in the design and quite possibly the most
  expensive. **No engineer has confirmed it is affordable.** If it is not, the Strict-vs-Redundant
  comparison loses its evidence and survives only as the Help Card note.
- **`SLO Trend` lane count is unbounded.** Three groups plus a remainder is legible; twelve groups is
  not. No decision on a lane cap, collapsing, or showing only the offending groups.
- **Group membership is entirely manual.** At 50+ devices there is no tag- or rule-based assignment,
  so a device newly matching the Source Filter lands silently in the strict remainder — and by OQ1 it
  can breach the SLO the day it is added, with no notification that it happened.

### OQ5 — Phase-2 DS risk, unmeasured

The group builder needs a repeater hosting a nested multi-select and a stepper; the grouped
`Configured Entities` table needs **collapsible group header rows**. `obs-table` already cannot host
a dropdown (**G23**, recorded in `docs/DS-GAPS.md`), and there is no evidence it supports group
headers at all. Expect at least one new DS gap.

**The canvas will not surface this** — it is hand-written HTML and can draw anything. The cost only
appears at the port.

### OQ6 — Nothing has been verified by rendering

Per this project's standing rule — **verify by rendering, never by reading** — the design is
currently unvalidated. No canvas exists, no screenshot has been taken, and the
backward-compatibility claim (*"Strict = zero groups, so no existing SLO changes behaviour"*) is
reasoning, not evidence. **Treat every visual claim in this spec as a proposal until an artboard
renders it.**

## 11. Success criteria — phase 1

The canvas is done when all of these hold, each **verified by rendering**.

> **Status 2026-09-07:** criteria 1–6 are met by `redundancy-slo/wireframe.html` and asserted by
> `redundancy-slo/verify.mjs` — **167 checks, all passing in real Chrome**. Criterion 7 is
> outstanding and is the only thing standing between this and sign-off.

1. Six artboards exist and read as one scenario, not six screens.
2. Artboard 4 shows a monitor reading **Breached** whose impact reads **Absorbed by redundancy**, on
   an SLO whose status reads **Ok**. (The core tension, made visible.)
3. ~~Artboard 2 shows the ungrouped-monitors warning firing with a real count.~~
   **Superseded 2026-09-03** by the one-group decision: an SLO profile's group *is* its member
   set, so artboard 2 has no remainder to warn about. The noise floor it was protecting is
   still real — it lives in OQ1, and on artboards 3–5.
4. Artboard 5 attributes the breach to a named group on the trend lane **and** in History, with a
   duration.
5. The `Strict would be N%` ghost marker appears on artboards 3 and 5, flagged in-spec as
   feasibility-gated (OQ4).
6. Nothing on any artboard implies an answer to OQ2.
7. OQ1 has been re-tested against a real customer estate, and the result recorded here.

## 12. Source material

- **The sketch:** `D:\Claude design\Create SLO Profile (standalone) (1).html` — a **bundled Claude
  Design canvas, not plain HTML**. 4.2 MB, 187 lines; reading it directly tells you nothing. The
  markup is JSON inside `<script type="__bundler/template">` — `JSON.parse` that tag's text content
  for ~200 KB of readable HTML. The logic is a `class Component extends DCLogic` in a
  `<script type="text/x-dc">` block.
- **The Evaluation Logic reference** *(added 2026-09-07)* — `D:\Claude design\OptionG-html.zip`,
  an appifact design-canvas export: `OptionG.dc.html` is an `<x-dc>` template plus a `DCLogic`
  class, and the values to replicate live in its inline `style="…"` attributes. It is a
  **reference mockup, not production code** — its own README says to replicate the values in
  the consuming styling system rather than copy them wholesale, which is what artboard 2 does.
- **The shipped screens:** `D:\Claude design\Screenshots\SLO\` — `SLO_1` list, `SLO_2` detail
  Overview, `SLO_3` monitor drawer, `SLO_4` SLO History, `SLO_5` historical instance.
- **The shipped SLO settings** *(added 2026-09-03)* — `SLO_setup_1` is
  **Settings → Service Level Objective (BETA) → SLO Profile**, a table with the columns
  `SLO TYPE · SLO NAME · FREQUENCY · WARNING · TARGET · BUSINESS SERVICE NAME · START DATE`.
  `SLO_setup_2` is the **real Create SLO Profile modal**: a left Availability / Performance rail, a
  three-column field grid (`SLO Name · SLO Description · Business Service Name` / `SLO For ·
  Source Filter · Source` / `Frequency · Target · Warning` / `Start Date`), then full-width `Tags`
  and `Notify Team`, with a `Reset` / `Create SLO Profile` footer.
- **`Screenshots\SLO\BS\`** *(added 2026-09-03)* — Business Service is a **first-class entity**,
  created and picked from a searchable dropdown during Application Registration and used in APM to
  group services. The form's `Business Service Name *` binds to one of those, not to free text.

> **The sketch says *what* to build; the shipped screens say *where it goes*.** The sketch is a
> Claude Design canvas and its chrome — its dark theme, its field order, its always-visible
> Help Card matrix — is **reference, not target**. Anything this design adds must land inside
> `SLO_setup_1` and `SLO_setup_2` as they actually are.
>
> Applied to the canvas on 2026-09-03: artboard 2 is now the shipped form field for field, with
> **Evaluation Logic as the only addition**, full width between `Start Date` and `Tags`, and
> `Business Service Name` rendered as the **entity picker it really is** — a dropdown with a
> search box and a `+` to create. A new **artboard 6** carries the `SLO_setup_1` settings list,
> with `EVALUATION LOGIC` added next to `FREQUENCY`; its `Create SLO Profile` button navigates
> to artboard 2, which is the real path through the product.
>
> **Out of scope** (confirmed 2026-09-03): redesigning the Help Card — the shipped one is a
> three-section educational accordion, and §3 above describes the *sketch's*, not the product's —
> and the `Correction Profile` / `Penalty Profile` siblings in that nav.
