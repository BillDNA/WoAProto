# S2 · Bill drives V1 — closed 2026-07-10

**Goal:** Bill can run the whole balance-iteration loop himself — an onboarding doc that walks him from
server start to reading a report, and a standard-runs runbook so a content change gets an
apples-to-apples comparison. Friction found while dogfooding gets minted straight into this sprint.

**Dates:** opened 2026-07-07 · closed 2026-07-10.

**Done when:** Bill has walked the onboarding doc end-to-end, run one standard run before/after a
content tweak and compared them, and confirms the loop works without Claude in the loop. — **met**
(and exceeded: Bill then drove a full 4-slot balance-iteration loop, `logs/reports/analysis/1.0/2026-07-09-1.0-balance-loop-final.md`).

## Tickets

- **WOA-004 — Bill's onboarding doc: driving the balance loop** (Done 2026-07-07):
  `human-instructions/driving-the-balance-loop.md` shipped, indexed, every command run live; Bill
  dogfooded it end-to-end (spawning WOA-006/007/008 friction tickets) and confirmed.
- **WOA-005 — Standard-runs runbook (apples-to-apples recipes)** (Done 2026-07-10): runbook in
  `human-instructions/` with three verified recipes (quick pulse, standard sweep, LLM match); one
  demonstrated before/after (attack_plus1 mod on The Ford, revert reproduced baseline exactly); Bill
  confirmed the format at sprint close.
- **WOA-008 — claude-plays match mode draws maps from the map-set pool** (Done 2026-07-09): shipped as
  the balance-loop pre-flight (commit bba0dd3); no `--map` → match pool = mapset-filtered roster via
  seed-shuffled mapOrder; verified across 9 live matches.
- **WOA-006 — Load saved balance reports into the Dashboard Charts tab** — not started; returned to
  Backlog at close.
- **WOA-007 — Define "best map": ideal-range scoring, rubric as SOT** — not started; rolled into the
  next sprint (balance-loop-v2 theme).

## Related

[[Finished Index]] · [[Roadmap]].

#finished
