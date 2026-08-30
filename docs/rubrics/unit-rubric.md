---
summary: What makes a good War of Attrition Unit — a piece whose job a player can name, whose deploy is a decision that changes across the skirmish, and whose stock is part of that decision.
applies-to: any Unit in the active unit-set (the `maps.js` units block, or a content unit-set once one exists) — the roles and any variant of their stats.
---
# Unit rubric

A Unit is a mobile combat piece: a stat line, a **bounty** the enemy scores for
killing it, and a **stock** of pieces. This rubric grades the one matter of taste
the stats table can't settle: is the piece *good design* — something a player
wants, for a reason they can say? Strict domination and the fielded/reserve
numbers are the balance checks' job (`docs/balance/`), and *when the deploy
order gets played* is the card rubric's; this doc owns what the piece is worth
once it lands.

## Goals

* ==**every unit is someone's right answer**== — each role is the best deploy in some real board state; none is always the answer, and none never is.
* ==**pay for what it's worth**== — what a Unit risks on the board tracks what it brings, so no Unit is a liability to deploy or a bargain that crowds the others out.

## Axes of evaluation

1. ==**The job on the table is the job on the board.**== Read the role its stat line implies, then watch a skirmish: does it play that role, and is it a role no other piece plays? A piece can fail this two ways, and they want different fixes — the story is legible but another piece tells it as well (move the numbers apart), or the piece does something distinct that nobody can read off it (move the stats until the job shows). Name which.
2. ==**"Field it now?" gets a different answer on different turns.**== A piece worth deploying is one whose moment comes and goes — the board state, the bounty exposed, the enemy's reach all shift the answer. Describe when in a skirmish this piece wants to land and when it wants to wait. If the answer is the same on turn two and turn twenty, the deploy is a reflex or a refusal, not a decision, and the bounty or the stats are what move it.
3. ==**The stock is felt.**== The number of pieces is a third of what a Unit is. Say whether running out of this piece is a thing that happens and matters — a last Cavalry a player saves, a seventh Infantry that never leaves Reserve. A stock that never binds is decoration; one that binds on turn three is the wrong count, and the finding says which.
