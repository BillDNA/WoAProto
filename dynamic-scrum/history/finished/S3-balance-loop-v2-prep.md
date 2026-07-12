# S3 · Balance loop v2 prep — closed 2026-07-12

**Goal:** everything in place to run balance loop v2 unattended — new levers armed (rule changes on a
1.1 rules version, unit comp & values as data, a better AI via the Q.2 verification), a leaner 7-map
active set, best-map scoring defined, and the loop's skills/process reshaped per Bill's retro (B.5).
**Prep only** — the v2 overnight run is the next sprint.

**Dates:** opened 2026-07-10 · closed 2026-07-12.

**Done when:** rules 1.1 shipped (Bill-chosen changes + test pins), unit composition/values editable as
slot data, the tuner sweep verified and adopted-or-rejected (Q.2 resolved), a 7-map set is the active
pool, "best map" is rubric-defined, and the retro'd skills are updated — so next sprint opens with
"run the loop". — **met, 7 of 7 tickets Done.**

One caveat on the "better AI" clause: the tuner was verified and **rejected**, not adopted. That still
resolves Q.2 (the lever is spent), but it means the loop's AI knob is closed and hard remains a fixed
measuring instrument — the v2 loop turns cards/maps/units, not weights.

## Tickets

- **WOA-009 — Rule-change suggestions from the 1.0 final report** (Done 2026-07-10): 5 ranked
  suggestions in `analysis/1.0/2026-07-10-rule-change-suggestions.md`; Bill picked S1 Variant A/A1
  incl. HQ gating (rejected S2/S3/S5; S4 → WOA-014 as 3-for-3 generation). Commit bce4609.
- **WOA-010 — Adopt chosen rule changes, bump rules version to 1.1** (Done 2026-07-10, sprint-run):
  rules 1.1 shipped — trench tie-survival + trenched-HQ tie-gate (`engine/03-rules.js`), version SoT
  bumped, 9 new test assertions proven to fail without the fix, 1.1 baselines measured (n60/720
  battles: essentially flat vs 1.0; tie-decided 11→10% as predicted).
- **WOA-011 — Unit composition & values as data levers** (Done 2026-07-10, sprint-run): new content
  kind `units`; a variant fully replaces the default unit block (composition + VP + atk/def/sup as
  data); total-10 piece guardrail at load; `--units` on balance-report + claude-plays; example
  `shock-army` ships inactive. Golden diff byte-identical.
- **WOA-012 — AI levels: verify & adopt weight-tuner sweep (Q.2)** (Done 2026-07-10, sprint-run):
  **REJECTED** — Q.2 resolved (`D.D:weight-tuner-sweep-rejected`). Bill's firmer recipe ran in full
  under 1.1 (34.7 min); survivors enemyDist 2.4 / fsDiff 4 / threatTie 1.88, but tuned **lost the
  matchup gate to hard (44% of 192)**. Defaults untouched, no version bump, golden diff holds.
- **WOA-013 — Trim the active map set to 7** (Done 2026-07-10, sprint-run): `content/mapsets/core7.js`
  (Core Seven) is the sole active mapset and loop default. Kept: causeway, frontier, saber-ridge,
  long-march, the-marshes, the-void, the-narrows — ranked by WOA-007 balanceScore. Cut: twin-gates,
  killing-ground, riverbend, the-ford, the-cockpit.
- **WOA-014 — Balance-loop v2: retro skill & process updates** (Done 2026-07-10, sprint-run): loop v2
  codified in the project skills — 1:1 adversarial checkers, one feels-match per iteration (seed 1001),
  create-card 3-for-3 batch mode judged as a set, v2 order-of-operations + 3 new final-report sections.
  create-map profiled: stage-4 sims are 100% of wall-clock, hard ≈7× normal.
- **WOA-007 — Define "best map": ideal-range scoring, rubric as SOT** (Done 2026-07-10): 8-metric
  range/weight table in `grading-rubrics.md` §Best map is the SOT; `balanceScore` reimplements it
  (0 = ideal, lower = better). Commit 1257da4.

## Closing note — the stale-ruler fix (2026-07-12)

Closing S3 drained the WOA-009 observations report, which caught a live hazard: the **"baselines to
protect" were 0.x-era** and three of them were wrong under 1.1 — most dangerously *attacks/swaps had
inverted* (V0 4.9/6.5 → 1.1 6.1/5.7), so grading a fresh run against them would flag healthy decks as
regressions. Fixed at close, before the loop ran: live 1.1 baselines now table-ised in
[[shipped-history]] + `CLAUDE.md`, the tie-rule baseline corrected 25% → 10% in `grading-rubrics.md`
(target ≤15% is now **MET** — a guardrail to hold, not a lever to pull), and the two-"ties" trap
(attrition tiebreak vs combat tie) documented so a suggestion can't aim at the wrong mechanism.

## Related

[[Finished Index]] · [[Roadmap]].

#finished
