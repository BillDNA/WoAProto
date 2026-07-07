---
last-reviewed: 2026-07-07
---
#onboarding #game-logs #code-architecture
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

Schema: `runs` / `battles` / `card_plays` / per-turn `timeline` (from `st.fsTimeline`). Query read-only
with `node dev/db-query.js "<sql>"` (no SQL = schema + row counts).

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
3. Charts tab in the in-browser Balance Dashboard — map-fairness scatter, card quadrant, battle-length
   histogram, same aggregation as the CLI (`game/report-model.js` is the ONE report model).
4. Skills wrap the loop: `generate-reports` (1+2, fire-and-forget), `review-reports` (grade against
   [[grading-rubrics]]), `run-tournament` (roster-wide meta read).

## Related

[[Docs Index]] · [[code-architecture]] · [[workflow]] · [[grading-rubrics]] · [[claude-plays-human-instructions]]
