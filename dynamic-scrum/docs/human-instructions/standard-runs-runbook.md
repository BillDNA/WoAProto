---
last-reviewed: 2026-07-07
---
#human-instructions #game-logs #balance

# Standard runs — the apples-to-apples runbook

Named, repeatable balance runs. The point: **the same recipe always uses the same seeds**, so when
you run it before and after a content tweak, any number that moved, moved because of your tweak —
not luck. Every recipe was run and verified 2026-07-07 (rules 1.0). Run from the repo root.

## The two comparison rules

1. **Same recipe vs same recipe.** Never compare a 12-battle run against a 60-battle one, or a
   `--once` run against the accumulator — different seeds/pools, the diff means nothing.
2. **Same rules version only.** A rules change bumps `Engine.VERSION` and starts a fresh report
   folder; numbers across versions aren't comparable (that's the point of the bump).

## Recipe 1 — Quick pulse (one map, seconds)

```
node game/balance.js 12 normal <map-name-filter>
```

*Measures:* did my tweak move anything on this map — Red%, 1st%, HQ%, Atk/Swp, the card report.
*Cost:* ~10s. Console only, nothing saved. Deterministic: the same command twice prints identical
numbers, so any diff after a tweak is real (at n=12 it's a **direction check, not a verdict** —
confirm anything surprising with Recipe 2).

*Watch:* whichever metric your tweak targets, plus HQ% and Atk/Swp for side effects.

## Recipe 2 — Standard sweep (whole roster, a few minutes)

```
node dev/balance-report.js 60 hard hard --parallel --once
```

*Measures:* the full picture at proper sample size — every map in the active set, 60 battles each,
hard vs hard, saved as a markdown report (`SAVED:` line prints the path). `--once` keeps it **out of
the accumulator**, which is what makes two sweeps directly comparable (both use the original seed
schedule; accumulator runs deliberately shift seeds per run).
*Cost:* ~2–4 min.

*Watch (protect-the-baselines list):* first-mover %, Red %, tie-goes-to-2nd %, attacks/swaps per
battle, zero-kill %. The 0.x-era anchors (first mover ~46, Red ~52, tie ~26, ~4.9 atk / ~6.5 swaps)
predate the 1.0 search overhaul — your first clean 1.0 sweep is the new anchor; a sharp move in any
of these = regression even if win rates look fine.

## Recipe 3 — Best-map LLM match (felt-notes, background, costs tokens)

```
node dev/balance-report.js 60 hard hard --parallel --once   # prints BEST_MAP: <name>
node dev/claude-plays.js --map "<BEST_MAP>" --match 3 --red haiku --blue haiku --red-effort low --blue-effort low --seed 1234
```

*Measures:* how the change *feels* — a first-to-3 LLM mirror match on the sweep's most interesting
map, with per-battle and per-match felt-notes, the rush-luck check, and a Typicality footer.
Transcript lands in `logs/reports/battle/1.0/…-match.md`. Fixed `--seed 1234` = same deals every
time. (The `generate-reports` skill now fires Recipe 4's three-match set instead; this single
pinned-map match remains the right tool for probing ONE map.)
*Cost:* tens of minutes wall-clock, real tokens (haiku + low effort is the cheap shape).

*Watch:* the felt-notes and fallback counts (high fallback = the model couldn't parse the game —
a legibility finding).

## Recipe 4 — Iteration set (any deck + map-set; the balance-loop recipe)

```
node dev/balance-report.js 100 hard hard --once --parallel [--deck <id>] [--mapset <id>]
node dev/claude-plays.js --match 3 --red haiku --blue haiku --effort low --seed 1001 [--deck <id>] [--mapset <id>]
node dev/claude-plays.js --match 3 --red haiku --blue haiku --effort low --seed 2002 [--deck <id>] [--mapset <id>]
node dev/claude-plays.js --match 3 --red haiku --blue haiku --effort low --seed 3003 [--deck <id>] [--mapset <id>]
```

*Measures:* the full iteration read for a content slot — the n=100 sweep (±10/map) plus three
first-to-3 haiku-low matches whose battles draw maps from the set (felt-notes, HQ-vs-attrition
meta, fallback health). The FIXED seeds 1001/2002/3003 are the apples-to-apples anchor: the same
recipe against two deck/mapset slots isolates the content change. Launch the three matches in
parallel, detached (this is what the `generate-reports` skill fires).
*Cost:* sweep ~2–4 min; matches ~40–90 min wall-clock, real tokens (haiku-low).
*Verified:* 2026-07-09 (rules 1.0), iterations 1–2 of the balance loop.

*Watch:* the protect-the-baselines list (Recipe 2), the new-card rows of the card table
(Noop% ≤2, AvgSeen vs the deleted cards), and the matches' fallback rate (≲5% = clean).

## The before/after procedure (demonstrated)

1. **Before:** run the recipe on untouched data.
2. **Tweak** one data value (`content/decks/`, `content/maps/`, `maps.js` AI rows).
3. **After:** run the exact same recipe. Compare.
4. **Revert** (or keep, if the numbers say yes). A rerun after a revert must reproduce the
   *before* numbers exactly — if it doesn't, something else changed too.

Live demo from 2026-07-07 — Recipe 1 on The Ford, `attack_plus1` step `mod` 1 → 2
(`game/content/decks/default.js`):

| | Red% | 1st% | HQ% | Turns | Atk | Swp | Attack +1 AvgSeen |
|---|--:|--:|--:|--:|--:|--:|--:|
| before (mod 1) | 58 | 75 | 25 | 26.0 | 7.5 | 3.3 | 10.4 |
| after (mod 2) | 58 | 58 | 42 | 23.7 | 7.8 | 2.3 | 5.6 |

Read: at +2 the AI stops hoarding the card (AvgSeen 10.4 → 5.6), battles end by HQ capture far more
(25% → 42%) and faster. The revert rerun reproduced the *before* row digit-for-digit — that's the
determinism the whole runbook leans on. (The tweak was reverted; `mod` is 1 on disk.)

## Adding your own recipes

Copy the shape: **name · exact command · what it measures · cost · what to watch.** Keep the
command byte-exact (seeds ride the defaults — never pass a random seed), note whether it saves an
artifact, and add it here. Candidates already proven elsewhere: the skill-premium matchup
(`node game/balance.js matchup 16 hard normal` — stronger AI's win rate, ~60% is the 0.x anchor)
and a personality duel (`matchup 16 brawler turtle`).

## Related

[[Docs Index]] · [[driving-the-balance-loop]] (the tools themselves) · [[data-and-reports]] ·
[[claude-plays-human-instructions]]
