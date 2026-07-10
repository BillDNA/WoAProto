---
name: generate-reports
description: Generate a fresh War of Attrition report set — a 100-battle hard-vs-hard balance sweep plus three fire-and-forget first-to-3 LLM matches (fixed seeds 1001/2002/3003, maps drawn from the mapset pool) against any deck + map-set. Saves everything the standard way under logs/reports. Use when asked to "generate reports", "make a fresh report set", "generate-reports", or to refresh the data before a review.
---

# generate-reports

Produce the standard report set for the current rules version, against ANY deck +
map-set (defaults: the ACTIVE pair). **This only generates data — it changes no game
files.** Repo-relative paths; run from the repo root.

This is the data-collection step of the balance-iteration loop (proven across the
July 2026 4-iteration run): one isolated balance sweep + three seeded LLM matches.
Every command pins its seeds, so the same recipe against two content slots is an
apples-to-apples diff — the comparison rules live in
`dynamic-scrum/docs/human-instructions/standard-runs-runbook.md` (keep the two in sync).

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

2. **Three fire-and-forget LLM matches** — first-to-3, haiku low both sides,
   **fixed seeds 1001 / 2002 / 3003** (never change them — they are the
   apples-to-apples anchor across content iterations). Match mode draws each
   battle's map from the mapset pool (engine-shuffled by the seed):

   ```
   node dev/claude-plays.js --match 3 --red haiku --blue haiku --effort low --seed 1001 [--deck <id>] [--mapset <id>]
   ```

   Repeat with `--seed 2002` and `--seed 3003`; launch all three in parallel as
   detached background processes, then **return immediately** — no waiting, no
   polling. Each match appends crash-safe per-battle rows to
   `claude-plays-log.jsonl` (+ a match-summary row listing the maps played) and
   writes one transcript to
   `logs/reports/battle/<version>/<stamp>-set-<mapset>-haiku-v-haiku-match.md`
   with per-battle map names, felt-notes, the rush-luck check, and a Typicality
   footer for the last battle's map.

3. **Report back** — the balance report path, plus "3 matches running in the
   background — transcripts will land at `logs/reports/battle/<version>/…-match.md`."
   Offer to run **review-reports** for the graded analysis once they finish.

## Notes

- Cost: sweep ~2–4 min; each match ~40–90 min wall-clock (they run concurrently),
  real tokens — haiku + low effort is the cheap shape.
- Everything files by rules version (`Engine.VERSION`). Content changes do NOT bump
  the version — the deck/mapset ids in the report meta line are the distinguisher.
- Fallback rate in the transcripts (fallbacks ÷ decisions) is the data-health gauge:
  ≲5% is clean; high fallback = a legibility problem, flag it before reading strategy.
- Offline: the balance sweep still generates; say the LLM matches were skipped rather
  than faking them. `--mock` smoke-tests the match pipeline (mock runs stay out of
  the DB by design).
- Don't tune anything from these numbers here — that's `review-reports` (grades vs
  the rubrics) and then Bill.
