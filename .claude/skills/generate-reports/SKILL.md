---
name: generate-reports
description: Generate a fresh War of Attrition report set — a 100-battle hard-vs-hard balance sweep plus one fire-and-forget first-to-3 LLM match (fixed seed 1001, maps drawn from the mapset pool; seeds 2002/3003 are optional extras) against any deck + map-set. Saves everything the standard way under logs/reports. Use when asked to "generate reports", "make a fresh report set", "generate-reports", or to refresh the data before a review.
---

# generate-reports

Produce the standard report set for the current rules version, against ANY deck +
map-set (defaults: the ACTIVE pair). **This only generates data — it changes no game
files.** Repo-relative paths; run from the repo root.

This is the **gather-data** step of the balance-iteration loop (§ The v2 loop below;
proven across the July 2026 4-iteration run): one isolated balance sweep + **one**
seeded LLM match. Loop v2 (B.5.1.2) runs **one feels-match per iteration**, not three —
the extra two seeds didn't earn their wall-clock. Every command pins its seeds, so the
same recipe against two content slots is an apples-to-apples diff — the comparison rules
live in `dynamic-scrum/docs/human-instructions/standard-runs-runbook.md` (keep the two in
sync).

## Steps

1. **Balance sweep** — 100 battles/map, hard vs hard, isolated from the accumulator:

   ```
   node dev/balance-report.js 100 hard hard --once --parallel [--deck <id>] [--mapset <id>]
   ```

   `--once` = the original seed schedule, so two sweeps with the same flags are
   directly comparable (accumulator runs deliberately shift seeds). `--parallel` =
   ~cores× faster; drop it only if you also want per-battle DB rows (serial writes
   them, parallel skips them). `--deck` / `--mapset` select content slots
   (`game/content/{decks,mapsets}/<id>.js`); the report meta line + filename carry
   the ids. Capture the `SAVED:` path. `BEST_MAP:` still prints — informational
   (matches no longer pin to it).

2. **One fire-and-forget LLM match** — first-to-3, haiku low both sides,
   **fixed seed 1001** (never change it — it is the apples-to-apples anchor across
   content iterations). Match mode draws each battle's map from the mapset pool
   (engine-shuffled by the seed):

   ```
   node dev/claude-plays.js --match 3 --red haiku --blue haiku --effort low --seed 1001 [--deck <id>] [--mapset <id>]
   ```

   Launch it as a detached background process, then **return immediately** — no
   waiting, no polling. The match appends crash-safe per-battle rows to
   `claude-plays-log.jsonl` (+ a match-summary row listing the maps played) and
   writes one transcript to
   `logs/reports/battle/<version>/<stamp>-set-<mapset>-haiku-v-haiku-match.md`
   with per-battle map names, felt-notes, the rush-luck check, and a Typicality
   footer for the last battle's map.

   *Optional extras (not the default):* for a deeper felt-read on a slot, repeat
   with `--seed 2002` and `--seed 3003` (the v1 three-match set). Only add them when
   one match's signal is genuinely too thin — v2's default is the single seed-1001
   match (B.5.1.2).

3. **Report back** — the balance report path, plus "1 match running in the
   background — the transcript will land at `logs/reports/battle/<version>/…-match.md`."
   Offer to run **review-reports** for the graded analysis once it finishes.

## The v2 loop (order of operations)

This skill is step 1 of the balance loop. The full v2 order (B.5.4) is:

1. **Gather data** — the sweep + one feels-match above (Steps 1–2). One iteration = one
   content slot measured.
2. **Guide the generate skills with the findings** — hand `review-reports`' read to
   `create-card` (the 3-for-3 batch: current deck in, 3 replacement slots out) and
   `create-map` (fill a *measured* gap). The findings steer what gets generated, not a
   blind draw.
3. **Judge the generated suggestions** — one adversarial checker per candidate
   (B.5.1.1, 1:1), graded against the rubrics, budget-checked as a set.
4. **Adopt** — Bill's call; the winning cards/maps land as slot data (a one-file diff).
5. **Repeat n times** — new slot, back to step 1. Fixed seeds keep every iteration
   apples-to-apples.
6. **Final report** — after the last iteration, write the loop's `logs/reports/analysis/
   <version>/…-balance-loop-final.md` (see below).

The **v2 levers** the loop can now pull, beyond cards/maps: **unit composition & values
as slot data** (WOA-011 — infantry/cavalry/artillery mix, VP, atk/def/support, all a
one-file content diff). Cards, maps, and unit values are the three knobs an iteration
may turn.

**AI weights are NOT a live knob.** WOA-012 verified and **rejected** the tuner sweep under
1.1: the tuned personality lost the matchup gate to hard (44% of 192). No weight set is known
to beat current hard, so `AI_WEIGHTS` defaults stand and the hard AI is a *fixed measuring
instrument*. Re-opening weights means clearing the beat-hard gate first — and remember that
tuning the AI to flatter the balance metrics moves the ruler, not the game.

## The final report

The loop's culmination (model: `logs/reports/analysis/1.0/2026-07-09-1.0-balance-loop-final.md`).
Keep what v1 did — the slot table, headline-numbers table, the story, content shipped, a
measurements audit — and **add three new suggestion sections** (B.5.4), each ranked with
measured evidence, all filed for Bill (he decides):

1. **Suggested RULE changes** — engine-level levers the data argues for (needs a spec +
   `test.js`; bumps `Engine.VERSION`). Shape: the metric it moves, the mechanism, expected
   direction/size, verification recipe. (Cf. the 1.0 "For Bill — rules-territory" list that
   became WOA-009.)
2. **Stats to gather or drop** — instruments to add (e.g. the turn-bucketed attack
   histogram v1 kept flagging) or retire (weak columns like per-card Win% that hug 50).
3. **AI levers to add or drop** — weights/personalities to introduce or cut (grounded in
   `ai-heuristic-model.md`), now that AI weights are a tunable (WOA-012).

Then Bill reviews and a sprint is built from the picks.

## Notes

- Cost: sweep ~2–4 min; the match ~40–90 min wall-clock, real tokens — haiku + low
  effort is the cheap shape. (v2's single match is a deliberate cost cut vs v1's three.)
- Everything files by rules version (`Engine.VERSION`). Content changes do NOT bump
  the version — the deck/mapset ids in the report meta line are the distinguisher.
- Fallback rate in the transcripts (fallbacks ÷ decisions) is the data-health gauge:
  ≲5% is clean; high fallback = a legibility problem, flag it before reading strategy.
- Offline: the balance sweep still generates; say the LLM match was skipped rather
  than faking it. `--mock` smoke-tests the match pipeline (mock runs stay out of
  the DB by design).
- Don't tune anything from these numbers here — that's `review-reports` (grades vs
  the rubrics) and then Bill.
