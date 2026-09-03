# ADR-0004 — The balance fold moves from JS to SQL

Status: Accepted

## Context

Balance metrics have lived as a JavaScript fold. `game/sim.js` sums finished
skirmishes into an aggregate (`balanceNew`/`balanceAdd`/`foldFacts`), and
`game/report-model.js` folds persisted rows the same way for the dashboard. The
project doctrine's *one-implementation-per-fact* clause named `game/sim.js` as
the single home of "the seed schedule + the balance fold".

That fold answered a fixed menu of questions. Anything new — "how does card X's
play timing move with a map's mountain-hex count?" — meant either a new JS fold
pass or a new bespoke table, because the store was bolted-flat: one wide row per
grain, with content facts (which battalion, what terrain, which dials) either
absent or inlined as opaque columns a query couldn't join against.

The store is now a **star schema** (`dev/db.js`): fact tables at skirmish /
decision / turn grain, surrounded by dimension tables (`versions`, `maps`,
`cards`, `battalions`) upserted from loaded content at ingest and stamped with the
(rules version, engine config digest) slice key. With the dimensions present and
joinable, an aggregate is a `GROUP BY` over a join — the fold *is* SQL, and it no
longer has to be written in JS to be asked.

Per-skirmish sequence facts (Drag, Swings, lead-changes, kill-tail) are a
different thing from the fold: they are extracted once per finished skirmish by
`SIM.skirmishFacts` and written to skirmish columns. That is extraction, not a
fold, and it stays JS-at-ingest — one derivation, one place, feeding both the
live path and the stored row.

## Decision

**The canonical home of a cited balance metric is a named SQL view over the star
schema, not a JS reduction.** `dev/db.js` ships the views (`v_map_balance`,
`v_global_balance`, `v_card_timing` — the last carrying both card timing and the
per-card fairness signal, one grain, one definition of plays/declines); every cited
metric — first-mover %, Red %, HQ %, zero-kill %, Tie %, Drag, Swings, Attack/Swap
share, first-blood→win %, control %, card play-timing, and the per-card fairness
signal (win contribution + pass-rate) — is a column of one, sliced by (version,
config_digest) so two rules-configs never pool.

This **supersedes the "fold in `game/sim.js`" clause** of one-implementation-per-
fact. The single home of a *cited metric* is its SQL view. What stays in JS is
narrow and deliberate:

- `SIM.skirmishFacts` — the per-skirmish extraction (the fact written to columns).
  Still one home; it is not a fold.
- `game/sim.js`'s `balanceMap` — the sweep loop that *runs* skirmishes. Producing
  games is not folding them.
- `game/report-model.js` — **demoted to rendering.** It still owns report
  scoring/layout and keeps its JS fold of persisted rows (the browser has no
  SQLite). That JS fold is the *secondary* path; the SQL view is the source of
  truth a disagreement is resolved against. Both the per-skirmish extraction
  (`factsFromRow ≡ skirmishFacts`) **and** the aggregate fold-equivalence
  (`R.foldSkirmishes` ≡ `v_global_balance` on a known pool) are now pinned by test
  (`dev/db.test.js`) — so the transitional browser fold cannot drift from the
  views while it remains.

The migration is incremental by design. The CLI/analysis path reads the views
today; the dashboard's in-browser fold is retired to server-side aggregation in a
follow-up, at which point `report-model.js` is purely a renderer. Landing the
schema, the ingest, and the views is what makes the direction real and testable;
the rewire is not gated on this decision.

**ADR-0002 (army-points as a descriptive yardstick) and ADR-0003 (`node:test` as
the one harness) remain intact.** This decision touches only where the balance
fold lives, not how points are priced or how tests run.

## Consequences

- A new balance question is a `SELECT` over dimensions already present, not a code
  change. "Card timing vs terrain" is a three-table join, no JS.
- The store is self-contained: terrain and card-intrinsic questions are answered
  in SQL without reaching into the JS content files, because the dimensions carry
  computed terrain, card points/kind/opener flags, and battalion composition.
- Two games at the same rules version but a different dial slice apart on a plain
  `config_digest` filter — the fold can never silently pool incomparable configs.
- `game/sim.js` keeps the extraction and the sweep, loses the "fold" title. The
  doctrine clause is updated to point the fold at the SQL views.
- `game/report-model.js` remains for rendering and the browser's transitional JS
  fold. The two folds are pinned equal by test; the fold is retained (the
  browser has no SQLite), not deleted, until the dashboard reads server-side
  aggregates — at which point the JS fold retires. Retained ≠ unpinned: the parity
  test is the guard.
- Views are versioned with the schema in `dev/db.js`; adding a cited metric is a
  new view (or a column of one), reviewed like any schema change.
