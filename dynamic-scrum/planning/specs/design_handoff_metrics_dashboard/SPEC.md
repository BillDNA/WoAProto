# Metric spec v2 — War of Attrition (agreed 2026-07-18)

Companion to README.md. This is the authoritative transcription of design option `1a` + the
data-shape decisions. SOT for bands remains `dynamic-scrum/rubrics/grading-rubrics.md`; this spec
adds the per-temperature model and the new capture. Everything lands per the two-phase plan in
TICKETS.md (P1 capture is golden-diff-safe; the re-baseline is rules-1.2, atomic).

## 1. Battle-level metrics

★ = feeds `balanceScore` (report-model.js). "Population" = win-path slice.

| Metric | Verdict | Population | Normalized to | T0 band | Notes |
|---|---|---|---|---|---|
| Red% ★ | keep | all | — | 45–55 | |
| 1st-mover% ★ | keep | all | — | 45–55 | |
| HQ-capture% ★ | keep | all | — | 10–40 | also the slicer for conditioned metrics |
| Attack share ★ | **split** (was Atk count) | all | % of actions taken (attacks+swaps+marches+deploys) | re-baseline | deck-size-proof (WOA-030 16→17) |
| Swap share ★ | **split** (was Swp count) | all | % of actions taken | re-baseline | swap-dance detector |
| Deploy interleave | **new** (temporal) | all | battle length | baseline TBD | share of deploys after first contact; 0 = all-up-front |
| First-contact turn | **new** (temporal) | all | battle length | baseline TBD | turn of first attack |
| Reserves at end | **condition** | HQ endings only | turn count | re-baseline | ⚠ small-n: print n, grey under threshold |
| 0-kill% ★ | keep | all | — | ≤5 | |
| Tie% ★ | **condition** | attrition endings only | — | re-baseline (~12?) | pooling diluted by ~HQ% |
| First-blood→win | keep | battles with a kill | — | 55–70 | |
| Control→win ★ | keep | battles with hex lead | — | ≥70 | |
| Turns / VPdiff | keep | all | — | guard | under the 32-play cap |
| Drag ★ | **condition** | attrition endings only | battle length | re-baseline (≤3?) | HQ endings pull to 0 by definition |
| Swings ★ | keep | all | — | ≥2.0 | |
| Settle point | **new** (temporal) | all | battle length (%) | baseline TBD | turn after which lead never flips again |

Cut from print, kept in DB: raw Atk/Swp counts; pooled card Win%.

## 2. Card metrics
Simple%, Noop%, 1stSight%, AvgSeen, Plays — unchanged. **Card Win%**: DB-only, sliced to
HQ-capture endings × non-simple plays (the slice to pull when needed; stays out of print per WOA-019).
**New (trace-derived): play-turn distribution** per card — quartiles + median over normalized battle
time (the "when cards fire" chart).

## 3. Unit metrics (all new — need per-unit capture)
Per unit type, per battle fielded: median deploy turn; attacks made; **attacks absorbed** (the
breakthrough-point number); kills; deaths; median lifespan (turns alive after deploy); exchange
(kills/deaths). Role buckets are a *reading* of these (charge/support axes + absorbed gauge), not
stored values.

## 4. The trace (per-battle row in logs/woa.db)

```
{ v:"1.2", map:"frontier", seed:81103, fp:"red",
  winner:"blue", winType:"attrition", turns:29,
  trace:[            // one entry per play, in order
    { t:1,  s:"red",  a:"deploy", u:"cav", h:"D4" },
    { t:9,  s:"red",  a:"attack", h:"C3", k:1, ld:"red" },
    …                // a: deploy|attack|swap|march
  ],                 // u: unit type on deploys; h: hex; k: kills; ld: leader after turn
  units:{ cav:{dep:[3,5], atk:6, abs:2, kill:3, die:1},
          inf:{…}, art:{…} } }
```

- Capture point: extend the existing `playLog` (already per-play) — add action/hex/kill/leader/unit
  fields; the `units` block is folded at battle end.
- Cost: ~32 plays × ~40 B ≈ 1.3 KB/battle; 700-battle run ≈ 1 MB. Accepted.
- **Every metric in §1–3 that can be derived from the trace IS derived from the trace**, as folds in
  `report-model.js` (decision #2). `balanceAdd` keeps only what the trace can't express.

## 5. Per-hex folds (drill-down lenses)
From the trace's `h` fields: occupancy (% of turns held), ownership flips per battle, kills on hex
per battle. Dead hex = <5% occupancy. Avenue of attack = top-quartile flips. Rushable-lane signature
= high flips + low kills along a corridor.

## 6. Bands per temperature (Thread 2 resolution)
Bands live as **data on each metric** in report-model.js — `{lo, hi, weight, feedsScore}` — with the
rubric doc still the SOT prose. Effective band at T1/T2 = each *closed* edge widened by 20%/40% of
band width (open edges stay open). The dashboard's temperature selector re-renders shading; the
verdict banner counts breaches at the selected tier. No second rubric document.

## 7. Run identity (A/B picker)
New `runs` table in woa.db: `{id, ts, rulesVersion, deck, mapset, aiRed, aiBlue, nPerMap, seedBase,
label, baseline:bool}`. Battles reference their run id. Exactly one baseline flag per rules version
(pinning a new one clears the old). The dashboard is view-only: it never creates runs; `balance.js` /
the dashboard Run loop write them (P1 wiring).

## 8. Small-n rule
Any sliced metric with slice-n < 40 per map (or < 240 fleet-wide): render greyed, show `(n=N)`,
exclude from the verdict banner. Matches the rubric's n≥40/map trust threshold.
