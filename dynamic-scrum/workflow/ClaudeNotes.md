# ClaudeNotes — running state (overwrite each session, never append)

Claude's compact snapshot of where things stand, so "take a look at where we are" is fast at session
start. **Overwrite** this each session — it is state, not a log.

## Where things stand (2026-07-15 — M1 sprint RAN autonomously; awaiting Bill's review)

- **Sprint `M1 · Fix the bent ruler` ran end-to-end** (`run-sprint`, full autonomy). **6/6 dispositioned:
  4 built+closed, WOA-018 REJECTED, WOA-020 CUT.** Suite 230→237 green throughout; 8 commits, **pushed**.
  Sprint is NOT yet closed — Bill reviews first. Run report:
  `dynamic-scrum/planning/sprint-runs/2026-07-15-M1-fix-the-bent-ruler.md`.

## The one thing to carry forward

**The flagship refuted the sprint's own premise.** WOA-018 (§5a.1 "the AI eval encodes a losing strategy")
does **not** survive AI-vs-AI measurement — no lever beats `hard` (narrow-gap 50.7%/672 + runner re-check
49.5%/196; urgency-scaling monotonically weaker). **Deploy-on-sight is ~neutral for this attrition dynamic**
(`fieldScore` counts only deployed units; the attrition projection already punishes hoarding) — the ruler
is NOT distorted. Recorded `D.D:ai-reserve-eval-rejected`. **M1's "Fix the bent ruler" framing needs
revisiting** — the reserve-timing question moved to WOA-024 (rules/content + a fresh human/LLM signal, not
an AI-eval tweak).

## Delivered (the trustworthy-instrument half — all real)

- **WOA-016** reserve-held-at-end metric (per side; baseline hard-vs-hard = 10%/10%).
- **WOA-017** deploy-step-budget test (`default` saturates stock exactly 7/7·2/2·1/1 — zero headroom).
- **WOA-019** dead per-card Win% dropped from reports (kept in DB).
- **WOA-020** The Void CUT (repair-first made it worse) → **core7 is now 6 maps** (name→"Core Six", id frozen).
- **WOA-021** `starting:true` documented as a tunable lever in grading-rubrics.

## Awaiting Bill's review / decision

1. **Revisit M1's framing** given the WOA-018 refutation (roadmap-level).
2. **core7 = 6 maps** — sweeps no longer comparable to 7-map baselines. Restore to 7 (redesign The Void, HQs
   are fundamentally too close; or promote the-cockpit) is a roster call. `the-void.js` preserved on disk.
3. **Dashboard parity follow-ons** — WOA-016 reserve tile + WOA-019 live winPct still in `ui/dashboard.js`.
4. **Deferred closing step:** the refine pass (route run-sprint/run-ticket signal — Agent-vs-Workflow
   dispatch, inline-carve-out extension, measured-rejection scorecard — to canonical). Not run; captured in
   the run report. Offer stands.

## Next

Bill reviews → then `end-session close-sprint` (once satisfied) or a roadmap revisit on M1. WOA-024 is the
live thread for the reserve-timing question.

## Related

[[Sprint]] · [[Roadmap]] · [[Decisions]] · [[Backlog]].

#claudenotes
