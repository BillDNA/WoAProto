---
last-reviewed: 2026-07-10
---
#human-instructions #ai #code-architecture
# The AI, in plain English — how it thinks and every knob you can turn

This is the human-facing map of the War of Attrition AI. It answers the two
questions from feedback round 2: **what is the heuristic and what are the
weights**, and **where are the "5 AIs"**. Everything here lives in
`game/engine/05-ai.js` (the brain — the only engine part AI work touches) and
`game/maps.js` (the personalities as data).

> The tables marked with `<!-- GEN:… -->` comments are **generated** from the
> engine by `node dev/gen-docs.js` — edit the code (or gen-docs' description
> map), rerun the tool, and never hand-edit between the markers.

## Where the 6 AIs are (the "AI_PRESETS has only 3" question)

There is **one** AI engine. What looks like different opponents are just
different *rows of numbers* fed to it. Six ship today:

| Name    | Lives in            | What it is |
|---------|---------------------|------------|
| easy    | `engine/05-ai.js` AI_PRESETS | greedy, but makes random mistakes |
| normal  | `engine/05-ai.js` AI_PRESETS | greedy, no mistakes |
| hard    | `engine/05-ai.js` AI_PRESETS | "Field Marshal" — looks one enemy reply deep |
| brawler | `maps.js` `"ai"` block | a normal AI tuned to trade and push forward |
| turtle  | `maps.js` `"ai"` block | a normal AI tuned to hug its HQ and dig in |
| hawk    | `maps.js` `"ai"` block | a normal AI that prizes its army and takes even trades |

So `AI_PRESETS` in `engine/05-ai.js` holds **3**; the engine then merges in
every row of the `"ai"` block from `maps.js` (`Object.keys(BUILTIN.ai)…`),
which adds brawler, turtle, and hawk → **6 total**. They all show up
automatically in the menu AI pickers, the Balance Dashboard, and `balance.js`.
**Adding another AI is adding a row to `maps.js`, not writing code.**

## How a turn is decided (the heuristic)

Every turn the AI does a small greedy search:

1. **List every legal play** it could make this turn (which card, played as its
   printed action / as a basic attack / as a basic reposition), and for
   multi-step cards, resolve each step by picking the best option for that step.
2. **Score the resulting board** with `evalState` — one number, higher = better
   for the AI. It's a weighted sum of the terms in the table below.
