#spec #code-architecture
# V1 — Architecture review & restructure (DECIDED, implemented July 2026)

The V1 code review Bill asked for: *"a general code review looking at how future versions are
looking and suggest a more formalized code architecture — we might establish some new standing
goals... start aiming for a steam release of a roguelite deck builder... then lets implement
that overview."* Produced by a 13-agent review (7 subsystem surveys → 3 independent architecture
proposals → 3-judge panel). This doc records the decision and the reasoning; the new standing
goals live in the root `CLAUDE.md`.

## The decision: Seam-Split

**Split by extraction, never rewrite.** The codebase already has a working module system —
classic IIFE scripts attaching to `window||globalThis` in a hand-ordered script-tag chain,
proven on `file://` by `content/manifest.js`. We keep that substrate and cut the two monoliths
(engine.js 1363 lines, index.html 3303 lines) along the seams the code already has: the engine's
comment-delimited regions and the UI's header-comment sections. Code moves verbatim; only
cross-part names are promoted onto one internal namespace (`WOA_E`, alias `I`). No ES modules
(kills `file://`), no bundler, no build step, no renamed globals (smoke.js and inline
onload/onerror handlers pin them).

Two rejected alternatives, for the record:
- **Steamworks** (kernel/shell/content registry architecture) — right about the destination,
  but pays migration cost now for abstractions no shipped V-item needs yet. Judges scored it
  lowest on migration safety. We stole: `dev/gen-docs.js`, the fail-open db-proxy contract, and
  "board-as-value is a trigger-conditioned follow-up" (see Deferred).
- **Proving Ground** (lab-first, manifest-loaded parts) — best on V1 tooling velocity; lost on
  loader magic and migration risk. We stole: cut the V1 seams FIRST while the engine is one file;
  the shim-first loader step; `ui/boot.js` owning all parse-time wiring; the script-tag-order
  test assert.

## Target layout

```
game/                       # playable app — plain classic scripts, zero deps, file://-zippable
  index.html                # markup + inline deck-override bootstrap + ordered script-tag chain
  style.css                 # extracted CSS
  maps.js                   # unchanged (WOA_BUILTIN core data)
  custom-deck.js            # unchanged (applied-deck override)
  content/kinds.js          # the one place the content-kind list lives ('decks','maps','mapsets')
  content/{manifest.js, decks/, maps/, mapsets/}
  engine.js                 # node entry, ~10 lines: readdir engine/ sorted → require each → export Engine
  engine/01-core.js         # version, content assembly, rng, static data snapshot
  engine/02-board.js        # geometry, shapes, board state (I.CURRENT_SHAPE), terrain pieces
  engine/03-rules.js        # queries + combat (supportFor/computeAttack keep their UI annotations)
  engine/04-battle.js       # match/battle lifecycle + turn flow; fires Engine.hooks.onBattleEnd
  engine/05-ai.js           # weights, presets, eval, search — the ONLY file the search overhaul edits
  engine/06-sim.js          # simBattle + balance aggregation (the balanceAdd choke point)
  engine/07-export.js       # assembles the Engine object (exact key list preserved + CARD_KEEP + hooks)
  report-model.js           # ONE copy of balanceScore/thresholds/folds/markdown (was 4 copies)
  ui/app.js                 # APP hub, $/show/toast/api/escapeHtml/art helpers
  ui/hex-svg.js             # shared hex math (board + preview + editor + field-manual mini-boards)
  ui/board.js  ui/fx.js  ui/battle.js  ui/net.js
  ui/maps-screen.js  ui/map-editor.js  ui/deck-editor.js  ui/dashboard.js  ui/manual.js
  ui/boot.js                # LAST tag: ALL top-level immediate wiring lives here only
  server.js                 # one file: routes table, regen manifest at boot, db write proxy (fail-open)
  balance.js  test.js       # unchanged paths (skills/docs pin them)
dev/                        # node-only tooling; may carry deps
  db.js  db-query.js        # SQLite (node:sqlite) per-battle store → logs/woa.db (gitignored)
  llm-client.js             # cold-spawn transport (kept as fallback)
  llm-session.js            # persistent piped claude session (rules ride the prompt cache)
  balance-report.js  claude-plays.js  smoke.js  tune-weights.js  gen-docs.js
```

