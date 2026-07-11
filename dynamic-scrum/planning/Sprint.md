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
| WOA-009 | Rule-change suggestions from the 1.0 final report        | balance   | In Progress | —     |
| WOA-010 | Adopt chosen rule changes, bump rules version to 1.1     | engine    | Todo   | WOA-009    |
| WOA-011 | Unit composition & values as data levers                 | engine    | Todo   | —          |
| WOA-012 | AI levels: verify & adopt weight-tuner sweep (Q.2)       | balance   | Todo   | —          |
| WOA-013 | Trim the active map set to 7                             | content   | Todo   | —          |
| WOA-014 | Balance-loop v2: retro skill & process updates           | dev-tools | Todo   | —          |
| WOA-007 | Define "best map": ideal-range scoring, rubric as SOT    | balance   | In Progress | —     |

**Suggested order:** WOA-009 first (it gates WOA-010's 1.1 bump on Bill's picks); WOA-013 / WOA-007 /
WOA-014 are independent and can interleave; WOA-012's adoption lands with or after the 1.1 bump so any
number shift rides one version; WOA-011 anytime (defaults unchanged → golden diff).

## In Progress / Todo

### WOA-009 — Rule-change suggestions from the 1.0 final report
**Area:** balance · **Status:** In Progress · **Type:** opus · **Docs:** data-and-reports

B.6: a ranked set of rule-change suggestions grounded in the 1.0 final report
(`logs/reports/analysis/1.0/2026-07-09-1.0-balance-loop-final.md`, which already carries a ranked
rules-territory list) — each suggestion names the metric it should move (dead turns, swings, turn
distribution, 0-kill rate, tie-goes-to-2nd ~26%), the mechanism, and how to verify. Must include worked
options for Bill's trench idea: **trench grants survival in ties** — including how it interacts with
attack-and-survive cards (B.6.1). Deliverable = an analysis doc Bill picks from; no code.

**Acceptance criteria:**
- [x] Suggestions doc saved under `logs/reports/analysis/` — ranked, each with target metric + verification recipe
- [x] Trench tie-survival explored with ≥2 concrete mechanics (incl. the survive-card interaction)
- [ ] Bill has picked the adoption set for WOA-010

**[runner 2026-07-10]** Doc delivered: `logs/reports/analysis/1.0/2026-07-10-rule-change-suggestions.md`
(5 ranked suggestions S1–S5 + trench-tie-survival worked section + 3 adoption sets). ACs 1–2 met;
**AC 3 pending Bill's pick** of the adoption set (Conservative / Moderate⭐ / Aggressive) — ticket
stays In Progress until then, then WOA-010 implements the pick.

### WOA-010 — Adopt chosen rule changes, bump rules version to 1.1
**Area:** engine · **Status:** Todo · **Type:** opus · **Depends on:** WOA-009 · **Docs:** code-architecture

B.8: implement the rule changes Bill picks from WOA-009 and bump the rules version to **1.1**
atomically with the test-pin updates (`D.D:rules-version-on-number-change`). Re-measure the protected
baselines (first-mover ~46%, Red ~52%, tie-goes-to-2nd ~26%, skill premium, attacks/swaps) on the
standard sweep and record the new 1.1 baselines.

**Acceptance criteria:**
- [ ] Chosen changes implemented; `node game/test.js` green with pins updated in the same commit
- [ ] Rules version reads 1.1 everywhere it surfaces (reports path `logs/reports/*/1.1/`, DB rows)
- [ ] New 1.1 baselines measured (standard sweep) and recorded
- [ ] User confirms done

### WOA-011 — Unit composition & values as data levers
**Area:** engine · **Status:** Todo · **Type:** opus · **Docs:** code-architecture

B.5.3.1: the loop's next levers are unit-level — composition (10 units total, variable
infantry/cavalry/artillery mix), victory-point values, and attack/defense/support values — all editable
as content data a slot can carry (content-as-data: a variant stays a one-file diff). Defaults
unchanged: prove it with a golden balance diff (same seeds → byte-identical aggregates). Physical-board
piece stocks stay the design guardrail on what a composition may ask for.

