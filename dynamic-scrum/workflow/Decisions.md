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

- **`D.D:rules-1.1-adoption`** (2026-07-10, WOA-009 pick) — the 1.1 rules bump adopts **S1 only**:
  trench grants the defender survival in a combat tie, Variant A/A1 (tieSpare attacker vs trenched
  defender = whiff, nobody dies), and the trench **gates HQ tie-capture** (trench your HQ border and
  a tie can't take it). Rejected: S2 HQ-win-only (redundant — trenching your HQ half-implements it),
  S3 tiebreak retune (sudden-death would raise drag; tie% stays a content KPI, live 11% is in-target),
  S5 deck-out reshuffle (unintended consequences + drag). S4 (split Deploy Cavalry) is deck surgery,
  not rules — folded into WOA-014's 3-for-3 generation step. Full menu:
  `logs/reports/analysis/1.0/2026-07-10-rule-change-suggestions.md`.

- **`D.D:balance-loop-v2-shape`** (2026-07-10, WOA-014, from Bill's B.5 retro) — loop v2 runs leaner:
  **1:1** adversarial checkers per generated candidate (2-checker delta wasn't significant), **one**
  feels-match per iteration (seed 1001; 2002/3003 optional extras), and card generation is **3-for-3**
  (one batch of 3 candidates for the iteration's 3 slots, judged as a set against the whole deck with
  the deck-budget corollary), replacing 1:1 suggest/replace. Order of operations: gather (100-sweep +
  1 feels) → guide generators with findings → judge → adopt → repeat n → final report (+ rule-change /
  stats-to-gather-or-drop / AI-lever sections). SoT: the project skills (`.claude/skills/`).

- **`D.D:weight-tuner-sweep-rejected`** (2026-07-10, WOA-012, resolves Q.2) — the tuner sweep is
  **rejected** for AI_WEIGHTS; defaults stay untouched, no version bump. Bill's firmer recipe ran in
  full under rules 1.1 (`tune-weights --n 40 --iters 2`, 34.7 min): survivors enemyDist 2.4 /
  fsDiff 4 / threatTie 1.88 (advance & myThreatKill from sweep #1 no longer beat baseline — 1.1's
  trench tie-survival already priced in the aggression), but the "tuned" personality **lost the
  matchup gate to current hard: 44% of 192 battles**. Fitness-on-a-subset ≠ head-to-head strength.
  The row stays in `maps.js` as an inactive pit-able personality. Q.3 note: threatTie flipped
  direction under 1.1 (survivor 1.88 < default 2.5; the 1.0-era 3.75 now scores badly) — the weights
  lever on ties looks spent. Evidence: `logs/reports/analysis/1.1/2026-07-10-weight-tuner-sweep-2.md`.

- **`D.D:roadmap-3-pillar-reframe`** (2026-07-15) — the Roadmap is reworked around Bill's three
  short-term pillars, **foundation-first**: M1 trustworthy + autonomous balance loop → M2 actionable data
  → M3 roguelite design intake, with **pillar 3 gated by 1 & 2**. Content growth (grow the card pool)
  moved *after* the run design (was the next milestone; now M4, gated on M3), and the AI-eval "bent
  ruler" fix (final report §5a.1) is promoted to the leading sprint (**M1 · Fix the bent ruler**). *Why:*
  the AI eval encodes a losing strategy invisible to AI-vs-AI (both sides share it, so 4,200 battles
  can't see it) — measuring a roguelite content explosion on that ruler is unsafe, so the loop must
  measure the real game before the content multiplies. The 16-card-ceiling / 17-card-deck call is parked
  in [[constraint-temperature]] pending a temperature policy, not decided here.

## Architecture

- **`D.A:units-content-kind`** (2026-07-10, WOA-011) — unit composition & values are a content kind
  (`game/content/units/<id>.js`, active-flag selection, the deck/mapset pattern): an active variant
  **fully replaces** the maps.js default unit block (no sparse patching); stats resolve in exactly one
  place (`engine/01-core.js` UNIT_DEFS → I.UNITS). The 10-total-pieces physical guardrail is a
  load-time throw for default and variants alike; atk/def/sup/vp are free data. The shipped example
  (`shock-army`) stays `active:false` so it can't affect balance data until deliberately enabled.
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
