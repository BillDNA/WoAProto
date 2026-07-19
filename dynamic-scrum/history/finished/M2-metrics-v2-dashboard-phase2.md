# M2 · Metrics v2 + dashboard, phase 2 — closed 2026-07-18

**Goal:** complete the capture the dashboard still greys out (fsTimeline, control-at-end), then land
the rules-1.2 metric re-baseline atomically and ship the map drill-down — every Phase-1 grey path
turns real.

**Dates:** planned + ran autonomously 2026-07-18 (5/5, zero bounces; run report
`planning/sprint-runs/2026-07-18-M2-metrics-v2-phase2.md`).

## Tickets

- **WOA-037 — fsTimeline → vpDiffTrack wiring** — premise re-scoped at dispatch (engine capture +
  timeline writes pre-existed); `GET /api/battles` joins the timeline table, `envelopeFromRow` folds
  `row.fs`; |VP-diff| real on the DB path. Golden diff held.
- **WOA-038 — control-at-end capture** — `battles` grew `hexes_red`/`hexes_blue` (NULL on legacy
  rows); `foldBattles` derives Control%, fold matched the live agg exactly (85%==85%). Golden diff
  held.
- **WOA-039 — rules-1.2 metric re-baseline (opus)** — Atk%/Swp% shares of actions, Tie%/Drag
  attrition-sliced, Reserves HQ-sliced; fresh Core Six n=60/map=360 setup-stamped; rubric +
  CLAUDE.md supersession + 16 test pins atomic; the one intentional golden-diff break. Two
  runner-adopted forks flagged (`D.D:shares-are-guards-not-scored`). The Narrows breaches at T0.
- **WOA-040 — map drill-down screen** — breadcrumb, A|B|A/B ghost toggle, absolute-scale tempo
  lanes, |VP-diff| track with honest grey, per-map band board (scope='map'), settle curve;
  vision-verified live. Found + minted **WOA-041** (balance-report runs persist zero battles).
- **WOA-036 — browser deck-override bug** — `custom-deck.js` ships as a no-op, active deck finally
  plays in the browser, global override badge with reset, deck-editor 16–17 band
  (`D.D:deck-total-band-16-17`).

## Done-when

Met: every metric maps to a lever and shows in the dashboard; two saved runs comparable A/B at a
selectable temperature; verdicts name their levers; Phase-1 grey paths (|VP-diff|, Control%) real.
Phase 3 (P2.3 hex lenses, P2.4 Cards, P3.1 Units) stays in the spec for the next pull.

#finished
