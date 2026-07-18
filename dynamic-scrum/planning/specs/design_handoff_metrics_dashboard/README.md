# Handoff: Metrics v2 + Balance Dashboard (War of Attrition)

## Overview
Two coupled pieces of work for the WarOfAttrition repo:

1. **Metric set v2** — normalization (rates not counts), win-path conditioning (attrition vs HQ slices), a per-turn battle **trace** that makes temporal metrics possible, per-hex and per-unit capture.
2. **A view-only Balance Dashboard** — a two-level chart UI (Overview → drill-down) that reads saved runs from `logs/woa.db` and always compares two runs (A = pinned baseline, B = candidate).

All decisions below were made with Bill in the design session on 2026-07-18. `SPEC.md` carries the full metric table and data shapes; `TICKETS.md` carries the phased ticket list.

## About the Design Files
`Metrics and Charts.dc.html` is a **design reference created in HTML** — a canvas of design options and screen mockups, not production code. The task is to **recreate the agreed designs inside the existing `game/` environment**: plain classic scripts, shared globals, hand-ordered script-tag chain, zero dependencies, inline-SVG-by-string-concat charts (see `game/ui/charts.js` for the established charting idiom). No frameworks, no bundler, no build step.

The design file is organized in numbered turns (newest at top). **What was adopted:**
- Turn 1: `1a` metric spec (adopted — SPEC.md is the authoritative transcription), `1b` trace shape (adopted), `1c` triage band board (adopted), `1e` deploy histogram + settle curve (adopted), `1f` per-map A/B delta (adopted). `1d` and `1g` were superseded by later turns.
- Turn 2: `2a` hex heatmap lenses (adopted), `2c` unit role map + breakthrough gauge (adopted; supersedes `1g`). `2b` superseded by `3a`.
- Turn 3: `3a` tempo lanes (adopted — supersedes `1d`/`2b` as the per-map tempo view).
- Turn 4: `4a` Overview screen, `4b` Map drill-down screen (adopted, with the view-only header and the A|B|A/B toggle).
- Turn 5: `5a` Cards tab, `5b` Units tab (adopted).

## Fidelity
**High-fidelity for layout, palette, and chart idioms** — colors, typography, and chart geometry follow the game's existing parchment system and should be matched. **All run-B numbers in the mockups are synthesized** — every real number comes from woa.db at runtime. Chart minis inside the turn-4/5 screen mockups are simplified; the full-size versions in turns 1–3 are the fidelity reference for each chart.

