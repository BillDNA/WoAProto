# Balance report — hard vs hard AI

_Rules version 1.1 · 7 map(s) · 700 battles (this run only, not accumulated) · deck cavsplit-16 · mapset core7 · ±10 pts/map · dev/balance-report.js_

## Maps

| Map | Shape | Red% | 1st% | HQ% | Turns | VPdiff | Atk | Swp | 0kill% | Tie% | Drag | Swings | Balance | Notes |
|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|
| Causeway | compact | 58 | 42 | 12 | 30.8 | 3.1 | 7.6 | 2.7 | 0 | 11 | 1.7 | 2.9 | 6.0 |  |
| Frontier | classic | 50 | 40 | 11 | 31.4 | 2.4 | 5.9 | 2.4 | 0 | 7 | 2.3 | 3.0 | 5.0 |  |
| Long March | spear | 50 | 38 | 17 | 30.2 | 1.9 | 5.6 | 2.6 | 0 | 17 | 2.2 | 3.8 | 7.6 | 2nd-mover strong |
| Saber Ridge | ridge | 47 | 47 | 18 | 30.8 | 2.4 | 7.5 | 2.1 | 0 | 10 | 1.9 | 3.1 | 0.0 | **best balance** |
| The Marshes | custom | 44 | 42 | 27 | 27.5 | 2.7 | 6.8 | 2.1 | 0 | 7 | 1.5 | 3.1 | 4.0 |  |
| The Narrows | hourglass | 46 | 44 | 21 | 28.4 | 2.5 | 5.6 | 3.2 | 1 | 12 | 2.7 | 2.9 | 1.7 |  |
| The Void | custom | 45 | 39 | 11 | 30.5 | 2.4 | 5.0 | 3.7 | 0 | 13 | 3.1 | 3.0 | 8.5 |  |

_Balance column: weighted distance outside each metric's ideal range (0 = ideal, lower = better) — Red/1st 45–55, HQ 10–40, 0kill ≤5, Tie ≤15, Drag ≤2.5, Swings ≥2.0, Control ≥70. SOT: grading-rubrics §Best map._

## Overall

- red 49% · first mover 42% · HQ captures 17% · avg battle 29.9 turns
- Behaviour: 6.3 attacks & 2.7 swaps/battle · zero-kill 0% · 92% of units ever fielded
- Decisiveness: tie-goes-to-2nd decided 11% · first blood won 62% of the 100% of battles with a kill · more-hexes side won 90%
- Pacing: 2.2 kill-less turns before end (0=decisive, ~32=circling) · 3.1 lead swings/battle (higher = more back-and-forth)

## Cards (700 battles)

| Card | Win% | Simple% | Noop% | 1stSight% | AvgSeen | Plays |
|---|--:|--:|--:|--:|--:|--:|
| Deploy Artillery | 50 | 1 | 0 | 77 | 1.25 | 1347 |
| Conscription | 51 | 0 | 0 | 74 | 1.32 | 1337 |
| Airdrop | 51 | 3 | 0 | 32 | 2.72 | 1276 |
| Deploy Cavalry | 51 | 0 | 0 | 20 | 2.89 | 2637 |
| Deploy Infantry | 50 | 1 | 1 | 11 | 3.31 | 1251 |
| Entrench | 50 | 0 | 0 | 11 | 4.71 | 3839 |
| Reckless Maneuvers | 50 | 0 | 0 | 10 | 3.98 | 1245 |
| Ordered Withdraw | 50 | 28 | 1 | 9 | 5.80 | 1238 |
| Careful Maneuvers | 51 | 1 | 0 | 8 | 4.37 | 1269 |
| Naval Barrage | 50 | 1 | 0 | 7 | 4.66 | 1227 |
| Mass Assault | 51 | 30 | 1 | 4 | 7.23 | 1240 |
| Attack +1 | 50 | 25 | 0 | 1 | 11.35 | 2468 |

#reports #balance #v1-1