## Load strategy

**Browser** (file:// and http alike): `<link style.css>` → `maps.js` → `custom-deck.js` →
`content/manifest.js` (document.write, unchanged) → **the inline deck-override bootstrap (must
stay inline: after WOA_CONTENT is populated, before the engine snapshots the active deck)** →
`engine/01…07` → `ui/*` with `boot.js` last. Each engine part is an IIFE sharing
`g.WOA_E`; cross-part names go through `I.*` at the call site (no load-time aliases — that
plus boot.js-owns-wiring is what makes file order safe). `07-export.js` sets `g.Engine`.

**Node**: `game/engine.js` = readdir `engine/` sorted → require each → `module.exports =
globalThis.Engine`. Every consumer's `require('./engine.js')` path and the exported key list are
unchanged. Filename-sort-as-load-order is the same convention `content/` already uses.

**Guards**: a test.js assert parses index.html and requires every `engine/*.js` present exactly
once in sorted order after manifest.js and before `ui/`, every `ui/*.js` present, `boot.js` last.
smoke.js inlines EVERY `<script src>` tag from disk and asserts none survived un-replaced.

## The refactor oracle

Determinism is the free regression net: same seed schedule → byte-identical `balance.js`
aggregates. Golden baselines (`node game/balance.js 24 normal` AND `24 easy` — easy-AI noise is
enumeration-order-sensitive) are captured before the split; **every extraction commit must
reproduce them byte-identically**, on top of test.js + smoke.js green. Anything that legitimately
changes numbers (the search overhaul) bumps RULES_VERSION instead, atomically with its test-pin
updates.

## Deferred, deliberately (triggers written down)

- **Board-as-value** (kill `I.CURRENT_SHAPE` so two boards can coexist in-process): adopt when
  Field Manual mini-boards or in-process workers actually collide with the global. Until then
  parallelism is process-per-map (each `require` gets a fresh engine) and `ui/manual.js` does
  synchronous setBoard save/restore around synthetic states.
- **Roguelite deck-builder architecture** (card pools, meta-progression, save system): pulled in
  by its spec when it exists, never speculatively.
- **Renderer diffing / framework**: renderAll's rebuild-everything is fine at 24 hexes.

## Migration checklist (each step = one commit, tests + golden diff green)

0. Golden baselines captured. Seams-first commit while engine.js is one file:
   `Engine.hooks.onBattleEnd` fired in finishBattle; `stepOptions(st,{previews:false})`;
   `CARD_KEEP` exported (claude-plays' hand copy deleted); `cloneForSim` (strips st.log +
   all-but-last playLog entry — noopPenalty reads the last; A/B outcome-identical gate);
   `st.fsTimeline` per-turn field scores (feeds the DB timeline table); loud content-load errors.
1. CSS → style.css (+ .btn-ghost class replacing ~15 inline copies).
2. Loader shim: engine/01-all.js (whole IIFE verbatim), engine.js → loader, index.html tag swap,
   smoke inliner generalized, tag-order assert added.
3.-7. Cut 01-core, 02-board, 03-rules, 04-battle, 05-ai + 06-sim + 07-export out one at a time.
8. UI split (two commits), boot.js last; in-game balance lab deleted (routes to dashboard).
9. report-model.js extraction (byte-identical report gate); balance-report seedBase derives from
   acc.runs so accumulation adds NEW battles.
10. server.js routes table + regen-at-boot + MIME (.json/.md) + Engine.VERSION in LAN create/join
    + /api/recordbattle db proxy (fail-open 501 without dev/).
11. Docs + skills truth sweep, standing goals updated, gen-docs.js for drift-prone tables.
