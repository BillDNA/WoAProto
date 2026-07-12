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

*(The engagement block above governs **process**; the below governs **this game's build** — the
standing goals layered on top of canonical DynamicScrum's `WORKFLOW.md`.)*

we are taking a board game prototype and turning it into a playable prototype in the web browser, the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

Start in [[code-architecture]] (`dynamic-scrum/docs/`) — it is the orientation file for this project and stays current; [[Docs Index]] maps every other doc. `game/README.md` is the player-facing manual. [[workflow]] has the build/test conventions. The shipped pre-board eras (June rounds / V0 / V1) live in [[shipped-history]].

## Standing goals (revised for V1 — reasoning in the retired `v1-architecture` spec, git history)

* **rapid balance iteration is still the point** — content is data files (`content/{decks,maps,mapsets}`, `maps.js` ai rows), tunables are data (AI_WEIGHTS overrides), new tools are small `dev/` scripts over the exported Engine surface
* **Steam trajectory, guardrails kept**: we're aiming at a Steam release of a roguelite deck-builder. The physical-board constraints (24-hex ceiling, 16-card decks, piece stocks) stay as *design* guardrails even where code no longer needs them; code formalization is pulled in by a shipped feature, never speculatively
* **`game/` stays plain classic scripts + shared globals** in a hand-ordered script-tag chain — no ES modules, no bundler, no build step. Zipping `game/` + double-clicking index.html keeps working; the local server (`node game/server.js`) is the **standard dev path** and the only path with writes/persistence. `game/` stays zero-dependency; `dev/` may carry deps
* **tests are the contract**: `node game/test.js` green on every commit (extend with every rules change), `node dev/smoke.js` green after UI changes. Refactors prove themselves with a **golden balance diff** (same seeds → byte-identical aggregates); anything that legitimately changes numbers bumps the rules version instead, atomically with its test-pin updates
* **one implementation per fact**: the seed schedule, the balance fold, report scoring/rendering (`game/report-model.js`), the content-kind list (`content/kinds.js`) each live in exactly one file — if adding a metric/column/kind isn't a one-file diff, fix the seam first
* **every battle from every source lands as a per-battle row** in `logs/woa.db` (via `Engine.hooks.onBattleEnd` / `balanceMap` onGame / the server proxy); markdown reports stay the human-readable committed artifact
* **paths that skills and docs pin are frozen API**: `game/engine.js`, `game/balance.js`, `game/test.js`, `dev/balance-report.js`, `dev/claude-plays.js`, `logs/reports/{balance,battle,analysis}/<version>/`, and balance-report's `SAVED:`/`BEST_MAP:` stdout lines — moving any requires a same-commit sweep of `.claude/skills/` + `dynamic-scrum/docs/`

## Shipped history

The June-2026 feedback rounds, V0, and V1 all shipped pre-board; the terse log lives in
[[shipped-history]] (`dynamic-scrum/history/`), including the **baselines to protect** — now the
**rules-1.1** figures (first mover 48%, Red 50%, tie-goes-to-2nd **10%**, **6.1 attacks / 5.7 swaps**
per battle, zero-kill 1%, Drag 2.3, Swings 2.8 — sharp moves in these = regression even if win rates
look fine). The old V0 row (~46 / ~52 / ~26%, 4.9 attacks / 6.5 swaps) is **superseded** — attacks and
swaps inverted between eras, so grading fresh runs against it flags healthy decks as broken. Skill
premium (60/78%) is unverified under 1.1. Post-adopt work is tracked on the board.

**For Bill to decide** (filed, not acted on): the Steam leverage draft ([[steam-roadmap]]).
*(The weight-tuner suggestions are closed — WOA-012 verified and **rejected** the sweep under 1.1;
tuned lost the matchup gate to hard, 44% of 192. Defaults stand.)*

## Vision (post-V1, not speced — YAGNI until V1 lands)

- **Roguelite deck-builder**: a card pool larger than the 20-card deck plus a deck-building loop between battles.
- **Side asymmetry**: different decks per side, and Commander abilities that bend the rules (e.g. guaranteed Conscription in the opening hand). Expect bigger balance swings — which is why the rubrics + metrics tooling above come first.
