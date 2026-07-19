# Sprint run — M2 · Metrics v2 + dashboard, phase 2 (2026-07-18)

**Protocol:** run-sprint over 5 tickets in dependency order (WOA-037 → 038 → 039 → 040, WOA-036
last), serial throughout (shared suites + woa.db made a parallel lane a collision). One Workflow
dispatch per card at the card's `Type:` model, xhigh effort; runner-verified every gate. Board writes
via the ds-board-hub MCP. Full run — no cards deliberately skipped.

## Pre-flight

All suites green at baseline (test.js 1150 → grew each ticket; db.test 97; smoke; claude-plays;
llm-session). Golden 24-normal/24-easy captured pre-run, re-captured post-WOA-039 (the one
intentional break). Pre-existing untracked `logs/reports/balance/1.1/accumulated.json` left for
Bill's triage. Ancient unrelated `stash@{0}` (Feedback-round-3 era) noticed and left alone.

## Scorecard (5/5 closed, zero bounces)

| Card | Type | Result | cost (tokens / time / calls) |
|---|---|---|---|
| WOA-037 fsTimeline → vpDiffTrack | sonnet | closed — premise re-scoped at dispatch | 149,844 / 13.6m / 77 |
| WOA-038 control-at-end capture | sonnet | closed — fold matched live agg 85%==85% | 148,561 / 10.9m / 57 |
| WOA-039 rules-1.2 re-baseline | opus | closed — atomic 11-file bump, 2 flagged forks | 286,898 / 33.2m / 90 |
| WOA-040 map drill-down | sonnet | closed — 5 screenshots vision-verified | 326,711 / 24.1m / 104 |
| WOA-036 deck-override no-op + badge | bug (sonnet) | closed — both states vision-verified | 211,423 / 20.4m / 109 |

Total subagent spend: ~1.12M tokens / ~102 min / 437 tool calls.

## Findings

1. **Same-day premise rot (WOA-037):** a ticket minted this morning was already 2/3 shipped by
   pre-Phase-1 commits its source verify-note couldn't see. The dispatch-time HEAD re-verification
   caught it; the dispatch was re-scoped to the real gap (the `/api/battles` timeline join). The
   premise check pays even on hours-old tickets.
2. **Feed-forward measurably cheapened successors:** WOA-038 reused WOA-037's patterns (sibling
   attach, ALTER precedent, the Windows kill gotcha) and came in at 57 calls vs 77; WOA-040 consumed
   WOA-039's key-rename/agg-field/small-n facts with zero re-derivation.
3. **Two runner-adopted spec forks on WOA-039, flagged for Bill** (`D.D:shares-are-guards-not-scored`):
   Attack%/Swap% are guard bands, not scored (SPEC ★ vs the 8-metric Best-map SOT); Reserves are
   HQ-sliced stock-share, not literally ÷turns. Both one-line reversible.
4. **Real defect found at a verify gate, not by a suite:** every `dev/balance-report.js` run persists
   ZERO battle rows (runs 92–94), a `D.A:battles-to-db` violation — reproduced by the runner and
   minted as **WOA-041** (Bugs). The WOA-039 baseline is safe (markdown report is the record) but
   measurement runs are invisible to the dashboard A/B pickers until fixed.
5. **1.2 headline balance signal:** The Narrows breaches at T0 under the new bands (Tie 26 > 18,
   Drag 3.4 > 3.0) — the drill-down renders it; candidate for the roster-call thread.

## Held-over human steps

- **Restart `node game/server.js`** (carried from Phase 1, still pending) — picks up the WOA-037
  `/api/battles` fs join; the dashboard's |VP-diff| track needs it live.
- **Bill: review the two WOA-039 forks** (`D.D:shares-are-guards-not-scored`) — overrule = small,
  named diffs.
- **Bill: eyeball the drill-down + badge screenshots** in
  `planning/sprint-runs/2026-07-18-M2-p2-screenshots/` (untracked scratch — move keepers to
  `planning/attachments/` if wanted).
- **WOA-041** (balance-report persistence) is on Bugs — pull when wanted; drill-down of measurement
  runs is blind until then.
- README's 3 stale 16-card mentions (doc follow-up flagged by WOA-036, not minted — fold into the
  next docs touch).

## Git-policy friction

None material. Explicit-path staging throughout; the WOA-041 mint got its own commit before
WOA-040's; observations notes landed before each ticket's commit (no trailing note commits). The
`Persisted … run <id>` trailer in balance.js output is non-deterministic — golden diffs must exclude
that one line (now in rig lore via the observation drops).

## Recommendations for these skills

Routed as 5 per-ticket observation drops to canonical inbound
(`from-warofattrition-observations-WOA-03x-2026-07-18.md`), covering: premise-check on same-day
tickets, the fold-vs-live evidence shape, `--once` seed control for metric-redefinition diffs, the
double-vision screenshot contract, and the flip/no-flip enumeration for hardcoded-number reconciles.
**Refine pass: explicitly deferred** (budget-deep session; signal lives in the 5 drops + this report
— canonical's next refine pass should fold them with the 6 Phase-1 drops already queued).

## Verdict

**5/5 dispatched and closed, zero bounces, full run.** Phase 2 done-when met: every Phase-1 grey
path is real (|VP-diff| track, Control%), rules-1.2 re-baseline landed atomically with fresh
setup-stamped Core Six numbers, the map drill-down ships, and browser play finally plays the
adopted deck — loudly, when overridden.

#sprint-run
