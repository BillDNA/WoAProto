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
| WOA-010 | Adopt chosen rule changes, bump rules version to 1.1     | engine    | Todo   | WOA-009    |
| WOA-011 | Unit composition & values as data levers                 | engine    | Todo   | —          |
| WOA-012 | AI levels: verify & adopt weight-tuner sweep (Q.2)       | balance   | Todo   | —          |
| WOA-013 | Trim the active map set to 7                             | content   | Todo   | —          |
| WOA-014 | Balance-loop v2: retro skill & process updates           | dev-tools | Todo   | —          |
| WOA-007 | Define "best map": ideal-range scoring, rubric as SOT    | balance   | Done   | —          |

**Suggested order:** WOA-009 first (it gates WOA-010's 1.1 bump on Bill's picks); WOA-013 / WOA-007 /
WOA-014 are independent and can interleave; WOA-012's adoption lands with or after the 1.1 bump so any
number shift rides one version; WOA-011 anytime (defaults unchanged → golden diff).

## In Progress / Todo

### WOA-010 — Adopt chosen rule changes, bump rules version to 1.1
**Area:** engine · **Status:** Todo · **Type:** opus · **Depends on:** WOA-009 · **Docs:** code-architecture

B.8: implement the rule changes Bill picks from WOA-009 and bump the rules version to **1.1**
atomically with the test-pin updates (`D.D:rules-version-on-number-change`). Re-measure the protected
baselines (first-mover ~46%, Red ~52%, tie-goes-to-2nd ~26%, skill premium, attacks/swaps) on the
standard sweep and record the new 1.1 baselines.

**Bill's pick (2026-07-10, `D.D:rules-1.1-adoption`): S1 only** — trench grants the defender survival
in a combat tie, **Variant A/A1** (defender survives; attacker dies unless `tieSpare`; tieSpare vs
trench = whiff, nobody dies), **HQ included**: a trenched HQ border can't be tie-captured (trench
gates the `:263` capture on ties). Rejected: S2 (redundant — trenching your HQ half-implements it),
S3 (sudden-death raises drag; tie% stays a content KPI), S5 (unintended consequences + drag).
S4 folded into WOA-014 as 3-for-3 generation. Verification recipe in the WOA-009 doc §S1.

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
receives the current deck and generates **3-for-3** (Bill 2026-07-10: one batch of 3 candidates for
the iteration's 3 replacement slots, judged as a set against the whole deck, instead of three
independent 1:1 suggest/replace calls; WOA-009's S4 — split Deploy Cavalry — is the kind of deck
surgery this step should be able to propose, seed it as a candidate for the first batch) (B.5.2.1);
**(4)** profile `create-map` — find
whether stage-3 or stage-4 rejections eat the time, report, and apply the cheap fix if one falls out
(B.5.2.2); **(5)** write the v2 order-of-operations into the loop recipe (gather 100-balance + 1 feels →
guide generators with findings → judge → adopt → repeat n) and extend the final-report template with
rule-change / stats-to-gather-or-drop / AI-lever suggestion sections (B.5.4). Skill edits land in
canonical skill files (`create-card`, `create-map`, `generate-reports`).

**Acceptance criteria:**
- [ ] Checker ratio 1:1 and one feels-match per iteration reflected in the loop recipe/skills
- [ ] create-card prompt takes the deck and generates 3-for-3 batches; create-map timing profiled with findings written up
- [ ] v2 order-of-operations + final-report additions in the recipe; a dry read-through matches B.5.4
- [ ] User confirms done

## Finished

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
