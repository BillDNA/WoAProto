# Claude skills: run-tournament / create-card / create-map

Three Claude Code skills (SKILL.md files, dev-side) that orchestrate the existing tools rather
than adding game code. They read the game's data, run the game's sims, and reason about the
results against the rubrics.

## run-tournament
Run a CLI tournament and turn it into balance suggestions.
- Depends on [[claude-plays]] (LLM players) and/or the heuristic AIs; pit configs/models across
  the map roster.
- Reuses `balance.js` aggregation + the [[metrics-dashboard]] numbers — the skill's job is to run
  the matches, read the metric spread, and propose concrete balance changes (this card is a dead
  card, this map is 70/30 side-biased, tie-rule decides too many games), grading against
  [[grading-rubrics]].
- Output is a report + suggestions for Bill, not auto-applied edits (rules changes are Bill's
  call — game/CLAUDE.md).

## create-card
Read the current deck (`maps.js` cards + `design-docs/card-cheatsheet.md`) and propose new cards
that *add something* — a decision the deck doesn't already offer — scored against the card rubric
in [[grading-rubrics]]. Proposals are in the [[deck-editor]] data shape so they drop straight in.

## create-map
Same pattern for maps: read the roster + board shapes, propose maps that fill a gap (a healthy
compact dist-4 map, a shape that isn't covered), graded against the map rubric. Proposals in the
[[map-roster-and-shapes]] data shape.

## Grounding / why these are thin

These are **skills, not engine code** — they call `node game/balance.js`, read `maps.js`, and
reason. Keep them thin: the intelligence is in the tools + rubrics they lean on, so the skill is
mostly "gather the inputs, run the sim, grade, report."

## Gotchas

- Build order: run-tournament needs [[claude-plays]] to exist; create-card / create-map need
  [[grading-rubrics]] to grade against. Don't start these before their dependencies land.
- Suggestions only. None of these three edits balance data on their own — they hand Bill a graded
  proposal and let him decide (consistent with "present findings to Bill, he decides rule
  changes" in game/CLAUDE.md).

---
skipped: auto-applying suggested changes, a fourth "create-unit" skill — units are a tiny fixed
set; revisit only if the roguelite pivot expands them.
