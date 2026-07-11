# create-map profiling — where the wall-clock goes (WOA-014, B.5.2.2)

Bill's B.5.2.2 asked: `create-map` is slow — "is it rejections in stage 3 or 4?" This note answers it
with **measured** timings (not guesses) and hands the cheap fix to the `create-map` skill.

*Machine:* node v24.15.0, Windows 11, this repo at rules 1.1. Every row below is a real `time` run
from the repo root; each `node game/balance.js` line was `>/dev/null` so only the sim ran.

## The two stages the skill runs

The `create-map` skill screens a candidate in two verification steps:

- **Stage 3 — structural check:** `node -e "…E.validateMaps([<def>])"` (skill Step 3). Rejects
  ≤24-hex / HQ / terrain-stock / contiguity violations. Pure structural, no simulation.
- **Stage 4 — balance screen:** `node game/balance.js <n> <map>` (skill Step 4). Simulates `n`
  battles on the candidate and reads side/mover bias, HQ%, Atk/Swp. This is the "n=40–200 of these"
  screen Bill was asking about.

## Measured cost

| What | n | AI | Wall-clock | Per-battle |
|---|--:|---|--:|--:|
| node bare startup | — | — | **0.038 s** | — |
| **Stage 3** — validateMaps | — | — | **0.060 s** | — |
| Stage 4 — balance screen | 40 | normal | 4.02 s / 4.07 s | ~101 ms |
| Stage 4 — balance screen | 100 | normal | 10.79 s | ~108 ms |
| Stage 4 — balance screen | 200 | normal | 22.47 s | ~112 ms |
| Stage 4 — balance screen (other map) | 40 | normal | 4.88 s (causeway) | ~122 ms |
| **Stage 4 — balance screen** | 40 | **hard** | **27.54 s** (ford) | **~689 ms** |
| **Stage 4 — balance screen** | 40 | **hard** | **30.87 s** (causeway) | **~772 ms** |

## Findings

1. **Stage 3 is free.** validateMaps is 0.060 s — essentially the 0.038 s node-startup cost plus a
   few ms of pure JS. A stage-3 rejection costs **nothing**. So the answer to Bill's question is
   unambiguous: **stage-4 rejections eat 100 % of the wall-clock; stage-3 is noise.**

2. **The dominant cost lever is AI difficulty, not n.** A `hard`-vs-`hard` screen is **~6.8×** a
   `normal`-vs-`normal` screen at the same n (27.5 s vs 4.0 s at n=40; ~690–770 ms/battle vs
   ~100 ms/battle). Sim time is roughly linear in n (normal: 4 s→11 s→22 s at 40→100→200), but the
   AI-search depth of `hard` swamps that: an n=40 hard screen (~28 s) costs **more than** an n=200
   normal screen (~22 s). Extrapolated, a `hard` n=200 screen is ~2.4 min **per map**.

3. **That is where v1's time went.** The 1.0 loop's map skeptics "ran real n=40–200 screens and
   killed 3 of 12 candidates" — with two checkers per candidate that is up to ~24 screens. At
   `hard` n=200 (~2.4 min each) that is ~1 hour of pure simulation; at `normal` n=40 (~4 s each) it
   is ~1.6 minutes. The screen *shape*, not the candidate count, is the wall-clock.

## Recommendation (cheap fix applied to the skill)

The skill already orders stage 3 before stage 4 (validateMaps gates the balance screen) — keep that.
The lever is the **shape of the stage-4 screen**, and rejection does not need a verdict-grade screen:

- **Reject cheaply at `normal` n=40 (~4 s), not `hard` (~28 s).** A candidate that is side-biased or
  attrition-only shows it in a direction read; a normal-AI screen is ~7× cheaper and enough to
  *kill* a map. Reserve `hard`-vs-`hard` and n=100–200 for the one or two **finalists** that survive
  rejection, where the number is a verdict, not a triage. (Net: a 12-candidate field drops from
  ~1 hour of sims to a few minutes.)
- **Front-load every free check before any sim.** validateMaps + the rubric/self-grade + the
  1:1 adversarial checker (B.5.1.1) all cost ~0; run them first so no map reaches a stage-4 sim
  until it is structurally sound and has a design reason to exist.
- **Parallelize multi-map screens.** `game/balance.js` is single-map serial; when a finalist is
  screened across the active set, `dev/balance-report.js --parallel` is ~3.3× faster for the same
  numbers.
- The **2→1 checker step-down (B.5.1.1) is itself the biggest single win** — it halves the number of
  stage-4 screens, and each screen is the entire cost.

Applied to `create-map` SKILL.md (Steps 3–4 + a Gotcha), same commit as this note.

#reports #analysis #v1-1
