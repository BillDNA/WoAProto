# Balance report — hard vs hard AI

_Rules version 1.0 · 12 map(s) · 1200 battles (this run only, not accumulated) · deck iter2 · mapset iter2 · ±10 pts/map · dev/balance-report.js_

## Maps

| Map | Shape | Red% | 1st% | HQ% | Turns | VPdiff | Atk | Swp | 0kill% | Tie% | Drag | Swings | Balance | Notes |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| Causeway | compact | 62 | 50 | 13 | 30.0 | 2.0 | 6.3 | 5.4 | 2 | 16 | 1.1 | 2.3 | 11.6 | SIDE-BIASED |
| Frontier | classic | 54 | 46 | 17 | 29.2 | 1.6 | 4.4 | 5.2 | 1 | 18 | 1.2 | 2.5 | 7.0 |  |
| Long March | spear | 50 | 42 | 2 | 32.7 | 1.9 | 4.9 | 7.0 | 0 | 16 | 1.6 | 2.9 | 4.6 | attrition-only |
| Saber Ridge | ridge | 50 | 56 | 25 | 28.5 | 1.8 | 6.3 | 3.4 | 1 | 12 | 0.9 | 2.7 | 2.3 |  |
| The Clearing | compact | 46 | 46 | 9 | 30.7 | 1.6 | 6.2 | 5.4 | 0 | 19 | 1.5 | 3.0 | 5.4 |  |
| The Cockpit | compact | 52 | 54 | 28 | 26.0 | 2.1 | 5.9 | 4.2 | 4 | 9 | 1.0 | 2.4 | 4.5 |  |
| The Col | hourglass | 46 | 52 | 26 | 25.7 | 2.0 | 4.8 | 4.1 | 9 | 14 | 1.6 | 2.2 | 9.6 |  |
| The Ford | compact | 49 | 53 | 28 | 25.0 | 1.8 | 5.6 | 4.2 | 10 | 14 | 1.1 | 2.4 | 7.4 |  |
| The Marshes | custom | 54 | 44 | 19 | 28.3 | 1.9 | 6.1 | 4.7 | 0 | 17 | 1.5 | 2.8 | 7.2 |  |
| The Narrows | hourglass | 51 | 37 | 8 | 31.0 | 2.0 | 5.2 | 7.1 | 1 | 15 | 2.2 | 3.0 | 11.0 | 2nd-mover strong, attrition-only |
| The Void | custom | 52 | 48 | 10 | 30.7 | 1.8 | 4.4 | 7.3 | 0 | 11 | 1.7 | 3.0 | -1.1 | **best balance** |
| The Weir | ridge | 49 | 45 | 10 | 30.2 | 1.9 | 5.4 | 6.2 | 5 | 18 | 1.1 | 3.0 | 5.8 |  |

_Balance column: lower = fairer + more back-and-forth (|red−50| + |1st−50| + penalties for zero-kill/tie-decided/drag, minus a reward for lead swings). Heuristic — Bill decides._

## Overall

- red 51% · first mover 48% · HQ captures 16% · avg battle 29.0 turns
- Behaviour: 5.5 attacks & 5.3 swaps/battle · zero-kill 3% · 91% of units ever fielded
- Decisiveness: tie-goes-to-2nd decided 15% · first blood won 64% of the 97% of battles with a kill · more-hexes side won 89%
- Pacing: 1.4 kill-less turns before end (0=decisive, ~32=circling) · 2.7 lead swings/battle (higher = more back-and-forth)

## Cards (1200 battles)

| Card | Win% | Simple% | Noop% | 1stSight% | AvgSeen | Plays |
|---|--:|--:|--:|--:|--:|--:|
| Deploy Cavalry | 52 | 0 | 0 | 80 | 1.23 | 2253 |
| Deploy Artillery | 50 | 1 | 0 | 67 | 1.50 | 2148 |
| Conscription | 52 | 1 | 1 | 63 | 1.57 | 2194 |
| Airdrop | 50 | 13 | 26 | 23 | 4.34 | 2083 |
| Deploy Infantry | 50 | 15 | 28 | 19 | 4.62 | 2087 |
| Entrench | 49 | 4 | 7 | 13 | 4.90 | 6334 |
| Storm and Hold | 50 | 4 | 0 | 7 | 5.03 | 2094 |
| Shock Troops | 51 | 4 | 0 | 6 | 6.30 | 4269 |
| Careful Maneuvers | 51 | 1 | 0 | 5 | 4.83 | 2107 |
| Reckless Maneuvers | 50 | 0 | 0 | 5 | 4.20 | 2067 |
| Forced March | 50 | 4 | 0 | 4 | 4.53 | 2062 |
| Sappers | 50 | 1 | 0 | 3 | 5.06 | 2036 |
| Naval Barrage | 50 | 0 | 0 | 2 | 5.06 | 2069 |

#reports #balance #v1-0

