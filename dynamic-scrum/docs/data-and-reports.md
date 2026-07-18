---
last-reviewed: 2026-07-18
---
#claude-orientation #game-logs #code-architecture
# Data & reports — where every battle lands and how reports flow

The one primer for the V1 data pipeline: per-battle persistence, the report tree, and the
skills loop that runs it. (Distilled from the retired v1 specs — `v1-data-persistence`,
`v1-claude-plays-and-reports`, `graphs-spec` — git history holds the full rationale.)

## The invariant

**Every battle from every source lands as a per-battle row in `logs/woa.db`** (gitignored, regenerable —
delete freely). Three funnels, one writer (`dev/db.js`):

| Source | Path in |
|---|---|
| CLI sims (`dev/balance-report.js`, `game/balance.js` via balanceMap) | `onGame` callback |
| Live play in the browser | `Engine.hooks.onBattleEnd` → `POST /api/recordbattle` (server proxy, **fail-open** — a zipped `game/` without `dev/` answers 501 and play continues) |
| LLM battles (`dev/claude-plays.js`) | direct `dev/db.js` insert |

Schema: `runs` / `battles` / `card_plays` / per-turn `timeline` (from `st.fsTimeline` — a field no
engine code populates yet, so the table is empty until WOA-037). Query read-only with
`node dev/db-query.js "<sql>"` (no SQL = schema + row counts).

**Run identity + trace (metrics-v2 Phase 1, WOA-031/032, 2026-07-18).** `runs` carries SPEC §7
identity — `deck` (always `Engine.ACTIVE_DECK.id`, which also covers the browser's `__applied`
sandbox deck), `mapset`, `seed_base`, `label`, `baseline` — with **exactly one `baseline` pin per
rules version** (`dev/db.js` `setBaseline` clears the old pin; asserted in `dev/db.test.js`).
`battles` rows carry a `trace` JSON column: the SPEC §4 envelope
`{v,map,seed,fp,winner,winType,turns,trace:[per-play {t,s,a,h,k,ld,u}…],units:{<type>:{dep,atk,abs,kill,die}}}`
(~4 KB/battle; unit keys are full names `infantry`/`cavalry`/`artillery`). Gotcha for folds: mixed
deploy+attack plays tag `a:'attack'` (sticky) — deploy *timing* reads `units.*.dep`, never the
`a`-stream. `game/balance.js` `matchup` mode deliberately writes no runs (a comparison sweep, not a
§7 run). Server reads: `GET /api/runs` (list) and `GET /api/battles?run=<id>` (rows incl. trace),
both guarded — no `dev/db.js` → empty, play continues.

## Reserve-held-at-end (WOA-016)

Per side, how much of that side's pieces were still undeployed (in reserve) when the battle ended —
`reserveEndRed`/`reserveEndBlue` in the balance aggregate (a 0..1 share per battle, summed like every
other aggregate field), `res_end_red`/`res_end_blue` (raw piece counts) in the `battles` table. It's the
per-side split of the SAME reserves-at-end read the existing `deployedShare` metric already folds
combined across both sides (`game/engine/06-sim.js` `balanceAdd`, right where `deployedShare` is
computed) — the two reconcile exactly (`deployedShare = done − 0.5×(reserveEndRed + reserveEndBlue)`,
asserted in `game/test.js`), so trust in the older metric transfers to the new one.

Shows as `Reserves at end: red X% · blue Y%` on every report surface — `node game/balance.js`'s
terminal output and `dev/balance-report.js`'s saved markdown both fold through `game/report-model.js`
(`foldGlobal` + `reportMarkdown`, the ONE report model), so the number is identical everywhere it
appears by construction.

**Interpretation**: high = that side hoarded pieces instead of committing them (turtling). This is the
instrument for the balance-loop-v2 felt-note "saving Infantry/Cavalry reserves for turn 15+ wins" (final
report §5c.4) — cross-reference a side's reserve-held share against its win rate (Red%/1st%) to prove or
disprove that the hoarding actually correlates with winning; WOA-018 is the follow-up that acts on
whatever this shows. Aggregate-per-side only (not broken out by unit type): unit composition is itself a
content lever (`content/units/*.js`, WOA-011), so a per-type breakdown would tie the DB schema/report
lines to today's `infantry`/`cavalry`/`artillery` ids — a fragility the per-side aggregate avoids while
still satisfying the instrument's purpose.

## Reports — the committed human record

Markdown reports are the durable artifact; the DB is the queryable index over the same battles.

- `logs/reports/balance/<version>/` — saved balance reports (dashboard format) + the per-version
  `accumulated.json` fold (`--fresh` resets, `--once` skips accumulation).
- `logs/reports/battle/<version>/` — claude-plays transcripts (one .md per run, Typicality footer)
  + crash-safe per-battle JSONL.
- `logs/reports/analysis/<version>/` — graded reviews and one-off analyses (weight-tuner sweeps,
  map-trim decisions). Findings go to Bill; **he decides rule changes**.
- `<version>` = `Engine.VERSION` (`game/engine/01-core.js`, tracks the rule book header) — the one
  source of the version string, so playtest data stays apples-to-apples per rules era.
- **Every report ends with a tag footer** `#reports #<kind> #v<version, dots as dashes>` (e.g.
  `#reports #balance #v1-0`) — auto-emitted by `report-model.js` (balance, CLI + dashboard alike) and
  `claude-plays.js` (battle); the review-reports skill writes it on analyses. Search by tag to find the
  right era's reports fast.

These paths + balance-report's `SAVED:`/`BEST_MAP:` stdout lines are **frozen API** (pinned by the
skills below) — moving any requires a same-commit sweep of `.claude/skills/` + these docs.

## The loop (tools + skills)

1. `node dev/balance-report.js --parallel` — fast saved report (process-per-map workers, ~3.3×);
   `--mapset <id|all>` picks the roster; prints `BEST_MAP:`.
2. `node dev/claude-plays.js --match N` — LLM felt-notes on the best map (persistent session per side,
   honesty invariant: the model only sees what a player sees).
3. The in-browser Balance Dashboard (metrics-v2 Phase 1, WOA-034/035): pill nav **Overview | Maps |
   Cards | Units | Tables**. Overview is the **view-only A/B landing view** — run-A/B pickers over
   the `runs` table (A defaults to the version's `baseline` pin, else newest), T0/T1/T2 temperature
   selector re-shading `WOA_REPORT.bands()`, triage band board + per-map balance-score dumbbells +
   pacing minis, all folded from saved battle rows (`WOA_REPORT.foldBattles`, same aggregation as the
   CLI — `game/report-model.js` is the ONE report model). Tables is the old run-loop dashboard,
   unchanged; the pre-P1 single-run Charts tab is retired (its chart primitives live on in
   `ui/charts.js` for the P2 tabs). Maps/Cards/Units are stubs until P2/P3.
4. Skills wrap the loop: `generate-reports` (1+2, fire-and-forget), `review-reports` (grade against
   [[grading-rubrics]]), `run-tournament` (roster-wide meta read).

## Related

[[Docs Index]] · [[code-architecture]] · [[workflow]] · [[grading-rubrics]] · [[claude-plays-human-instructions]]
