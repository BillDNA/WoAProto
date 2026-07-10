# Balance report — hard vs hard AI

_Rules version 1.0 · 12 map(s) · 1200 battles (this run only, not accumulated) · deck iter3 · mapset iter3 · ±10 pts/map · dev/balance-report.js_

## Maps

| Map | Shape | Red% | 1st% | HQ% | Turns | VPdiff | Atk | Swp | 0kill% | Tie% | Drag | Swings | Balance | Notes |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| Frontier | classic | 41 | 37 | 18 | 29.2 | 1.5 | 3.7 | 6.8 | 4 | 24 | 2.0 | 2.5 | 24.9 | 2nd-mover strong |
| Long March | spear | 46 | 32 | 2 | 32.7 | 1.4 | 4.0 | 10.0 | 0 | 32 | 2.2 | 2.7 | 24.4 | 2nd-mover strong, attrition-only |
| Saber Ridge | ridge | 48 | 42 | 21 | 29.5 | 2.0 | 5.5 | 6.4 | 4 | 24 | 1.8 | 2.5 | 12.9 |  |
| The Cauldron | custom | 55 | 59 | 29 | 25.7 | 2.0 | 4.9 | 6.0 | 12 | 15 | 1.5 | 2.1 | 20.1 |  |
| The Clearing | compact | 46 | 48 | 22 | 27.9 | 2.2 | 5.1 | 7.3 | 4 | 23 | 1.5 | 2.1 | 9.5 |  |
| The Cockpit | compact | 54 | 62 | 35 | 24.5 | 2.4 | 5.0 | 6.0 | 9 | 8 | 1.4 | 1.9 | 18.8 | 1st-mover strong |
| The Ford | compact | 48 | 58 | 26 | 26.7 | 2.1 | 5.3 | 7.3 | 7 | 20 | 1.6 | 2.2 | 14.2 |  |
| The Marshes | custom | 50 | 58 | 29 | 25.7 | 2.3 | 4.9 | 6.2 | 5 | 10 | 1.2 | 2.1 | 8.3 | **best balance** |
| The Salient | ridge | 39 | 41 | 35 | 28.1 | 1.9 | 5.6 | 5.9 | 2 | 16 | 1.2 | 2.4 | 19.4 |  |
| The Sluice | hourglass | 47 | 41 | 22 | 27.9 | 1.6 | 3.9 | 8.7 | 3 | 23 | 2.2 | 2.4 | 14.4 |  |
| The Void | custom | 50 | 42 | 21 | 27.8 | 1.5 | 3.3 | 8.9 | 8 | 28 | 1.9 | 2.3 | 15.2 |  |
| The Weir | ridge | 46 | 48 | 25 | 26.0 | 1.9 | 4.0 | 8.5 | 16 | 19 | 1.5 | 2.3 | 15.0 |  |

_Balance column: lower = fairer + more back-and-forth (|red−50| + |1st−50| + penalties for zero-kill/tie-decided/drag, minus a reward for lead swings). Heuristic — Bill decides._

## Overall

- red 48% · first mover 47% · HQ captures 24% · avg battle 27.6 turns
- Behaviour: 4.6 attacks & 7.4 swaps/battle · zero-kill 6% · 87% of units ever fielded
- Decisiveness: tie-goes-to-2nd decided 20% · first blood won 66% of the 94% of battles with a kill · more-hexes side won 88%
- Pacing: 1.7 kill-less turns before end (0=decisive, ~32=circling) · 2.3 lead swings/battle (higher = more back-and-forth)

## Cards (1200 battles)

| Card | Win% | Simple% | Noop% | 1stSight% | AvgSeen | Plays |
|---|--:|--:|--:|--:|--:|--:|
| Deploy Cavalry | 53 | 0 | 0 | 82 | 1.21 | 2238 |
| Deploy Artillery | 50 | 0 | 0 | 68 | 1.46 | 2118 |
| Airdrop | 50 | 2 | 0 | 30 | 2.59 | 2037 |
| Vanguard | 49 | 0 | 0 | 26 | 2.59 | 2056 |
| Entrench | 50 | 0 | 0 | 17 | 3.71 | 6172 |
| Storm and Hold | 49 | 5 | 0 | 10 | 6.02 | 1937 |
| Shock Troops | 51 | 0 | 0 | 8 | 4.29 | 4077 |
| Over the Top | 53 | 0 | 0 | 6 | 5.04 | 2024 |
| Careful Maneuvers | 52 | 1 | 0 | 5 | 5.89 | 1964 |
| Reckless Maneuvers | 50 | 0 | 0 | 4 | 5.33 | 1915 |
| Forced March | 50 | 2 | 0 | 4 | 5.45 | 1909 |
| Creeping Barrage | 50 | 0 | 0 | 4 | 5.01 | 1931 |
| Naval Barrage | 50 | 1 | 0 | 3 | 6.09 | 1884 |

#reports #balance #v1-0

