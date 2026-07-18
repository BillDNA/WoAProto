# Sprint — M2 · Metrics v2 + dashboard, phase 1

**Goal:** the loop measures on the adopted 17-card deck, every battle leaves a per-play trace, and the
data is *seen* — a view-only A/B dashboard Overview reading saved runs from `logs/woa.db`.

**Orientation:** this sprint executes the adopted deck flip (WOA-030, first — so every later baseline
and golden diff is taken on the adopted deck) and then Phase 1 of the **metrics-v2 + dashboard spec**
(`dynamic-scrum/planning/specs/design_handoff_metrics_dashboard/` — SPEC.md is the metric SOT,
README.md the screen/design SOT, `Metrics and Charts.dc.html` the visual reference). Phase 1 is
**golden-diff-safe**: trace capture + folds + dashboard shell + Overview, **no printed-number
changes**. The re-baseline (rules-1.2) and drill-down/cards/units screens are Phase 2/3 — next
sprint, not this one. Standing gates on every ticket: `node game/test.js` green · `node dev/smoke.js`
after UI changes · frozen paths untouched (`game/engine.js`, `game/balance.js`, `game/test.js`,
`dev/balance-report.js`, report dirs, `SAVED:`/`BEST_MAP:` stdout lines) · reports stay markdown ·
`game/` stays zero-dependency classic scripts.

**Done when:** the suite is green on the adopted deck with baselines re-stamped; a balance run (CLI or
dashboard) lands per-battle trace rows + a run-identity row in `woa.db`; and the dashboard Overview
renders the triage band board + per-map dumbbells for any two saved runs A/B at a selectable
temperature — with aggregates byte-identical to pre-sprint (golden diff holds all sprint).

## Tickets

### WOA-034 — Dashboard shell: view-only, run pickers, tabs (P1.4)
**Area:** game-ui · **Status:** Todo · **Type:** sonnet · **Depends on:** WOA-032 · **Docs:** specs/design_handoff_metrics_dashboard, code-architecture

The chrome the Overview lands in (README *Screens*): dark header, run-A/B pickers over the `runs`
table, pill nav, temperature selector — charts become **view-only** (the Tables view keeps today's
run loop untouched). Files: `game/ui/dashboard.js`, `game/ui/boot.js`, `game/index.html`.

**Acceptance criteria:**
- [ ] Header run-A/B pickers list runs from the `runs` table via server fetch; A defaults to the run flagged `baseline` for the current rules version
- [ ] Pill nav Overview | Maps | Cards | Units | Tables; Tables is today's dashboard unchanged (run loop + Save intact there); Run/Save removed from the charts context
- [ ] Temperature selector T0/T1/T2 wired into extended `DASH` state (`{runA, runB, view, mapFocus, abMode, temperature, runs}` per README *State Management*)
- [ ] Under `file://` (no server): charts tab shows the current in-memory run only + a "start the server for run history" note — zip-and-double-click keeps working
- [ ] `node dev/smoke.js` + `node game/test.js` green; **visual check is human/vision** — header, pills, pickers render per the design reference (mockup 4a chrome)
- [ ] User confirms done

### WOA-035 — Overview screen: band board, map dumbbells, verdict, pacing minis (P1.5)
**Area:** game-ui · **Status:** Todo · **Type:** sonnet · **Depends on:** WOA-033, WOA-034 · **Docs:** specs/design_handoff_metrics_dashboard

The landing view (README *Screen 1*, mockup 4a; full-fidelity chart references: designs 1c/1f/1e in
the design canvas). All numbers from woa.db via WOA-033's folds; charts in the established
`game/ui/charts.js` idiom (inline SVG by string concat, greedy label placer, `.chtip` tooltips).

**Acceptance criteria:**
- [ ] Triage band board (design 1c): one bullet row per scored metric, nested T-band shading that re-renders with the temperature selector, run A hollow / run B filled dots, breach styling (red outline + bold label), `A → B` monospace values; small-n rule per SPEC §8 (slice-n < 40/map → greyed, `value (n=N)`, excluded from verdict)
- [ ] Balance-score-by-map dumbbells (design 1f) on a 0–20 scale sorted by run-B, connector colored regress/improve; row click sets `DASH.mapFocus` and navigates to the Maps pill (a stub view until P2.2 builds the drill-down — next sprint)
- [ ] Verdict banner: count of T0-tier breaches at the selected temperature + named breach links that navigate to the explaining view/filter
- [ ] Pacing minis (design 1e): deploy-interleave histogram + settle curves (A dashed / B solid)
- [ ] `node dev/smoke.js` green; **visual check is human/vision** — layout/palette match the design reference per README *Fidelity* (mockup numbers are synthesized; real numbers from the DB)
- [ ] User confirms done

## In Progress

_None._

## Finished

- **WOA-033 — report-model.js: bands as data + trace folds (P1.3)** (2026-07-18) — BANDS table (8 scored + 1 guard, {lo,hi,weight,feedsScore}) unified INTO balanceScore (200k-sample equivalence + golden diff byte-identical, sha-matched); bands(metric,T0|T1|T2) widening live (half-open rule → D.D:half-open-band-widening); 6 folds pure over the SPEC §4 envelope, runner live-smoked on a real DB row; suite 1124→1150 ok. vpDiffTrack needs env.fs — engine doesn't capture fsTimeline yet → WOA-037 (Backlog, pre-P2.2); fact-fix for 035: table is `timeline`, not `battle_timeline`. cost: 170,957 tok / 22.5 min / 40 calls

- **WOA-032 — Trace rows + `runs` table in woa.db (P1.2)** (2026-07-18) — Runs table extended per SPEC §7 (additive ALTERs, old rows survive); battle rows carry trace JSON (~4KB/battle, over spec's 1.3KB estimate — accepted); baseline pin-twice uniqueness proven in dev/db.test.js (66 ok); Engine.ACTIVE_DECK exported as the one deck-identity read (WOA-036-safe); balance.js + dashboard Run loop stamp identity (runner live-verified: run 67, deck=cavsplit17-raid-paid, trace on rows); charts side untouched. matchup mode deliberately not persisted (not a §7 run). No label/pin UI yet → WOA-034. cost: 219,165 tok / 17.9 min / 78 calls

- **WOA-031 — Per-play trace capture in the engine (P1.1)** (2026-07-18) — Trace capture live: playLog entries carry a/h/k/ld/u (attack sticky vs mixed plays), st.unitMetrics {dep,atk,abs,kill,die} per type folded incrementally; suite 237→1124 ok; golden diff independently verified byte-identical (1232 vs 1239 reports); runner live-exercised a fresh battle (32/34 tagged, kills==die). Fidelity note for folds: mixed deploy+attack plays tag 'attack' — deploy timing reads unitMetrics.dep, not the a-stream. cost: 182,680 tok / 18.8 min / 72 calls

- **WOA-030 — Execute the 17-card adopt (`D.D:seventeen-card-adopt`)** (2026-07-18) — 17-card adopt executed: tests deck-decoupled (fixtureCard), cavsplit17-raid-paid active, rubric+CLAUDE.md baselines re-stamped (superseded chains kept), skill premium re-measured (n>e 69 / h>e 76 / h>n 56 / sanity 46, all n=576), 0-kill confirms 2% n=100/map; matchup leg added to generate-reports; manifest.js regenerated (was stale, -5 decks); browser applied-deck override found → WOA-036 (Bill decides); Goals.md annotation held for Bill. cost: 298,190 tok / 48.4 min / 182 calls

_None._

## Blockers

_None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]] · spec: `specs/design_handoff_metrics_dashboard/`.

#sprint
