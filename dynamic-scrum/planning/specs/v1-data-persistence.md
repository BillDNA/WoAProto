> **Status: Implemented** (V1, July 2026) — kept for decision rationale + Bill's inline rulings; current behaviour lives in the dynamic-scrum/docs primers ([[Docs Index]]).

#spec
# V1 — Data persistence: a DB instead of loose JSON — first impressions & questions

Feedback Round 5: *"spec out what it would mean to capture data in a db rather than these
loose json files. — goal would be to have better data querying and allow us to plot
improvements over time."*

A **thinking doc, not an implementation plan.** Pairs with [[graphs-spec]] — that doc asked
"what views?", this one asks "what store makes those views (and version-over-version trends)
cheap?" Nothing here is committed.

## What we store today (and why it chafes)

- `logs/reports/balance/<version>/accumulated.json` — one blob per rules version, keyed by
  AI matchup, folding many runs together. Good for "current totals", bad for "show me the
  distribution" or "trend across versions".
- `logs/reports/balance/<version>/*.md` — human-readable dashboard reports (one file per run).
- `logs/reports/battle/claude-plays-log.jsonl` — append-only, one JSON object per LLM battle.
- `logs/reports/battle/<version>/*.md` — readable LLM transcripts.
- `logs/reports/analysis/*.md` — graded write-ups.

The chafe is exactly the two goals Bill named:
1. **Querying.** "Which maps are side-biased across *every* 0.3 run?" or "every battle that
   ended by HQ capture in under 12 turns" is a grep-and-eyeball today. It's one line of SQL
   against a table.
2. **Plot improvements over time.** [[graphs-spec]] #6 (version trend) and Q4 (keep per-battle
   rows) are both blocked on the same thing: **we aggregate then throw the per-battle rows
   away** (`balanceAdd` folds a battle into totals and drops it — engine.js:1243). You can't
   plot a distribution or a trend you never kept.

## The proposal: SQLite, dev-only

- **SQLite, a single file under `logs/`** (e.g. `logs/woa.db`). One file, no server, no daemon —
  it is the zippable-single-file philosophy applied to data. Node reads it via the **built-in
  `node:sqlite`** (Node 22+, zero dependency) or `better-sqlite3` as a `dev/` dep if we want
  older Node. **This lives entirely in `dev/`** — `game/` stays zero-dep, file://-runnable,
  untouched. The DB never ships in the zip.
- The in-browser Balance Dashboard **cannot** read a `.db` (file://, no node) — it keeps folding
  live runs through `balanceNew`/`balanceAdd` as now. The DB is the **dev-side analysis store**,
  written by `dev/balance-report.js` and `dev/claude-plays.js`, read by report/graph tooling.
  (If we ever want the dashboard to read history, that's a "dev server hands it JSON" follow-up,
  not part of this.)

## Sketch schema (illustrative, not final)

The unlock is keeping the grain we currently discard — **one row per battle**, not per run.

- `runs` — `id, version, ts, kind('balance'|'llm'), red_ai, blue_ai, n, tool, notes`
- `battles` — `id, run_id, version, map, seed, first_player, winner, win_type('hq'|'attrition'
  |'concession'|'unfinished'), turns, fs_red, fs_blue, first_blood, lead_changes, kill_tail`
  ← this is the [[graphs-spec]] Q4 grain (battle-length histograms, typicality dots).
- `card_plays` — `id, battle_id, card_id, mode, turn, seen, noop, side, won` ← the card report,
  now sliceable per-map/per-version instead of pre-summed.
- `timeline` *(optional, opt-in)* — `battle_id, turn, fs_red, fs_blue` ← the field-score line for
  [[graphs-spec]] #5/#7. Biggest row-count; make it a flag (`--keep-timeline`) so ordinary runs
  stay small.

Views/derived: map-level aggregates ("balance score per map per version") become a `GROUP BY`,
so the dashboard tables and `balance-report.js` markdown can be *generated from* the DB rather
than being the only copy of the numbers.

## Migration & coexistence

- **Dual-write, don't rip out.** Keep emitting the markdown reports (git-diffable, human-readable,
  what Bill actually reads) AND insert rows into the DB. The `.md` stays the artifact; the DB is
  the queryable index beside it.
- **One-time importer** (`dev/db-import.js`): walk `logs/reports/**` — fold `accumulated.json`
  into `runs`+`battles` at run grain (per-battle detail for *old* data is gone, so pre-V1 rows
  are aggregate-only; that's fine, we start keeping detail from V1 forward), and read every
  `claude-plays-log.jsonl` line into `battles`+`card_plays`.
- **Version is already the seam.** Everything is stamped with `Engine.VERSION`; the DB just makes
  it a column instead of a folder name, so cross-version queries stop being cross-folder greps.

## Git question (flagged, not assumed)

A binary `.db` is merge-hostile and bloats history. Two clean options: (a) **gitignore it**, treat
it as a regenerable cache (the `.md` reports + jsonl remain the committed source of truth, importer
rebuilds the DB on demand); or (b) **commit it** as the single source and generate markdown from it.
My lean: **(a) gitignore, DB-as-index** — keeps the committed record human-readable and the DB
disposable, matching how `graphify-out/cache` is treated.

## Questions for Bill

1. **SQLite dev-only, or is JSON actually fine + we just add a query script?** If querying is the
   only pain, a `dev/query.js` over the existing jsonl might be 80% of the value at 10% of the
   cost. SQLite earns its keep mainly if we want the per-battle grain + trend plots. Which pain is
   real for you — querying, or plotting-over-time, or both?
	1. I'm leaning SQLite, 
2. **Keep per-battle rows?** (Same as [[graphs-spec]] Q4.) This is the whole point of a DB over
   the current aggregate blobs. Yes → we retain the grain that unlocks histograms/typicality/trend.
	1. yeah 
3. **Commit the `.db` or gitignore it?** (My lean: gitignore, regenerable from the committed
   reports.)
	1. ignore for now but might change my mind later
4. **Timeline detail?** Opt-in per-turn field-score rows (bigger DB) for the timeline/typicality
   views, or hold until we've decided those charts are worth building?
	1. i think if we have more detail we can ask more nuanced questions 
5. **Cut-over point.** Start the DB at the next version bump (V1) so pre-V1 loose data stays
   as-is and imports as aggregate-only — agreed, or backfill nothing?
	1. lets start collecting in v1 i think we can ignore the v0 and before no need to try and backfill
6. **Who writes to it?** Just the CLI tools (`balance-report.js`, `claude-plays.js`), or should
   the in-browser dashboard's runs also land in the DB (needs the local server as a write proxy
   — a bit more plumbing)?  
	1. i think it all does, i think if i play the ai, watch the ai's play or run the balancer from the dashboard, or cli runs it or its a claude plays.  this is part of why i lean SQLLite

Answer 1–2 and I can turn this into a real V1 spec (schema DDL + importer + one example query
that reproduces a current report from the DB).
