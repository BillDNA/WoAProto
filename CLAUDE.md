# WarOfAttrition

**Local docs:** the project's orientation docs, rubrics, and reference material live under `docs/` —
`code-architecture.md`, `workflow.md`, the `rubrics/` + `balance/` sets, `card-cheatsheet.md`, and the
rule book — read by the local game skills (`create-card`, `create-map`, `run-tournament`,
`review-reports`, `generate-reports`, `balance-loop`). `CONTEXT.md` is the domain glossary; measured balance baselines
live in `docs/balance-baselines.md`.

---

# WarOfAttrition — project doctrine

*(This governs **this game's build** — the standing goals for the project.)*

we are taking a board game prototype and turning it into a playable prototype in the web browser, the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

Start in [[code-architecture]] (`docs/`) — it is the orientation file for this project and stays current; `CONTEXT.md` is the domain glossary. `game/README.md` is the player-facing manual. [[workflow]] has the build/test conventions. The shipped pre-board eras (June rounds / V0 / V1) are archived in git history.

## Standing goals (revised for V1 — reasoning in the retired `v1-architecture` spec, git history)

* **rapid balance iteration is still the point** — content is data files (`content/{decks,maps,mapsets}`, `maps.js` ai rows), tunables are data (AI_WEIGHTS overrides), new tools are small `dev/` scripts over the exported Engine surface
* **Steam trajectory, guardrails kept**: we're aiming at a Steam release of a roguelite deck-builder. The physical-board constraints (24-hex ceiling, 16-card decks, piece stocks) stay as *design* guardrails even where code no longer needs them; code formalization is pulled in by a shipped feature, never speculatively
* **`game/` stays plain classic scripts + shared globals** in a hand-ordered script-tag chain — no ES modules, no bundler, no build step. The local server (`node game/server.js`) is the **standard and only supported run path** (the only path with writes/persistence); `file://` double-click is **no longer a supported target** (retired in [[0001-no-file-protocol-target]] — dropped the double-click guarantee, kept no-bundler/classic-scripts). `game/` stays zero-dependency; `dev/` may carry deps
* **tests are the contract**: `node game/test.js` green on every commit (extend with every rules change), `node dev/smoke.js` green after UI changes. Refactors prove themselves with a **golden balance diff** (same seeds → byte-identical aggregates); anything that legitimately changes numbers bumps the rules version instead, atomically with its test-pin updates
* **acceptance criteria are gates, not wishes**: an AC closes only when a test goes red without it; an AC may not reference a surface no ticket builds (name a blocking foundation ticket instead); a ticket with a UI AC carries a screenshot in its PR. Distrust *"already exists as a prototype"* — a `dev/proto/` mock is a design answer, not a built surface. Full rules + the #108 post-mortem that earned them in [[workflow]] (`docs/workflow.md`)
* **one implementation per fact**: the seed schedule, the balance fold, report scoring/rendering (`game/report-model.js`), the content-kind list (`content/kinds.js`) each live in exactly one file — if adding a metric/column/kind isn't a one-file diff, fix the seam first
* **every skirmish from every source lands as a per-skirmish row** in `logs/woa.db` (via `Engine.hooks.onSkirmishEnd` / `balanceMap` onGame / the server proxy); markdown reports stay the human-readable committed artifact
* **content is reviewed with its rubric, not with a code review**: any card, map, unit, personality, or rubric that is created or changed gets a `review-with-rubric` pass against the rubric that owns it (`docs/rubrics/`; a rubric → `rubric-rubric`) before it's called done — `/code-review` and generic diff review do not substitute, they can't see a checklist hiding in prose
* **paths that skills and docs pin are frozen API**: `game/engine.js`, `game/balance.js`, `game/test.js` (now a thin shim that delegates to the `test.{geometry,terrain,cards,maps,ai,reports}.js` `node:test` files it was split into — ADR-0003; the path and `node game/test.js` gate are unchanged), `dev/balance-report.js`, `dev/claude-plays.js`, `logs/reports/{balance,skirmish,analysis}/<version>/`, and balance-report's `SAVED:`/`BEST_MAP:` stdout lines — moving any requires a same-commit sweep of `.claude/skills/` + `docs/`

## Shipped history

The **baselines to protect** — the live rules-1.2 measured anchors (first-mover %, tie-goes-to-2nd,
Drag, Swings, skill premium, and the load-bearing 1.2 metric-redefinition warning) — live in the
single source of truth **`docs/balance-baselines.md`**. Superseded lineage (rules-1.1 / V0 / the
pre-WOA-020 pool / the `default`-deck rows) is dropped; git is the archive. Balance is math (that
note); rubrics are the subjective-fun judgment layer that cite it.

**For Bill to decide** (filed, not acted on): the Steam leverage draft (issue #27, `idea`).
*(The weight-tuner suggestions are closed — WOA-012 verified and **rejected** the sweep under 1.1;
tuned lost the matchup gate to hard, 44% of 192. Defaults stand.)*

## Vision (post-V1, not speced — YAGNI until V1 lands)

- **Roguelite deck-builder**: a card pool larger than the 16-card deck plus a deck-building loop between battles.
- **Side asymmetry**: different decks per side, and Commander abilities that bend the rules (e.g. guaranteed Conscription in the opening hand). Expect bigger balance swings — which is why the rubrics + metrics tooling above come first.

## Agent skills

### Issue tracker

Issues and specs are tracked as GitHub issues in `BillDNA/WoAProto` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map to identically-named labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` + `docs/adr/`. See `docs/agents/domain.md`.
