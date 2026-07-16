# M1 · Fix the bent ruler — closed 2026-07-16

**Goal:** make the AI's evaluation encode the *winning* strategy (hold reserve, deploy late) and build
the instruments to prove it — the trustworthy half of Roadmap M1.

**Ran:** 2026-07-15, fully autonomous (`run-sprint`, 8 commits) · **Closed:** 2026-07-16 · 6/6
dispositioned: 4 built+closed, 1 REJECTED, 1 CUT. Suite 230→237 green throughout.

**Headline:** the flagship **refuted the sprint's own premise**. WOA-018 (§5a.1 "the AI eval encodes a
losing strategy") does not survive AI-vs-AI measurement — no lever beats `hard` (narrow-gap 50.7%/672;
urgency-scaling monotonically weaker). Deploy-on-sight is ~neutral for this attrition dynamic; the
ruler is NOT distorted (`D.D:ai-reserve-eval-rejected`). The reserve-timing question moved to WOA-024
(rules/content + a fresh human/LLM signal). Run report:
`dynamic-scrum/planning/sprint-runs/2026-07-15-M1-fix-the-bent-ruler.md`.

## Tickets

- **WOA-016 — reserve-held-at-end metric** (Done): per-side reserve-at-end share in engine agg +
  report-model + `res_end_red/blue` DB columns; golden diff holds; hard-vs-hard baseline 10%/10%.
- **WOA-017 — deploy-step-budget test** (Done): test.js asserts deploy steps ≤ piece stock per type;
  `default` saturates stock exactly (7/7·2/2·1/1) — zero headroom.
- **WOA-018 — fix AI reserve/board eval bias** (Done/REJECTED): both levers measured vs `hard` on core7
  and rejected; eval reverted pristine, defaults stand, RULES_VERSION unchanged (1.1).
- **WOA-019 — drop dead per-card Win%** (Done): column removed from terminal + saved reports (dead at
  n=700); `won` stays in `logs/woa.db`. Dashboard live winPct untouched (parity follow-on).
- **WOA-020 — fix or cut The Void** (Done/CUT): repair-first tried (fill the donut) — worse (1st 84% /
  HQ 78% / 0-kill 42%); HQs fundamentally 3 hexes apart. CUT → core7 now 6 maps ("Core Six", id
  frozen); `the-void.js` preserved on disk. Restore-to-7 is Bill's roster call.
- **WOA-021 — `starting:true` lever documented** (Done): guaranteed-opener lever subsection added to
  `grading-rubrics.md` with measured effects + how-to-read guidance.

## Carried out of the sprint

- Roadmap M1's AI-eval framing needs reconciling post-refutation → WOA-025 AC (alignment sweep).
- M1's overnight-autonomous half still open on the Roadmap.
- core7 = 6 maps: sweeps no longer comparable to 7-map baselines; roster call pending.
- Dashboard parity follow-ons (WOA-016 reserve tile, WOA-019 live winPct).
- M1-close alignment pass ran 2026-07-15: 2 MUSTs fixed inline, 17 SHOULDs → WOA-025
  (evidence in `dynamic-scrum/planning/drafts/alignment-drafts.md`).

## Related

[[Finished Index]] · [[Roadmap]] · [[Backlog]].

#finished
