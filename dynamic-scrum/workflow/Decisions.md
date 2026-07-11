# Decisions

Index of settled decisions. **Design** = how the workflow/product behaves and feels; **Architecture** =
structure, tooling, technical approach. Each entry is headed by a stable kebab slug (`D.D:<slug>` /
`D.A:<slug>`) — the sole citation key (cross-project `canonical D.A:<slug>`) — with a brief *why* inline
(or a link to a `dynamic-scrum/docs/` file). Claude adds to this without being asked when a decision is made in conversation.

> Seeded 2026-07-07 from the pre-adopt `Claude.md` standing goals — the load-bearing standing choices,
> not a re-import of git history.

## Design

- **`D.D:physical-board-guardrails`** — the 24-hex ceiling / 16-card decks / piece stocks stay as
  *design* guardrails even where code no longer needs them; they've been the best scope-discipline tool
  and stay so on the road to Steam.
- **`D.D:rules-version-on-number-change`** — any change that legitimately shifts balance numbers bumps
  the rules version, atomically with its test-pin updates; refactors that shouldn't move numbers prove
  it with a **golden balance diff** (same seeds → byte-identical aggregates).

- **`D.D:best-map-ideal-ranges`** (2026-07-10, WOA-007) — "best map" is defined by the ideal-range
  table in `dynamic-scrum/rubrics/grading-rubrics.md` §Best map (that table is SOT; `balanceScore`
  implements it). Score = weighted distance outside each range, 0 = ideal, lower = better. This
  **reversed the Round-4 ruling**: attrition-only maps (HQ% < 10) are now penalized — both win paths
  must live on every map — and the old open-ended swing reward is gone (swings ≥2.0 score clean, they
  no longer buy back fairness failures). Control-tracks-win (≥70) joined the score.

## Architecture

- **`D.A:no-build-game`** — `game/` stays plain classic scripts + shared globals in a hand-ordered
  script-tag chain (no ES modules / bundler / build step). Zipping `game/` + double-clicking index.html
  must keep working; `node game/server.js` is the standard dev path and the only one with persistence.
  `game/` stays zero-dependency; `dev/` may carry deps.
- **`D.A:battles-to-db`** — every battle from every source lands as per-battle rows in `logs/woa.db`
  (via `Engine.hooks.onBattleEnd` / `balanceMap` onGame / the server proxy); markdown reports stay the
  human-readable committed artifact.
- **`D.A:one-active-mapset`** — one active map-set (`content/mapsets/`) = THE match pool everywhere
  (`--mapset` on all tools); replaced the old `woa-disabled-maps` flag.
- **`D.A:commit-the-graph`** — `graphify-out/` is **committed** to git (not gitignored) and refreshed
  after major runs. A deliberate project convention that differs from the DynamicScrum default; recorded
  so a future reconnect/adopt run never "fixes" it by gitignoring the graph.

## Related

[[Questions]].

#decisions
