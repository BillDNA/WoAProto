# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-18 — Sprint M2 OPENED, nothing worked yet)

- **Sprint M2 · Metrics v2 + dashboard, phase 1 is planned and committed** (6 tickets, all Todo):
  **WOA-030** (17-card adopt — runs FIRST so all baselines/diffs land on the adopted deck) →
  WOA-031 trace capture → WOA-032 db `runs` table → WOA-033 bands-as-data + folds (opus) →
  WOA-034 view-only shell → WOA-035 Overview screen. Shape decision: `D.D:metrics-v2-phased-adopt`.
- **Source spec:** `dynamic-scrum/planning/specs/design_handoff_metrics_dashboard/` (SPEC.md = metric
  SOT, README.md = screens/design SOT, `Metrics and Charts.dc.html` = visual reference). Phase 1 is
  golden-diff-safe; the rules-1.2 re-baseline + drill-down/cards/units (P2.1–P3.1 in its TICKETS.md)
  are the **next** sprint.
- Board housekeeping done at plan time: WOA-006 closed-as-absorbed (→ WOA-032/034);
  `metric-bands-by-temperature` parking-lot note graduated + deleted; Roadmap M2 rewritten.

## Open threads

- **Alignment pass still DUE** (flagged at M1.1 close, not run; `D.D:alignment-pass-on-request`) —
  runs on Bill's ask. Also still offered: the combined M1+M1.1 canonical refine pass.
- **Pacing baseline** unpinned in the rubric — re-measures under the adopted deck in WOA-030's sweep.
- Earlier carried threads: core7 roster call (restore to 7 maps?), Roadmap M1 overnight-autonomous
  half. `rig-notes.md` stub scaffolded (committed this session) — fill-in still pending.
- WOA-035 scope note: map-dumbbell click lands on a Maps **stub** (sets `DASH.mapFocus`); P2.2 builds
  the real drill-down next sprint.

## Next

`session-start tickets WOA-030` (or `run-sprint` for the whole board). Alignment pass / refine pass
on Bill's ask.

## Related

[[Sprint]] · [[Roadmap]] · [[Decisions]] · [[Backlog]].

#claudenotes
