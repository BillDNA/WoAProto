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

## In Progress

_None._

## Finished

- **WOA-044 — Units tab (P3.1)** (2026-07-19) — Units tab live in #dashPaneUnits: role map (deploy timing x made-vs-absorbed, one identity colour per unit, A-ghost->B-solid), breakthrough dumbbells, lifespan bars (new dieT capture — `D.D:unit-lifespan-diet-capture`; FIFO pairing + right-censoring; legacy runs grey honestly), exchange dots; fleet-240 small-n with (n=N) everywhere. Engine capture extension golden-diff-proven byte-identical (runner re-verified); suites green (+~30 test assertions); code-architecture fold-list de-enumerated (fold-in). Spec's last slice — distill-spec due at sprint close. cost: 313,192 tok / 26.7 min / 116 calls

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
