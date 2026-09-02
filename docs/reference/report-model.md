# Report model — the reporting subsystem reference

`game/report-model.js` is the ONE copy of the balance-report logic every reporting
surface shares (the CLI `dev/balance-report.js`, the in-browser Balance Dashboard,
the saved markdown). The scoring formula, the band table, the global fold, the
card-table rows and the report markdown once lived in four places and drifted;
they live in `report-model.js` now, and consumers keep only their own presentation.

It is exposed dual: the browser global `WOA_REPORT` (classic script) and
`module.exports` for node — the pattern `maps.js` uses. Nearly every function
takes plain data (`WOA_SIM.balanceMap` aggregates, `E.CARDS`) as arguments and is pure.
The one exception is `foldSkirmishes`, which delegates the per-skirmish fold to the
engine's single-source `factsFromRow`/`foldFacts` rather than keep a second copy.

This doc holds the reference detail the code points to. See [[code-architecture]]
for the whole-project map and [[balance-baselines]] for the measured anchors.

## Trace envelope — the data contract

Every trace fold takes ONE skirmish's **envelope**. Both a DB `skirmishes` row
(its `trace` column is this JSON as TEXT) and a live skirmish state (a trivial
wrapper) produce the same shape:

```
{ v, map, seed, fp, winner, winType, turns,
  trace: [ {p,id,mode,turn,seen, a?,h?,k?,ld?,u?,noop?} ... ],   // st.playLog
  units: { infantry:{dep:[..],atk,abs,kill,die,dieT:[..]}, cavalry:{..}, artillery:{..} },  // st.unitMetrics
  fs?:  [ [redFieldScore, blueFieldScore] ... ] }                // per turn; only fsDiffTrack needs it
```

- **Absent fields are omitted**, not nulled — every reader guards.
- **`dieT`** (per-type death-turn list, symmetric to `dep`) is absent ENTIRELY on
  legacy rows: the type's `units[t]` has no `dieT` key at all, not an empty array.
  `unitsAggFromEnvelopes`' `hasDieT` flag distinguishes "no deaths this run" from
  "this run predates dieT capture" (the latter greys the Lifespan chart rather than
  drawing a fabricated zero).
- **`fs`** never rides in the trace blob (`insertSkirmish` doesn't store it there).
  `GET /api/skirmishes` attaches it as a sibling `row.fs` from the `timeline` table;
  `envelopeFromRow` folds it back in, so every consumer (`fsDiffTrack`) sees it
  whether the source was a DB row or a live wrapper.
- **Fidelity:** a mixed deploy+attack play is tagged `a:'attack'` (attack is
  sticky), so deploy TIMING is read from `units.*.dep` (exact per-type deploy
  turns), never by scanning the `a`-stream for `'deploy'`. First contact is the
  first `a:'attack'` entry.

Normalized time: folds that compare across skirmishes of different length divide
turn numbers by `turns` (∈ (0,1]) rather than using raw turn numbers.

## Metric bands

`BANDS` is the ONE band table, as data. `balanceScore` folds over it (no second
copy of the ranges) — the eight `feedsScore:true` rows ARE the ideal-range list.
The prose SOT is [best-map-score.md](balance/best-map-score.md) (ideal ranges) +
[balance/README.md](balance/README.md) (North stars / game-level guards); **if a
doc and the table disagree, the doc wins and the table is fixed.**

Each row: `{ key, label, lo, hi, weight, feedsScore, val(agg,done), nFor? }`

| field | meaning |
|---|---|
| `lo` / `hi` | band edges; `null` = OPEN on that side (no penalty). `0` is a real closed edge, not open. |
| `weight` | points per unit outside the band (feeds the score). |
| `feedsScore` | `true` = summed into `balanceScore`; `false` = a shaded GUARD band the dashboard renders but the score ignores. |
| `val(agg,done)` | pulls the value out of a `balanceMap` aggregate. `pct()` for %-metrics, a raw ratio for Drag & Swings (so a NaN from a malformed agg scores 0). A conditioned metric divides by its slice count, not `done`. |
| `nFor(agg,done)` | the slice denominator for conditioned metrics — read by the small-n rule. |

**Conditioned denominators** (not every finished skirmish):
- **Tie% / Drag** divide by attrition endings (`attritionEndings`), not `done` — HQ
  endings have Drag 0 by definition and would dilute pooled Tie%.
- **Control%** divides by `controlGames`, **First-blood→win** by `firstBloodGames` —
  each its own sub-population.
- **Attack% / Swap%** are shares of all actions taken (`actionTotal` = attacks +
  swaps + marches + deploys), so they're deck-size-proof (raw counts weren't: adding
  a card inflated them without any behaviour change). Denominated over `done`, no
  `nFor`, so never spuriously small-n.

**Small-n rule:** a conditioned metric with slice-n < 40 per map (or < 240
fleet-wide, `SMALL_N`) renders greyed, `(n=N)`, and is excluded from the verdict
banner. The report can't grey a table row, so it annotates with `(n=…, small-n)`
instead; the dashboard band board does the greying.

**Temperature:** `bands(metric, T)` widens each CLOSED edge outward by 20% (T1) /
40% (T2) of band width; OPEN edges stay open. For a half-open band (one finite
edge — only Swings among the scored eight) the closed edge widens by that fraction
of `|edge|`. `balanceScore` uses T0 (stored edges) only — the score is
temperature-independent by design.

