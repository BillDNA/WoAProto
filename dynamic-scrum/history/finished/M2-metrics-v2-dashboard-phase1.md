# M2 · Metrics v2 + dashboard, phase 1 — closed 2026-07-18

**Goal:** the loop measures on the adopted 17-card deck, every battle leaves a per-play trace, and the
data is *seen* — a view-only A/B dashboard Overview reading saved runs from `logs/woa.db`.

Planned and run same-day (2026-07-18) from the metrics-v2 design handoff
(`dynamic-scrum/planning/specs/design_handoff_metrics_dashboard/`; shape decision
`D.D:metrics-v2-phased-adopt`). Ran fully autonomously — **6/6 closed, zero bounces, zero
regressions**; golden balance diff byte-identical at every capture/model gate. Run report:
`dynamic-scrum/planning/sprint-runs/2026-07-18-M2-metrics-v2-phase1.md`.

## Tickets

- **WOA-030 — Execute the 17-card adopt** — flip live (`cavsplit17-raid-paid` active), card tests
  deck-decoupled (`fixtureCard`), rubric + CLAUDE.md baselines re-stamped, skill premium re-measured
  (h>e 76%, sanity 46% thin), 0-kill confirms 2% n=100/map. Found the browser applied-deck override
  (→ WOA-036, Bugs).
- **WOA-031 — Per-play trace capture** — `playLog` gains `a/h/k/ld/u`, `st.unitMetrics`
  `{dep,atk,abs,kill,die}` per type; suite 237→1124 ok; golden diff byte-identical.
- **WOA-032 — Trace rows + runs table** — SPEC §7 run identity (additive migration), trace JSON on
  battle rows, one baseline pin per rules version, `Engine.ACTIVE_DECK` the deck-identity read.
- **WOA-033 — Bands as data + trace folds** — `BANDS` backs `balanceScore` (200k-sample equivalence),
  `bands(metric, T)` widening (`D.D:half-open-band-widening`), six pure folds over the trace envelope
  (vpDiffTrack null → WOA-037).
- **WOA-034 — Dashboard shell** — view-only A/B run pickers (`GET /api/runs`), 5-pill nav (Tables =
  old dashboard intact), T0/T1/T2 selector, `file://` fallback; old single-run Charts tab retired.
- **WOA-035 — Overview screen** — 1c triage band board (small-n greying; Control% honest n/a →
  WOA-038), 1f map dumbbells with click→Maps focus, verdict banner with breach links, 1e pacing
  minis; `GET /api/battles` + `foldBattles`; vision-verified on real runs at T0/T2.

## Carried out / forward

- Follow-ons minted: **WOA-036** (Bugs — browser deck override, Bill decides), **WOA-037** (fsTimeline
  capture), **WOA-038** (control-at-end capture) — 037/038 are natural P2 riders.
- Phase 2/3 of the spec (rules-1.2 re-baseline, map drill-down, cards, units) stay in its TICKETS.md
  for next sprint-planning; the spec remains active (not distilled — feature part-shipped).
- Held for Bill: Goals.md 17-card annotation; progressive-tier-reveal design call; server restart.
