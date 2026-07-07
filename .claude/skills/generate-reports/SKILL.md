---
name: generate-reports
description: Generate a fresh War of Attrition report set — a 60-battle hard-vs-hard balance report, then two LLM battles (claude-plays) on the best-balance map. Saves everything the standard way under logs/reports. Use when asked to "generate reports", "make a fresh report set", "generate-reports", or to refresh the data before a review.
---

# generate-reports

Produce a fresh, standard report set for the current rules version, then hand
off to `review-reports` if Bill wants the analysis. All paths are repo-relative;
run from the repo root. **This only generates data — it changes no game files.**

## Steps

1. **Balance report** — a 60-battle hard-vs-hard run over the whole roster:

   ```
   node dev/balance-report.js 60 hard hard
   ```

   This saves the markdown to `logs/reports/balance/<version>/` and prints two
   machine-readable lines to stdout:
   - `SAVED: logs/reports/balance/<version>/<stamp>-hard-vs-hard-n60.md`
   - `BEST_MAP: <name>` — the map with the best Balance score (closest to fair +
     most back-and-forth; the script's heuristic, documented in the report).

   ⏳ Hard AI over the full roster is the slow step (many minutes). Run it in the
   background if the harness supports it and wait for the `SAVED:`/`BEST_MAP:`
   lines rather than polling output. Capture `<name>` from `BEST_MAP:`.

2. **Two LLM battles on the best-balance map** — same map, two seeds, run them at
   the SAME TIME (independent processes, one per side-luck sample):

   ```
   node dev/claude-plays.js --map "<BEST_MAP>" --red haiku --blue haiku --red-effort low --blue-effort low --seed 1234
   node dev/claude-plays.js --map "<BEST_MAP>" --red haiku --blue haiku --red-effort low --blue-effort low --seed 5678
   ```

   Each writes a transcript to `logs/reports/battle/<version>/` (with a
   **Typicality vs the map baseline** footer comparing that game to a hard-AI
   baseline for the map) and appends to the master `claude-plays-log.jsonl`.
   These call the real `claude -p` transport — they cost time/tokens and can
   fall back to the engine on a bad reply (that's logged, not a crash).

3. **Report back** — list the three saved files (1 balance + 2 battle) and give a
   2–3 line readout: the best map + why it scored best, and each battle's result
   + Typicality verdict. Offer to run **review-reports** for the full graded
   analysis (→ `logs/reports/analysis/`).

## Notes

- "Best balance" here = the `balance-report.js` Balance column (lower is better:
  |red−50| + |1st−50| + penalties for zero-kill / tie-decided / drag, minus a
  reward for lead swings). It's a heuristic to pick an *interesting* map to watch
  an LLM play, not a verdict — say so.
- Everything is filed by rules version (`Engine.VERSION`), so a run after a rule
  change lands in a fresh folder and old data stays apples-to-apples.
- If `claude -p` isn't available (offline), the balance report still generates;
  say the LLM battles were skipped rather than faking them. `--mock` produces a
  deterministic offline battle if you only need to smoke-test the pipeline.
- Don't tune anything from these numbers here — that's `review-reports` (grades
  vs the rubrics) and then Bill.
