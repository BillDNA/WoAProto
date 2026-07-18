# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-18 — M2 Phase 1 CLOSED; between sprints)

- **M2 · Metrics v2 + dashboard, phase 1 is CLOSED** — planned AND ran autonomously the same day
  (6/6, zero bounces; archive `dynamic-scrum/history/finished/M2-metrics-v2-dashboard-phase1.md`,
  run report `planning/sprint-runs/2026-07-18-M2-metrics-v2-phase1.md`). Live now: the 17-card adopt
  (WOA-030), per-play trace + run identity in woa.db (WOA-031/032), bands-as-data + folds in
  report-model (WOA-033), and the view-only A/B dashboard shell + Overview (WOA-034/035). Golden
  balance diff held byte-identical all sprint.
- **The metrics-v2 spec stays active** (Phase 1 of 3 shipped — not distilled): P2.1–P2.4 + P3.1 in
  `specs/design_handoff_metrics_dashboard/TICKETS.md`, with Backlog riders WOA-037 (fsTimeline →
  |VP-diff|) and WOA-038 (control-at-end → Control% scores).

## For Bill (held-over from the run)

1. **WOA-036 (Bugs)** — the browser has never played the active-flagged deck (stray applied-deck
   override, `custom-deck.js` + localStorage). Pick the fix shape.
2. **Goals.md annotation** — 17-card text in `D.D:seventeen-card-adopt`'s EXECUTED note.
3. **Restart `node game/server.js`** to pick up the new API routes + dashboard.
4. **Eyeball the Overview** (screenshots in `planning/sprint-runs/2026-07-18-M2-screenshots/`) —
   esp. the progressive tier reveal call vs the mockup's static triptych.
5. Watch: adopted-deck sanity matchup 46% of 576 (~2σ low, recorded as within-noise).

## Open threads

- **Alignment pass still DUE** (flagged at M1.1 close; M2's close adds run-signal) — on Bill's ask.
  The canonical refine pass now has 6 more observation drops in canonical inbound (WOA-030…035).
- Pacing baseline: re-stamped under the adopted deck in WOA-030 — thread closed.
- Earlier carried: core7 roster call (restore to 7 maps?), rig-notes fill-in.

## Next

`session-start sprint-planning` → M2 Phase 2 (rules-1.2 re-baseline is the atomic bump; pull
WOA-037/038 alongside P2.1–P2.2), or `run-ticket WOA-036` once Bill picks its shape.

## Related

[[Sprint]] · [[Roadmap]] · [[Decisions]] · [[Backlog]].

#claudenotes
