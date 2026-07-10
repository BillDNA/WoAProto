# Balance report — hard vs hard AI

_Rules version 1.0 · 12 map(s) · 1200 battles (this run only, not accumulated) · deck bestof · mapset bestof · ±10 pts/map · dev/balance-report.js_

## Maps

| Map | Shape | Red% | 1st% | HQ% | Turns | VPdiff | Atk | Swp | 0kill% | Tie% | Drag | Swings | Balance | Notes |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| Causeway | compact | 47 | 45 | 15 | 29.6 | 2.2 | 6.7 | 3.6 | 1 | 9 | 2.0 | 2.7 | 4.2 | **best balance** |
| Frontier | classic | 61 | 35 | 13 | 30.3 | 2.1 | 5.1 | 3.2 | 3 | 13 | 2.2 | 2.5 | 25.1 | 2nd-mover strong |
| Long March | spear | 49 | 35 | 3 | 32.4 | 2.0 | 5.2 | 4.4 | 2 | 16 | 2.9 | 2.8 | 14.7 | 2nd-mover strong, attrition-only |
| Saber Ridge | ridge | 52 | 44 | 18 | 30.1 | 2.5 | 7.1 | 3.0 | 2 | 8 | 1.6 | 2.6 | 4.6 |  |
| The Clearing | compact | 43 | 55 | 17 | 29.1 | 2.3 | 6.5 | 3.5 | 2 | 11 | 2.1 | 2.3 | 10.6 |  |
| The Cockpit | compact | 51 | 53 | 37 | 24.4 | 2.5 | 5.7 | 2.8 | 7 | 9 | 1.7 | 1.9 | 6.0 |  |
| The Ford | compact | 49 | 59 | 23 | 27.4 | 2.3 | 6.4 | 3.4 | 5 | 9 | 2.2 | 2.3 | 9.6 |  |
| The Marshes | custom | 57 | 57 | 27 | 26.6 | 2.4 | 6.2 | 3.1 | 5 | 8 | 1.8 | 2.2 | 13.4 |  |
| The Narrows | hourglass | 48 | 46 | 29 | 26.2 | 2.1 | 4.7 | 3.8 | 4 | 16 | 2.4 | 2.1 | 7.8 |  |
| The Sluice | hourglass | 47 | 43 | 21 | 28.2 | 2.3 | 4.9 | 4.3 | 4 | 11 | 2.6 | 2.5 | 9.2 |  |
| The Void | custom | 47 | 43 | 20 | 28.5 | 1.9 | 4.3 | 4.6 | 6 | 18 | 2.4 | 2.5 | 12.4 |  |
| The Weir | ridge | 56 | 46 | 20 | 27.5 | 2.2 | 5.3 | 3.9 | 15 | 9 | 2.0 | 2.6 | 14.6 |  |

_Balance column: lower = fairer + more back-and-forth (|red−50| + |1st−50| + penalties for zero-kill/tie-decided/drag, minus a reward for lead swings). Heuristic — Bill decides._

## Overall

- red 51% · first mover 47% · HQ captures 20% · avg battle 28.3 turns
- Behaviour: 5.7 attacks & 3.6 swaps/battle · zero-kill 5% · 89% of units ever fielded
- Decisiveness: tie-goes-to-2nd decided 11% · first blood won 61% of the 95% of battles with a kill · more-hexes side won 91%
- Pacing: 2.1 kill-less turns before end (0=decisive, ~32=circling) · 2.4 lead swings/battle (higher = more back-and-forth)

## Cards (1200 battles)

| Card | Win% | Simple% | Noop% | 1stSight% | AvgSeen | Plays |
|---|--:|--:|--:|--:|--:|--:|
| Deploy Cavalry | 52 | 0 | 0 | 80 | 1.23 | 2269 |
| Deploy Artillery | 50 | 0 | 0 | 69 | 1.43 | 2184 |
| Airdrop | 50 | 1 | 0 | 31 | 2.55 | 2083 |
| Vanguard | 49 | 0 | 0 | 26 | 2.55 | 2089 |
| Entrench | 50 | 0 | 0 | 16 | 3.70 | 6308 |
| Storm and Hold | 50 | 26 | 0 | 10 | 5.83 | 1994 |
| Shock Troops | 51 | 0 | 0 | 8 | 4.19 | 4161 |
| Over the Top | 53 | 0 | 0 | 7 | 4.29 | 2118 |
| Reckless Maneuvers | 50 | 0 | 0 | 6 | 4.53 | 1998 |
| Creeping Barrage | 50 | 1 | 0 | 5 | 4.53 | 1992 |
| Naval Barrage | 50 | 2 | 0 | 3 | 5.31 | 1968 |
| Attack +1 | 50 | 33 | 0 | 0 | 13.75 | 3897 |

#reports #balance #v1-0

