---
summary: What makes a good War of Attrition Personality — an AI opponent that is a distinct in-theme character *and* a legible tactical puzzle, in a panel that spans the archetype space so content isn't tuned to one optimal style.
applies-to: any Personality in the panel (a `maps.js` `ai` weight-override row, bound to a Commander via `commander.personality`) — one row under review, a proposed new one, or the panel as a whole. Read Personalities only against content measured with the same Deck + Mapset.
---
# Personality rubric

A Personality is one AI opponent — a shallow `AI_WEIGHTS` override that makes a
seat *play like someone*. This rubric judges whether facing it is **fun to play
against**, and whether the panel of them is diverse enough that content graded
across it isn't overfit to a single optimal style. It grades taste; the
per-panel spread numbers and the fairness Tolerances (`Red%`/`1st%`) that
hard-gate it live in `docs/balance/`.

Fun-to-play-against is **twin tests, both required**:

* **Stronghold** — is it a distinct, in-*theme* **character**? A named signature
  style with a throughline you could describe in a sentence, not a bag of
  weights.
* **Punch-Out** — is it a **legible, learnable tactical puzzle**? Beating it
  should feel like decoding a pattern — a plan you can read across a match and
  then beat on purpose.

## Goals

* ==**every opponent is someone**== — each Personality plays a recognizable, in-theme character, not an anonymous optimizer.
* ==**the puzzle is solvable**== — its plan is legible enough that a player can learn it and beat it deliberately, not just out-roll it.
* ==**the panel spans the space**== — across aggression / defense / positioning / variance, the roster is diverse *by construction*, so content graded against it can't be overfit to one style.

## Axes of evaluation

### Per personality

1. **Is it a character (Stronghold)?** Can you name the plan this seat is running — its signature, the throughline that makes it *this* opponent and not a neighbour? A Personality whose behaviour you can't tell apart from the defaults, or from another row, has no character.
2. **Is it a readable puzzle (Punch-Out)?** Watching a match, can a player see the pattern and name the counter — or does the seat just make locally-strong moves with no legible plan to decode? An opponent you can only beat by playing stronger, never by *reading* it, fails the Punch-Out test even when it's fun to win against.
3. **Do its matches breathe?** Against real content, do its games swing — lead changes, momentum that shifts — rather than snowball from move one or grind to a stalemate? `Swings` (`leadChanges/done`) and `Drag` from `report-model.js`'s BANDS are the runnable evidence: a flat-`Swings`, high-`Drag` opponent is legible but not *fun* to fight. Read the reading, not the number.

### Across the set

4. **Does the panel span the archetypes?** Do the rows cover the four axes — aggression, defense, positioning, variance — or do several collapse onto the same corner (two brawlers wearing different names)? A panel that clusters can't catch content overfit to the style it's missing.
5. **Does content read as overfit against it?** This axis is the home for the panel's overfit lens (#101). Run the candidate through the existing symmetric sweep with `diff` = *each* Personality; the finding is the **per-archetype profile and its spread**, never a mean (the one summary that hides the exact overfit this panel exists to catch). A **wide BANDS spread across the panel** — great against one style, miserable against another — is the overfit signal; it is a *finding*, read-only on the exploratory Tolerances (HQ%, 0kill%, Tie%, Drag, Swings, Control%), with only `Red%`/`1st%` as a hard fairness floor. Overfit is a spread, not a win-rate fan-out.

## Related runnable checks (`docs/balance/`)

`Swings`/`Drag` per-match (`report-model.js` BANDS) are the evidence for axis 3;
the per-archetype panel spread — worst-case `Red%`/`1st%` fairness floor, the
exploratory Tolerances read-only — is the evidence for axis 5. Grade the
reading against peers on the same Deck; **smoke-check only, no numeric pin** —
the panel is a taste layer.

Roster stays an archetype *spread*, not a set of tuned rows: **brawler · turtle ·
hawk** are the seed characters; add a row only when a story-character (a
Commander's `personality`) needs one, never speculatively.
