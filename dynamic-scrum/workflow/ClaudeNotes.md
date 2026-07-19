# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-18 — M2 Phase 2 CLOSED; between sprints)

- **M2 · Metrics v2 + dashboard, phase 2 is CLOSED** — planned AND ran autonomously the same day
  (5/5, zero bounces; archive `history/finished/M2-metrics-v2-dashboard-phase2.md`, run report
  `planning/sprint-runs/2026-07-18-M2-metrics-v2-phase2.md`). Live now: **rules 1.2** (Atk%/Swp%
  shares, Tie%/Drag attrition-sliced, Reserves HQ-sliced; fresh setup-stamped Core Six baselines),
  |VP-diff| + Control% real from DB (WOA-037/038), the **map drill-down** (WOA-040), and the
  browser finally playing the adopted deck with an override badge (WOA-036).
- **The metrics-v2 spec stays active** (Phase 2 of 3 shipped — not distilled): P2.3 hex lenses,
  P2.4 Cards, P3.1 Units remain in `specs/design_handoff_metrics_dashboard/TICKETS.md`.
- **New bug on the board: WOA-041** — `dev/balance-report.js` runs persist a runs row but ZERO
  battle rows (`D.A:battles-to-db` violation; measurement runs invisible to the dashboard A/B
  pickers). Worth landing before Phase 3.

## For Bill

1. **Two WOA-039 forks, runner-adopted, yours to overrule** (`D.D:shares-are-guards-not-scored`):
   Attack%/Swap% are guard bands not scored (SPEC ★ vs the 8-metric Best-map SOT); Reserves is
   HQ-sliced stock-share, not ÷turns. Each is a small named diff to reverse.
2. **Restart `node game/server.js`** (still pending since Phase 1) — the |VP-diff| track needs the
   new /api/battles live.
3. **Eyeball the drill-down + badge screenshots**: `planning/sprint-runs/2026-07-18-M2-p2-screenshots/`
   (untracked scratch; move keepers to `planning/attachments/`).
4. **The Narrows breaches at T0 under 1.2** (Tie 26 > 18, Drag 3.4 > 3.0) — feeds the carried core7
   roster-call thread.
5. Untracked `logs/reports/balance/1.1/accumulated.json` still awaiting triage (pre-sprint leftover).
6. README has 3 stale 16-card mentions (WOA-036 follow-up candidate, not minted).

## Open threads

- **Alignment pass still DUE** (flagged at M1.1 close; M2 P1+P2 closes added run-signal) — on Bill's
  ask. Canonical inbound now holds **11 observation drops** (6 from P1, 5 from P2) + both run
  reports; the refine pass there should fold them together (explicitly deferred at P2 run end).
- Earlier carried: core7 roster call (now with The Narrows evidence), rig-notes gained real content
  this close (golden-diff trailer rule, server-kill recipe, headless capture).

## Next

`session-start sprint-planning` → M2 Phase 3 (hex lenses / Cards / Units, pull WOA-041 first), or
`run-ticket WOA-041` standalone.

## Related

[[Sprint]] · [[Roadmap]] · [[Decisions]] · [[Backlog]].

#claudenotes
