---
last-reviewed: 2026-07-16
---
#human-instructions #game-logs #claude-orientation

# Driving the balance loop — Bill's guide

Zero to reading balance data, at the command line, no Claude required. Every command below was
run and verified on 2026-07-07 (rules 1.0); the paths/version strings below are swept to the
current rules-1.1 naming (2026-07-16) — a full command re-verify under 1.1 is not in scope here.
Run everything **from the repo root**.

## The loop in one breath

```
node game/server.js          # 1. start the game (leave running)
# ...play or watch a battle in the browser...
node dev/balance-report.js   # 2. bulk-sim the roster, save a report
node dev/db-query.js         # 3. poke the per-battle database
```

Change a card/map/weight → rerun 2 → compare the reports. That's the whole iteration loop.

## 1. Start the server

```
node game/server.js
```

Expected:

```
  WAR OF ATTRITION — server running   (rules 1.1)
  ---------------------------------
  On this computer:  http://localhost:8420
  Battle persistence: ON -> logs/woa.db
```

Leave it running (Ctrl+C stops it). The server is the standard dev path — it's the only way
saves persist: map/deck/map-set edits write real files, and every finished browser battle
lands in the database. If it says the port is taken, a server is already running in another
window — use that one, don't start a second.

## 2. Play or watch a battle

Open **http://localhost:8420** — pick *Battle the AI* (play) or *Watch* (AI vs AI) from the
menu. To skip the menu entirely, **http://localhost:8420/index.html?autostart=ai** drops you
straight into a battle.

When the battle ends you'll have your first row in `logs/woa.db` (the console window logs
nothing — persistence is silent; step 4 proves it landed).

## 3. Generate a report set

### The workhorse: `dev/balance-report.js`

```
node dev/balance-report.js
```

Simulates the active map-set (currently `core7`, 7 maps) and **saves** a markdown
report. Defaults: 60 battles per map, hard vs hard. Expected tail:

```
SAVED: logs\reports\balance\1.1/2026-07-07-1100-hard-vs-hard-n6-r2.md
ACCUMULATED: logs\reports\balance\1.1/accumulated.json (360 battles across 2 runs)
BEST_MAP: The Ford
```

Each run **folds into the per-version accumulator**, so repeated runs = more data on the same
rules version. The flags that matter:

| Flag / arg | What it does |
|---|---|
| `[n] [aiRed] [aiBlue]` | e.g. `node dev/balance-report.js 20 normal` — 20 battles/map, normal vs normal |
| `--parallel` | process-per-map workers, ~3.3× faster (skips per-battle DB rows — the report is identical) |
| `--once` | report this run only, don't touch the accumulator (quick experiments) |
| `--fresh` | reset the accumulator to just this run (after a deliberate data reset) |
| `--mapset <id>` | a specific map-set (`all` = every map on disk) |

### Quick single-map check: `game/balance.js`

```
node game/balance.js 4 normal ford
```

Same numbers, printed to the console only (nothing saved, nothing accumulated) — the fast
"did my tweak move anything" tool. Expected shape: a per-map table (`Red% Blue% 1st% ... Atk Swp`),
Overall/Behaviour/Decisiveness lines, and a card report — each column explained in a
"How to read it" footer right in the output. Also: `node game/balance.js matchup 16 hard normal`
pits any two AI personalities (the stronger one's win rate = skill premium).

### LLM playtests: `dev/claude-plays.js`

The felt-notes tool — an LLM plays real battles and tells you how the game felt. Costs real
tokens; full flags and gotchas live in [[claude-plays-human-instructions]]. Verify the
plumbing free with:

```
node dev/claude-plays.js --mock --map cockpit
```

Expected: a full battle in seconds ("mock: always the first option"), transcript written to
`logs/reports/battle/1.1/`.

## 4. Where everything lands

| Path | What | Committed? |
|---|---|---|
| `logs/reports/balance/1.1/` | saved balance reports + `accumulated.json` | yes — the human record |
| `logs/reports/battle/1.1/` | claude-plays transcripts (+ JSONL master log one level up) | yes |
| `logs/reports/analysis/1.1/` | graded reviews, one-off analyses | yes |
| `logs/woa.db` | one row per battle, every source (browser, CLI, LLM) | **no — gitignored, delete freely** |

`1.1` is the rules version (`Engine.VERSION`) — it bumps when rules change, so data stays
apples-to-apples per era. The DB is a regenerable index over the same battles the reports
summarize; deleting it loses nothing you can't re-sim.

## 5. Query the database

```
node dev/db-query.js
```

No arguments = the schema plus row counts (`runs`, `battles`, `card_plays`, per-turn
`timeline`). With SQL (read-only, quote it):

```
node dev/db-query.js "select map, count(*) battles, sum(winner='red') red_wins, sum(win_type='hq') hq from battles group by map order by battles desc limit 5"
```

Expected:

```
map          battles  red_wins  hq
-----------  -------  --------  --
Twin Gates         6         3   0
The Void           6         3   2
...
(5 rows)
```

On a fresh clone there's no DB yet — you'll see `No DB at ...logs\woa.db — nothing has been
recorded yet`. Any battle (browser or a non-`--parallel` balance-report run) creates it.

## 6. What each dev/ script is for

| Script | One line |
|---|---|
| `balance-report.js` | bulk-sim the roster → saved report + accumulator + DB rows (step 3) |
| `claude-plays.js` | LLM plays battles/matches → transcripts + felt-notes ([[claude-plays-human-instructions]]) |
| `db-query.js` | read-only SQL console over `logs/woa.db` (step 5) |
| `db.js` | the one DB writer every battle source funnels through (not run directly) |
| `tune-weights.js` | offline AI-weight sweeper — **suggestions only**, never edits engine files |
| `gen-docs.js` | regenerates the AI-weights/personalities/content tables in the docs — run after touching `AI_WEIGHTS` or `content/` |
| `smoke.js` | jsdom UI harness — run after UI changes (`npm i --prefix dev jsdom` once, first time) |
| `llm-client.js` / `llm-session.js` | claude-plays' transports (not run directly) |
| `*.test.js` | focused suites — run the one matching the area you touched |

And the two testing commands that guard everything (`ALL TESTS PASSED` is the expected end):

```
node game/test.js    # engine rules suite — green on every commit
node dev/smoke.js    # browser UI smoke — green after UI changes
```

## 7. Which skill does what (say it to Claude)

| Skill                        | What you get                                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------------- |
| `generate-reports`           | a fresh standard set: 60-battle hard-vs-hard report + a first-to-3 LLM match on the best map |
| `review-reports`             | the reports graded against the rubrics → analysis saved to `logs/reports/analysis/`          |
| `run-tournament`             | roster-wide meta read → graded balance suggestions                                           |
| `create-card` / `create-map` | a proposed card / map, rubric-graded, in the exact data shape                                |

Findings always come back to you — **you decide rule changes**, the tools just measure.

## Related

[[Docs Index]] · [[data-and-reports]] (where the pipeline is specified) · [[code-architecture]] ·
[[claude-plays-human-instructions]] · [[ai-heuristic-model]]
