# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-12, balance-loop-v2 session)

- **S3 (Balance loop v2 prep) CLOSED** — 7/7 Done, archived to
  `dynamic-scrum/history/finished/S3-balance-loop-v2-prep.md`. **No sprint is active** — the v2 loop is
  running *between* sprints, by Bill's call. The next sprint gets planned from the loop's final report.
- **Balance loop v2 is RUNNING** — 3 iterations, **cards as the only variable knob** (Bill considered
  adding weights, then dropped it once reminded WOA-012 rejected the tuner). Maps/rules/units/weights
  frozen → the three iterations are apples-to-apples.
- **The ruler was stale, and is now fixed.** The WOA-009 inbound report (drained + deleted this session)
  caught it: the "baselines to protect" were 0.x-era and **attacks/swaps had inverted** (V0 4.9/6.5 →
  1.1 6.1/5.7) — grading the loop against them would have flagged healthy decks as regressions. Live 1.1
  baselines now table-ised in `shipped-history` + `CLAUDE.md`; tie-rule baseline corrected 25% → 10% in
  `grading-rubrics.md`.

## Threads to carry

- **The tie-rule lever is spent, not open.** Target ≤15% is now MET (10%) — hold it as a guardrail; any
  doc still calling it "the biggest open lever" is 0.x-era text.
- **Two different "ties"** — attrition tiebreak ("tie-goes-to-2nd") vs the *combat* tie in
  `engine/03-rules.js`. Documented in `grading-rubrics.md`; don't let a suggestion aim at the wrong one.
- **AI weights are a closed knob** — hard is a fixed measuring instrument. Re-opening means clearing the
  beat-hard gate first, and tuning the AI to flatter the metrics moves the ruler, not the game.
- WOA-015 (new, Backlog): the ds-board-hub live-parse bug — canonical tooling, route via `send-report`.
- Steam-roadmap draft still parked, Bill-decides. Skill premium (60/78%) unverified under 1.1.

## Related

[[Sprint]].

#claudenotes
