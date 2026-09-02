# Cisco NX-OS WAN Link monitor screen — design

**Status:** approved (wireframe signed off 2026-09-01)
**Wireframe:** `../../../../nxos-wan-link/wireframe.html` — the low-fidelity flow this implements

## Goal

ObserveOps already ships WAN Link monitoring for Cisco **IOS XE** and **IOS XR**. This adds
**Cisco NX-OS**, with three probes: **ICMP Echo**, **UDP Echo** and **UDP Jitter**.

The deliverable is a working screen on the ObserveOps design system: the WAN Link list, a detail
drawer per probe, and a probe-configuration drawer.

## Where it lives

`observeops-app` is a single-page shell with a screen registry. Its `monitors` module already exists
in the sidebar with **no screens** — this fills it.

| | |
|---|---|
| Route | `#/monitors/wan-link` |
| Screen | `src/wan-link/screen.js`, exporting `meta` and `mount(root)` |
| Registry | one entry in the `monitors` module's `screens` array |

Landing path, matching the reference screenshots: **sidebar → Monitors → WAN Link tab**. No new HTML
page, no new Vite entry.

## Screen regions

```
obs-app-header                          (shell, already exists)
obs-sidebar  Monitors active            (shell, already exists)
─────────────────────────────────────────────────────────────
page header    Monitors
obs-tabs       Inventory · Network · SDN · … · [WAN Link] · … · Other
obs-toolbar    search                                    ⋯ export · filter
obs-filters    Monitors · Severity · Status · + Filter
obs-table      the WAN link list
footer         pagination · items per page · severity legend · count
```

### List columns

Column order follows the most recent reference screenshot — **RTT before STATUS**:

| Key | Title | Notes |
|---|---|---|
| `name` | WAN LINK NAME | monospace, `src→dst` suffix |
| `monitor` | MONITOR | source device hostname |
| `type` | TYPE | icon cell |
| `probe` | WAN PROBE TYPE | ICMP Echo · UDP Echo · UDP Jitter |
| `sourceIp` | SOURCE IP | |
| `destinationIp` | DESTINATION IP | |
| `sourceInterface` | SOURCE INTERFACE | NX-OS names, `Eth1/n` |
| `rtt` | RTT | blank when the link is down |
| `status` | STATUS | `obs-severity shape="chip"` |

Clicking a row opens that link's detail drawer (`obs-table` `rowclick`).

### Seed data

**One link per probe.** The list exists to reach each probe's detail drawer, not to demonstrate a
populated inventory, so three rows is the whole seed.

A down link carries no RTT, mirroring the product. No seeded link is down, so that rule lives in an
exported `displayRtt(status, rtt)` and is tested directly rather than through the seed.

## Detail drawer

`obs-drawer placement="right"`, wide. Header: link name │ probe type │ status. The drawer's own
close affordance is used; the wireframe's back button is the DS drawer header.

### ICMP Echo and UDP Echo — 3 charts, no tiles

Both probes produce identical CLI output, so they share one layout.

| Widget | Span | Source |
|---|---|---|
| Today's Availability | 2/12 | `Number of successes` · `Number of failures` · `Latest operation return code` |
| Availability Statistics | 4/12 | same — Last Day · Last 7 Days · Last 15 Days |
| RTT History | 6/12 | `Latest RTT` → `ipsla.latency.ms.avg` |

NX-OS reports **no min or max RTT** for these probes, so the two extra `RTT History` charts in the
XE/XR template are dropped. The drawer states this rather than leaving the omission silent.

### UDP Jitter — 6 tiles + 10 charts

The tile row is **capped at 6**.

| Tile | Source |
|---|---|
| RTT | `RTT Min/Avg/Max` |
| SRC to DST Jitter | `Source to Destination Jitter` (Avg) |
| DST to SRC Jitter | `Destination to Source Jitter` (Avg) |
| SRC to DST Latency | `SD Latency one way` (Avg) |
| DST to SRC Latency | `DS Latency one way` (Avg) |
| Packet Lost | `Loss Source to Destination` · `Loss Destination to Source` |

