# WarOfAttrition

This project runs the **DynamicScrum** scrum workflow. The board lives in `dynamic-scrum/planning/` +
`dynamic-scrum/workflow/`; orientation docs in `dynamic-scrum/docs/`.

## Start every session with the workflow
- Begin with **`/session-start`** — it orients from the board and aligns on focus before any work.
- Wrap up with **`/end-session`** — it updates the board and (if a remote exists) pushes.
- Capture passing ideas with **`/make-ticket`** without derailing.

## Workflow authority — read before reaching for any external skill
**The canonical DynamicScrum `WORKFLOW.md` is the process source of truth** — surfaced each session by the
SessionStart grounding hook (there is no local copy). It outranks any installed plugin/skill — superpowers'
own precedence agrees (user instructions > skills > default). In particular:

- **External skills (superpowers etc.) are a toolbox, not the driver.** Use them à la carte — adversarial
  code review, TDD, systematic debugging, verification-before-completion. **Do not auto-run the
  brainstorm → spec → plan → implement *pipeline* on every ticket.**
- **Design ceremony scales with altitude:** heavy design lives at **parking-lot → roadmap**; **tickets are
  actionable**, completed directly by a Sonnet-tier agent with adversarial review as the net; the full
  spec→plan flow is for a **brainstorming/research ticket** or a novel/risky build, and is rare.
- **Trunk-based, edit-in-place on `main`** — standing consent to commit on `main`; **no git worktrees**, no
  feature branch except for genuinely risky/large structural work.
- **Artifact paths:** design specs go in **`dynamic-scrum/planning/specs/`**, never `dynamic-scrum/docs/superpowers/`.
- **Integration is `/end-session`** (commit on `main` + push) — not a branch-finish / merge / PR menu.

## Where things live
- **Process SOT:** the canonical DynamicScrum `WORKFLOW.md`, surfaced each session by the SessionStart
  grounding hook — no local copy.
- **Skills** (`session-start`, `end-session`, `make-ticket`, `alignment-pass`) resolve at **user level**
  (`~/.claude/skills/`), served once per machine — no per-project junction.
- **Rubrics** (the rule books alignment grades against) are served at user level
  (`~/.claude/rubrics/workflow-rubrics/`); add project-specific rubrics as real files in a local `dynamic-scrum/rubrics/`.
- **Owner scratchpad:** `dynamic-scrum/workflow/Bill.md` (`B.N` notes).

---

# WarOfAttrition — project doctrine

*(Migrated verbatim from the pre-adopt `Claude.md`. The engagement block above governs **process**; the
below governs **this game's build**. Where the old text says "[[workflow]] has our workflow", the process
SOT is now canonical DynamicScrum's `WORKFLOW.md` — surfaced by the SessionStart hook — with these
project-specific standing goals layered on top.)*

we are taking a board game prototype and turning it into a playable prototype in the web browser, the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

Start in [[code-overview]] — it is the orientation file for this project and stays current. [[game/README]] is the player-facing manual.  [[workflow]] has guide lines for our workflow.
## Standing goals (revised for V1 — see [[v1-architecture]] for the reasoning)

* **rapid balance iteration is still the point** — content is data files (`content/{decks,maps,mapsets}`, `maps.js` ai rows), tunables are data (AI_WEIGHTS overrides), new tools are small `dev/` scripts over the exported Engine surface
* **Steam trajectory, guardrails kept**: we're aiming at a Steam release of a roguelite deck-builder. The physical-board constraints (24-hex ceiling, 16-card decks, piece stocks) stay as *design* guardrails even where code no longer needs them; code formalization is pulled in by a shipped feature, never speculatively
* **`game/` stays plain classic scripts + shared globals** in a hand-ordered script-tag chain — no ES modules, no bundler, no build step. Zipping `game/` + double-clicking index.html keeps working; the local server (`node game/server.js`) is the **standard dev path** and the only path with writes/persistence. `game/` stays zero-dependency; `dev/` may carry deps
* **tests are the contract**: `node game/test.js` green on every commit (extend with every rules change), `node dev/smoke.js` green after UI changes. Refactors prove themselves with a **golden balance diff** (same seeds → byte-identical aggregates); anything that legitimately changes numbers bumps the rules version instead, atomically with its test-pin updates
* **one implementation per fact**: the seed schedule, the balance fold, report scoring/rendering (`game/report-model.js`), the content-kind list (`content/kinds.js`) each live in exactly one file — if adding a metric/column/kind isn't a one-file diff, fix the seam first
* **every battle from every source lands as a per-battle row** in `logs/woa.db` (via `Engine.hooks.onBattleEnd` / `balanceMap` onGame / the server proxy); markdown reports stay the human-readable committed artifact
* **paths that skills and docs pin are frozen API**: `game/engine.js`, `game/balance.js`, `game/test.js`, `dev/balance-report.js`, `dev/claude-plays.js`, `logs/reports/{balance,battle,analysis}/<version>/`, and balance-report's `SAVED:`/`BEST_MAP:` stdout lines — moving any requires a same-commit sweep of `.claude/skills/` + `design-docs/`

