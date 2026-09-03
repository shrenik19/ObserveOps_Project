# WAN Link Discovery — design

**Date:** 2026-09-02
**Status:** approved in conversation; wireframe to follow
**Supersedes:** the in-device `Add WAN Link` drawer

## Problem

WAN Link monitoring is created today from a drawer that opens *inside* a monitored device
(`Inventory → <device> → WAN Link → Add WAN Link`). Because the device is implicit, the drawer never
asks which monitor the link belongs to — but it also cannot be reached from anywhere else, cannot use
anything the platform already knows about that device, and is a right-side drawer carrying a form
that is about to grow a fourth platform.

Three things are wanted at once:

1. **Add Cisco NX-OS** to WAN Link discovery (SSH, like IOS XR).
2. **Revamp** the existing IOS XE (SNMP) and IOS XR (SSH) discovery design.
3. **Introduce monitor selection** — start from an already-monitored network device rather than from
   an implicit one.

## Shape of the solution

WAN Link becomes a **category in the Discovery Profile tree**, a sibling of Storage and Database. It
inherits the Create Discovery Profile page, the Discovery Profile grid, the progress screen and the
provision grid. The in-device drawer is retired.

```
Discovery Profile list  →  Create Discovery Profile · WAN Link  →  Discovery Progress  →  Provision grid  →  WAN Link instances
   (existing grid,           (new form)                            (existing pattern,     (existing pattern,   (device WAN Link tab)
    new row type)                                                   new card narration)    new columns)
```

### What a run does

**Declare → push → verify → provision.** The profile declares the link; `Save and Run` pushes that
IP SLA operation to the router, waits for the first result, and reports it. The provision grid holds
the declared link with its verification outcome; `Add Selected Objects` turns it into a monitored WAN
link instance.

It does **not** read operations already configured on the device. That was considered and rejected —
it would have made `Payload`, `Type of Service`, `Frequency` and `Operation Timeout` meaningless as
inputs.

## Platform matrix

| Vendor | Device OS | Method | WAN Probes |
|---|---|---|---|
| Cisco Systems | IOS XE | SNMP | ICMP Echo · ICMP Jitter · Path Echo |
| Cisco Systems | IOS XR | SSH | ICMP Echo · UDP Echo · UDP Jitter · ICMP Path Echo · ICMP Path Jitter |
| Cisco Systems | NX-OS | SSH | ICMP Echo · UDP Echo · UDP Jitter |
| Juniper | RPM | SNMP | ICMP Ping |

The field set varies **by probe**; the probe list varies **by platform**. Two independent tables, not
four bespoke forms.

**Method is derived, never asked.** Every row above has exactly one method, so the two large
`SNMP` / `SSH` cards at the top of today's drawer are removed outright and no replacement field is
shown. Method survives only as the filter on the Credential Profiles dropdown.

**Probe names are not normalised.** IOS XE says `Path Echo` where IOS XR says `ICMP Path Echo`;
Juniper says `ICMP Ping` where Cisco says `ICMP Echo`. Each platform's dropdown shows that platform's
own vocabulary, because the device CLI is what an engineer will check against.

## Entry points

| Entry | Behaviour |
|---|---|
| Settings → Discovery Settings → Discovery Profile → `Create Discovery Profile` → **WAN Link** | Monitor starts empty |
| A device's **WAN Link** tab → `Add WAN Link` | Deep-links to the same form with **Monitor pre-selected and locked**; back returns to the device |

## The Create form

Left rail: the existing category tree, `WAN Link` selected as a leaf.
Right column, top-right of the first row: a `Single | CSV` segmented control, matching the
`IP/Host | IP Range | CSV | CIDR` control the template already uses. **`CSV` is rendered disabled** —
bulk is deferred pending product facts.

### Block 1 — Profile

| Field | Notes |
|---|---|
| Discovery Profile Name * | Must be unique |

### Block 2 — Target

Replaces the template's `IP/Host`.

| Field | State |
|---|---|
| **Monitor** * | Searchable dropdown of monitored network devices — name, IP, vendor · OS. Locked when deep-linked from a device |
| Vendor | Auto-filled from the monitor, **disabled**. Values: Cisco Systems, Juniper |
| **Device OS** * | Auto-filled, **editable**. Cascades from Vendor: Cisco → IOS XE / IOS XR / NX-OS; Juniper → RPM |
| Credential Profiles * + `Create Credential Profile` | Filtered to the platform's protocol; prefilled with the monitor's own credential when it matches, empty and required when it does not |

### Block 3 — Discovery Parameters of WAN Link

| Field | Shown when |
|---|---|
| **WAN Probe** * | Always — options filtered by Device OS |
| Internet Service Provider * | Always |
| **Source Interface** | Always — a real dropdown populated from the monitor's interfaces |
| Source Router Location | Always |
| Destination IP * | Always |
| Destination Router Location | Always |
| **Destination Port** * | Only for `UDP Echo` and `UDP Jitter` — the sole conditional field on the form |
| Timeout | Always |

### Block 4 — IP SLA Operations Test Parameters

`Payload` · `Type of Service` · `Frequency *` · `Operation Timeout *` — unchanged from today's drawer.

### Block 5 — Notifications

`Notify` + `Bcc`, unchanged from the template.

### Reactive rules

- Blocks 3 and 4 are **greyed until a Monitor is chosen** — the probe list cannot exist before the OS does.
- Changing **Device OS** re-filters `WAN Probe`. If the selected probe is unavailable on the new OS it
  is cleared with an inline note, never silently swapped.
