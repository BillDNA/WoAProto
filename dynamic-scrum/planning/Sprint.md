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

## In Progress

_None._

## Finished

- **WOA-035 — Overview screen: band board, map dumbbells, verdict, pacing minis (P1.5)** (2026-07-18) — Overview live on real data (fresh trace-carrying runs 73/74, n=270 each): 1c band board (8 scored + guard, A hollow/B filled, small-n greying incl. honest Control% n/a → WOA-038), 1f dumbbells sorted worst-first with working click→Maps-stub focus, verdict banner with breach links (breach path proven via forced-breach probe), 1e pacing minis with real numbers; /api/battles route + foldBattles agg fold added (db tests 71→97, smoke +10). Runner vision-verified all 3 screenshots (T0/T2 widening visible, click-through works). Design call flagged for Bill: progressive tier reveal (T0 draws only T0 band) vs the mockup's static triptych. cost: 361,356 tok / 37.1 min / 110 calls

- **WOA-034 — Dashboard shell: view-only, run pickers, tabs (P1.4)** (2026-07-18) — Shell live: GET /api/runs (+ listRuns in dev/db.js, +5 tests), A/B header pickers with baseline-else-latest default, 5-pill nav (Tables = old dashboard verbatim, Run/Save hidden elsewhere), T0/T1/T2 selector in extended DASH, file:// graceful fallback (smoke-asserted). Runner vision-verified both screenshots (chrome matches 4a; Tables intact with live 20-battle run — which visibly plays the applied deck, WOA-036 confirmed on-screen). Old single-run Charts tab retired per spec pill nav; charts.js primitives kept dormant for 035+. Label/pin UI skipped (declared; setBaseline ready). cost: 232,206 tok / 54.5 min / 89 calls

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
