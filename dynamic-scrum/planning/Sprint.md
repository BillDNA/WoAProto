# Sprint — M2 · Metrics v2 + dashboard, phase 2

**Goal:** complete the capture the dashboard still greys out (fsTimeline, control-at-end), then land
the rules-1.2 metric re-baseline atomically and ship the map drill-down — every Phase-1 grey path
turns real.

_Orientation: Phase 2 of the metrics-v2 spec (`specs/design_handoff_metrics_dashboard/` — SPEC.md +
TICKETS.md P2.1–P2.2; Phase 1 shipped 2026-07-18, [[M2-metrics-v2-dashboard-phase1]]). Build order
matters: the two capture riders (WOA-037/038) are golden-diff-safe and land FIRST so the WOA-039
re-baseline measures on complete capture; WOA-040's |VP-diff| track needs WOA-037's timeline rows and
WOA-039's 1.2 bands. WOA-039 is the one ticket where the golden diff intentionally breaks — the
rules-version bump to 1.2 justifies it, atomic with rubric + test pins. WOA-036 (browser
deck-override bug, shape decided 2026-07-18: no-op the checked-in custom-deck.js + override badge)
rides along, independent of the other four. P2.3 (hex lenses) / P2.4 (Cards) / P3.1 (Units) stay in
the spec for the next pull._

## Tickets

## In Progress

_None._

## Finished

- **WOA-036 — Browser plays a stray "applied deck" override, never the active-flagged deck** (2026-07-19) — Shipped both halves of the decided shape: custom-deck.js is a commented no-op (drop-in contract preserved; server null-sync writes the same shape — no server change needed), fresh loads play cavsplit17-raid-paid (17 orders visible, runner vision-verified), global "custom deck applied: <name> [reset]" badge with working round-trip; deck-editor total check → 16-17 band (D.D:deck-total-band-16-17) with a full flip/no-flip enumeration of every hardcoded 16; smoke retargeted to invariants not numbers. Suites 1179/104/smoke green; golden diff byte-identical; file:// verified via headless Chrome. README's 3 stale 16-mentions flagged as follow-up, not crept. cost: 211,423 tok / 20.4m / 109 calls

- **WOA-040 — Map drill-down screen: tempo lanes, |VP-diff| track, per-map bands, settle curve** (2026-07-19) — Map drill-down live: breadcrumb + wraparound, A|B|A/B toggle (lanes+track only, board/settle always both-runs), tempo lanes at absolute per-lane scales, |VP-diff| track with honest grey on fs-less runs, per-map band board via ovBandRowHtml scope='map', settle curve via extracted chSettleSvg; BATTLE_CACHE/dashLoadBattleRows now the one shared A/B fetch. +24 smoke assertions; suites 1179/104/smoke green; golden diff byte-identical vs 1.2 baseline; runner vision-verified 5 screenshots (real breach renders red). Escalation reproduced + minted WOA-041 (balance-report runs persist zero battles). cost: 326,711 tok / 24.1m / 104 calls

- **WOA-039 — Rules-1.2 metric re-baseline: rates not counts, win-path conditioning — atomic bump** (2026-07-19) — Rules 1.2 shipped atomically: shares replace counts (Atk% 19 / Swp% 16 of actions), Tie%/Drag attrition-sliced (13% / 2.4, bands 0-18 / 0-3.0), Reserves HQ-only small-n; fresh Core Six n=60/map=360 measured + setup-stamped (report logs/reports/balance/1.2/); rubric + CLAUDE.md supersession + 16 new test pins in one changeset; suites 1179/104/smoke/claude-plays green. TWO runner-adopted forks flagged for Bill (D.D:shares-are-guards-not-scored): shares are guards not scored despite SPEC ★; reserves stock-share not ÷turns. The Narrows breaches at T0 (Tie 26, Drag 3.4). cost: 286,898 tok / 33.2m / 90 calls

- **WOA-038 — Capture board-control at battle end so Control% can score on the dashboard** (2026-07-18) — battles grew hexes_red/hexes_blue (ALTER precedent, NULL on legacy rows); insertBattle tallies via hexesHeld(st) mirroring balanceAdd; foldBattles derives controlGames/controlWins with the null-guard + tie gate — fold matched the live agg exactly (85%/85% on the same run); Overview Control% now a real n. Suites 1163/104/smoke green; golden diff byte-identical vs pre-sprint baseline. cost: 148,561 tok / 10.9m / 57 calls

- **WOA-037 — Engine captures st.fsTimeline (per-turn field scores) — feeds timeline table + vpDiffTrack** (2026-07-18) — Premise was stale (engine capture + timeline writes already shipped pre-Phase-1); re-scoped at dispatch to the real gap — GET /api/battles now joins the timeline table (one grouped query, fail-open) and envelopeFromRow folds row.fs into the envelope, so vpDiffTrack is real on the DB path; +6 test.js assertions (fsTimeline shape + row.fs fold); golden diff byte-identical; live-verified 144/144 rows carry fs. cost: 149,844 tok / 13.6m / 77 calls

_None._

## Blockers

_None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]] · specs/design_handoff_metrics_dashboard.

#sprint
