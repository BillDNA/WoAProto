# Sprint — S3 · Balance loop v2 prep

**Goal:** everything in place to run balance loop v2 unattended — new levers armed (rule changes on a
1.1 rules version, unit comp & values as data, a better AI via the Q.2 verification), a leaner 7-map
active set, best-map scoring defined, and the loop's skills/process reshaped per Bill's retro (B.5).
**Prep only** — the v2 overnight run is the next sprint.

**Orientation:** [[2026-07-09-1.0-balance-loop-final|1.0 balance-loop final report]] ·
[[data-and-reports]] · [[grading-rubrics]] · loop recipe = the `generate-reports` skill.

**Done when:** rules 1.1 shipped (Bill-chosen changes + test pins), unit composition/values editable as
slot data, the tuner sweep verified and adopted-or-rejected (Q.2 resolved), a 7-map set is the active
pool, "best map" is rubric-defined, and the retro'd skills are updated — so next sprint opens with
"run the loop".

## Ticket overview

| Ticket  | Title                                                    | Area      | Status | Depends on |
| ------- | -------------------------------------------------------- | --------- | ------ | ---------- |
| WOA-009 | Rule-change suggestions from the 1.0 final report        | balance   | Done   | —          |
| WOA-010 | Adopt chosen rule changes, bump rules version to 1.1     | engine    | Done   | WOA-009    |
| WOA-011 | Unit composition & values as data levers                 | engine    | Done   | —          |
| WOA-012 | AI levels: verify & adopt weight-tuner sweep (Q.2)       | balance   | Done   | —          |
| WOA-013 | Trim the active map set to 7                             | content   | Todo   | —          |
| WOA-014 | Balance-loop v2: retro skill & process updates           | dev-tools | Done   | —          |
| WOA-007 | Define "best map": ideal-range scoring, rubric as SOT    | balance   | Done   | —          |

**Suggested order:** WOA-009 first (it gates WOA-010's 1.1 bump on Bill's picks); WOA-013 / WOA-007 /
WOA-014 are independent and can interleave; WOA-012's adoption lands with or after the 1.1 bump so any
number shift rides one version; WOA-011 anytime (defaults unchanged → golden diff).

## In Progress / Todo



### WOA-013 — Trim the active map set to 7
**Area:** content · **Status:** Todo · **Type:** sonnet · **Docs:** data-and-reports

B.7: bring the active pool down to 7 maps to speed the loop up — a solid base to expand from later.
Pick the 7 from the 1.0 final report's map metrics (and WOA-007's ranges once they exist — don't
block on it), ship as a new mapset (`content/mapsets/`), make it the loop default
(`D.A:one-active-mapset`); roster files stay on disk. One line of rationale per kept/cut map.

**Acceptance criteria:**
- [ ] 7-map mapset exists and is the default pool for balance-report / claude-plays / generate-reports
- [ ] Keep/cut rationale recorded (report or mapset comment)
- [ ] User confirms done


## Finished

- **WOA-012 — AI levels: verify & adopt weight-tuner sweep (Q.2)** (2026-07-10, sprint-run) —
  **REJECTED**, Q.2 resolved (`D.D:weight-tuner-sweep-rejected`). Bill's firmer recipe ran in full
  under 1.1 (`tune-weights --n 40 --iters 2`, 34.7 min, saved to
  `analysis/1.1/2026-07-10-weight-tuner-sweep-2.md`): survivors enemyDist 2.4 / fsDiff 4 /
  threatTie 1.88, but tuned **lost the matchup gate to hard (44% of 192)** — defaults untouched, no
  version bump, golden diff holds (no engine files in the diff). Row kept in maps.js as an inactive
  personality; Q.3 annotated (threatTie lever flipped under 1.1, looks spent). Run note: the build
  dispatch died twice on the 35-min tuner (session interrupt, then subagent-can't-wait); runner
  finished the remainder inline under the same verify gate — suite green, diff read, matchup re-read
  from log. cost: 98k tokens / 5.4 min / 24 tool-calls (dispatch) + runner-inline remainder.
- **WOA-011 — Unit composition & values as data levers** (2026-07-10, sprint-run) — new content kind
  `units` (`game/content/units/<id>.js`, active-flag selection like decks/mapsets): a variant fully
  replaces the default unit block (composition + VP + atk/def/sup as data, one-file diff); total-10
  piece guardrail enforced at load; `--units` on balance-report + claude-plays (mirrors `--deck`);
  example `shock-army` ships inactive. Golden diff byte-identical (same SHA256 before/after, no
  variant active); 11 new test assertions; suite + smoke green under runner re-run. cost: 189k
  tokens / 18.8 min / 73 tool-calls.
- **WOA-014 — Balance-loop v2: retro skill & process updates** (2026-07-10, sprint-run) — loop v2
  codified in the project skills: 1:1 adversarial checkers, one feels-match per iteration (seed 1001;
  2002/3003 optional), create-card 3-for-3 batch mode judged as a set (split-Deploy-Cavalry seeded as
  first-batch candidate), v2 order-of-operations + 3 new final-report sections in generate-reports;
  runbook Recipe 3/4 synced. create-map profiled with real timings
  (`logs/reports/analysis/1.1/2026-07-10-create-map-profile.md`): stage 3 free (0.06s), stage-4 sims
  are 100% of wall-clock, hard ≈7× normal — skill now rejects at normal n=40, promotes finalists to
  hard. Runner-verified (diffs read, greps clean, timings real). Skills are PROJECT-level
  (`.claude/skills/`), not user-level. cost: 125k tokens / 12 min / 54 tool-calls.
- **WOA-010 — Adopt chosen rule changes, bump rules version to 1.1** (2026-07-10, sprint-run) — rules
  1.1 shipped: S1 A/A1 trench tie-survival + trenched-HQ tie-gate (`game/engine/03-rules.js`), version
  SoT bumped (everything derives via `E.VERSION`), 9 new test assertions (proven to fail without the
  fix), README + rule book updated, 1.1 baselines measured (n60 sweep, 720 battles: essentially flat
  vs 1.0 — tie-decided 11→10% as S1 predicted, 0kill 1%, attacks/swaps held 6.1/5.7). Runner-verified
  (suite 219 ok, real diff read, fail-without-fix stash check). cost: 140k tokens / 11.7 min / 39
  tool-calls.
- **WOA-007 — Define "best map": ideal-range scoring, rubric as SOT** (2026-07-10) — 8-metric
  range/weight table in `grading-rubrics.md` §Best map is the SOT; `balanceScore` reimplements it
  (0 = ideal, lower = better); Round-4 attrition-only exemption reversed, control-tracks-win joins
  the score (`D.D:best-map-ideal-ranges`). Verified: tests green, full sweep clean, spot-checks
  vs bestof n=100 (Causeway 0.0 / Frontier 16.0 / Long March 15.4). Commit 1257da4.
- **WOA-009 — Rule-change suggestions from the 1.0 final report** (2026-07-10) —
  `logs/reports/analysis/1.0/2026-07-10-rule-change-suggestions.md`: 5 ranked suggestions, trench
  tie-survival worked in 4 variants with the tieSpare-card interactions, 3 adoption sets. Bill
  picked **S1 Variant A/A1 incl. HQ gating** (rejected S2/S3/S5; S4 → WOA-014 as 3-for-3
  generation) — recorded in WOA-010's body. Doc commit bce4609.

## Blockers

- _None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]].

#sprint