| Row | Chart | Span | Series |
|---|---|---|---|
| A | Today's Availability | 2/12 | — |
| A | Availability Last 30 Days | 4/12 | 7 Days · 15 Days · 30 Days |
| A | RTT History | 6/12 | Min. RTT · Avg. RTT · Max. RTT |
| B | Source to Destination Jitter | 4/12 | Min · Avg · Max Jitter |
| B | Destination to Source Jitter | 4/12 | Min · Avg · Max Jitter |
| B | Packet Loss Statistics | 4/12 | Packet Skipped · Out Of Sequence · Packet Late Arrival · Tail Drop |
| C | Source to Destination Latency | 6/12 | Min · Avg · Max Latency |
| C | Destination to Source Latency | 6/12 | Min · Avg · Max Latency |
| D | Source to Destination Loss Periods | 6/12 | Loss Periods · Period Length Min/Max · Inter-Loss Length Min/Max |
| D | Destination to Source Loss Periods | 6/12 | same, DS direction |

**Changes from the XE/XR jitter template, all forced by the NX-OS counter set:**

- The positive/negative jitter split has no NX-OS source — 4 charts collapse to 2.
- `Sum` series become `Avg`; NX-OS reports Min/Avg/Max only.
- `Packet Error` has no equivalent; `Tail Drop` replaces it.
- The **Average Jitter** and **Avg Latency** charts are dropped — both re-drew series already
  plotted by the directional charts.
- **Loss Periods** is new, one chart per direction. Splitting by direction leaves room for both
  halves of every Min/Max pair.

### Counters deliberately not covered

`Latest operation start time` · `Operation time to live` · `IPSLA operation id` (metadata, not
metrics) · `Number Of RTT` · `Number of Latency one-way Samples` · `Number of SD Jitter Samples` ·
`Number of DS Jitter Samples` (sample counts) · `Mean Opinion Score (MOS)` · `ICPIF` (dropped when
the tile row was capped at 6).

## Probe config drawer

`obs-drawer` opened from a toolbar action, `footer="cancel-save"`.

| Group | Fields |
|---|---|
| Probe | Probe Type (`obs-select`) · Probe Name |
| Source & Destination | Source Monitor · Source IP · Source Interface · Destination IP · **Destination Port** |
| Schedule & Thresholds | Frequency · Timeout · ToS / DSCP · VRF |
| Probe-specific | reacts to probe type |

**Destination Port is hidden for ICMP Echo** and shown for both UDP probes. ICMP Echo and UDP Echo
reuse the XE/XR field set unchanged; UDP Jitter adds packet count, packet interval and codec.

## Charts

**The DS ships no chart element.** Its 47 components include `obs-dataviz-tooltip`,
`obs-metric-list` and `obs-metric-picker`, but nothing that draws a series — the product's charts
are Highcharts, per `tokens/chart-palette.json`.

Charts are therefore **inline SVG rendered by this screen**, styled entirely from the DS's
`--chart-*` CSS custom properties, which the DS CSS does ship:

`--chart-vivid-teal` · `--chart-sunset-orange` · `--chart-neon-purple` · `--chart-lime-green` ·
`--chart-hot-pink` · `--chart-aqua` · `--chart-golden-yellow` · `--chart-rose-red` ·
`--chart-emerald-green` · `--chart-fuchsia` · `--chart-amber` · `--chart-bright-violet` ·
`--chart-tangerine` · `--chart-mint-green` · `--chart-electric-coral` · `--chart-chartreuse` ·
`--chart-indigo` · `--chart-vibrant-magenta`

plus `--chart-grid-line-color`, `--chart-border-color`, `--chart-legend-color`, `--chart-null-color`
and `--chart-font-family`.

Series are assigned **by order**, per the palette's own rule: series *n* takes hue *n*, wrapping
after the last. No hue is hand-picked. The palette is theme-aware, so the tokens carry light and
dark automatically.

## Constraints

- **No hardcoded colours.** Every colour resolves to a `var(--token)`. The repo's deploy workflow
  enforces this.
- **Never guess a DS component's API** — read `elements-api.json`, then confirm by rendering.
- **Verify by rendering, not by reading.** jsdom and static checks have both missed real defects in
  this repo; every visual or behavioural claim needs a headless-Chrome check.
- **Every DS gap goes in `docs/DS-GAPS.md`** with a repro, the evidence, the workaround and an ask.
- Node 22.22.2+ / 24.15+ / 26+.

## Out of scope

- Any backend. Data is seeded in-memory, as everywhere else in this app.
- XE/XR templates — untouched.
- The list's export and column-chooser actions render but do nothing, matching the other screens.
