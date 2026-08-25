# Handoff — Candidate B: one skirmish drive-loop behind a decision seam

*Written for a fresh session to pick up cold. Prereq context: this came out of an
architecture review (see [[code-style]] and the `report-model.js` scrub on branch
`worktree-arch-comment-scrub`). Candidate A (comment scrub + style guide) is done;
this is candidate B, untouched.*

## The problem

Driving a skirmish to completion — `decide a turn → playCard → drain the step
queue` — is **hand-rolled in at least 5 places**, differing only in *who decides
the turn*. There is **no exported play-to-end helper** on the Engine surface.

This violates the project's own doctrine (`CLAUDE.md`: *one implementation per
fact*): a change to turn-flow today means editing 5 near-identical loops. It also
passes the **deletion test** — extracting the loop concentrates the "how you drive
a skirmish" fact in one place rather than smearing it.

## Evidence — the copies (verify line numbers; they drift)

| site | what decides the turn | landmark |
|---|---|---|
| `game/test.js` | `E.aiPlanTurn` | the AI-vs-AI match loop (search `skirmish-over` / `aiPlanTurn`) |
| `game/test.js` | fixed fixture | the fsTimeline fixture builder |
| `dev/smoke.js` | `E.aiPlanTurn` | `tick()` continuation |
| `dev/claude-plays.js` | LLM decision | ~2 loops (search `st.phase !== 'skirmish-over'`, `st.phase === 'step'`) |

Each is the same shape:
```
while (st.phase !== 'skirmish-over' /* && turn cap */) {
  var plan = decide(st);          // aiPlanTurn(st, diff) | LLM | fixed
  applyPlan(st, plan);            // playCard
  var g = 0;
  while (st.phase === 'step' && g++ < CAP) applyStep(st, ...);
}
```

## The proposed seam

One deep function, injected decision:

```js
Engine.playToEnd(st, {
  decide,        // (st) -> plan   — the ONLY thing that varies (aiPlanTurn / LLM / fixed)
  onTurn,        // optional (st, plan) hook for per-turn capture (fsTimeline, logging)
  maxTurns,      // optional safety cap
})
```

Three real adapters (AI personality, LLM, fixed fixture) → the seam is **real, not
hypothetical** (the "two adapters = a real seam" test). The interface is the test
surface: `decide` is exactly the injection point tests already want.

## CRITICAL finding — the canonical loop already exists (a 6th copy)

`E.balanceMap` has its **own private drive loop** at `game/engine/06-sim.js:14-23`:
```
while (st.phase !== 'skirmish-over' && guard++ < 400) {
  var plan = I.aiPlanTurn(st, diff);
  ...
  while (st.phase === 'step' && g2++ < 12) { I.applyStep(st, c); ... }
}
```
called from `balanceMap` (`06-sim.js:169`). So the real count is **6 copies**, and
this is **not** a new function — it is *extract THIS loop, generalize its `decide`
(hard-coded `aiPlanTurn` here), export it, and point balanceMap + the 5 outer sites
at it*. Do NOT write a fresh `playToEnd` beside the private one — that makes it 7.

The generalization is small: the only thing `06-sim.js:16` fixes is `decide =
aiPlanTurn(st, diff)`; the LLM and fixture sites need that injectable. Keep the
`guard < 400` / `g2 < 12` caps — they are load-bearing infinite-loop guards.

## Constraints (hard)

- **Golden-diff contract** (`CLAUDE.md`, `docs/workflow.md`): capture
  `node game/balance.js 24 normal` and `24 easy` stdout BEFORE touching engine code;
  they must reproduce **byte-identical** after. If `balanceMap` is refactored to call
  the extracted loop, this is the proof it didn't change behaviour. Anything that
  legitimately moves numbers bumps `RULES_VERSION` instead — but this refactor must
  NOT move them.
- **`node game/test.js` green** on every commit; **`node dev/smoke.js` green** after
  (needs `npm install` in `dev/` for jsdom — it is NOT installed in fresh worktrees).
- `game/` stays zero-dependency, classic scripts, no bundler (`CLAUDE.md`).
- Frozen-API paths: `game/engine.js`, `game/test.js`, `dev/claude-plays.js` — if the
  export surface changes, sweep `.claude/skills/` + `docs/`.

## Suggested sequence

1. Start a fresh worktree/branch off `main`.
2. Read `engine/06-sim.js` `balanceMap`; answer the open question above.
3. Capture golden output (`balance.js 24 normal` + `24 easy`) to temp files.
4. Extract/expose `playToEnd(st, {decide, onTurn, maxTurns})`; have `balanceMap` call
   it (or share its core). Keep the guard-counter cap each site had.
5. Repoint the 5 sites to `playToEnd`, each passing its own `decide`.
6. Verify: golden diff byte-identical, `test.js` green, `smoke.js` green.
7. Use the `codebase-design` skill's vocabulary (module / seam / depth / adapter) if
   designing the interface twice.

## Kickoff prompt (paste into the fresh session)

> Implement candidate B from `docs/handoffs/B-playToEnd-drive-loop.md`: extract the
> skirmish drive-loop (currently hand-rolled in test.js ×2, smoke.js, and
> claude-plays.js ×2) into one decision-injected helper on the Engine surface, and
> repoint all sites at it. Read the handoff doc first, then answer its CRITICAL open
> question (does `balanceMap` in engine/06-sim.js already own the canonical loop?)
> before writing anything. Honour the golden-diff contract — capture
> `node game/balance.js 24 normal` and `24 easy` before and prove byte-identical after.
