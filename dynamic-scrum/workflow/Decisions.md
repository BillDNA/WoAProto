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
  the deck-budget corollary), replacing 1:1 suggest/replace. Order of operations SoT:
  `.claude/skills/generate-reports/SKILL.md` § The v2 loop (order of operations) — don't restate it here.

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
  in the `constraint-temperature` parking-lot note pending a temperature policy, not decided here
  *(graduated 2026-07-16 → WOA-029, which settles that call)*.

- **`D.D:ai-reserve-eval-rejected`** (2026-07-15, WOA-018) — the balance-loop-v2 §5a.1 flagship claim —
  *"the AI's `unitOnBoard 22 > unitReserve 16` eval encodes a losing strategy"* — is **verified and
  rejected under AI-vs-AI measurement**. Neither proposed lever beats current `hard` on core7:
  narrow-gap (`unitReserve`→19) is a coin-flip (50.7% of 672; runner re-check 49.5% of 196), and
  urgency-scaling reserve value (a golden-diff-safe `unitReserveUrgent` term, default 0) is monotonically
  WEAKER (uu6 38% → uu12 4% — it turtles into a loss). *Why the hypothesis fails:* deploy-on-sight is ~correct
  for this attrition dynamic — `fieldScore` counts only DEPLOYED units and the attrition projection already
  punishes undeployment — so the eval is at worst neutral, **not** distorting the balance ruler. The LLM
  feels-match's hold-reserve edge does not transfer to the greedy/hard heuristic (the LLM springs reserves
  with timing the heuristic lacks). Defaults stand, no version bump (RULES_VERSION 1.1). A sibling of
  `D.D:weight-tuner-sweep-rejected`: an eval "improvement" motivated by prettier strategy, measured and
  rejected. **Corollary:** if the reserve-timing dominance is real for HUMANS, it's a **rules/content**
  question (WOA-024), not an AI-eval one — and the reserve-held-at-end metric (WOA-016) is the instrument
  to detect it.

- **`D.D:m11-measure-before-redefining`** (2026-07-16, M1.1 planning) — the M1.1 "Measuring good" sprint
  runs **re-baseline before rubric refactor** (WOA-026 → WOA-027): every figure the refactored rubric
  cites must be a dated rules-1.1 / Core Six measurement, because north stars 1/2/4 still carry pre-1.1
  June figures and WOA-020's Void cut changed the map pool under even the 1.1 numbers — redefining
  "good" against stale baselines would be the bent-ruler mistake in doc form. Scope calls: constraint-
  temperature is **design + the 17-card `cavsplit17-raid-paid` call only** (WOA-029; loop automation of
  the dial stays in M2's operationalize step), and WOA-025 runs as one sonnet ticket (its 17 SHOULDs are
  mechanical `file:line` fixes; 3 alignment NICEs folded in 2026-07-16, the canonical-scoped cosmetic
  dropped).

- **`D.D:seventeen-card-adopt`** (2026-07-16, WOA-029 → Bill at M1.1 close) — **ADOPT
  `cavsplit17-raid-paid`**: the 16-card ceiling is relaxed to **17 for this deck** (16 stays the
  default guardrail for every other deck), per the first live application of the search-side
  temperature policy (rubric §Temperature → Search-side). *Why:* the declared T2 probe measured
  T0-clean on both tiers — Swings +25–30% (2.7→3.5 hard / 2.9→3.6 normal), fielded +4 pts,
  reserves-at-end −4 pts, Drag flat — for +3 turns and a normal-tier 0-kill drift 1→4% (in band);
  the deck pins printed==stock (7/2/1) so the deploy-step floor and WOA-017 both hold. Evidence:
  `logs/reports/analysis/1.1/2026-07-16-1.1-analysis-cavsplit17-T2probe.md`. **Execution gated on
  WOA-030**: the first live flip found card-pinned tests coupled to the active deck
  (`test.js:543` resolves Ordered Withdraw — a card this deck cuts — suite crashed at 136/237), so
  the flip ships with the test decoupling + the atomic guardrail/baseline records, not from the
  close-sprint wrap. The n≥100 normal 0-kill confirmation rides along as a watch item, not a gate —
  Bill adopted without it. **EXECUTED 2026-07-18 (WOA-030):** flip live for all CLI/sim/test paths;
  suite green with either deck (fixture-decoupled via `test.js` `fixtureCard()`); baselines +
  skill premium re-stamped (hard>easy 76%, sanity 46% — thin, within noise); 0-kill watch item
  settles at **2%** (n=100/map). Browser play was found to bypass the active flag entirely
  (stray applied-deck override) — filed as **WOA-036**, Bill's call.

