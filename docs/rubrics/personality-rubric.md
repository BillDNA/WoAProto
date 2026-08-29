---
summary: What makes a good War of Attrition Personality — an AI opponent that is a distinct in-theme character *and* a legible tactical puzzle, in a panel that spans the archetype space so content isn't tuned to one optimal style.
applies-to: any Personality in the panel (a `maps.js` `ai` weight-override row, bound to a Commander via `commander.personality`) — one row under review, a proposed new one, or the panel as a whole. Read Personalities only against content measured with the same Deck + Mapset.
---
# Personality rubric

A Personality is one AI opponent — a shallow `AI_WEIGHTS` override that makes a
seat *play like someone*. This rubric judges whether facing it is **fun to play
against** — the twin **Stronghold** and **Punch-Out** tests defined in
`CONTEXT.md`, both required — and whether the panel of them is diverse enough
that content graded across it isn't overfit to a single optimal style. It grades
taste; the per-panel spread numbers and the fairness Tolerances (`Red%`/`1st%`)
that hard-gate it live in `docs/balance/`.

## Goals

* ==**every opponent is someone**== — each Personality plays a recognizable, in-theme character (Stronghold), not an anonymous optimizer.
* ==**the puzzle is solvable**== — its plan is legible enough to learn and beat on purpose (Punch-Out), not just out-rolled.
* ==**the panel spans the space**== — across aggression / defense / positioning / variance, the roster is diverse *by construction*, so content graded against it can't be overfit to one style.

## Axes of evaluation

### Per personality

1. **Can you name its plan (Stronghold)?** Watching it play, can you state the throughline that makes it *this* opponent and not a neighbour — the signature you'd describe in a sentence? A Personality you can't tell apart from the defaults, or from another row, has no character to be fun.
2. **Can you name the counter (Punch-Out)?** Can a player see the pattern across a match and say how to beat it — or does the seat just make locally-strong moves with no plan to decode? An opponent you can only beat by playing stronger, never by *reading* it, fails even when winning against it feels good.
3. **Do its matches breathe?** With Deck and Map held fixed across the panel — so the swinginess reads on the seat, not the battlefield — do its games shift momentum and change leads, rather than snowball from move one or grind to a stalemate? A flat, grinding opponent can be legible and still not fun to fight. `Swings`/`Drag` are the evidence (see below); read the reading, not the number.

### Across the set

4. **Does the roster cluster?** Do the rows reach into all four corners — aggression, defense, positioning, variance — or do several collapse onto the same one (two brawlers wearing different names)? A panel that clusters is blind to content overfit to exactly the style it's missing.
5. **Does content read as overfit against it?** This is the home for the panel's overfit finding: the measured *effect* of axis 4's clustering on a content candidate. Read the **per-archetype profile and its spread**, never a mean (the one summary that hides the exact overfit this panel exists to catch). A **wide spread across the panel** — great against one style, miserable against another — is the overfit signal. It is a *finding*, read-only on the exploratory metrics, with only `Red%`/`1st%` as a hard fairness floor: overfit is a spread, not a win-rate fan-out.

## Related runnable checks (`docs/balance/`)

`Swings` (`leadChanges/done`) and `Drag` from `report-model.js`'s BANDS are the
per-match evidence for axis 3; the per-archetype panel spread — worst-case
`Red%`/`1st%` fairness floor, the exploratory metrics (HQ%, 0kill%, Tie%, Drag,
Swings, Control%) read-only — is the evidence for axis 5. Grade the reading
against peers on the same Deck; **smoke-check only, no numeric pin** — the panel
is a taste layer.

Roster stays an archetype *spread*, not a set of tuned rows: **brawler · turtle ·
hawk** are the seed characters; add a row only when a story-character (a
Commander's `personality`) needs one, never speculatively.
