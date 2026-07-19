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

- **WOA-043 — Cards tab (P2.4)** (2026-07-19) — Cards tab live in #dashPaneCards: sight quadrant (win% = SPEC §2 HQ x non-simple slice via new cardHqWinSlice; pooled Win% kept off-axis per WOA-019) with A-ghost->B-solid arrows + chMakePlacer labels; dead-card Simple% dumbbells with independent Noop ⚠; fire-time quartile strips reusing cardPlayTurnQuartiles as-is; fleet-240 small-n greying (DOM-verified 18/18+24/24). Runner vision-verified on 114v115 + 91v106; suites green; golden diff runner-re-verified. Known minor: chMakePlacer label collisions in the ~50% cluster (accepted, spec README). cost: 295,607 tok / 25.1 min / 99 calls

- **WOA-042 — Hex lenses on the map drill-down (P2.3)** (2026-07-19) — hexLenses/foldHexLenses pure folds (SPEC §5 thresholds as data) + three SVG hex lenses on the drill-down reusing board.js hex helpers (`D.D:hex-lenses-svg-not-clippath`); dead-hatch, nested-ring avenues, HQ stars, hover A->B values, A|B|A/B ghost — all runner-vision-verified from 6 saved screenshots; suites green, golden diff runner-re-verified byte-identical both modes. cost: 270,533 tok / 32.5 min / 94 calls

- **WOA-041 — balance-report --parallel runs persist a runs row but ZERO battle rows — battles-to-db doctrine violation** (2026-07-19) — --parallel workers ship slimBattleState(st) per battle via their stdout envelope; parent = single woa.db writer under the run id (`D.D:parallel-battles-via-parent-writer`). Proof: runs 106 (parallel) / 107 (serial) both 24==4x6 battles, bit-identical checksums + byte-identical markdown; root cause = deliberate pre-doctrine skip; runs 92-94 annotated unpersistable in runs.notes; follow-on WOA-045 (run identity columns). cost: 99,483 tok / 8.8 min / 22 calls

_None._

## Blockers

_None._

## Related

[[Roadmap]] · [[Backlog]] · [[Bugs]] · [[ClaudeNotes]] ·
[[specs/design_handoff_metrics_dashboard/SPEC|metrics-v2 spec]].

#sprint
