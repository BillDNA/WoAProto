---
name: run-tournament
description: Run an AI (and optionally LLM) tournament over the War of Attrition map roster and turn the metric spread into graded balance suggestions for Bill. Use when asked to "run a tournament", "check the balance", "measure the meta", or after any rules/card/map change lands.
---

# run-tournament

Run the sims, read the spread against the rubrics, hand Bill a graded report.
**Suggestions only — never edit maps.js, cards, or rules yourself**
(dynamic-scrum/docs/code-architecture.md: findings go to Bill, he decides rule
changes).

**Stays in its lane:** this skill both *measures* (the sweep) and *grades*
(the rubric read) in one pass — the combined job `generate-reports` +
`review-reports` split across two skills. Use `run-tournament` for a quick
one-shot roster-wide meta check with no saved artifact; use the
`generate-reports` → `review-reports` pair when you want the fuller loop (a
seeded LLM felt-note match, a saved `logs/reports/analysis/` write-up, or
findings meant to feed `create-card`/`create-map`).

## Inputs to settle first (ask only if genuinely unclear)

- Scope: the default pool is the ACTIVE map-set (12-map roster as shipped);
  `--mapset <id>` picks another set, `--mapset all` = every map on disk, or use
  a name filter. n per map (default 60; 24 for a quick look)?
- Which AIs: `normal` for the standard read; add `hard` if pacing allows; any
  maps.js `"ai"` personalities in play (brawler, turtle, hawk, ...)?
- LLM reference point wanted? (adds real-money/time cost — default no)

## Steps

1. **Baseline runs** (all from repo root):
   - `node game/balance.js 60` — per-map report + Behaviour/Decisiveness + card report.
     (To SAVE the report and fold it into the per-version accumulator, use
     `node dev/balance-report.js 60 --parallel` instead — much faster on the
     full roster, identical numbers.)
   - `node game/balance.js matchup 16` — skill premium (stronger AI's win rate).
   - Pit personalities when relevant: `node game/balance.js matchup 16 brawler turtle`.
2. **LLM battles** (only if asked): `node dev/claude-plays.js --red haiku --blue normal
   --map <name>` per interesting map (add `--match 3` for a first-to-3 match; each
   LLM side gets one persistent session, so matches are token-cheap per battle).
   The LLM is a non-heuristic reference point on the skill curve, and its
   felt-notes are playtest signal — quote them.
3. **Grade** every headline number against `dynamic-scrum/rubrics/grading-rubrics.md`
   (north stars + per-artifact rubrics: goal / evidence + data origin / score
   meaning). Quote the target band next to each reading.
4. **Report** (markdown, for Bill):
   - North-star scoreboard: each metric, current value, target band, verdict.
   - Per-map flags: SIDE-BIASED / mover-strong / attrition-only / STALEMATES rows,
     with the numbers.
   - Pacing (Feedback Round 2): the Drag column (trailing kill-less turns before
     the game ends — high = the AIs march in circles) and Swings (field-score
     lead flips per battle — high = real back-and-forth). Flag maps that drag.
   - Card watchlist: high Simple%, high 1stSight% + low AvgSeen.
   - Concrete suggestions, each tied to the evidence ("Thornfield reads 73/28 red
     at n=40 — consider moving the red-side forest one hex south"), phrased as
     options for Bill, not decisions.
   - Sample-size honesty: state n and the ±100/√n noise band next to every claim.

## Gotchas

- Win% hugs 50 in attrition games — flag only big deviations, never Win% alone.
- The card report's Simple% carries the CARD_KEEP burn bias (the AI burns its
  least precious card) — say so when citing it.
- If Behaviour numbers moved sharply vs the rules-1.1 baseline in
  dynamic-scrum/rubrics/grading-rubrics.md "Game-level rubric" (6.1 attacks /
  5.7 swaps / 88% fielded, n=40/map — the code-architecture.md "Known balance
  signals" table is still the superseded 0.x/V0-era reading; prefer the 1.1
  accumulator under logs/reports/balance/1.1/ once it has volume), treat it as
  an AI regression signal even when win rates look fine.
- Keep `node game/test.js` out of scope here — this skill measures balance, not
  correctness.
