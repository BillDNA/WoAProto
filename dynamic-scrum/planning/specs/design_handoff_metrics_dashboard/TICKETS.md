# Tickets — Metrics v2 + Balance Dashboard

Phased per the agreed plan. Each ticket is sized to be completed directly (DynamicScrum: tickets are
actionable; adversarial review is the net). Golden-diff status noted per ticket.

## Phase 1 — trace capture + Overview (no printed-number changes)

**P1.1 — Per-play trace capture** (`game/engine/04-battle.js`, `06-sim.js`)
Extend `playLog` entries with `{a, h, k, ld, u}` per SPEC §4; fold the `units` block at battle end.
Gate: `node game/test.js` green; **golden balance diff byte-identical** (capture adds fields, changes
no aggregate). Extend test.js with a trace-shape assertion.

**P1.2 — Trace rows into woa.db + runs table** (`game/server.js`, `Engine.hooks.onBattleEnd`)
Per-battle row gains the trace JSON; new `runs` table per SPEC §7; battles reference run id;
`baseline` pin (one per rules version). balance.js and the dashboard Run loop stamp run identity.

**P1.3 — report-model.js: bands as data + trace folds**
Add per-metric `{lo, hi, weight, feedsScore}` band table (SOT comment pointing at grading-rubrics)
+ T1/T2 widening rule; add trace folds: deploy interleave, first contact, settle point, per-turn
action-octile lanes, |VP-diff| track, card play-turn quartiles. Pure functions over rows — node and
browser both consume. No printed numbers change yet.

**P1.4 — Dashboard shell: view-only, run pickers, tabs** (`game/ui/dashboard.js`, `boot.js`, `index.html`)
Remove Run/Save from the charts context (Tables view keeps today's run loop untouched); header run-A/B
pickers reading the runs table via server fetch; pill nav Overview|Maps|Cards|Units|Tables;
temperature selector; file:// fallback = current in-memory run only + "start the server" note.

**P1.5 — Overview screen** (`game/ui/charts.js`)
Triage band board (design 1c): bullet rows, nested T-band shading, A hollow / B filled dots, breach
styling, small-n greying (SPEC §8). Map dumbbells (1f) sorted by B, click → map drill-down. Verdict
banner with breach links. Pacing minis (1e).

## Phase 2 — map drill-down + cards (P2.1 is the rules-1.2 bump)

**P2.1 — Metric re-baseline (rules-1.2, atomic)** (`report-model.js`, `balance.js`, rubric, test pins)
Attack/swap → % of actions; Tie%/Drag → attrition-only; Reserves → HQ-only + turn-normalized;
re-measure Core Six baselines at n=60 hard; update grading-rubrics bands + shipped-history baselines
+ test pins in ONE commit. Golden diff intentionally breaks → version bump justifies it.

**P2.2 — Map drill-down screen** (charts.js)
Breadcrumb map switcher; A|B|A/B toggle (default B; A/B = ghost overlay); tempo lanes (3a — absolute
per-lane scales, never 100%-stacked); |VP-diff| track; per-map band board; settle curve.

**P2.3 — Hex lenses** (charts.js)
Occupancy / flips / kills hex maps from the trace `h` folds (SPEC §5). Hexes via clip-path polygon;
dead hexes hatched; avenue-of-attack = nested-hex red ring (NOT css outline on a clipped element —
renders broken); HQ labels; hover values; lenses follow the A/B toggle.

**P2.4 — Cards tab** (charts.js)
Sight quadrant with A/B ghost arrows (reuse the greedy label placer); dead-card Simple% dumbbells
with Noop ⚠; "when cards fire" quartile strips from P1.3's fold.

## Phase 3 — units

**P3.1 — Units tab** (charts.js)
Role map (2c axes: deploy timing × made-vs-absorbed), breakthrough gauge, lifespan bars, exchange
dots — all from the trace `units` block (incl. `abs`, captured in P1.1). A/B ghost arrows.

## Standing gates (every ticket)
`node game/test.js` green · `node dev/smoke.js` after UI changes · frozen paths untouched
(`engine.js`, `balance.js`, `test.js`, `dev/balance-report.js`, report dirs, `SAVED:`/`BEST_MAP:`
stdout lines) · reports stay markdown · `game/` stays zero-dependency classic scripts.
