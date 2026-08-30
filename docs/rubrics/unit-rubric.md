---
summary: What makes a good War of Attrition Unit — a piece with a job no other piece does better, priced so its Field-score cost tracks its battlefield worth.
applies-to: any Unit in the active unit-set (`content/units/`, else the `maps.js` units block) — the Infantry / Cavalry / Artillery roles and any variant of their stats. Read against content measured on the same Deck + Mapset.
---
# Unit rubric

A Unit is a mobile combat piece in one of three roles — Infantry (the line),
Cavalry (the fragile striker), Artillery (the support piece). This rubric grades
the one matter of taste the stats table can't settle: does the roster give each
Unit a *distinct, fairly-priced job*? Strict domination is arithmetic and lives
in `docs/balance/`; a dominated Unit gets a stat or cost change before this
rubric applies. The lever behind every axis is a Unit's atk/def/sup and its
Field-score cost.

## Goals

* ==**every unit is someone's right answer**== — each role is the best deploy in some real board state; none is always the answer, and none never is.
* ==**pay for what it's worth**== — a Unit's Field-score cost tracks the value it brings, so no Unit is a liability to deploy or a bargain that crowds the others out.

## Axes of evaluation

1. ==**The stats tell the same story the board does.**== Read the stats table, then watch a skirmish: is Infantry the line, Cavalry the killer, Artillery the multiplier *on the board*, or only on paper? When the two disagree — a "striker" that never lands a kill, a "support" piece that wins by standing in the line — name which to move, the numbers or the role, because a Unit whose job is only in its stat line has no job.
2. ==**Name the board state that wants it.**== For each Unit, describe the position — terrain, threat, hand, turn — in which a good player reaches for *this* piece and not the others. If the description is "whenever you can" or "never", say which and say what the neighbouring role is doing instead; the fix is a stat or cost change to the pair, not to the one.
3. ==**The deploy is a bet a player would place.**== Since surviving Units *are* the Attrition score, a deploy risks Field-score to gain board. Ask where the bet goes wrong: a Unit worth more in Reserve than on the board is priced above its worth; one that is free board and no risk is priced below it and crowds the others out. The fielded/reserve behaviour band (`docs/balance/`) is evidence for this finding, never the finding — it says *that* a Unit is held back, not *why*.
