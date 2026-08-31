---
summary: What makes a good War of Attrition Personality — an AI opponent whose character and puzzle are one legible thing, in a panel where no two members fall to the same read.
applies-to: any Personality (a `maps.js` `ai` weight-override row, bound to a Commander via `commander.personality`) — one under review, a proposed one, or the panel as a whole. Read against content measured on the same Deck + Mapset.
---
# Personality rubric

A Personality is one AI opponent — a shallow `AI_WEIGHTS` override that makes a
seat *play like someone*. It grades the one matter of taste the balance sweep
can't settle: is this opponent **fun to play against**? A **Stronghold** (a
character you recognize) that is also a **Punch-Out** (a puzzle you read and beat
on purpose) — in a good design, one thing. Both defined in `CONTEXT.md`. The
win-rate and balance math is the balance sweep's job; this doc asks whether the
opponent is *someone worth beating*.

## Goals

* ==**every opponent is someone**== — a recognizable character, not an anonymous optimizer wearing a name.
* ==**the character is the puzzle**== — the story you read off it and the plan you beat it with are the same thing, learned in a loss and turned in the rematch.
* ==**the panel leaves nowhere to hide**== — its members cover the styles, so no single strategy beats them all and no content slips through a gap.

## Axes of evaluation

1. ==**The metaphor meets the mechanics.**== Read its name, its play, and its weights together — do they tell one story, or have they come apart (a "turtle" that sallies, weights that spell no one)? When they disagree, the finding names which to move — the theme or the numbers — and that is the fix.
2. ==**The tell can be learned and turned.**== Watch a loss: name the pattern a beaten player would diagnose and beat next time. If you can't — it hides behind no tell, out-muscles you with a tell that has no counter, or won't commit to its pattern long enough to read — say which, because each points at a different repair.
3. ==**No two members fall to the same read.**== Across the panel, does beating one personality teach you to beat another? A shared counter means one puzzle wearing two names — and the style *nothing* punishes is the gap content overfits into. The balance sweep's spread (`Swings`/`Drag` among its metrics) is the evidence, read as a per-member profile, never a mean.

## Roster

An archetype *spread*, not a set of tuned rows: **brawler · turtle · hawk** seed
the corners; add a row only when a story-character (a Commander's `personality`)
needs one, never speculatively. Smoke-check only — the panel is a taste layer,
no numeric pin.
