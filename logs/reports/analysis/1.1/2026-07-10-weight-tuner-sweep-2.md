# Weight-tuner sweep #2 — the firmer pass (July 2026, rules 1.1)

The verification recipe Bill required for Q.2 (`node dev/tune-weights.js --n 40 --iters 2`):
6-map spread subset, n=40/map/candidate, normal AI, two coordinate-descent passes, common random
numbers, anti-degeneracy guardrails on. 34.7 minutes, run under **rules 1.1** (sweep #1 ran under 1.0).

## Survivors — REJECTED at the matchup gate (tuned lost to hard, 44% of 192)

| weight | current | suggested | subset fitness after |
|---|--:|--:|--:|
| enemyDist | 1.6 | 2.4 | 6.2 |
| fsDiff | 8 | 4 | 5.6 |
| threatTie | 2.5 | 1.88 | 4.0 |

(baseline fitness 7.7 — already far below 1.0's 19.1 baseline, i.e. the 1.1 trench tie-survival
rules alone bought most of what sweep #1 was chasing.)

## Reading it — how 1.1 changed the answer

- **advance and myThreatKill fell out.** Sweep #1's survivors advance 3.3 and myThreatKill 1.5 no
  longer beat baseline under 1.1 (advance candidates scored 10.5–46.3 vs 7.7; myThreatKill's best,
  4.5 → 6.0, didn't hold in pass 2). The extra aggression 1.0 wanted is already priced in by the
  tie-survival rules.
- **threatTie flipped direction.** Under 1.0 the survivor was 3.75 ("respect ties more"); under 1.1
  it's 1.88 — *below* the current 2.5. With trenches sparing defenders on ties, over-weighting tie
  threats now reads as timidity. This is the Q.3 (threatTie lever) finding.
- **enemyDist 2.4 and fsDiff 4 reproduced** across both rules eras and both sweep intensities —
  the most robust pair in the set.
- Guardrails held: advance=4.4 and unitReserve≥24 rejected both passes (attack collapse / zero-kill
  spikes).
- Pass 2 refined nothing further — every pass-2 candidate lost to the pass-1 result (4.0), so
  coordinate descent converged in one pass on this subset.

## Full sweep log

```
tune-weights: normal AI, 6 maps (Saber Ridge, Frontier, The Cockpit, Riverbend, The Narrows, The Marshes), n=40/map/candidate
sweeping: advance, enemyDist, trenchHome, trenchFacing, fsDiff, unitReserve, myThreatKill, threatTie  scales: 0.5,0.75,1.5,2
baseline fitness 7.7  (atk 6.5 swp 3.6 0kill 2% tie 9%)
  advance=1.1 -> 11.3
  advance=1.65 -> 12.6
  advance=3.3 -> 10.5
  advance=4.4 -> 46.3  [attacks collapsed (4.4 vs 6.5); zero-kill battles up (10%)]
  enemyDist=0.8 -> 8.3
  enemyDist=1.2 -> 8.1
  enemyDist=2.4 -> 6.2
  enemyDist=3.2 -> 6.8
  * keeping enemyDist=2.4 (fitness 7.7 -> 6.2)
  trenchHome=3 -> 6.4
  trenchHome=4.5 -> 6.4
  trenchHome=9 -> 7.6
  trenchHome=12 -> 6.8
  trenchFacing=1.5 -> 6.0
  trenchFacing=2.25 -> 6.2
  trenchFacing=4.5 -> 8.0
  trenchFacing=6 -> 7.9
  fsDiff=4 -> 5.6
  fsDiff=6 -> 6.9
  fsDiff=12 -> 8.1
  fsDiff=16 -> 7.9
  * keeping fsDiff=4 (fitness 6.2 -> 5.6)
  unitReserve=8 -> 6.3
  unitReserve=12 -> 5.7
  unitReserve=24 -> 60.0  [attacks collapsed (2.4 vs 6.5); zero-kill battles up (53%)]
  unitReserve=32 -> 55.5  [attacks collapsed (2.3 vs 6.5); zero-kill battles up (52%)]
  myThreatKill=1.5 -> 6.9
  myThreatKill=2.25 -> 6.5
  myThreatKill=4.5 -> 6.0
  myThreatKill=6 -> 12.1
  threatTie=1.25 -> 4.8
  threatTie=1.88 -> 4.0
  threatTie=3.75 -> 8.0
  threatTie=5 -> 8.0
  * keeping threatTie=1.88 (fitness 5.6 -> 4.0)
  advance=1.1 -> 11.1  [swap-dancing up (5.4 vs 3.6)]
  advance=1.65 -> 5.3
  advance=3.3 -> 9.0
  advance=4.4 -> 43.3  [attacks collapsed (4.5 vs 6.5); zero-kill battles up (10%)]
  enemyDist=1.2 -> 7.0
  enemyDist=1.8 -> 7.6
  enemyDist=3.6 -> 6.5
  enemyDist=4.8 -> 5.2
  trenchHome=3 -> 5.4
  trenchHome=4.5 -> 5.8
  trenchHome=9 -> 4.8
  trenchHome=12 -> 6.5
  trenchFacing=1.5 -> 5.3
  trenchFacing=2.25 -> 4.9
  trenchFacing=4.5 -> 4.8
  trenchFacing=6 -> 4.6
  fsDiff=2 -> 4.3
  fsDiff=3 -> 4.3
  fsDiff=6 -> 6.1
  fsDiff=8 -> 5.5
  unitReserve=8 -> 6.9
  unitReserve=12 -> 4.8
  unitReserve=24 -> 58.3  [attacks collapsed (2.4 vs 6.5); zero-kill battles up (50%)]
  unitReserve=32 -> 54.9  [attacks collapsed (2.4 vs 6.5); zero-kill battles up (52%)]
  myThreatKill=1.5 -> 4.4
  myThreatKill=2.25 -> 4.5
  myThreatKill=4.5 -> 4.2
  myThreatKill=6 -> 13.1
  threatTie=0.94 -> 7.0
  threatTie=1.41 -> 7.0
  threatTie=2.82 -> 6.0
  threatTie=3.76 -> 7.4

==== SUGGESTIONS (34.7 min) ====
| weight | current | suggested | fitness after |
|---|--:|--:|--:|
| enemyDist | 1.6 | 2.4 | 6.2 |
| fsDiff | 8 | 4 | 5.6 |
| threatTie | 2.5 | 1.88 | 4.0 |
```

#reports #analysis #v1-1
