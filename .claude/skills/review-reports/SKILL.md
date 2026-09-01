---
name: review-reports
description: Review War of Attrition playtest reports — skirmish transcripts (logs/reports/skirmish) and balance reports (logs/reports/balance) — against the grading rubrics, and save a graded analysis to logs/reports/analysis. Use when asked to "review the reports", "analyze the reports", "review-reports", "what do the logs/reports say", or after generate-reports runs.
---

# review-reports

Read the playtest reports, grade them against the rubrics, and write ONE graded
analysis to `logs/reports/analysis/`. Covers both report types:

- **skirmish** reports — `logs/reports/skirmish/<version>/*.md` (per-run LLM/AI
  transcripts from `dev/claude-plays.js` — single skirmishes or first-to-N matches:
  result(s), decisions, journal, per-skirmish felt-notes, and the **Typicality vs
  the map baseline** footer) plus the machine record
  `logs/reports/skirmish/claude-plays-log.jsonl` (one JSON row per finished skirmish:
  `ts, version, map, seed, transport, matchId, skirmishIndex, red, blue,
  redEffort, blueEffort, winner, winType, turns, fallbacks, decisions[], notes`;
  token `usage` is reported on the match row).
- **balance** reports — `logs/reports/balance/<version>/*.md` (whole-roster
  metric tables from the Balance Dashboard or `dev/balance-report.js`: per-map
  Red%/1st%/HQ%/Turns/VPdiff/Atk/Swp/0kill%/Tie%/Drag/Swings/Balance + card
  table — Simple%/1stSight%/AvgSeen/Plays plus **Pts/Resid** (army-points cost
  and the WOA #57 mispricing residual — a `⚠` marks a **soft** mispricing flag,
  see card rubric axis 5); Win% was dropped from this table,
  see rubric Card criterion 6). `accumulated.json` beside them is the
  per-version fold of every skirmish to date; the same skirmishes also land as
  rows in `logs/woa.db` (`node dev/db-query.js` for ad-hoc SQL).

**Suggestions only — never edit maps.js, cards, the rules, or code. Bill decides.**

## Read first

- `docs/balance/` (runnable math) + `docs/rubrics/` (taste rubrics) — THE grading
  SOT, split by kind. Ground every reading and suggestion in one of their
  sections: **North stars** (the 5 headline items, `docs/balance/README.md`),
  **§Temperature** (T0/T1/T2 + hard floors — read before writing a verdict,
  `docs/balance/README.md`), **card rubric** (`docs/rubrics/card-rubric.md`),
  **map rubric** (`docs/rubrics/map-rubric.md`) + **"Best map"** (the
  `balanceScore` SOT, `docs/balance/best-map-score.md`), **unit rubric**
  (`docs/rubrics/unit-rubric.md`), **Game-level guards** (Behaviour health /
  Pacing / Deck as attrition clock, `docs/balance/README.md`). Every criterion
  there is Goal/Evidence/Score/Lever — carry that same shape into the analysis (below).
  Every number is dated + setup-labeled (AI tier, n, mapset, date) there —
  **quote the rubric's band, never restate its baseline figures here**; this
  skill file goes stale the moment a restated number does, and the rubric is
  the one place they're allowed to live.
- `docs/ai/ai-heuristic-model.md` — so any AI-behaviour
  suggestion names the exact weight to turn.
- The reports themselves. Default to the **current rules version** (the highest
  `<version>` folder / the `Engine.VERSION` stamped in report headers). Don't mix
  versions in one analysis — a rule changed between them, so the numbers aren't
  comparable. If the user names a file or version, use only that.

## Scope (settle first, ask only if genuinely unclear)

- Which version? (default: newest.) Skirmish reports, balance reports, or both
  (default: both, if present)?
- If the user names specific files, analyze only those.
- **Which temperature (rubric §Temperature)?** Grading the shipped `default`
  content/rules against the rubric's baselines → **T0** (strict — no north
  star leaves its band). Reviewing a candidate change (a card/map/deck/AI-weight
  tweak someone wants adopted) → **T1** (the loop default — ≥3 metrics improve,
  ≤1 leaves its band by ≤1 band-width, name the trade). Deliberately mapping
  the design space against a candidate that's expected to blow past a band →
  **T2** (hot — everything but the hard floors is allowed, and say the T0/T1
  re-measure is still owed before anything ships). Default to T0 unless the
  reports are plainly about a candidate change.

## The analysis (this shape) → save to `logs/reports/analysis/`

Filename: `<YYYY-MM-DD>-<version>-analysis.md`. Open with a one-line scope
(version, how many skirmish reports across which maps, how many balance reports, n)
**followed by a `Temperature: TX — <one-line why>` line** (per the Scope step
above — every analysis states its tier up front, never leaves it implied).
End the file with the tag footer `#reports #analysis #v<version with dots as dashes>`
(e.g. `#reports #analysis #v1-0`) — the balance/skirmish reports auto-tag themselves
the same way; the tags are how the right era's reports are found fast.

