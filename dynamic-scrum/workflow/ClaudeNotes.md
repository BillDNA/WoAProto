# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-16 — M1.1 sprint RAN autonomously; awaiting Bill's review)

- **Sprint `M1.1 · Measuring "good"` ran end-to-end** (`run-sprint`, full autonomy): **5/5 closed,
  zero bounces**, suite 237 green throughout, 6 commits + the run report — **NOT pushed** (end-session
  integrates) and the sprint is NOT closed on the board — Bill reviews first. Run report:
  `dynamic-scrum/planning/sprint-runs/2026-07-16-M1.1-measuring-good.md`.

## The one thing to carry forward

**The 17-card call is on Bill's desk, measured.** `cavsplit17-raid-paid` probed at T2 under the new
search-side policy: **T0-clean on both tiers** — Swings +25–30%, turtling down, Drag flat — for +3
turns and normal 0-kill 1→4% (in band, near the 5% floor). **Recommendation: ADOPT gated on one
n≥100 normal confirmation run. Decision: BILL'S CALL (pending)** —
`logs/reports/analysis/1.1/2026-07-16-1.1-analysis-cavsplit17-T2probe.md`. On adopt, 17 becomes that
deck's documented ceiling (recorded in rubric + Goals atomically), 16 stays the default guardrail.

## Delivered

- **WOA-025** M1 drift swept (17 ACs, 20 files; drafts staging drained).
- **WOA-026** every rubric figure re-measured on Core Six, dated + setup-labeled; CLAUDE.md baselines
  updated (steer-approved); code-architecture numbers block → pointer. Finding: the old "normal"
  Behaviour baseline was a mislabeled hard-vs-hard read (flagged, not retro-fixed).
- **WOA-027** rubric refactored — **Goal/Evidence/Score/Lever** on all 23 criteria; §Temperature
  first-class; setup-label rule mandatory.
- **WOA-028** review-reports refactored — pointer-only, `Temperature: TX` header mandatory, levers
  carried; proven by a committed T0 all-pass dry-run analysis (`2026-07-16-1.1-analysis.md`).
- **WOA-029** search-side temperature policy in the rubric slot (local-max signal / ranked dial /
  re-measure-to-ship) + the T2 probe above.

## Awaiting Bill's review / decision

1. **17-card ADOPT/REJECT** (above) — the confirmation run is one ask away.
2. **Rubric gaps to pin (WOA-028 shakedown):** north star 1 needs a `matchup`-shape report in the
   standard set (consider adding to generate-reports); Pacing baseline candidate measured (hard
   28.7t/23% HQ, normal 27.4t/25%) — Bill owns the rubric.
3. **CLAUDE.md baselines diff** — flagged per steer; prior rows kept as superseded.
4. **Refine pass (M1 + M1.1 combined) still offered, not run** — signal preserved in 5 observation
   drops in canonical inbound + both run reports. Also offered: scaffold `rig-notes.md` to home the
   WoA sim lore (--parallel timings, --deck selection, printed==stock pin, here-string→`-F` commits).

## Next

Bill reviews → `end-session close-sprint` (which pushes), or the 17-card confirmation run / refine
pass on ask. M2 (actionable, visible data — dashboard + operationalize the temperature dial) is next
on the Roadmap.

## Related

[[Sprint]] · [[Roadmap]] · [[Decisions]] · [[Backlog]].

#claudenotes