## History — shipped (June 2026)

Six feedback rounds, all closed. Terse log; current state and every ruling live in `game/CLAUDE.md`, `game/README.md`, and git history.

1. **Visual + infra base** — physical-style player mats, campaign journal with grid refs (A1…E4), centred scorecard, board FX/animations, spent-orders track; `maps.js` map-save system (12 maps / 5 boards, 24-hex ceiling); git + GitHub Pages hosting; art-by-card-id pipeline; `balance.js` AI-vs-AI lab.
2. **Rules + lab** — multiple trenches per hex allowed; LAN room codes persist; `balance.js [n] [diff] [map]` + in-game Balance buttons; Field Marshal (hard) AI searching one reply deep on sampled hands; `balance.js matchup` luck-o-meter.
3. **Art + card metrics** — art wired by card id with text fallback; editor splits terrain runs into physical 2s/3s; card report gains Simple% / 1stSight% / AvgSeen.
4. **Responsive** — small-screen menu (shrink, don't scroll), width-clamped title, `1fr auto 1fr` topbar that stacks, journal overlay.
5. **Legibility + concede** — no-op turns logged + Skip% column; Naval Barrage reaches the whole board; three-column battle layout (journal to window bottom); Concede button + advisory heuristic.
6. **Anti-degeneracy** — hard turn-1 dead turns 9%→0; attrition scored by **surviving units on the board**; eval projects the deck-out attrition winner (kills the swap-dance stalemate); Behaviour/Decisiveness metrics in `balance.js`.

## V0 — SHIPPED (July 2026)

Ten specs built in one autonomous run (July 2, 2026) + five feedback rounds, all closed. Terse log; the full arc lives in `specs/V0-specs/V0-summary.md`, current behaviour in `game/CLAUDE.md` + [[code-overview]], every ruling in git history.

**The ten specs** — terrain rework (trenches = attacker-support denial; directional rivers), combat clarity (hover attack pills, strike arrows, supporter rings from engine truth), 2A layout (mats left, journal-as-book right, VP tug-bar), Balance Dashboard (CLI-identical aggregation), Quartermaster's Ledger deck editor, deletable maps + hex-carved board shapes, parameterized AI personalities as data rows, grading rubrics, claude-plays (`claude -p` transport, honest info only, felt-notes), claude skills (run-tournament / create-card / create-map).

1. **Round 1 — polish + rules nudges.** River parity with forest/mountain, interior terrain placement, no-reposition-while-a-basic-attack-exists rule, Airdrop `noOpener` deck toggle, deck-builder + dashboard whiteboard passes, misc UI QoL; graphify added.
2. **Round 2 — AI transparency + metrics.** [[ai-heuristic-model]] doc, no-skip rule, **Drag** + **Swings** pacing metrics, rule-book versioning starts at **0.2**, 5 deck slots, claude-plays logs + human-instructions, doc reorg + tags, rule book rewritten to match code.
3. **Round 3 — rules refinement.** River: support crosses freely but no deploy-control extension; no same-type swaps (a hidden skip); trench-orientation + search-cost questions raised (answered in V1 specs); first rubric-graded data review; version stamps in logs/reports.
4. **Round 4 — data infrastructure (0.3).** Per-version accumulation (`accumulated.json`), Typicality footer on LLM battles, `content/` reorg (every map + deck a deletable file, one roster for all modes), reports → `logs/reports/{balance,battle,analysis}/<version>/`, Debug state-dump button, generate-reports + review-reports skills, [[graphs-spec]] drafted; river-deploy bug fixed.
5. **Round 5 — specced V1.** The `specs/V1-specs/` thinking docs (data persistence, AI search + tuning, claude-plays sessions, content curation, field-manual animations); Bill answered every open question inline in the specs.

**Baselines to protect** (post-V0, details in V0-summary): first mover ~46%, Red ~52%, tie-goes-to-2nd decides ~26% (biggest open lever), hard>normal 60% / hard>easy 78% skill premium, behaviour band ~4.9 attacks / ~6.5 swaps per battle. Sharp moves in these = regression even if win rates look fine.
## V1 — SHIPPED (July 2026, rules version 1.0)

Built in one autonomous run (July 6–7). Terse log; the architecture record is
[[v1-architecture]], current behaviour lives in [[code-overview]].

- **Architecture review → Seam-Split restructure** ✓ — 13-agent review; engine.js → `engine/01..07` parts (shared `WOA_E` namespace), index.html 2816→277 lines + `ui/*.js` (boot.js owns all wiring), `report-model.js` (one copy of the report model), `content/kinds.js`, server routes table. Every step gated on **byte-identical golden balance diffs** + tests + smoke. New standing goals above.
- [[v1-data-persistence]] ✓ — `logs/woa.db` (node:sqlite, gitignored): every battle from every source lands as per-battle rows (runs/battles/card_plays/per-turn timeline) via `Engine.hooks.onBattleEnd`, balanceMap's onGame, and `/api/recordbattle` (fail-open). `dev/db-query.js` is the query CLI.
- [[v1-ai-search-and-tuning]] ✓ — random 80-cap → **ranked shortlist** (`AI_WEIGHTS.shortlist`, never drops the best move); **trench orientation is now a real choice** (`trenchFacing` rewards facing live enemy lanes — the Round-3 question answered); `Engine.rankChoices` K-of-N API; `dev/tune-weights.js` (first sweep's suggestions filed in `logs/reports/analysis/` — **not adopted, Bill decides**); `balance-report --parallel` (3.3×); cloneForSim diet (−29% hard-AI time, outcome-identical). Also enforced the Round-3 **same-type swap ban** that two docs claimed shipped but the engine never had.
- [[v1-claude-plays-and-reports]] ✓ — one persistent claude session per side per match (rules ride the prompt cache; live-verified ~10 fresh input tokens/decision), `--match N` first-to-N with the rush-luck check (`seriesFlipped`), felt-notes per battle AND per match, honesty proven by a sentinel test, ranked `--k` option diet, `--deck`/`--mapset`, crash-safe per-battle JSONL; generate-reports now fires the match detached and walks away. The stale RULES prompt (pre-V0 trench rule, no rivers) is fixed and pinned by tests.
- [[v1-content-curation]] ✓ — roster trimmed **17 → 12** on two-era evidence (cut: Black Forest, Open Mountain Pass, The Bulge, Twin Woods, Highwater; the 0.3-only list changed after the 1.0 cross-check — table in `logs/reports/analysis/2026-07-06-v1-map-trim.md`); **map-sets** (`content/mapsets/`, 5 slots, one active = THE match pool everywhere, `--mapset` on all tools) replaced `woa-disabled-maps`; ships "Tournament" (active) + "Rivers" demo set.
- [[graphs-spec]] ✓ — Charts tab in the Balance Dashboard: map-fairness scatter, card quadrant, per-map battle-length histogram (per-battle detail collected during dashboard runs). Palettes machine-validated against the parchment; every chart titled by the question it answers.
- [[v1-field-manual-animations]] ✓ — step-through diagram player (Support / Ties / Trench-vs-River) on a mini board speaking the live FX language, every number from the real engine at render time; authoring doc at `design-docs/human-instructions/manual-animations-authoring.md`.
- **Docs** ✓ — `dev/gen-docs.js` regenerates the drift-prone tables (weights/personalities/content) from code; code-overview/workflow/skills/README swept to match reality; rule book bumped to **1.0** with a version-history block.

**For Bill to decide** (filed, not acted on): the weight-tuner suggestions (`logs/reports/analysis/2026-07-06-weight-tuner-sweep-1.md`) and the Steam leverage draft (`design-docs/steam-roadmap.md`).

## Vision (post-V1, not speced — YAGNI until V1 lands)

- **Roguelite deck-builder**: a card pool larger than the 20-card deck plus a deck-building loop between battles.
- **Side asymmetry**: different decks per side, and Commander abilities that bend the rules (e.g. guaranteed Conscription in the opening hand). Expect bigger balance swings — which is why the rubrics + metrics tooling above come first.