- **`D.D:metrics-v2-phased-adopt`** (2026-07-18, M2 planning) — the metrics-v2 + dashboard spec
  (`dynamic-scrum/planning/specs/design_handoff_metrics_dashboard/`, agreed with Bill in the Claude
  design session 2026-07-18; graduated the `metric-bands-by-temperature` parking-lot note) ships
  **phased with WOA-030 first**: the 17-card adopt executes before any capture, so every golden diff
  and baseline in the sprint is taken on the adopted deck — attack/swap *shares* are deck-size-proof,
  raw counts are not, and re-measuring Core Six on the old deck would be thrown away at the rules-1.2
  re-baseline anyway. **Phase 1 (this sprint, WOA-031…035) is golden-diff-safe** — trace capture,
  runs table, bands-as-data + folds, view-only shell, Overview — no printed number changes; **the
  metric redefinitions (rates not counts, win-path conditioning) land only in Phase 2's atomic
  rules-1.2 bump** (per `D.D:rules-version-on-number-change`), held for the next sprint. **WOA-006 is
  closed as absorbed** — saved-run loading ships as the runs table + run pickers (WOA-032/034), a
  stronger shape than parsing `accumulated.json`.

- **`D.D:half-open-band-widening`** (2026-07-18, WOA-033) — SPEC §6's T1/T2 widening (20%/40% of band
  width) is undefined for a half-open band (Swings `[2.0, ∞)` has no finite width): the finite edge
  widens by that fraction of **|edge|** instead (Swings lo 2.0 → 1.6 at T1, 1.2 at T2), open edges
  stay open. Pinned by a test; only Swings among the 8 scored metrics is affected. Folds take ONE row
  shape — the SPEC §4 trace envelope (+ optional `fs` for vpDiffTrack); `balanceScore` stays
  temperature-independent (T0 bands), temperature only re-shades the dashboard via
  `bands(metric, temperature)`.

- **`D.D:deck-override-noop-plus-badge`** (2026-07-18, WOA-036 shape, Bill at M2-P2 planning) — the
  browser's applied-deck override (`game/custom-deck.js` + `woa-custom-deck` localStorage, which
  outranks the `content/decks/` active flag) **stays** — it's the only custom-deck path for zipped
  file:// and LAN play — but it must never be silent: the checked-in `custom-deck.js` ships as a
  **no-op** (the active-flagged deck shows through by default), and any live override renders a
  visible "custom deck applied: <name> [reset]" badge. Chosen over delete-the-mechanism (kills the
  file:// path) and over badge-only (leaves the stray checked-in Vanguard deck as the default).

- **`D.D:shares-are-guards-not-scored`** (2026-07-18, WOA-039 build, runner-adopted — **Bill may
  overrule**) — Attack%/Swap% shares land as **guard bands** (`feedsScore:false`, bands 12–28 /
  10–26) rather than scored metrics, despite SPEC §1's ★: the Best-map SOT lists exactly 8 scored
  metrics, the adopted dashboard design says "8 scored rows + guards below the fold", and scoring
  them would invent unspecified weights. The 1.2 balanceScore movement comes ONLY from Tie%/Drag's
  attrition-endings denominator. Sibling call, same session: "Reserves turn-normalized" implemented
  as HQ-endings-only reserve **stock-share** with `(n=N)` small-n, not a literal ÷turns (unit would
  be uninterpretable for an unscored diagnostic); if a turns-division was intended it is a one-line
  change in reportMarkdown + balance.js.

- **`D.D:deck-total-band-16-17`** (2026-07-18, WOA-036 build, runner-adopted) — the Deck Editor's
  hard `total !== 16` check becomes a **16–17 band** (every shipped `content/decks/*.js` totals
  exactly 16 or 17; the physical guardrail is a design ceiling, not a hard 16). Editor blurbs and
  the manual's order-count text follow the band. Per-card copy ceiling stays 16. The editor's
  status line now names the real active deck instead of hardcoding `default`.
- **`D.D:parallel-battles-via-parent-writer`** (2026-07-18, WOA-041 build, runner-adopted) —
  `balance-report --parallel` workers ship each finished battle back through their one stdout JSON
  envelope (`{agg, battles:[{g, st}]}`, `st` slimmed by `dev/db.js`'s `slimBattleState` — the exact
  fields `insertBattle` reads, colocated so list and reader can't drift); the **parent stays the
  single woa.db writer**, inserting under its run id on the serial path's seed/fp schedule. Workers
  never open woa.db — zero cross-process SQLite contention. Runs 92–94 remain unpersistable (seed
  offset unrecorded — [[Backlog]] WOA-045 records run identity going forward) and are annotated in
  their `runs.notes`.

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
