# Sprint — none active

**S3 · Balance loop v2 prep closed 2026-07-12** (7/7 tickets Done) → archived to
[[S3-balance-loop-v2-prep]].

## Between sprints — balance loop v2 is running

Bill is running **balance loop v2** off-board (2026-07-12): 3 iterations, **cards as the only variable
knob**. Maps (`core7`), rules (1.1), unit values, and AI weights are all **frozen** for the duration —
that's what makes the three iterations apples-to-apples.

- **Recipe:** the `generate-reports` skill (§ The v2 loop). Per iteration: sweep + one seed-1001
  feels-match → `review-reports` → `create-card` 3-for-3 batch guided by the findings → 1 adversarial
  checker per candidate → Bill adopts → re-measure.
- **Graded against:** the **rules-1.1** baselines (first mover 48%, Red 50%, tie 10%, 6.1 attacks /
  5.7 swaps, zero-kill 1%, Drag 2.3, Swings 2.8) — see [[shipped-history]]. The old V0 row is
  superseded; attacks/swaps inverted between eras.
- **AI weights are NOT a knob** — WOA-012 rejected the tuner; hard is a fixed measuring instrument.
- **Lands as:** `logs/reports/analysis/1.1/…-balance-loop-final.md`, whose three suggestion sections
  (rule changes / stats to gather-or-drop / AI levers) are what the **next sprint gets planned from**.

The next sprint is built from that final report — don't plan one before it lands.

## Blockers

- _None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]] · [[Finished Index]].

#sprint