**Acceptance criteria:**
- [ ] Composition + VP + attack/defense/support overridable from content data (one-file diff per variant)
- [ ] Defaults untouched — golden balance diff byte-identical; `test.js` extended to cover an override
- [ ] User confirms done

### WOA-012 — AI levels: verify & adopt weight-tuner sweep (Q.2)
**Area:** balance · **Status:** Todo · **Type:** opus · **Docs:** data-and-reports

B.5.3.2 ("the AI should get better") via the already-filed sweep #1 suggestions
(`logs/reports/analysis/2026-07-06-weight-tuner-sweep-1.md`), run through the firmer recipe Bill
required: `node dev/tune-weights.js --n 40 --iters 2`, then a "tuned" personality that **wins** a
matchup against current hard. Adopt if it holds (weights shift numbers → lands with/after the WOA-010
1.1 bump), reject with evidence otherwise. Either way Q.2 moves to Decisions; note what it says about
Q.3 (threatTie lever).

**Acceptance criteria:**
- [ ] Verification recipe run; tuned-vs-hard matchup result recorded
- [ ] Adopt or reject recorded in `Decisions.md`; if adopted, weights land coordinated with the 1.1 bump
- [ ] Q.2 removed from `Questions.md`; Q.3 annotated with the finding

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

### WOA-014 — Balance-loop v2: retro skill & process updates
**Area:** dev-tools · **Status:** Todo · **Type:** opus · **Docs:** data-and-reports

B.5's retro, applied to the loop's skills so v2 runs leaner: **(1)** adversarial checkers step down
2:1 → 1:1 (B.5.1.1); **(2)** one feels-match per iteration, not three (B.5.1.2); **(3)** `create-card`
receives the current deck and the card it will replace (B.5.2.1); **(4)** profile `create-map` — find
whether stage-3 or stage-4 rejections eat the time, report, and apply the cheap fix if one falls out
(B.5.2.2); **(5)** write the v2 order-of-operations into the loop recipe (gather 100-balance + 1 feels →
guide generators with findings → judge → adopt → repeat n) and extend the final-report template with
rule-change / stats-to-gather-or-drop / AI-lever suggestion sections (B.5.4). Skill edits land in
canonical skill files (`create-card`, `create-map`, `generate-reports`).

**Acceptance criteria:**
- [ ] Checker ratio 1:1 and one feels-match per iteration reflected in the loop recipe/skills
- [ ] create-card prompt takes deck + replace-target; create-map timing profiled with findings written up
- [ ] v2 order-of-operations + final-report additions in the recipe; a dry read-through matches B.5.4
- [ ] User confirms done

### WOA-007 — Define "best map": ideal-range scoring, rubric as SOT
**Area:** balance · **Status:** In Progress · **Docs:** grading-rubrics · **Type:** brainstorming

Bill wants "best map" properly defined: each metric gets an ideal *range* and the map is scored
against those ranges — replacing today's ad-hoc formula (`balanceScore`, `game/report-model.js:37` —
fairness deltas + degeneracy penalties − swing reward; attrition-only deliberately unscored per the
Round-4 ruling, which this may revisit). The definition lands in the grading rubrics as the SOT;
`balanceScore` then implements the rubric (one implementation per fact — CLI, dashboard, tuner all
read it). (S2 dogfood friction; rolled into S3 at the 2026-07-10 close — feeds WOA-013's map picks
and the v2 loop's judging.)

**Acceptance criteria:**
- [x] Ideal ranges per metric decided by Bill and written into the rubrics doc as SOT (2026-07-10:
      8-metric range/weight table in grading-rubrics §Best map; Round-4 attrition ruling reversed,
      control-tracks-win joins the score — `D.D:best-map-ideal-ranges`)
- [x] `balanceScore` reimplements the rubric; reports/skills that cite the old formula updated
      (report footnote + tune-weights comment; no other citers found)
- [ ] User confirms done

## Finished

- _None yet._

## Blockers

- _None._

## Related

[[Roadmap]] · [[Backlog]] · [[ClaudeNotes]].

#sprint