- Changing **Monitor** resets `Source Interface` and re-evaluates the credential prefill.
- `Destination Port` appears and becomes required when the probe is `UDP Echo` or `UDP Jitter`.

### Footer

`Save and Exit` · `Reset` · `Save and Run`.

**`Save and Schedule` is deliberately not offered.** A schedule would re-push identical operation
config on a timer, which achieves nothing. On-demand `Run` remains in the row's ⋮ menu for the case
where a push failed.

## The progress screen

Reuses the existing furniture: profile name as title, `Discovery Progress` bar, `Total Objects` /
`Discovered Objects` / `Failed Objects` tiles, `Search`, `Abort`, one card per object.

Device discovery narrates a single line (*Ping successful*). A WAN link push has four stages, each
failing differently, and the card narrates all four:

| Stage | Card line | Failure line |
|---|---|---|
| 1 | `Connecting to <monitor> over SSH` | `SSH authentication failed` |
| 2 | `Credential validated` | `Credential profile rejected by device` |
| 3 | `Creating IP SLA operation` | `IP SLA not supported` · `Operation id already in use` |
| 4 | `Waiting for first result…` → `First result received — RTT 2 ms` | `Destination unreachable` · `No result within timeout` |

A stage-3 failure is bad configuration; a stage-4 failure is a dead path. One generic "failed" hides
the difference.

## The provision grid

Reuses the furniture — title, export, search, `Discovered Objects N | Failed Objects N`, checkbox
column, inline-editable name with pencil, `N` / `P` / `U` legend, `Cancel` · `Add Selected Objects`.

Columns are WAN-Link-specific, because a link has no host and no interface count:

`☐` · **NAME** (badge + pencil) · **MONITOR** · **WAN PROBE** · **SOURCE INTERFACE** · **DESTINATION IP** · **ISP**

Default name is `<ISP> — <Destination IP>`, editable inline.

`OPERATION ID` was considered as a column and dropped — the IP SLA operation id stays internal.

### Badge meanings

| Badge | Means |
|---|---|
| **N** New | Operation created on the device and verified — not yet a monitored instance |
| **P** Provisioned | This exact link already exists as a monitored WAN link |
| **U** Unprovisioned | Operation is on the device but returned no data yet |

On confirm, instances are created and the user lands on the device's **WAN Link** tab.

## The Discovery Profile grid row

| Column | For a WAN Link profile |
|---|---|
| DISCOVERY PROFILE NAME | As entered |
| IP/HOST/IP RANGE/CIDR/CSV | The **monitor's IP** — the profile's target. Destination IP on hover |
| TYPE | A WAN Link icon; platform (`NX-OS`) as its tooltip. The `Type` filter gains a **WAN Link** option |
| DISCOVERED OBJECTS | `1` today; `N` once CSV lands |
| STATUS | `Last ran at …` / `Last ran failed at …`, unchanged |
| COLLECTORS | The monitor's collector, read-only |
| ACTIONS | `▶` Run, and ⋮ → Edit · Run · View Discovered Objects · Delete |

### Immutability after provisioning

**A profile that has been run and provisioned cannot be edited and cannot be re-run.** Its ⋮ menu
offers `View Discovered Objects` and `Delete` only; `▶` Run is disabled.

The reason is physical, not cosmetic: the profile's identity *is* an IP SLA operation living on a
router. Editing `Monitor`, `WAN Probe` or `Destination IP` would describe a different operation, and
re-running would leave the original still executing on the device with nothing watching it. To change
a provisioned link you delete it and create a new profile.

`Edit` and `Run` remain available while a profile has never run, or ran and failed.

## Out of scope

| Item | Why |
|---|---|
| **Bulk / CSV configuration** | Deferred. The segmented control's `CSV` slot is designed and rendered disabled; the field mapping awaits product facts. |
| **Monitor templates for `Path Echo` and `ICMP Path Jitter`** | Only NX-OS templates are being built (ICMP Echo, UDP Echo, UDP Jitter). Both path probes remain selectable in the form — the operation is valid — but nothing renders their per-hop data yet. Known gap. |
| **Juniper RPM monitor template** | Same reason. `ICMP Ping` is selectable; no template exists. |

## Assumptions recorded

1. Credential Profiles prefills with the monitor's own credential when its protocol matches the
   platform's method, and the dropdown is filtered to that protocol.
2. Collector is inherited from the monitor and never shown on the form — a WAN link cannot be polled
   by a collector that cannot reach its router.
3. `Groups`, `Tags` and `Collector Type / Collectors` are not shown on the WAN Link form, though the
   template offers them for other categories.
4. Path probes require no extra form fields; `Max Hops` was considered and dropped.
5. UDP Jitter requires no packet-count, packet-interval or codec fields.

## Decisions taken, and what was rejected

| Decision | Rejected alternative |
|---|---|
| WAN Link is its own category in the tree | A sub-node under Network; a standalone page outside Discovery Profiles |
| Monitor first, then Vendor, then Device OS | Deriving the platform silently; choosing platform from the tree |
| Vendor disabled, Device OS editable | Both locked; both free |
| Method derived and not shown | Keeping the `SNMP` / `SSH` cards |
| Declare → push → verify | Reading existing IP SLA ops off the device; doing both |
| Single only, CSV slot reserved | Building bulk now; dropping bulk entirely |
| In-device drawer retired | Keeping both entry points; a full-screen overlay |
| Provisioned profiles immutable | Locking three fields but allowing re-run; free editing with teardown on re-run |
