# Observations — WOA-009 (run-ticket)

cost: runner-direct (no build sub-agent dispatched — opus docs-analysis deliverable, written by the
runner) / single session / ~15 tool calls.

Lessons (WOA-009):

- **Hub couldn't resolve WOA-009.** The `ds-board-hub` at :4841 served `/api/board` fine but
  `GET /api/ticket/WOA-009` returned "ticket not found on board" and the move endpoint errored
  (`reading 'chunks'` on the missing ticket). WOA-009 is correctly formatted in `Sprint.md`
  (identical shape to WOA-010, which *did* parse) — so the hub's live parse is dropping it. Fell back
  to direct Sprint.md edits per run-ticket Precondition 4. **Worth a hub-parse look** before the next
  run relies on the API for a mid-sprint ticket.
- **Two "ties" trap.** The 1.0 report + Goals both say "tie-goes-to-2nd"; the engine also has a
  *combat* tie (`03-rules.js:252`). Bill's trench idea targets the combat tie, the ~26% metric is the
  attrition tiebreak. Any rules-suggestion work must disambiguate these up front or the
  metric-to-mechanism mapping goes wrong.
- **~26% is a stale anchor.** The protected "tie-goes-to-2nd ~26%" is 0.x-era; 1.0 default reads 11%
  (final-report table). Cite the live number, not the guardrail, when sizing a tiebreak change.

#observations