3. **Add randomness** equal to `noise` (easy makes mistakes; normal/hard don't).
4. **(hard only) Look one move ahead.** The top `breadth` candidates are
   re-scored by subtracting the opponent's *best sampled reply*. The opponent's
   hidden hand is **resampled from public information** (deck + discards) — the
   AI never peeks at the real enemy hand. This is the only difference between
   normal and hard.
5. **Play the highest-scoring candidate.**

A full hard battle simulates in about a second, so it's fine both live and in
the Balance Dashboard / `balance.js` runs. Keep new personalities in that
ballpark.

### The tie-breaker for burning cards (CARD_KEEP)
If the best play is to ignore a card's printed action and just use it as a
basic attack/reposition, the AI burns its **least precious** card, ranked by
`CARD_KEEP` in `engine/05-ai.js` (Mass Assault 9 = hoard it; a plain deploy
3 = fine to spend). This is why the Simple% column in the card report is
biased: cheap cards get burned more.

## Every weight (the `AI_WEIGHTS` table)

These are the multipliers in `evalState`. Defaults live in `engine/05-ai.js`
(`AI_WEIGHTS`); a personality overrides any of them in its `weights:{}`.
Higher = the AI cares more about that thing. (Generated table — a weight
reading "TODO — describe me" is new and needs a description in
`dev/gen-docs.js`.)

<!-- GEN:weights -->
| Weight | Default | Plain English |
|--------|--------:|---------------|
| `attrWin` | 500 | Huge swing for being the projected attrition winner if the decks ran out now. Ramps up as cards run low. This is the anti-stalemate term — **don't zero it.** |
| `fsDiff` | 8 | Value per point of field-score lead (surviving units on board), always on. |
| `fsDiffUrgent` | 40 | Extra value per point of field-score lead, scaled up as the game nears its end. |
| `unitOnBoard` | 22 | Value of each of my deployed units (× the unit's worth). |
| `unitReserve` | 16 | Value of each of my un-deployed reserves. Lower than on-board = mild nudge to actually field them. |
| `unitValInfantry` | 3 | The AI's worth of one infantry, multiplied into the unit/threat terms. V1: a weight, so the tuner and personalities can sweep it. |
| `unitValCavalry` | 4 | The AI's worth of one cavalry (see `unitValInfantry`). |
| `unitValArtillery` | 5 | The AI's worth of one artillery (see `unitValInfantry`). |
| `advance` | 2.2 | Reward for my units being *closer* to the enemy HQ (per hex). Raise it to make the AI pushy. |
| `hqGuard` | 4 | Bonus for a unit sitting next to my own HQ. |
| `enemyDist` | 1.6 | Reward for keeping enemy units *far* from my HQ. |
| `myThreatHQ` | 220 | Reward for having an attack that could take the enemy HQ next step. |
| `myThreatKill` | 3 | Reward per point of enemy unit I threaten to kill next step. |
| `threatHQ` | 600 | Penalty for the enemy being able to take *my* HQ next step. |
| `threatKill` | 6 | Penalty per point of my unit the enemy threatens to kill. |
| `threatTie` | 2.5 | Penalty per point of my unit the enemy could trade with (tie). |
| `trenchHome` | 6 | Bonus per trench dug near my own HQ. |
| `trenchFacing` | 3 | V1: bonus per covered trench edge that faces a **live enemy lane** (an enemy unit within 2 hexes of the far side of the denied border). This is what makes trench *orientation* a real choice — see below. |
| `noopPenalty` | 80 | Penalty for a plan that resolves **zero** actions (a dead turn). Anti-degeneracy — **don't zero it.** |
| `antiShuffle` | 10 | Penalty for re-swapping the same pair of units it swapped last turn. Anti-degeneracy. |
| `fallbackBias` | 12 | Mild preference for a card's printed action over burning it. |
| `shortlist` | 40 | V1 search dial: when a step has more options than this, keep the top N by a cheap static pre-rank (winning attacks first, advances next, swaps last). Replaces the old **random** 80-cap that could discard the best move. Lower = faster + more approximate — lab personalities can crank it down. |
<!-- /GEN:weights -->

### How the AI picks a trench's orientation (Bill's Round-3/5 question)

Before V1 the honest answer was "it doesn't": `trenchHome` was orientation-blind,
so unless a live enemy attack happened to cross one of the candidate borders
(where support denial shows up in `threatKill`/`threatHQ`), every facing scored
the same and the first one in enumeration order won — which is how the
Feedback-Round-2 "trench facing nowhere" happened.

Since V1 the orientation is explicit: each covered edge that faces a live enemy
lane (enemy unit within 2 hexes of the hex across the denied border) earns
`trenchFacing` points, counted for trenches on my units' hexes or shielding my
HQ. Same-facing ties still fall back to enumeration order, but a trench that
blocks a real approach now always beats one facing an empty flank. The cheap
pre-rank (`shortlist`) uses the same signal, so useful facings also survive the
branching cut.

### The three dials that aren't weights
| Dial | Default | What it does |
|------|--------:|--------------|
| `noise`       | 0   | Random points added to each candidate's score. 60 (easy) = frequent mistakes; 0 = perfect play. |
| `breadth`     | 0   | How many top candidates get the look-ahead re-score. 0 = pure greedy; 3 = hard. |
| `replySamples`| 2   | How many hidden enemy hands to sample when looking ahead. |
| `replyWeight` | 0.7 | How heavily the enemy's best reply counts against a candidate. |

### The branching shortlist (V1)

One weight doubles as a search dial: `shortlist`. When a single step offers
more options than it (default 40), the AI keeps only the top-`shortlist`
candidates by a cheap static pre-rank — winning attacks first, advances toward
the enemy HQ next, swaps last — and fully evaluates just those. Before V1 the
cap was 80 **random** options, which could silently discard the best move; the
pre-rank keeps the promising ones by construction (and it's the same ranking
`dev/claude-plays.js --k` uses to shortlist options for the LLM). Turn it down
in a lab personality for speed, at the cost of occasionally missing a subtle
reposition.

### Tuning the weights offline

`node dev/tune-weights.js` sweeps chosen weight keys by coordinate descent
(`--keys advance,threatTie --n 16 --ai normal`…), scoring each candidate with
the shared balance score from `game/report-model.js` on a fixed seed schedule.
It prints suggestions and **never writes engine files** — Bill decides.

## The shipped personalities (read them as examples)

From `maps.js` — copy the shape to make your own (generated list; the prose
below is hand-written):

<!-- GEN:personalities -->
```
"brawler": { "noise": 0, "breadth": 0,
  "weights": { "myThreatKill": 7, "threatKill": 3, "advance": 4, "unitReserve": 10 } },
"turtle": { "noise": 0, "breadth": 0,
  "weights": { "hqGuard": 12, "enemyDist": 3, "advance": 0.8, "trenchHome": 12, "unitOnBoard": 26 } },
"hawk": { "noise": 0, "breadth": 0,
  "weights": { "unitOnBoard": 28, "advance": 3.25, "myThreatKill": 5, "threatKill": 5, "threatTie": 0.5 } },
"tuned": { "noise": 0, "breadth": 3,
  "weights": { "enemyDist": 2.4, "fsDiff": 4, "threatTie": 1.88 } }
```
<!-- /GEN:personalities -->

- **brawler** cares more about killing (`myThreatKill`↑), fears trades less
  (`threatKill`↑), pushes forward harder (`advance`↑), and is happy to empty its
  reserves (`unitReserve`↓). It marches and trades.
- **turtle** hugs its HQ (`hqGuard`↑), pushes enemies away (`enemyDist`↑),
  barely advances (`advance`↓), loves trenches (`trenchHome`↑), and prizes units
  on the board (`unitOnBoard`↑). It digs in and waits for the attrition clock.
- **hawk** prizes its fielded army (`unitOnBoard`↑), pushes forward (`advance`↑),
  hunts kills (`myThreatKill`↑) while fearing losses a touch less than stock
  (`threatKill` 5 vs the default 6), and all but ignores tie threats
  (`threatTie` 0.5 vs 2.5) — it will happily take an even trade.

First read from the lab: turtle beat brawler ~65/35 (untuned — these are
examples, not balanced archetypes).

## How to change or add an AI

1. **Tweak an archetype:** edit its `weights` in `maps.js`. No code.
2. **Add a new one:** add a row to the `"ai"` block in `maps.js` with any
   subset of the weights above. It auto-appears everywhere.
3. **Measure it:** `node game/balance.js matchup 16 <yours> normal` (pit it vs
   a preset) or `node game/balance.js 40 <yours>` (per-map report driven by it).
   Watch the Behaviour + Pacing lines — if attacks/swaps or Drag/Swings move
   sharply, you changed the *feel*, not just the win rate.
4. **Regenerate this doc:** `node dev/gen-docs.js` (new weights need a
   description in its map, new personalities appear in the list above
   automatically).

**Guardrail:** never ship a personality that zeroes `noopPenalty`,
`antiShuffle`, or `attrWin` without re-measuring — those three are the fixes
that killed the round-5/6 swap-dance stalemate. Zero them and it comes back.
