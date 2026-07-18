# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-18 — M2 Phase 2 planned + opened, not yet run)

- **Active sprint: M2 · Metrics v2 + dashboard, phase 2** (planned 2026-07-18, 5 tickets, all Todo).
  Build order: **WOA-037** (fsTimeline capture) → **WOA-038** (control-at-end capture, shares
  capture seams with 037) → **WOA-039** (rules-1.2 re-baseline — opus, the ONE intentional
  golden-diff break, atomic with report-model bands + grading-rubrics + shipped-history row + test
  pins) → **WOA-040** (map drill-down screen). **WOA-036** (deck-override bug) is independent,
  lands anytime — shape decided: no-op the checked-in `custom-deck.js` + visible override badge
  (`D.D:deck-override-noop-plus-badge`).
- Phase 1 shipped earlier today (6/6, zero bounces — `history/finished/M2-metrics-v2-dashboard-phase1.md`).
  Spec stays active through Phase 3 (P2.3 hex lenses, P2.4 Cards, P3.1 Units still queued in
  `specs/design_handoff_metrics_dashboard/TICKETS.md`).

## For Bill (carried from the Phase-1 run)

1. **Restart `node game/server.js`** to pick up the new API routes + dashboard.
2. **Eyeball the Overview** (screenshots in `planning/sprint-runs/2026-07-18-M2-screenshots/`).
3. Goals.md annotation — 17-card text per `D.D:seventeen-card-adopt`'s EXECUTED note.
4. Watch: adopted-deck sanity matchup 46% of 576 (~2σ low, recorded as within-noise).
5. Untracked `logs/reports/balance/1.1/accumulated.json` left for triage (not committed at wrap).

## Open threads

- **Alignment pass still DUE** (flagged at M1.1 close; M2 P1's close added run-signal) — on Bill's ask.
- SPEC.md points at `dynamic-scrum/rubrics/grading-rubrics.md`; the file actually lives in
  `dynamic-scrum/docs/` — one-line spec fix, fold into WOA-039's touch.
- Earlier carried: core7 roster call (restore to 7 maps?), rig-notes fill-in.

## Next

`run-sprint` (or `run-ticket WOA-037`) to work M2 Phase 2; WOA-039 waits on both captures.

## Related

[[Sprint]] · [[Roadmap]] · [[Decisions]] · [[Backlog]].

#claudenotes