1. **North-star scoreboard** (from the balance reports) — each of the rubric's
   5 North stars plus the Game-level rubric's Behaviour-health line: current
   value **with its setup label** (AI tier/n/mapset/date, matched to what the
   report actually ran), the rubric's target band (quote it, don't restate a
   baseline number from memory), and a verdict — ✓ / watch / ✗, judged at the
   Temperature stated above (T0: strict against the band; T1: a named
   trade-off is allowed; T2: only the hard floors bind). **Every watch/✗ row
   carries its rubric Lever line** — the knob + file, copied from the
   criterion's Lever, so a bad reading never arrives without something to turn.
2. **Per-map flags** — grade each map against the rubric's Map criteria (side
   balance, mover balance, HQ-vs-attrition mix, board control, tie-rule share)
   and the "Best map" Balance-score ranking. Per Bill's Round-4 note (rubric,
   "Best map" table), an **attrition-only map with high Swings + low Drag is
   GOOD** (the lead changed hands to the end) — don't flag it as broken; flag
   maps that *drag* (high Drag, low Swings) or that a side/mover runs away
   with. Same Lever-carry-through rule as § 1.
3. **Skirmish read** (from the transcripts) — win split, HQ vs attrition, the
   **fallback rate** (fallbacks ÷ decisions; high = the LLM was confused or the
   move list was unclear — flag it, it poisons everything else), and each game's
   **Typicality** verdict (was it representative or an outlier for its map?).
4. **How it felt** — distil the felt-notes across runs into 3–5 bullets:
   recurring "felt strong / weak / luck-driven". Quote sparingly.
5. **Suggestions (ranked, ≤6)** — one line each: the change, the evidence
   (quote the number + report), the rubric criterion + **Lever** it should
   move (name the knob and file, straight from the rubric), and the type —
   **rules** (needs a spec + `test.js`), **data** (maps.js / a card / a deck via
   the create-card / create-map skills), or **AI** (a named heuristic weight).
   Recommend measuring with `node dev/balance-report.js` before/after, at the
   same Temperature the suggestion is meant to clear.
6. **Watch-list** — what the reports hint at but can't confirm at this n (say the
   n and the rubric's sample-size-honesty band). Not a suggestion yet. **Any card
   carrying a `⚠` in the balance report's Resid column belongs here as a soft
   mispricing flag** (card rubric axis 5) — name the card, its Resid, and the
   timing blind-spot caveat (a held-value card can read negative without being
   weak). Never promote it to a hard verdict; measured balance overrules the
   price (ADR-0002).

Then tell Bill the saved path and give a 3-line verbal summary.

## Rules

- **State the Temperature, always.** A `Temperature: TX` line in the header
  (§Scope above) is mandatory, and every verdict in § 1–2 is judged against
  that tier's tolerance from rubric §Temperature — never an implied default.
- **Match setup before comparing.** Several rubric baselines carry two
  readings (e.g. Game-level §1 Behaviour has a normal-AI primary and a
  hard-vs-hard secondary; Map criterion 3 HQ% and criterion 6 Tie-rule share
  both give hard-vs-hard and normal figures). Grade a hard-vs-hard report
  against the hard-vs-hard reading, a normal-vs-normal report against the
  normal reading — never cross tiers.
- **Every Lever travels with its metric.** Any metric graded watch/✗ in § 1–2
  carries the rubric's Lever line (knob + file) into the analysis — that's
  what makes the finding actionable instead of just a number.
- Honest sample sizes: a felt-note from one skirmish is an anecdote; two LLMs
  agreeing across runs is a signal. State n and the noise band by every claim
  (rubric "How to run the numbers" — sniff test at n=24, trust at n≥40/map or
  n≥96/matchup). Win% hugs 50 in attrition games — flag only big deviations,
  and see rubric Card criterion 6 before leaning on it at all.
- Felt-notes are a player's *impression*, not ground truth — cross-check against
  the decision/outcome data before promoting one to a suggestion. Fallbacks are
  not player choices; don't read strategy into them.
- The card table's Simple% carries the CARD_KEEP burn bias (the AI burns its
  least precious card) — say so when citing it. **Card criteria 4–5
  (1stSight%/AvgSeen) are diagnostics of the AI, not card design targets** —
  read the rubric's ⚠ box before grading a card an auto-play or a dead hoard
  off those two columns alone.
- If Behaviour numbers moved sharply vs the dated baseline in
  `docs/balance-baselines.md` (the single numbers home — every figure there
  carries its AI tier / n / mapset / date; don't restate numbers here, they go
  stale), read against the Behaviour-health guard in `docs/balance/README.md`
  §Game-level guards, treat it as an AI
  regression signal even when win rates look fine — after confirming the
  setups actually match (see "Match setup" above).
- One page of analysis is plenty. If there's nothing worth suggesting, say so
  — a clean T0 pass across every north star is a legitimate finding, not a
  failure to find something.
