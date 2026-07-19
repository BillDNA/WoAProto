# Sprint — M2 · Metrics v2 + dashboard, phase 3

**Goal:** finish the dashboard's remaining screens — hex lenses, Cards tab, Units tab — off the trace
capture Phases 1–2 landed, with the balance-report persistence bug fixed first so measurement runs
are finally drillable. Closes out the metrics-v2 spec (distill-spec fires at sprint close).

**Orientation:** the spec is `specs/design_handoff_metrics_dashboard/` (SPEC.md §5 hex folds, §2
cards, §3 units, §8 small-n rule; TICKETS.md P2.3/P2.4/P3.1 are the slice definitions). All three UI
tickets touch `game/ui/charts.js` (file owner — build strictly in order) and read pure folds from
`game/report-model.js`. The card play-turn quartile fold already exists (report-model.js "Per-card
play-turn quartiles"); the hex folds do NOT — WOA-042 writes them. Unit capture exists
(`units:{dep,atk,abs,kill,die}` per envelope). Mount points are stable:
`#dashPaneCards` / `#dashPaneUnits` (dashboard.js). Standing gates every ticket: `node game/test.js`
green · `node dev/smoke.js` after UI changes · golden balance diff byte-identical (no printed-number
changes anywhere in this phase) · frozen paths untouched · `game/` stays zero-dependency classic
scripts.

## Tickets

### WOA-041 — balance-report --parallel runs persist a runs row but ZERO battle rows — battles-to-db doctrine violation
**Area:** dev-tools · **Status:** Todo · **Type:** bug · **Docs:** data-and-reports

Found during WOA-040's verify (2026-07-18, runner-reproduced): every `dev/balance-report.js` run in woa.db (runs 92/93/94, incl. the WOA-039 rules-1.2 n=60 measurement, run 92) has a runs-table row but ZERO persisted battles — `SELECT COUNT(*) FROM battles WHERE run_id IN (92,93,94)` = 0 — while every `balance.js` run persists all its battles (e.g. runs 88/89/95/96: 144 each). Likely the `--parallel` process-per-map workers never wire their battles to the parent run id (or never call insertBattle at all). Violates `D.A:battles-to-db` ("every battle from every source lands as a per-battle row") and means measurement runs — the most important runs — are invisible to the dashboard's A/B pickers. The WOA-039 baseline itself is safe (the committed markdown report is the record) but its battles can't be drilled into. Pulled first this sprint so the Phase-3 drill-downs (WOA-042/043/044) can see measurement runs.

**Acceptance criteria:**
- [ ] balance-report (both --parallel and serial) persists every battle row under its run id; a fresh small run shows battles == n*maps in woa.db
- [ ] Root cause noted (worker wiring vs never-persisted); existing empty runs 92-94 either backfilled or noted as unpersistable
- [ ] User confirms done

### WOA-042 — Hex lenses on the map drill-down (P2.3)
**Area:** dashboard · **Status:** Todo · **Depends on:** WOA-041 · **Type:** sonnet · **Docs:** specs/design_handoff_metrics_dashboard/SPEC.md, code-architecture

The map drill-down (WOA-040) shows tempo and VP but nothing spatial — you can't see WHERE a map's
fights happen, which hexes are dead, or which lane the winner rushed. SPEC §5 defines three per-hex
lenses folded from the trace's `h` fields. The folds don't exist yet in `report-model.js` (P1.3
stopped at battle-level folds) — this ticket writes them AND renders them.

**Acceptance criteria:**
- [ ] `report-model.js` gains per-hex folds from trace `h` fields per SPEC §5: occupancy (% of turns held), ownership flips per battle, kills on hex per battle — pure functions over rows (node + browser both consume); dead hex = <5% occupancy; avenue-of-attack = top-quartile flips
- [ ] Map drill-down (`game/ui/charts.js`) renders the three hex lenses: hexes via clip-path polygon; dead hexes hatched; avenue-of-attack marked with a nested-hex red ring (NOT css outline on a clipped element — renders broken); HQ hexes labeled; hover shows per-hex values
- [ ] Lenses follow the existing A|B|A/B toggle
- [ ] `node game/test.js` green (extend with a hex-fold shape assertion) · `node dev/smoke.js` green · golden balance diff byte-identical
- [ ] User confirms done *(rendered lenses are a visual check — route to human/vision verify)*

### WOA-043 — Cards tab (P2.4)
**Area:** dashboard · **Status:** Todo · **Depends on:** WOA-042 · **Type:** sonnet · **Docs:** specs/design_handoff_metrics_dashboard/SPEC.md, code-architecture

Card metrics exist in the Tables view but nothing answers "which cards are dead weight and when do
cards actually fire" visually — the pill nav's Cards pane is still a placeholder. Fills
`#dashPaneCards` (stable mount, dashboard.js) from existing folds only — no new capture. Depends on
WOA-042 for `charts.js` file-owner sequencing, not data.

**Acceptance criteria:**
- [ ] Sight quadrant (win% × 1st-sight%) with A/B ghost arrows, reusing the existing greedy label placer from charts.js
- [ ] Dead-card Simple% dumbbells with Noop ⚠ marker
- [ ] "When cards fire" quartile strips fed by the existing per-card play-turn quartile fold in `report-model.js` (fold reused as-is, not reimplemented)
- [ ] Small-n greying per SPEC §8 applies; tab follows the run-A/B pickers
- [ ] `node game/test.js` green · `node dev/smoke.js` green · golden balance diff byte-identical
- [ ] User confirms done *(rendered tab is a visual check — route to human/vision verify)*

### WOA-044 — Units tab (P3.1)
**Area:** dashboard · **Status:** Todo · **Depends on:** WOA-043 · **Type:** sonnet · **Docs:** specs/design_handoff_metrics_dashboard/SPEC.md, code-architecture

The last placeholder pane. Unit-role questions (is cavalry a rusher or a trader? does artillery
absorb or dish?) have per-unit capture since P1.1 (`units:{dep,atk,abs,kill,die}` in every trace
envelope, incl. `abs`) but no view. Fills `#dashPaneUnits` (stable mount, dashboard.js). Depends on
WOA-043 for `charts.js` file-owner sequencing. Closes the spec's last slice — distill-spec fires at
sprint close.

**Acceptance criteria:**
- [ ] Role map per SPEC §3 (axes: deploy timing × made-vs-absorbed), one point per unit type, A/B ghost arrows
- [ ] Breakthrough gauge, median-lifespan bars (turns alive after deploy), and exchange dots — all folded from the trace `units` block in `report-model.js` as pure functions (node + browser both consume)
- [ ] Small-n greying per SPEC §8 applies; tab follows the run-A/B pickers
- [ ] `node game/test.js` green (extend with a unit-fold shape assertion) · `node dev/smoke.js` green · golden balance diff byte-identical
- [ ] User confirms done *(rendered tab is a visual check — route to human/vision verify)*

## In Progress

_None._

## Finished

_None._

## Blockers

_None._

## Related

[[Roadmap]] · [[Backlog]] · [[Bugs]] · [[ClaudeNotes]] ·
[[specs/design_handoff_metrics_dashboard/SPEC|metrics-v2 spec]].

#sprint
