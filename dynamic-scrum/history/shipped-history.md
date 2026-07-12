---
last-reviewed: 2026-07-07
---
#onboarding #history
# Shipped history — pre-board eras (June–July 2026)

The terse shipped log that used to head root `CLAUDE.md`, parsed out when the project adopted
DynamicScrum (2026-07-07). Read for "when/why did X land"; current behaviour lives in
[[code-architecture]], every ruling in git history. Post-adopt work is tracked on the board
([[Sprint]] / [[Roadmap]]) instead of here.

## History — shipped (June 2026)

Six feedback rounds, all closed. Terse log; current state and every ruling live in `game/CLAUDE.md`, `game/README.md`, and git history.

1. **Visual + infra base** — physical-style player mats, campaign journal with grid refs (A1…E4), centred scorecard, board FX/animations, spent-orders track; `maps.js` map-save system (12 maps / 5 boards, 24-hex ceiling); git + GitHub Pages hosting; art-by-card-id pipeline; `balance.js` AI-vs-AI lab.
2. **Rules + lab** — multiple trenches per hex allowed; LAN room codes persist; `balance.js [n] [diff] [map]` + in-game Balance buttons; Field Marshal (hard) AI searching one reply deep on sampled hands; `balance.js matchup` luck-o-meter.
3. **Art + card metrics** — art wired by card id with text fallback; editor splits terrain runs into physical 2s/3s; card report gains Simple% / 1stSight% / AvgSeen.
4. **Responsive** — small-screen menu (shrink, don't scroll), width-clamped title, `1fr auto 1fr` topbar that stacks, journal overlay.
5. **Legibility + concede** — no-op turns logged + Skip% column; Naval Barrage reaches the whole board; three-column battle layout (journal to window bottom); Concede button + advisory heuristic.
6. **Anti-degeneracy** — hard turn-1 dead turns 9%→0; attrition scored by **surviving units on the board**; eval projects the deck-out attrition winner (kills the swap-dance stalemate); Behaviour/Decisiveness metrics in `balance.js`.

## V0 — SHIPPED (July 2026)

Ten specs built in one autonomous run (July 2, 2026) + five feedback rounds, all closed. Terse log; the full arc lives in [[V0-summary]] (next to this file), current behaviour in [[code-architecture]], every ruling in git history.

**The ten specs** — terrain rework (trenches = attacker-support denial; directional rivers), combat clarity (hover attack pills, strike arrows, supporter rings from engine truth), 2A layout (mats left, journal-as-book right, VP tug-bar), Balance Dashboard (CLI-identical aggregation), Quartermaster's Ledger deck editor, deletable maps + hex-carved board shapes, parameterized AI personalities as data rows, grading rubrics, claude-plays (`claude -p` transport, honest info only, felt-notes), claude skills (run-tournament / create-card / create-map).

1. **Round 1 — polish + rules nudges.** River parity with forest/mountain, interior terrain placement, no-reposition-while-a-basic-attack-exists rule, Airdrop `noOpener` deck toggle, deck-builder + dashboard whiteboard passes, misc UI QoL; graphify added.
2. **Round 2 — AI transparency + metrics.** [[ai-heuristic-model]] doc, no-skip rule, **Drag** + **Swings** pacing metrics, rule-book versioning starts at **0.2**, 5 deck slots, claude-plays logs + human-instructions, doc reorg + tags, rule book rewritten to match code.
3. **Round 3 — rules refinement.** River: support crosses freely but no deploy-control extension; no same-type swaps (a hidden skip); trench-orientation + search-cost questions raised (answered in V1 specs); first rubric-graded data review; version stamps in logs/reports.
4. **Round 4 — data infrastructure (0.3).** Per-version accumulation (`accumulated.json`), Typicality footer on LLM battles, `content/` reorg (every map + deck a deletable file, one roster for all modes), reports → `logs/reports/{balance,battle,analysis}/<version>/`, Debug state-dump button, generate-reports + review-reports skills, `graphs-spec` drafted; river-deploy bug fixed.
5. **Round 5 — specced V1.** The V1 thinking docs (now `dynamic-scrum/planning/specs/`) (data persistence, AI search + tuning, claude-plays sessions, content curation, field-manual animations); Bill answered every open question inline in the specs.

**Baselines to protect** — *V0-era numbers, superseded. The live guardrails are the rules-1.1 figures
below; these are kept only as the historical record of what V0 measured:* first mover ~46%, Red ~52%,
tie-goes-to-2nd decides ~26%, hard>normal 60% / hard>easy 78% skill premium, ~4.9 attacks / ~6.5 swaps
per battle.

**LIVE baselines to protect (rules 1.1, n60 hard-vs-hard, 2026-07-10)** — measure regressions against
*these*, not the V0 row above:

| Metric | 1.1 baseline | Was (V0) |
| --- | --- | --- |
| first mover | 48% | ~46% |
| Red | 50% | ~52% |
| tie-goes-to-2nd decides | **10%** | ~26% |
| attacks / swaps per battle | **6.1 / 5.7** | ~4.9 / ~6.5 |
| zero-kill | 1% | — |
| HQ captures | 19% | ~22% |
| avg battle length | 29.0 turns | — |
| Drag (kill-less turns before end) | 2.3 | — |
| Swings (lead changes/battle) | 2.8 | — |

Sharp moves in these = regression even if win rates look fine. Note attacks/swaps **inverted** between
eras (V0 4.9/6.5 → 1.1 6.1/5.7) — grading a fresh run against the V0 row flags healthy decks as broken.
Skill premium (60/78%) has **not** been re-measured under 1.1; treat it as unverified, not as a pin.

## V1 — SHIPPED (July 2026, rules version 1.0)

Built in one autonomous run (July 6–7). Terse log; the architecture record is
`v1-architecture`, current behaviour lives in [[code-architecture]].

- **Architecture review → Seam-Split restructure** ✓ — 13-agent review; engine.js → `engine/01..07` parts (shared `WOA_E` namespace), index.html 2816→277 lines + `ui/*.js` (boot.js owns all wiring), `report-model.js` (one copy of the report model), `content/kinds.js`, server routes table. Every step gated on **byte-identical golden balance diffs** + tests + smoke.
- `v1-data-persistence` ✓ — `logs/woa.db` (node:sqlite, gitignored): every battle from every source lands as per-battle rows (runs/battles/card_plays/per-turn timeline) via `Engine.hooks.onBattleEnd`, balanceMap's onGame, and `/api/recordbattle` (fail-open). `dev/db-query.js` is the query CLI.
- `v1-ai-search-and-tuning` ✓ — random 80-cap → **ranked shortlist** (`AI_WEIGHTS.shortlist`, never drops the best move); **trench orientation is now a real choice** (`trenchFacing` rewards facing live enemy lanes — the Round-3 question answered); `Engine.rankChoices` K-of-N API; `dev/tune-weights.js` (first sweep's suggestions filed in `logs/reports/analysis/` — **not adopted, Bill decides**); `balance-report --parallel` (3.3×); cloneForSim diet (−29% hard-AI time, outcome-identical). Also enforced the Round-3 **same-type swap ban** that two docs claimed shipped but the engine never had.
- `v1-claude-plays-and-reports` ✓ — one persistent claude session per side per match (rules ride the prompt cache; live-verified ~10 fresh input tokens/decision), `--match N` first-to-N with the rush-luck check (`seriesFlipped`), felt-notes per battle AND per match, honesty proven by a sentinel test, ranked `--k` option diet, `--deck`/`--mapset`, crash-safe per-battle JSONL; generate-reports now fires the match detached and walks away. The stale RULES prompt (pre-V0 trench rule, no rivers) is fixed and pinned by tests.
- `v1-content-curation` ✓ — roster trimmed **17 → 12** on two-era evidence (cut: Black Forest, Open Mountain Pass, The Bulge, Twin Woods, Highwater; the 0.3-only list changed after the 1.0 cross-check — table in `logs/reports/analysis/2026-07-06-v1-map-trim.md`); **map-sets** (`content/mapsets/`, 5 slots, one active = THE match pool everywhere, `--mapset` on all tools) replaced `woa-disabled-maps`; ships "Tournament" (active) + "Rivers" demo set.
- `graphs-spec` ✓ — Charts tab in the Balance Dashboard: map-fairness scatter, card quadrant, per-map battle-length histogram (per-battle detail collected during dashboard runs). Palettes machine-validated against the parchment; every chart titled by the question it answers.
- `v1-field-manual-animations` ✓ — step-through diagram player (Support / Ties / Trench-vs-River) on a mini board speaking the live FX language, every number from the real engine at render time; authoring doc at [[manual-animations-authoring]].
- **Docs** ✓ — `dev/gen-docs.js` regenerates the drift-prone tables (weights/personalities/content) from code; code-overview/workflow/skills/README swept to match reality; rule book bumped to **1.0** with a version-history block.

**For Bill to decide** (filed, not acted on): the weight-tuner suggestions (`logs/reports/analysis/2026-07-06-weight-tuner-sweep-1.md`) and the Steam leverage draft ([[steam-roadmap]]).

## Related

[[Docs Index]] · [[code-architecture]] · [[Roadmap]] — post-adopt milestones live there.
