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
**rules-1.2 / Core Six / `cavsplit17-raid-paid`** figures (metric re-baseline **WOA-039**, engine
rules unchanged; measured 2026-07-18, hard-vs-hard, n=60/map=360, `core7`'s 6-map pool: first mover
47%, Red 49%, HQ 17%, **tie-goes-to-2nd 13% of attrition endings**, **Attack share 19% / Swap share
16%** of all actions, zero-kill 2%, first-blood→win 66%, control 93%, **Drag 2.4 (attrition
endings)**, Swings 3.5, reserves-at-end HQ-only red 33% / blue 31% (n=61, small-n) —
`logs/reports/balance/1.2/2026-07-18-1712-hard-vs-hard-n60.md`; sharp moves in these = regression
even if win rates look fine). **Note the 1.2 metric redefinition**: Atk/Swp are now % of actions
(not counts/battle), Tie%/Drag condition to attrition endings (not pooled), Reserves to HQ endings —
so a 1.1 count/pooled figure and a 1.2 share/sliced figure are NOT comparable. The prior **rules-1.1
/ Core Six / `cavsplit17-raid-paid`** row (measured 2026-07-16, hard-vs-hard, n=60/map: first mover
47%, Red 49%, tie 11% pooled, **6.7 attacks / 5.8 swaps** counts/battle, zero-kill 2%, Drag 2.0
pooled, Swings 3.5) is **superseded by the metric redefinition**. The rules-1.1 / Core Six row on the
superseded **`default` 16-card deck** (first mover 45%, Red 51%, tie 9%, 6.3/5.4 atk/swp counts,
zero-kill 1%, Drag 2.1, Swings 2.7) is superseded further back; the row before that (first mover 48%,
Red 50%, tie 10%, 6.1/5.7 atk/swp, Drag 2.3, Swings 2.8) was on the pre-WOA-020 7-to-12-map pool; the
old V0 row (~46 / ~52 / ~26%, 4.9 attacks / 6.5 swaps counts) is superseded further back still —
attacks and swaps inverted between eras, so grading fresh runs against any of them flags a healthy
deck as broken. Skill premium is now verified under 1.1 / Core Six / `cavsplit17-raid-paid` (`matchup 96`,
n=96/map=576/pairing, 2026-07-18): normal>easy 69%, hard>easy 76%, hard>normal 56% (thin, within
noise), sanity 46% (thin, within noise) (**superseded, default 16-card deck, 2026-07-16**:
normal>easy 69%, hard>easy 73%, hard>normal 56% — thin, within noise — sanity 50%). Post-adopt work
is tracked on the board.

**For Bill to decide** (filed, not acted on): the Steam leverage draft ([[steam-roadmap]]).
*(The weight-tuner suggestions are closed — WOA-012 verified and **rejected** the sweep under 1.1;
tuned lost the matchup gate to hard, 44% of 192. Defaults stand.)*

## Vision (post-V1, not speced — YAGNI until V1 lands)

- **Roguelite deck-builder**: a card pool larger than the 16-card deck plus a deck-building loop between battles.
- **Side asymmetry**: different decks per side, and Commander abilities that bend the rules (e.g. guaranteed Conscription in the opening hand). Expect bigger balance swings — which is why the rubrics + metrics tooling above come first.