## Environment & constraints (from CLAUDE.md — binding)
- `game/` stays plain classic scripts + shared globals; zip-and-double-click must keep working. The dashboard is **view-only** and reads woa.db **via `node game/server.js`** (the only path with reads/writes); under `file://` the charts tab shows the current in-memory run only (today's behavior) with a "start the server for run history" note.
- **One implementation per fact**: every new derivation is a fold in `game/report-model.js`. `balanceAdd` scalars become derived-from-trace, not separately counted (decision #2: do the refactor).
- **Golden balance diff**: Phase 1 (capture) must be byte-identical on aggregates. Phase 2 (re-baseline) legitimately changes numbers → ships as **rules-1.2**, atomically with rubric + test-pin updates.
- Frozen paths: `game/engine.js`, `game/balance.js`, `game/test.js`, `dev/balance-report.js`, `logs/reports/...` layout, and balance-report's `SAVED:`/`BEST_MAP:` stdout lines.
- Reports **stay markdown** (decision #6). The dashboard never parses reports; it reads the DB.

## Screens / Views
### Screen 1 — Overview (mockup `4a`)
Landing view after selecting runs. Dark header bar (`#2c2517`, parchment text): title, **run A picker** (baseline, pinned), "vs", **run B picker**, "view-only · reads saved runs from woa.db" caption. Pill nav: Overview | Maps | Cards | Units | Tables (existing Tables view unchanged). Right of nav: **temperature selector (T0/T1/T2)** — re-renders all band shading to the selected tier.

- **Verdict banner** (rust tint `rgba(158,43,37,.07)`): count of T0 breaches + named breaches; each breach is a link that opens the view explaining it (Drag → Maps filtered to attrition endings; a map score → that map's drill-down).
- **Left column — triage band board** (design `1c`): one bullet-chart row per scored metric (8 rows) + guards below the fold. Track with nested band shading T2 `#ded0ab` / T1 `#d3c294` / T0 `#bfa96e`; run A = 12px hollow circle (2px `#3a2f1d` border, parchment fill), run B = filled circle (`#3a2f1d` in-band, `#9e2b25` breached); breached rows get a 1.5px `#9e2b25` outline around the track and bold red label. Right cell: `A → B` values in monospace 11px.
- **Right column — balance score by map** (design `1f`): dumbbell per map on a 0–20 scale, sorted by run-B score; connector colored `#9c5449` regress / `#97753f` improve; **click a row → Screen 2**. Below: two pacing minis (deploy-interleave histogram, settle curves) from design `1e`.

### Screen 2 — Map drill-down (mockup `4b`)
Breadcrumb map-switcher (`‹ Frontier · The Narrows · The Void ›`) under the Maps pill. **A | B | A/B segmented toggle** (default B): single-run views by default; A/B overlays run A as a ghost outline. Right: the map's balance score `A → B`.

- **Tempo lanes** (design `3a`, full-fidelity reference in turn 3): one lane per action type (deploy `#b6925a`, attack `#9c5449`, swap `#54708e`, march `#9a9180`), each lane = avg plays-per-turn per turn-octile on its **own** scale (never 100%-stacked — that was explicitly rejected), lane axis label "max N/turn", 1.5px `#b9a878` baseline. |VP-diff| sparkline track above the lanes. Optional: unit-type split stacked **inside the deploy lane only**.
- **This-map band board**: `1c` rows filtered to the map.
- **Hex lenses** (design `2a`): three side-by-side hex maps (occupancy / ownership flips / kills), hexes drawn with `clip-path:polygon(25% 0,75% 0,100% 50%,75% 100%,25% 100%,0 50%)`, sequential brass ramp `#e3d6b4 → #d3b784 → #b6925a → #97753f → #77582e → #59421f → #3a2f1d`. Dead hexes (<5% occupancy): hatched fill `repeating-linear-gradient(45deg,#dccfae 0,#dccfae 3px,#b09b6d 3px,#b09b6d 4.5px)`. Avenue-of-attack (top-quartile flips): nested-hex red ring (outer hex `#9e2b25`, inner hex inset ~3px with the value fill) — **never CSS outline on a clipped element** (renders broken). HQ hexes labeled. Lenses follow the A|B toggle; hex hover shows numbers.
- **Settle curve** for this map (design `1e` idiom: A dashed `#5a4c33`, B solid `#77582e`).

### Cards tab (mockup `5a`)
- **Sight quadrant** (evolves the existing charts.js card quadrant): x = AvgSeen (instant → hoarded), y = 1stSight%; top-left corner labeled OP WATCHLIST in red caps. A/B mode: ghost dot + arrow per card. Use charts.js's greedy label placer — the mockup's hand-placed labels showed collisions are the failure mode.
- **Dead-card check**: Simple% A→B dumbbells sorted by B; Noop% > 2 stamps a red ⚠ on the row.
- **When cards fire** (new, trace-derived): per card, a quartile bar (middle 50% of play turns, brass ramp by median) + 3px ink median tick over normalized battle time.

### Units tab (mockup `5b`)
- **Role map** (design `2c`): x = median deploy timing, y = attacks-made vs attacks-absorbed balance (top = "Leading the charge", bottom = "Supporting role"); dot size = battles fielded; A/B ghost + dashed arrow.
- **Breakthrough point**: attacks-absorbed/battle dumbbells (the "who gets attacked" answer — deliberately NOT an axis on the role map).
- **Lifespan** (new): median turns alive after deploy, bars.
- **Exchange** (new): kills per death, dot on a line with a 1.0 midline.

## Interactions & Behavior
- Run pickers list runs from the new `runs` table; A defaults to the run flagged `baseline` for the current rules version.
- Temperature selector: T1/T2 widen each closed band edge by 20%/40% of band width (bands stored per metric; see SPEC).
- **Small-n guard** (decision #5): any conditioned metric with slice-n < 40 renders greyed (50% opacity), value replaced by `value (n=N)`, excluded from the verdict banner.
- All navigation is filter-passing, no page loads: overview breach → tab + pre-applied filter; map row → drill-down for that map.
- Tooltips: reuse the existing `.chtip` pattern (`data-tip` JSON + shared fixed tooltip div).

## State Management
Extend the existing `DASH` global: `{ runA, runB, view:'overview'|'maps'|'cards'|'units'|'tables', mapFocus, abMode:'A'|'B'|'AB', temperature:'T0'|'T1'|'T2', runs:[…] }`. Chart renderers are pure functions of (runA-fold, runB-fold, bands, temperature) — same pattern as today's `renderCharts(el)`.

## Design Tokens (from game/style.css + ui/charts.js — already in the codebase)
- Surfaces: `--parch #e8dcc0`, `--parch2 #dccfae`, `--parch3 #cfc09a`; dark chrome `#2c2517`
- Ink: `#3a2f1d`; soft `#5a4c33`; muted `#75643f`; grid `#d8caa2`; axis `#b9a878`
- Sequential ramp: `#b6925a #97753f #77582e #59421f #3a2f1d`; band shading `#ded0ab / #d3c294 / #bfa96e`
- Poles: red `#9e2b25` (regress/breach), soft red `#9c5449`, blue `#54708e` / `#2b5d97`; HQ copper `#a0522a`, attrition river `#3e7dba`
- Type: Georgia serif everywhere; monospace (`ui-monospace, Menlo`) for values; 11–13px chart text
- Chart idiom: inline SVG by string concat, direct labels via the greedy placer, series identity on marks never on text color

## Assets
None — all charts are code-drawn. Hex clip-path polygon above.

## Files
- `Metrics and Charts.dc.html` — the design canvas (open in a browser; turns numbered newest-first; option ids referenced throughout this README)
- `SPEC.md` — metric spec v2: full table, trace/per-hex/per-unit data shapes, band model, run identity
- `TICKETS.md` — phased ticket list (P1 capture + overview, P2 map drill-down, P3 units), with golden-diff and rules-version notes per ticket
