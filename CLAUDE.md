# WarOfAttrition

**Local docs:** everything lives under `docs/` — start at `docs/code-architecture.md` (the front door),
`docs/README.md` indexes the folder. The how-the-code-works set is `docs/reference/` (`workflow.md`,
`card-cheatsheet.md`, `report-model.md`, …); grading lives in `docs/rubrics/` + `docs/balance/`; the
rule book sits beside `code-architecture.md`. These are read by the local game skills (`create-card`,
`create-map`, `run-tournament`, `review-reports`, `generate-reports`, `balance-loop`). `CONTEXT.md` is
the concept address book (area pages in `docs/context/`); measured balance baselines live in `docs/balance/balance-baselines.md`.

---

# WarOfAttrition — project doctrine

*(This governs **this game's build** — the standing goals for the project.)*

we are taking a board game prototype and turning it into a playable prototype in the web browser, the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

Start in [[code-architecture]] (`docs/`) — it is the orientation file for this project and stays current; `CONTEXT.md` is the concept address book. `game/README.md` is the player-facing manual. [[workflow]] has the build/test conventions.

## Standing goals

* **rapid balance iteration is still the point** — content is data files (`content/{battalions,maps,mapsets}`, `maps.js` ai rows), tunables are data (AI_WEIGHTS overrides), new tools are small `dev/` scripts over the exported Engine surface
* **Steam trajectory, guardrails kept**: we're aiming at a Steam release of a roguelite deck-builder. The physical-board constraints (24-hex ceiling, 16-card battalions, piece stocks) stay as *design* guardrails even where code no longer needs them; code formalization is pulled in by a shipped feature, never speculatively
* **`game/` stays plain classic scripts + shared globals**, loaded in the order `game/load-order.js` declares ([[0006-declared-load-order]]) — the one place the chain is written, read by the page, node and the sweep worker alike, so a script can live at any depth and be named for what it is, not for where it sorts. No ES modules, no bundler, no build step. The local server (`node game/server.js`) is the **standard and only supported run path** (the only path with writes/persistence); `file://` double-click is **no longer a supported target** (retired in [[0001-no-file-protocol-target]] — dropped the double-click guarantee, kept no-bundler/classic-scripts). `game/` stays zero-dependency; `dev/` may carry deps
* **tests are the contract**: `node game/test/test.js` green on every commit (extend with every rules change), `node dev/smoke.js` green after UI changes. Tests **assert the mechanism, never the content value** — a test pins that a limit is *enforced*, not that the number is 3, so tuning an in-bounds card/map/unit number reds **zero** tests ([[testing-seams]]). Only a **rules/AI** change (not a content edit, not a refactor) bumps the rules version, atomically with its pinned *relationship* tests. **No golden/byte-frozen diff over shipping content** — a snapshot has no oracle, so it only ever cries wolf when you iterate content; a one-off refactor behaviour check is an ad-hoc by-hand `dev/balance.js` stdout capture into the gitignored `dev/baselines/` (diff before/after, then discard), never a committed gate
* **one implementation per fact**: the seed schedule + the per-skirmish fact extraction (`SIM.skirmishFacts` in `game/sim.js`, the batch/measurement layer that sits outside the shipped engine), the balance fold (now **named SQL views over the star schema** in `dev/db.js` — the "fold in `game/sim.js`" clause was superseded by [[0004-fold-moves-to-sql]]; `game/report-model.js` is demoted to rendering + a transitional browser fold), the content-kind list (`content/kinds.js`) each live in exactly one file — if adding a metric/column/kind isn't a one-file diff, fix the seam first
* **every skirmish from every source lands as a per-skirmish row** in `logs/woa.db` (via `Engine.hooks.onSkirmishEnd` / `balanceMap` onGame / the server proxy); markdown reports stay the human-readable committed artifact
* **content is reviewed with its rubric, not with a code review**: any card, map, unit, personality, or rubric that is created or changed gets a `review-with-rubric` pass against the rubric that owns it (`docs/rubrics/`; a rubric → `rubric-rubric`) before it's called done — `/code-review` and generic diff review do not substitute, they can't see a checklist hiding in prose
* **paths that skills and docs pin are frozen API**: `game/engine.js`, `dev/balance.js` (the balance-lab CLI), `game/test/test.js` (a thin shim that delegates to the `test.{geometry,terrain,cards,maps,ai,reports,ui,seams,integration}.js` `node:test` files beside it in `game/test/` — [[0003-node-test-harness]]; the gate is `node game/test/test.js`; `seams`/`integration` are the verification tracer — [[testing-seams]]), `dev/balance-report.js`, `dev/claude-plays.js`, `logs/reports/{balance,skirmish,analysis}/<version>/`, and balance-report's `SAVED:`/`BEST_MAP:` stdout lines — moving any requires a same-commit sweep of `.claude/skills/` + `docs/`

## Shipped history

The **baselines to protect** — the live rules-1.2 measured anchors (first-mover %, tie-goes-to-2nd,
Drag, Swings, skill premium, and the load-bearing 1.2 metric-redefinition warning) — live in the
single source of truth **`docs/balance/balance-baselines.md`**. Superseded lineage is dropped; git is the
archive. Balance is math (that note); rubrics are the subjective-fun judgment layer that cite it.

**For Bill to decide** (filed, not acted on): the Steam leverage draft (an `idea` issue).
*(The weight-tuner sweep was verified and **rejected** — tuned lost the matchup gate to hard;
defaults stand.)*

## Vision (not speced — YAGNI for now)

- **Roguelite deck-builder**: a card pool larger than the 16-card deck plus a deck-building loop between battles.
- **Side asymmetry**: different battalions per side, and Commander abilities that bend the rules (e.g. guaranteed Conscription in the opening hand). Expect bigger balance swings — which is why the rubrics + metrics tooling above come first.

## Agent skills

### Issue tracker

Issues and specs are tracked as GitHub issues in `BillDNA/WoAProto` (via the `gh` CLI). See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map to identically-named labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: root `CONTEXT.md` (indexing `docs/context/`) + `docs/adr/`. See `docs/agents/domain.md`.
