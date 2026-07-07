---
name: review-reports
description: Review War of Attrition playtest reports — battle transcripts (logs/reports/battle) and balance reports (logs/reports/balance) — against the grading rubrics, and save a graded analysis to logs/reports/analysis. Use when asked to "review the reports", "analyze the reports", "review-reports", "what do the logs/reports say", or after generate-reports runs.
---

# review-reports

Read the playtest reports, grade them against the rubrics, and write ONE graded
analysis to `logs/reports/analysis/`. Covers both report types:

- **battle** reports — `logs/reports/battle/<version>/*.md` (per-run LLM/AI
  transcripts from `dev/claude-plays.js` — single battles or first-to-N matches:
  result(s), decisions, journal, per-battle felt-notes, and the **Typicality vs
  the map baseline** footer) plus the machine record
  `logs/reports/battle/claude-plays-log.jsonl` (one JSON row per finished battle:
  `ts, version, map, seed, transport, matchId, battleIndex, red, blue,
  redEffort, blueEffort, winner, winType, turns, fallbacks, decisions[], notes`;
  token `usage` is reported on the match row).
- **balance** reports — `logs/reports/balance/<version>/*.md` (whole-roster
  metric tables from the Balance Dashboard or `dev/balance-report.js`: per-map
  Red%/1st%/HQ%/Turns/VPdiff/Atk/Swp/0kill%/Tie%/Drag/Swings/Balance + card
  table — Win%/Simple%/1stSight%/AvgSeen/Plays). `accumulated.json` beside them
  is the per-version fold of every battle to date; the same battles also land
  as rows in `logs/woa.db` (`node dev/db-query.js` for ad-hoc SQL).

**Suggestions only — never edit maps.js, cards, the rules, or code. Bill decides.**

## Read first

- `design-docs/grading-rubrics.md` — ground every reading and suggestion in a
  rubric (north stars + card/map/unit/game rubrics: goal / evidence + data
  origin / score meaning). Cite the target band next to each number, not vibes.
- `design-docs/human-instructions/ai-heuristic-model.md` — so any AI-behaviour
  suggestion names the exact weight to turn.
- The reports themselves. Default to the **current rules version** (the highest
  `<version>` folder / the `Engine.VERSION` stamped in report headers). Don't mix
  versions in one analysis — a rule changed between them, so the numbers aren't
  comparable. If the user names a file or version, use only that.

## Scope (settle first, ask only if genuinely unclear)

- Which version? (default: newest.) Battle reports, balance reports, or both
  (default: both, if present)?
- If the user names specific files, analyze only those.

## The analysis (this shape) → save to `logs/reports/analysis/`

Filename: `<YYYY-MM-DD>-<version>-analysis.md`. Open with a one-line scope
(version, how many battle reports across which maps, how many balance reports, n).

1. **North-star scoreboard** (from the balance reports) — each headline metric,
   current value, rubric target band, verdict (✓ / watch / ✗). red%, 1st-mover%,
   HQ%, avg turns, zero-kill%, tie-goes-to-2nd%, attacks/swaps, Drag, Swings.
2. **Per-map flags** — the SIDE-BIASED / mover-strong / attrition-only /
   STALEMATES rows with their numbers, and the Balance-score ranking. Per Bill's
   Round-4 note, an **attrition-only map with high Swings + low Drag is GOOD**
   (the lead changed hands to the end) — don't flag it as broken; flag maps that
   *drag* (high Drag, low Swings) or that a side/mover runs away with.
3. **Battle read** (from the transcripts) — win split, HQ vs attrition, the
   **fallback rate** (fallbacks ÷ decisions; high = the LLM was confused or the
   move list was unclear — flag it, it poisons everything else), and each game's
   **Typicality** verdict (was it representative or an outlier for its map?).
4. **How it felt** — distil the felt-notes across runs into 3–5 bullets:
   recurring "felt strong / weak / luck-driven". Quote sparingly.
5. **Suggestions (ranked, ≤6)** — one line each: the change, the evidence
   (quote the number + report), the rubric/metric it should move, and the type —
   **rules** (needs a spec + `test.js`), **data** (maps.js / a card / a deck via
   the create-card / create-map skills), or **AI** (a named heuristic weight).
   Recommend measuring with `node dev/balance-report.js` before/after.
6. **Watch-list** — what the reports hint at but can't confirm at this n (say the
   n and the ±100/√n band). Not a suggestion yet.

Then tell Bill the saved path and give a 3-line verbal summary.

## Rules

- Honest sample sizes: a felt-note from one battle is an anecdote; two LLMs
  agreeing across runs is a signal. State n and the ±100/√n noise band by every
  claim; Win% hugs 50 in attrition games — flag only big deviations.
- Felt-notes are a player's *impression*, not ground truth — cross-check against
  the decision/outcome data before promoting one to a suggestion. Fallbacks are
  not player choices; don't read strategy into them.
- The card table's Simple% carries the CARD_KEEP burn bias (the AI burns its
  least precious card) — say so when citing it.
- If Behaviour numbers moved sharply vs the baselines in
  design-docs/onboarding/code-overview.md "Known balance signals" (~5 attacks
  / ~7 swaps / zero-kill ~4% / ~88% fielded — 0.x-era numbers; the 1.0
  accumulator is the growing current-era baseline), treat it as an AI
  regression signal even when win rates look fine.
- One page of analysis is plenty. If there's nothing worth suggesting, say so.
