# "Best map" — the ideal-range score (SOT)

**This table is the definition of "best map," and the source of truth for the
metric bands.** `balanceScore` in `game/report-model.js` folds over exactly these
rows (the `BANDS` table there is the code copy); the CLI `BEST_MAP:` line, the
dashboard, and the tuner all read that one function. **If this table and the code
disagree, this table wins and the code gets fixed** — one implementation per fact.

Score = the weighted distance each metric sits **outside** its ideal range (0
inside), summed. **Lower = better; 0 = ideal on every axis.** All endpoints and
weights are tunable targets, Bill's to adjust — tune one here only to change what
"best" *means*, never to fix a map.

Band edges: `lo`/`hi` are the range; an open side (no penalty there) is written
`—`. `0` is a real closed edge, not open.

## Scored bands (feed the score)

| Metric | Per-map aggregate | Ideal range | Weight per unit outside |
| --- | --- | --- | --- |
| Red% | `redWins/done` | 45–55 | 1.0 /pt |
| 1st% | `firstWins/done` | 45–55 | 1.0 /pt |
| HQ% | `hqWins/done` | 10–40 | 0.5 /pt |
| 0kill% | `zeroKill/done` | 0–5 | 0.6 /pt |
| Tie% | `tiebreak/attritionEndings` | 0–18 | 0.3 /pt |
| Drag | `attritionKillTail/attritionEndings` | 0–3.0 | 4 /turn |
| Swings | `leadChanges/done` | 2.0–— | 6 /swing short |
| Control% | `controlWins/controlGames` | 70–100 | 0.5 /pt short (skipped when no control games) |

**Tie% and Drag divide by attrition endings, not every battle**: HQ endings have
Drag 0 by definition and only diluted the pooled Tie%.
Both carry a slice-n and are greyed/excluded from the verdict when that slice is
small (see the small-n rule in `docs/balance/README.md`).

## Guard bands (shaded, NOT scored)

Rendered on the dashboard for context; `weight 0` / `feedsScore:false`, so they
never touch the score.

| Metric | Per-map aggregate | Guard range |
| --- | --- | --- |
| First-blood→win | `firstBloodWins/firstBloodGames` | 55–70 |
| Attack% | `attacks / (attacks+swaps+marches+deploys)` | 12–28 |
| Swap% | `swaps / (attacks+swaps+marches+deploys)` | 10–26 |

Attack% / Swap% are **shares of all actions taken** (deck-size-proof); a sharp move in either after a
change is a regression even when win rates look fine (the swap-dance detector).

## Ruling on record

Attrition-only maps ARE penalised — HQ% below 10 costs points, because both win
paths should live on every map (Bill's ruling). Swings at or above 2.0 score
clean; they no longer buy back a fairness failure.
