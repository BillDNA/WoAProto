---
name: generate-reports
description: Generate a fresh War of Attrition report set — a 60-battle hard-vs-hard balance report, then a fire-and-forget first-to-3 LLM match (claude-plays) on the best-balance map. Saves everything the standard way under logs/reports. Use when asked to "generate reports", "make a fresh report set", "generate-reports", or to refresh the data before a review.
---

# generate-reports

Produce a fresh, standard report set for the current rules version. **This only
generates data — it changes no game files.** All paths are repo-relative; run
from the repo root.

V1 shape (Feedback Round 5): the balance report runs to completion, then the
LLM match is **fired into a detached background process and left alone** — no
babysitting, no polling. Bill (or `review-reports`) reads the transcript when
it lands.

## Steps

1. **Balance report** — a 60-battle hard-vs-hard run over the roster:

   ```
   node dev/balance-report.js 60 hard hard --parallel
   ```

   (`--parallel` runs one worker per map — same numbers, ~cores× faster. Drop it
   only if you also want per-battle DB rows from this run; serial writes them,
   parallel skips them.) It saves the markdown and prints two machine lines:
   - `SAVED: logs/reports/balance/<version>/<stamp>-hard-vs-hard-n60-rN.md`
   - `BEST_MAP: <name>` — best Balance score (closest to fair + most
     back-and-forth). Capture `<name>`.

2. **Fire-and-forget LLM match** — one first-to-3 match on the best map,
   detached, in the background, per-run log file (no shared-redirect interleaving):

   ```
   STAMP=$(date +%Y%m%d-%H%M%S)
   nohup node dev/claude-plays.js --map "<BEST_MAP>" --match 3 \
     --red haiku --blue haiku --red-effort low --blue-effort low \
     --seed 1234 > "logs/reports/battle/run-$STAMP.log" 2>&1 &
   ```

   Then **return immediately** — do NOT wait for it, tail it, or poll it. The
   match writes per-battle rows to `claude-plays-log.jsonl` as battles finish
   (crash-safe), a match-summary row at the end, and one readable transcript to
   `logs/reports/battle/<version>/<stamp>-<map>-haiku-v-haiku-match.md` with a
   match summary (including the rush-luck check: did the game-1 winner also
   take the match?), per-battle + per-match felt-notes, and a cached Typicality
   footer. Each LLM side plays through ONE persistent claude session for the
   whole match (rules ride the prompt cache; any session failure falls back to
   cold per-call transport automatically).

3. **Report back** — the balance report path + best map and why it scored best,
   plus: "match running in background — transcript will land at
   `logs/reports/battle/<version>/…-match.md`, live log at
   `logs/reports/battle/run-<stamp>.log`." Offer to run **review-reports**
   later for the graded analysis.

## Notes

- "Best balance" = the Balance column (lower is better: |red−50| + |1st−50| +
  penalties for zero-kill / tie-decided / drag, minus a reward for lead swings).
  A heuristic to pick an *interesting* map — say so, don't treat it as a verdict.
- Everything is filed by rules version (`Engine.VERSION`); a run after a rules
  change lands in a fresh folder and old data stays apples-to-apples.
- If `claude` isn't available (offline), the balance report still generates;
  say the LLM match was skipped rather than faking it. `--mock` smoke-tests the
  pipeline offline (mock runs stay out of the DB by design).
- Don't tune anything from these numbers here — that's `review-reports` (grades
  vs the rubrics) and then Bill.
