---
summary: What makes a good War of Attrition Unit — a piece with a job no other piece does better, priced so its Field-score cost tracks its battlefield worth.
applies-to: any Unit in the active unit-set (`content/units/`, else the `maps.js` units block) — the Infantry / Cavalry / Artillery roles and any variant of their stats.
---
# Unit rubric

A Unit is a mobile combat piece in one of three roles — Infantry (the line),
Cavalry (the fragile striker), Artillery (the support piece). This rubric judges
whether the roster gives each Unit a *distinct, fairly-priced job*. It grades
taste; the one arithmetic check (strict domination — a pass/fail read of the
stats table) lives in `docs/balance/`.

The lever behind both axes is the Unit's atk/def/sup and its Field-score cost.

## Goals

* ==**every unit is someone's right answer**== — each role is the best deploy in some real board state; none is always the answer, and none never is.
* ==**pay for what it's worth**== — a Unit's Field-score cost tracks the value it brings, so no Unit is a liability to deploy or a bargain that crowds the others out.

## Axes of evaluation

1. **Does each role have a job no other does better?** Is Infantry the line, Cavalry the killer, Artillery the force multiplier — visible in the stats *and* in play? A Unit that is always the deploy of choice regardless of the board, or never worth deploying, has no distinct job.
2. **Does the price track the value?** Since surviving Units are the Attrition victory condition, does each Unit's Field-score cost feel earned — so every role still gets fielded, and none is systematically left in Reserve because deploying it is bad Attrition maths?

## Related runnable checks (`docs/balance/`)

Strict domination (no Unit worse-or-equal on every axis with nothing in
exchange) is arithmetic, not taste — it's a pass/fail gate in `docs/balance/`.
Run it first; a dominated Unit gets a stat or cost change before this rubric
applies. The "% of units ever fielded" behaviour band is the evidence for axis 2.
