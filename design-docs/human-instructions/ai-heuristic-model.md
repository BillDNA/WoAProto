#human-instructions #ai #code-architecture
# The AI, in plain English — how it thinks and every knob you can turn

This is the human-facing map of the War of Attrition AI. It answers the two
questions from feedback round 2: **what is the heuristic and what are the
weights**, and **where are the "5 AIs"**. Everything here lives in
`game/engine.js` (the brain) and `game/maps.js` (the personalities as data).

## Where the 5 AIs are (the "AI_PRESETS has only 3" question)

There is **one** AI engine. What looks like different opponents are just
different *rows of numbers* fed to it. Five ship today:

| Name    | Lives in            | What it is |
|---------|---------------------|------------|
| easy    | `engine.js` AI_PRESETS | greedy, but makes random mistakes |
| normal  | `engine.js` AI_PRESETS | greedy, no mistakes |
| hard    | `engine.js` AI_PRESETS | "Field Marshal" — looks one enemy reply deep |
| brawler | `maps.js` `"ai"` block | a normal AI tuned to trade and push forward |
| turtle  | `maps.js` `"ai"` block | a normal AI tuned to hug its HQ and dig in |

So `AI_PRESETS` in the engine holds **3**; the engine then merges in every row
of the `"ai"` block from `maps.js` (`Object.keys(BUILTIN.ai)…`), which adds
brawler and turtle → **5 total**. They all show up automatically in the menu
AI pickers, the Balance Dashboard, and `balance.js`. **Adding a sixth AI is
adding a row to `maps.js`, not writing code.**

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

A full hard battle simulates in ~1 second, so it's fine both live and in the
balance lab. Keep new personalities in that ballpark.

### The tie-breaker for burning cards (CARD_KEEP)
If the best play is to ignore a card's printed action and just use it as a
basic attack/reposition, the AI burns its **least precious** card, ranked by
`CARD_KEEP` in `engine.js` (Mass Assault 9 = hoard it; a plain deploy 3 = fine
to spend). This is why the Simple% column in the card report is biased: cheap
cards get burned more.

## Every weight (the `AI_WEIGHTS` table)

These are the multipliers in `evalState`. Defaults live in `engine.js`
(`AI_WEIGHTS`); a personality overrides any of them in its `weights:{}`.
Higher = the AI cares more about that thing.

| Weight | Default | Plain English |
|--------|--------:|---------------|
| `attrWin`      | 500  | Huge swing for being the projected attrition winner if the decks ran out now. Ramps up as cards run low. This is the anti-stalemate term — **don't zero it.** |
| `fsDiff`       | 8    | Value per point of field-score lead (surviving units on board), always on. |
| `fsDiffUrgent` | 40   | Extra value per point of field-score lead, scaled up as the game nears its end. |
| `unitOnBoard`  | 22   | Value of each of my deployed units (× the unit's worth). |
| `unitReserve`  | 16   | Value of each of my un-deployed reserves. Lower than on-board = mild nudge to actually field them. |
| `advance`      | 2.2  | Reward for my units being *closer* to the enemy HQ (per hex). Raise it to make the AI pushy. |
| `hqGuard`      | 4    | Bonus for a unit sitting next to my own HQ. |
| `enemyDist`    | 1.6  | Reward for keeping enemy units *far* from my HQ. |
| `myThreatHQ`   | 220  | Reward for having an attack that could take the enemy HQ next step. |
| `myThreatKill` | 3    | Reward per point of enemy unit I threaten to kill next step. |
| `threatHQ`     | 600  | Penalty for the enemy being able to take *my* HQ next step. |
| `threatKill`   | 6    | Penalty per point of my unit the enemy threatens to kill. |
| `threatTie`    | 2.5  | Penalty per point of my unit the enemy could trade with (tie). |
| `trenchHome`   | 6    | Bonus per trench dug near my own HQ. |
| `noopPenalty`  | 80   | Penalty for a plan that resolves **zero** actions (a dead turn). Anti-degeneracy — **don't zero it.** |
| `antiShuffle`  | 10   | Penalty for re-swapping the same pair of units it swapped last turn. Anti-degeneracy. |
| `fallbackBias` | 12   | Mild preference for a card's printed action over burning it. |

### The three dials that aren't weights
| Dial | Default | What it does |
|------|--------:|--------------|
| `noise`       | 0   | Random points added to each candidate's score. 60 (easy) = frequent mistakes; 0 = perfect play. |
| `breadth`     | 0   | How many top candidates get the look-ahead re-score. 0 = pure greedy; 3 = hard. |
| `replySamples`| 2   | How many hidden enemy hands to sample when looking ahead. |
| `replyWeight` | 0.7 | How heavily the enemy's best reply counts against a candidate. |

## The two shipped personalities (read them as examples)

From `maps.js` — copy the shape to make your own:

```
"brawler": { "noise": 0, "breadth": 0,
  "weights": { "myThreatKill": 7, "threatKill": 3, "advance": 4, "unitReserve": 10 } },
"turtle":  { "noise": 0, "breadth": 0,
  "weights": { "hqGuard": 12, "enemyDist": 3, "advance": 0.8, "trenchHome": 12, "unitOnBoard": 26 } }
```

- **brawler** cares more about killing (`myThreatKill`↑), fears trades less
  (`threatKill`↑), pushes forward harder (`advance`↑), and is happy to empty its
  reserves (`unitReserve`↓). It marches and trades.
- **turtle** hugs its HQ (`hqGuard`↑), pushes enemies away (`enemyDist`↑),
  barely advances (`advance`↓), loves trenches (`trenchHome`↑), and prizes units
  on the board (`unitOnBoard`↑). It digs in and waits for the attrition clock.

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

**Guardrail:** never ship a personality that zeroes `noopPenalty`,
`antiShuffle`, or `attrWin` without re-measuring — those three are the fixes
that killed the round-5/6 swap-dance stalemate. Zero them and it comes back.
