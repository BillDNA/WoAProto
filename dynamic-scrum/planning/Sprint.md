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

### WOA-036 — Browser plays a stray "applied deck" override, never the active-flagged deck
**Area:** game-ui · **Status:** Todo · **Type:** bug · **Docs:** code-architecture

Found during WOA-030's verify (2026-07-18). `index.html` (~line 268) force-clears every `content/decks/` deck's `active` flag and substitutes a browser-only "applied deck" whenever one is present — and one always is: `game/custom-deck.js` is a checked-in, non-empty 16-card leftover (commit 4ba14fa, "Vanguard") with cards distinct from both `default` and `cavsplit17-raid-paid`. Override precedence: `woa-custom-deck` localStorage → `custom-deck.js` → active flag. Consequence: interactive browser play has NEVER reflected the active flag — including the adopted 17-card deck — while every CLI/sim/test path (balance.js, test.js, dev/) bypasses the override and is correct. The mechanism itself stays (it's how zipped file:// and LAN play get a custom deck — export the file, drop it next to index.html). **Decided shape (Bill, 2026-07-18): both fixes** — (1) ship `custom-deck.js` as a no-op (empty/absent override) so the active deck shows through by default; (2) whenever an override IS active (localStorage or a dropped file), show a visible "custom deck applied: <name> [reset]" badge so it can never be silent again. Also reconcile `deck-editor.js` `deckProblems()`'s hard-coded `total !== 16` with the 17-card adopt. Independent of the other four tickets — can land anytime in the sprint.

**Acceptance criteria:**
- [ ] Checked-in `game/custom-deck.js` is a no-op; a fresh browser load (node game/server.js AND zipped file://, no localStorage) plays the active-flagged deck (`cavsplit17-raid-paid`, 17 cards visible in a dealt game)
- [ ] An active override (localStorage or dropped custom-deck.js) shows a visible badge naming the applied deck with a working reset; no override = no badge
- [ ] deck-editor.js's deck-size validation accepts the 17-card adopted deck (hard-coded 16 reconciled)
- [ ] node dev/smoke.js green; node game/test.js green
- [ ] User confirms done

## In Progress

_None._

## Finished

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