## Reporting doctrine — deliberate omissions

- **Card Win% is computed but NOT printed.** It's dead at n=700 (every card reads
  49–52 against the ±8 rubric threshold). Still derived in `cardRows()` and recorded
  in `logs/woa.db`, just kept out of the report. Noop% IS printed — new multi-step
  cards are where dead turns reappear and the rubric's dead-card check needs it.
- **Pooled card Win% never reaches the Cards-tab quadrant axis.** The meaningful
  number there is `cardHqWinSlice`: HQ-capture endings × non-simple plays only (a
  basic-attack/reposition fallback isn't the card "winning", and an attrition
  skirmish was decided by the standoff, not the last card). Pooled `wins` survives
  only for internal bubble-sizing/tooltips. This slice is thin by construction (HQ
  endings ~17% of skirmishes), so expect small-n at ordinary run sizes.
- **The mispricing residual rides the same HQ slice.** The card table's
  `Resid` column = the card's HQ-slice win *share* minus its army-points *share*,
  scaled back to points (`cardRows`, tunables `MISPRICE_RESID_PTS` /
  `MISPRICE_MIN_HQPLAYS`). It reuses the HQ×printed-play signal above (folded as
  `hqPlays`/`hqWins` on the card agg by `balanceAdd`), NOT the dead pooled Win%.
  Because the slice is small-n, a card is only flagged once its own `hqPlays` clears
  `MISPRICE_MIN_HQPLAYS`. The residual is exposure-weighted (win-share, so
  draw-frequency is a confound) and blind to held-value/late-timing cards — both
  documented at the flag, both reasons it is advisory-only (ADR-0002). Prints only
  when the caller passes `cardPoints` (CLI report, dashboard save; the Cards-pane
  `cardRunView` doesn't, so it's unaffected).

## DB rows → aggregate (`foldSkirmishes`)

Folds `skirmishes` table rows (`GET /api/skirmishes?run=<id>`) into the SAME
aggregate shape `balanceAdd` builds server-side. `insertSkirmish` only stores
skirmish-over states, so `done` is `rows.length` — no unfinished count to subtract.
The read is bit-for-bit the live source: `fs_red`/`fs_blue` ARE `E.fieldScore` at
skirmish end. The attrition slice is derived from `win_type` + `kill_tail`, the same
slice `balanceAdd` computes live — no new stored column.

**Control columns:** a row feeds `controlGames` only when both `hexesRed`/`hexesBlue`
are non-null AND unequal (a real hex tie counts toward `done` but not
`controlGames`); `controlWins` increments when the winner also held more hexes. Rows
carrying NULL/NULL ("no control data", never a fabricated 0/0 tie) fall out of both
counters, so `control.val()`/`bandN()` see a smaller-but-real n instead of 0.

## Spatial reconstruction (`hexLenses`) is best-effort

Per-hex occupancy / flips / kills are reconstructed from what the trace RECORDS
(the `h` hex each play acts on, the actor `p`, an attack's `k` kills) — NOT a full
combat replay (the trace has no march origin, no attack outcome, no starting HQ
positions). Known, bounded approximations:

- **March origin isn't in the trace**, so a vacated origin lingers as "held" — an
  over-count that only inflates the BUSY end, never the dead end the <5% test reads.
  It happens to surface rushable lanes (a march onto ground the enemy last held reads
  as a kill-less flip — the "high flips + low kills" signature).
- **`k` counts an attacker's own death too**, so captures are slightly
  over-attributed — acceptable for a relative heatmap.
- **HQ hexes** never appear unless attacked, so the RENDER layer (which knows the
  map's HQs) exempts them from the dead-hex hatch; the fold stays pure over the
  trace, with no map/board dependency.

Classification thresholds live in one place: dead hex = <5% occupancy
(`HEX_DEAD_OCC`); avenue of attack = flips in the top quartile of the flip
distribution (`HEX_AVENUE_Q`).

## Unit lifespan pairing (`unitsAggFromEnvelopes`) is FIFO

The trace carries no persistent per-unit identity, so lifespan is reconstructed
per type, PER SKIRMISH. `dep[]` (deploy turns) and `dieT[]` (death turns) are both
chronological by construction — each push happens as its event resolves, and turn
numbers only increase within a skirmish — so the fold pairs them index-wise: the
k-th death is attributed to the k-th deploy (a per-type FIFO approximation).

- **Never pool across skirmishes first** — a survivor's censor point needs that
  skirmish's own turn count.
- **Deploys left unmatched** (`dep.length > dieT.length`) survived to skirmish end;
  their lifespan is RIGHT-CENSORED at that skirmish's turn count (`turns - depTurn`),
  not excluded — dropping survivors would silently understate the "steady support"
  units that held the line all game, exactly the ones the chart wants to show.
- **Small-n:** a type's own n is `skirmishesFielded` (per-skirmish, unconditioned),
  used for every chart on the Units tab.
- **Legacy rows** (`hasDieT` false — no envelope carries a `dieT` array) can't derive
  lifespan; the Lifespan chart greys itself fleet-wide with a "predates capture" note
  rather than drawing a fabricated zero.

## Related

[[code-architecture]] · [[workflow]] · [[balance-baselines]] · [best-map-score.md](balance/best-map-score.md)
