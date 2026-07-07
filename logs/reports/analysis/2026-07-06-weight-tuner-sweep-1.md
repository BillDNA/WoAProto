# Weight-tuner sweep #1 — suggestions for Bill (July 2026, rules 1.0)

First run of the committed tuner (`node dev/tune-weights.js`, defaults:
6-map spread subset, n=16/map/candidate, normal AI, one coordinate-descent
pass, common random numbers, anti-degeneracy guardrails on). 6.5 minutes.

## The suggestions (NOT adopted — your call)

| weight | current | suggested | subset fitness after |
|---|--:|--:|--:|
| advance | 2.2 | 3.3 | 18.1 |
| enemyDist | 1.6 | 2.4 | 17.2 |
| fsDiff | 8 | 4 | 15.3 |
| myThreatKill | 3 | 1.5 | 14.0 |
| threatTie | 2.5 | 3.75 | 8.5 |

(baseline fitness 19.1; lower = fairer + more back-and-forth. trenchHome,
trenchFacing, unitReserve: no candidate beat the default by a real margin.)

## Reading it

- The direction is coherent: **more aggression** (advance up), **more HQ
  defense awareness** (enemyDist up), **less raw score-chasing** (fsDiff down),
  **respect ties more** (threatTie up — makes the AI avoid trades that hand the
  tie-goes-to-2nd win away, which was the biggest 0.x complaint).
- The guardrails did their job mid-sweep: advance=4.4 won on fitness but
  spiked zero-kill battles to 9% and was rejected; two low-advance candidates
  were rejected for swap-dancing.
- **Caveats before adopting anything**: 6-map subset + n=16 is a screening
  run, not a verdict; coordinate descent is path-dependent (keys interact);
  this tuned NORMAL — hard's reply search may want different values.

## Suggested verification recipe (if you like the direction)

1. `node dev/tune-weights.js --n 40 --iters 2` (a slower, firmer pass)
2. Apply the survivors to a personality row in maps.js (e.g. "tuned") and pit
   it: `node game/balance.js matchup 16 tuned normal` — it should WIN, not
   just score well.
3. If adopted into AI_WEIGHTS: bump the rules version (data-era rule) and run
   `node dev/gen-docs.js` so the doc table follows.

## Full sweep log

```
tune-weights: normal AI, 6 maps (Saber Ridge, Frontier, The Cockpit, Riverbend, The Narrows, The Marshes), n=16/map/candidate
sweeping: advance, enemyDist, trenchHome, trenchFacing, fsDiff, unitReserve, myThreatKill, threatTie  scales: 0.5,0.75,1.5,2
baseline fitness 19.1  (atk 5.9 swp 3.0 0kill 3% tie 5%)
  advance=1.1 -> 18.8  [swap-dancing up (4.9 vs 3.0)]
  advance=1.65 -> 19.3  [swap-dancing up (4.9 vs 3.0)]
  advance=3.3 -> 18.1
  advance=4.4 -> 28.4  [zero-kill battles up (9%)]
  * keeping advance=3.3 (fitness 19.1 -> 18.1)
  enemyDist=0.8 -> 20.4
  enemyDist=1.2 -> 18.1
  enemyDist=2.4 -> 17.2
  enemyDist=3.2 -> 20.0
  * keeping enemyDist=2.4 (fitness 18.1 -> 17.2)
  trenchHome=3 -> 17.0
  trenchHome=4.5 -> 17.0
  trenchHome=9 -> 17.8
  trenchHome=12 -> 18.2
  trenchFacing=1.5 -> 17.0
  trenchFacing=2.25 -> 17.1
  trenchFacing=4.5 -> 17.7
  trenchFacing=6 -> 20.4
  fsDiff=4 -> 15.3
  fsDiff=6 -> 17.5
  fsDiff=12 -> 17.8
  fsDiff=16 -> 20.1
  * keeping fsDiff=4 (fitness 17.2 -> 15.3)
  unitReserve=8 -> 18.4
  unitReserve=12 -> 21.3
  unitReserve=24 -> 44.4  [attacks collapsed (2.5 vs 5.9); zero-kill battles up (45%)]
  unitReserve=32 -> 46.8  [attacks collapsed (2.6 vs 5.9); zero-kill battles up (44%)]
  myThreatKill=1.5 -> 14.0
  myThreatKill=2.25 -> 19.6
  myThreatKill=4.5 -> 21.7
  myThreatKill=6 -> 18.9
  * keeping myThreatKill=1.5 (fitness 15.3 -> 14.0)
  threatTie=1.25 -> 22.0
  threatTie=1.88 -> 19.2
  threatTie=3.75 -> 8.5
  threatTie=5 -> 13.9
  * keeping threatTie=3.75 (fitness 14.0 -> 8.5)

==== SUGGESTIONS (6.5 min) ====
| weight | current | suggested | fitness after |
|---|--:|--:|--:|
| advance | 2.2 | 3.3 | 18.1 |
| enemyDist | 1.6 | 2.4 | 17.2 |
| fsDiff | 8 | 4 | 15.3 |
| myThreatKill | 3 | 1.5 | 14.0 |
| threatTie | 2.5 | 3.75 | 8.5 |

Verify on the full roster before adopting: node game/balance.js 60 normal
Adopt by editing AI_WEIGHTS in game/engine/05-ai.js (and bump the rules version —
weight changes shift the data baseline). Suggestions only — Bill decides.
```

#reports #analysis
