#claude-orientation #code-architecture
# War of Attrition — start here

A digital version of Bill's physical board game **War of Attrition**: a browser deck-builder wargame you can playtest and balance-iterate fast. Read this page top-to-bottom, then follow the one link that fits your task.

**Source of truth**
- `War Of Attrition rule book.md` (next to this file) — the rules. When code and rule book disagree, ask Bill; don't silently pick one.
- `HexClarificationDiagram.png` (next to this file) — defines directional terrain. Don't regress it to symmetric edges.
- `../game/README.md` — player-facing manual, including every ruling made where the rule book was silent, and Bill's house rules.

**The shape.** `game/` is the playable app: zero-dependency classic scripts in a hand-ordered `<script>` chain — no ES modules, no bundler, no build step. The engine (`game/engine/`, pure JS, no DOM) is the only place rules live; the UI (`game/ui/`) renders engine truth and never encodes a rule; game content is data (`game/content/`, `game/maps.js`). `dev/` is node-only tooling (may carry deps; absent from a zipped game). The **local server** (`node game/server.js`) is the standard run path — the only one with writes and persistence. **One implementation per fact**: the seed schedule + balance fold, report model, content-kind list each live in exactly one file.

## To change X, start in Y

| To change… | Start in | Then |
|---|---|---|
| A rule / combat / turn flow | `game/engine/03-rules.js`, `04-skirmish.js` | [[engine-model]]; bump `RULES_VERSION` if numbers move |
| The hex itself — coords, directions, distance, edge/side names | `game/engine/board/hex/hex.js` (+ `game/ui/board/hex/hex-screen.js` for where it sits on screen) | `game/engine/board/hex/hex.md` |
| The board — the outline, and every mark drawn on it | `game/engine/board/board.js` (+ `game/ui/board/` for the marks) | `game/engine/board/board.md` |
| AI behaviour / strength | `game/engine/05-ai.js` (the heuristic); the dials in `game/engine/ai/ai-config.js` (`AI_WEIGHTS`/`AI_TUNING`) | [[ai-heuristic-model]]; re-run `dev/gen-docs.js` |
| A card, battalion, map, mapset, unit-set, Commander | `game/content/<kind>/<slug>.js` (+ `content/kinds.js`) | [[card-cheatsheet]]; edit in-app while the server runs |
| A Commander's effect / a new effect primitive | `game/content/commanders/<slug>.js` (the trait data); `game/engine/03a-commander-effects.js` (the vocabulary) | [[commander-schema]]; primitives apply at the combat/draw hooks, source-agnostic |
| Core tunables (unit stats, shapes, personalities) | `game/maps.js` | keep it pure JSON |
| A game-setting dial (points cap, weight table, stocks, trench count, map hex band, combat/skirmish/limits) | `Engine.CONFIG` in `game/engine/00-config.js` | the config home + digest; read by nested name at each site, no flat value-aliases |
| A UI guardrail (battalion size band) | `UI_CONFIG` in `game/ui/ui-config.js` | the SAME standard, UI tier; read by the builders |
| How big hexes are drawn, per board | `HEX_CONFIG` in `game/ui/board/hex/hex-config.js` | one row per board (live, manual, dashboard lens, thumbnail) |
| How a concept LOOKS | that household's `.css`, imported at the top of `game/style.css` | `ui/board/hex/hex.css`, `ui/board/terrain/terrain.css`; `style.css` keeps the page — chrome, layout, screens, shared palette |
| A dev-lab run default (LLM timeout, sweep sample counts, claude-plays defaults) | `LAB` in `dev/lab-config.js` | the SAME standard, dev-lab tier (node only); named sections, read by the tools |
| An AI dial (eval weights, or search/eval tuning) | `AI_WEIGHTS` / `AI_TUNING` in `game/engine/ai/ai-config.js` | the SAME standard, AI tier; read by nested name in `05-ai.js`; a Commander overrides `AI_WEIGHTS` terms |
| The board / a screen's look or interaction | `game/ui/*.js` (+ `style.css`) | [[ui-invariants]], [[context-ui-components]] |
| The balance report / metrics / dashboard | `game/report-model.js` | [[report-model]] |
| The batch/sweep fold | `game/sim.js` | [[report-model]] |
| A server route (save/record) | `game/server.js` | restart the server after editing it |
| A balance/tooling CLI | `dev/*.js` | [[workflow]] |
| Build / test / run conventions | — | [[workflow]] |
| Domain terms / naming | `CONTEXT.md` → `docs/context/` | one home per term (`dev/check-context.js` guards it) |
| How comments & docs should read | — | [[code-style]] |

Every gameplay change goes in the engine, never in the UI. Any card/map/unit/personality/rubric change gets a rubric pass (`docs/rubrics/`) before it's done — a code review can't see a checklist hiding in prose.

## How the code is organised

The words for talking about where code lives. A **concept** is a thing the system has; its **address** is the file, directory or doc it lives at. A **household** is one concept with its own address, earned when something outside needs to call it and nothing outside needs to see inside it. A **lodger** is a concept crammed into another concept's file because a session judged a new home out of scope — the defect. A **dialect** is how one shape is materialised per runtime: `game/` is browser classic scripts, `dev/` is node CommonJS, and a birch and an elm both still read as a tree.

### What a household looks like

Every board household is the same file set on two streets, so a session finds a
new one by shape rather than by being told. `hex`, `terrain` and `unit` all look
like this:

| | |
| --- | --- |
| `engine/board/<x>/<x>.js` | the base: what the rooms share, and where its pieces are |
| `engine/board/<x>/<room>.js` | one file per member of the family |
| `engine/board/<x>/<x>-config.js` | its rules dials, installed as `Engine.CONFIG.<x>` |
| `engine/board/<x>/<x>.md` | the addresses, and the recipe for adding a room |
| `engine/board/<x>/<x>.test.js` | its contract: one more room, live with no edit elsewhere |
| `ui/board/<x>/<x>-marks.js` | how it is drawn: the shapes every room shares |
| `ui/board/<x>/<room>-mark.js` | one file per room, declaring only what makes it that room |
| `ui/board/<x>/<x>-config.js` | its drawn dials, a row per surface, as `<X>_CONFIG` |
| `ui/board/<x>/<x>.css` | every colour and rule about it, imported by `style.css` |
| `ui/board/<x>/<x>-marks.test.js` | the drawing half's contract |

Three rules hold across all of them, and each is pinned by a test rather than by
this page. **A colour lives in the household's `.css`** and a mark names it as a
`var(--…)`; no drawing file spells a hex. **A number lives in that household's
`*-config.js`**, made by the shared `Engine.defineConfigHome`; a config file
comments each dial where it sits and never restates its own shape in prose above
itself. **A per-room fact lives on the room** — its glyph, its inset — and a
per-surface fact lives in the config.

## Drill-downs

- [[engine-model]] — the rules kernel: board, terrain, trenches, combat, cards, victory, AI, the throwaway refactor diff.
- [[ui-invariants]] — what the browser app guarantees; the constraints a UI change must not break.
- [[workflow]] — build/test/tooling: the server, `npm test`, the balance CLIs, `gen-docs.js`.
- [[report-model]] — the reporting subsystem: score, metric bands, trace envelope, the one balance fold.
- [[ai-heuristic-model]] — the AI weights and personalities, human-readable.
- [[card-cheatsheet]] — the card/step data shape for the battalion editor.
- [[War Of Attrition rule book]] · [[balance-baselines]] · [[code-style]] · `CONTEXT.md` (the concept address book).

---

*Below is reference — the file-by-file map. Skim it when you need to place a file, not to get oriented.*

## Files

### game/ — the playable app (zero-dependency, zippable)

- `index.html` — markup, `style.css`, and one `<script src>`: `load-order.js`. All behaviour lives in `ui/`.
- `load-order.js` — **the chain**, declared once and read by `index.html`, `engine.js` (node) and `sweep-worker.js`. Three ordered arrays: `CONTENT` (`maps.js` → `custom-battalion.js` → `content/manifest.js` → `applied-battalion.js`) → `ENGINE` → `APP` (`sim.js` → `report-model.js` → `ui/*`, `boot.js` LAST). Position in the array schedules a file, so a script may live at any depth and be named for what it is. Add a file by putting its path in the array that matches when it must run. Why, and the alternatives weighed: [[0006-declared-load-order]].
- `applied-battalion.js` — resolves which battalion this browser plays (localStorage beats `custom-battalion.js` beats the active-flagged one) after `WOA_CONTENT` is populated, before the engine snapshots it.
- `style.css` — all CSS.
- `maps.js` — **core tunable data as hand-editable JSON** (`WOA_BUILTIN`): board shapes, the per-type `terrain` dials, and AI personalities. Unit stats are NOT here — they are content (`content/units/`). Loaded first in browser and node alike; keep it pure JSON with the header comment.
- `content/` — **the deletable game content**, one tiny file per item, each `push`ing itself into the `WOA_CONTENT` global: `cards/<id>.js` (the shared **card pool** — each card's intrinsics: name, text, steps, opener behaviour, a reserved `faction:null` stub), `battalions/<slug>.js` (a battalion references pool cards by id and sets each `count` — the only battalion-scoped field, mirroring mapset→map), `maps/<slug>.js`, `mapsets/<slug>.js` (named mapsets, one `active:true` = the match pool for every play mode and CLI tool), `units/<slug>.js` (**the army** — one file active, and it IS the unit set; the unit house resolves it, `engine/board/unit/unit.md`), `commanders/<slug>.js` (a Commander — id/name, reserved story, a traits list of effect primitives, an inline AI `weights` override; resolved per side by `resolveCommander`, picked before the battalion builder). `content/kinds.js` is the ONE place the kind list lives. `content/manifest.js` (regenerated by the server at boot and on every save/delete) writes the item scripts into the page before the engine runs — `load-order.js` schedules it; node loads the dirs by `readdir` in `engine/01-core.js`, which hydrates each battalion's `{cardId,count}` refs against the pool. A card's `starting`/`noOpener` fields are meaningful to the engine (the opener and never-in-opener flags).
- `engine.js` — the node loader (~10 lines): require each path in `load-order.js`'s `ENGINE` → `module.exports = globalThis.Engine`.
- `engine/` — the engine as ten classic-script parts, ordered by `load-order.js`'s `ENGINE` array (`ai/ai-config` after `00-config`, whose `defineConfigHome` it calls while loading; `07-export` last, as it reads the whole namespace). Each is an IIFE sharing the internal namespace `g.WOA_E` (alias `I`); cross-part names go through `I.*` at the call site, never captured at load time — that convention (plus `boot.js` owning all load-time wiring) is why a part constrains order only when it reads something *while loading*. Numeric prefixes are a reading hint, not the schedule. Deep detail: [[engine-model]].
  - `00-config` — **`Engine.CONFIG`**, the single home for rules-facing game-setting tunables (`pointsCap`, the `points` weight table, the map hex band `mapHexFloor`/`mapHexCeiling` — the ceiling enforced by `validateMaps` and the map editor alike — `pieceTotal`, and the named `combat` / `skirmish` / `limits` sections). Terrain's and the unit's dials are not here: each house owns them in `engine/board/terrain/terrain-config.js` and `engine/board/unit/unit-config.js`, which install `CONFIG.terrain` and `CONFIG.unit` so they still key the digest. THE config standard: one namespace object, made by the shared `Engine.defineConfigHome` helper (which attaches the digest getter), is the SOLE owner of the dials as named data — every site reads them by their nested name (`Engine.CONFIG.pointsCap`, `Engine.CONFIG.skirmish.matchTarget`, …); there are no flat value-aliases, so grepping a config name lands on the home and its readers, never a renamed copy. `Engine.configDigest(obj)` fingerprints it (`CONFIG.digest`). Adding a tunable is a one-place edit — the digest picks it up. Its peers, made by the same helper a tier down, are `ui/ui-config.js` and one `*-config.js` per board household — `ui/board/{hex,terrain,unit}/` (UI tier) — and `dev/lab-config.js` (`LAB` — the dev-lab tier: run defaults for the `dev/` tools, organized into named sections — `llm` timeout, `claudePlays`/`balance`/`balanceReport`/`tuneWeights` run defaults, `sweep` worker reserve — node only, never loaded in the browser). The AI tier is its own file — see `ai/ai-config` next.
  - `ai/ai-config` — **`AI_WEIGHTS`** (the eval weight table — the surface a Commander's weight override merges over) and **`AI_TUNING`** (the search/eval dials that aren't per-personality weights: `urgencyWindow`, `laneRange`, `threatCardMod`, `skipBias`, `optionCap`, and the `defaults` personality shape). Two sibling config homes on the same helper, read by nested name in `05-ai.js` (`I.AI_WEIGHTS`/`I.AI_TUNING`). Kept out of `Engine.CONFIG` on purpose — only `CONFIG.digest` is stamped onto DB rows, so AI tuning must never move it.
  - `01-core` — `RULES_VERSION` (exported as `Engine.VERSION`), content assembly, rng, static data snapshot. Army-points are computed against `00-config`'s `Engine.CONFIG.points`, read directly at each site.
  - `hex/` — **the hex house**: the coordinate vocabulary everything above is written in (`key`/`parseKey`, the six `DIRS`, `step`, `dist`, `edgeKey`/`sideKey`), with its screen dialect at `ui/board/hex/hex-screen.js` and every drawn size at `ui/board/hex/hex-config.js`. Start at `hex.md`.
  - `board/` — **the board house**: the outline (which hexes are in play, containment, grid labels, per-map `shapeDef` registration, and the one question that needs an outline — which of a hex's six neighbours exist), with one file per authored outline form over `board.js`. Its screen dialect is `ui/board/`: one file per mark, drawn at any board's scale. Start at `board.md`.
  - `board/unit/` — **the unit house**: one file per type (`infantry`, `cavalry`, `artillery`) over `unit.js`, which also owns **`Engine.Units`** — the one place unit and reserve layout is known (place/remove/advance/swap, reserve spend). Its numbers are content (`content/units/`), handed to it by `unit-config.js` as `CONFIG.unit`. Its drawing half is `ui/board/unit/`. Start at `unit.md`.
  - `board/terrain/` — **the terrain house**: one file per type (`forest`, `mountain`, `river`, `trench`) over `terrain.js`, with its own `terrain-config.js` (every terrain dial), **`Engine.Trenches`** (where the dug pieces are) and `terrain.test.js`. Its drawing half is `ui/board/terrain/`. Start at `terrain.md`.
  - `03-rules` — queries + combat (`supportFor`/`computeAttack`, `deployTargets`, `listAttacks`/`listRepositions`). It stores nothing: the pieces live in their own houses (`Engine.Units`, `Engine.Trenches`).
  - `03a-commander-effects` — the source-agnostic Commander effect primitives (`commanderCombat`/`commanderDrawDelta`) + the `st.commanders` reader and the weight-override merge; applied at the combat/draw hooks. [[commander-schema]].
  - `04-skirmish` — match/skirmish lifecycle + turn flow; the de-flattened skirmish state and `Engine.view(st)`; fires `Engine.hooks.onSkirmishEnd`.
  - `05-ai` — `AI_WEIGHTS`, `AI_PRESETS`, `evalState`, `CARD_KEEP`, the shortlist search, `rankChoices`. The only part AI work edits.
  - `06-drive` — `playToEnd` (the one decision-injected skirmish drive-loop) + `validateMaps`.
  - `07-export` — assembles the public `Engine` object (browser `window.Engine`, node export).
- `sim.js` — **the batch/measurement layer** (skirmish sweeps + balance aggregation): `simSkirmish` + the ONE balance fold + `balanceMap`. Browser global `WOA_SIM` + node module, built on `Engine.playToEnd`. The CLI reporters, the in-browser dashboard, and `dev/db.js` all fold through this one file. It sits under `game/` (not `dev/`) because the shipped dashboard runs the same fold; deleting it leaves a game that still boots and plays by hand.
- `report-model.js` — **ONE copy of the report model**: the balance score, the per-map health thresholds, aggregate folds, card-row derivation, markdown rendering. Browser global `WOA_REPORT` + node module. Detail: [[report-model]].
- `ui/*.js` — the UI, classic scripts with NO wrappers (top-level names attach to `window`; files cross-reference by bare name). Key parts: `app.js` (APP state hub + helpers + `openOverlay`/`closeOverlay`), `ui-config.js` (**`UI_CONFIG`** — the UI-tier config home: the battalion size band (genuinely UI-only), same object→digest pattern as `Engine.CONFIG`, read by the builders; `boot.js` renders both digests as the read-only corner **config bug**), `kit/` (what several households use and none owns: `defineKind`, and `svgEl` — the one `createElementNS`), `ui-primitives.js` (shared HTML-chrome toolkit), `board/hex/` (where a hex and its faces sit on screen, at any scale, and **`HEX_CONFIG`** — the size each board draws hexes at), `board/` (the board house's drawing half — one file per mark, **`BOARD_CONFIG`** for every drawn number, and the three boards it renders itself: `live-board.js`, `thumb-board.js` and `map-editor.js`, the board being authored), `board/unit/` (the unit house's drawing half — one token builder for the board and the mat, and each type's single glyph), `fx.js` (WHEN a flourish fires; every mark it plays belongs to the house of the thing it is about), `skirmish.js`, `net.js` (LAN client), `maps-screen.js`, `battalion-editor.js`, `dashboard.js` (the Balance Dashboard), `manual.js` (Field Manual + step-through diagram player), and **`boot.js` — loaded LAST, owns EVERY top-level statement that executes at page load**. All other ui files only declare. Invariants: [[ui-invariants]].
- `server.js` — zero-dependency LAN + dev server; regenerates `content/manifest.js` at boot and after saves. One routes table, one row per endpoint:

  | Route | Does |
  |-------|------|
  | `POST /api/create` / `join` / `push`, `GET /api/poll` | LAN rooms — whole-state JSON sync, seq-numbered; create/join return `Engine.VERSION` for mismatch warnings |
  | `POST /api/savemap` / `deletemap` | write/remove `content/maps/<id>.js` + regen manifest |
  | `POST /api/savebattalion` | write `custom-battalion.js` (the applied battalion; `null` = back to default) |
  | `POST /api/savemapsets` | rewrite the whole `content/mapsets/` dir to the posted slot state (≤ 8 sets) + regen manifest |
  | `POST /api/savereport` | Balance Dashboard markdown → `logs/reports/balance/<version>/` |
  | `POST /api/savedebug` | Debug-button state dump → `logs/debug/` |
  | `POST /api/recordskirmish` | persistence proxy: one finished skirmish → rows in `logs/woa.db` via `dev/db.js`. Fail-open: a zipped `game/` without `dev/` answers 501 and play continues |

  Restart the server after editing it — a stale instance on port 8420 keeps serving old code.
- `custom-battalion.js` — the Battalion Editor's **applied** deck: `window.WOA_CUSTOM_BATTALION = [...cards] | null`. Ships as a no-op (`null`) so fresh loads play the content `active:true` deck; stays in the chain as the drop-in contract. Loads before the engine; the inline bootstrap (localStorage `woa-custom-battalion` wins over the file) pushes a non-null override into `WOA_CONTENT.battalions` as the active battalion before the engine snapshots the card list — applying a deck = reload, and any live override renders a global "custom battalion applied" badge. Validation (`battalionProblems`) enforces 16–17 total copies, exactly one `starting` card at count 1, known step types/flags/units, unique ids.
- `test/` — the engine test suite. `test/test.js` (run with `node game/test/test.js`) is a thin shim that `require`s every test file: the subsystem files beside it — `test.{board,combat,cards,maps,ai,reports,ui,seams,integration}.js`, each a `node:test` file — plus each house's own `*.test.js`, which lives with the code it covers — the terrain house has one on each street (`engine/board/terrain/terrain.test.js`, `ui/board/terrain/terrain-marks.test.js`), the hex and unit houses likewise (`engine/board/hex/hex.test.js`, `ui/board/hex/hex-screen.test.js`; `engine/board/unit/unit.test.js`, `ui/board/unit/unit-marks.test.js`). Add a new section to whichever file owns that code; a test that does not exercise its house's own subject belongs in the subsystem file for the code it does exercise. `test.seams.js` + `test.integration.js` are the verification tracer (mechanism-not-value seam + real-path integration gate) — see [[testing-seams]]. Controlled tests pin `TESTMAP` (bare classic board, in `test/test.helpers.js`).
- `CLAUDE.md` — a pointer stub at this doc.

### dev/ — node-only tooling (may carry deps; absent from a zipped game/)

- `balance.js` — the balance-lab CLI: `node dev/balance.js [n] [ai] [name-filter]` per-map reports; default pool is the active mapset, `--mapset <id>` picks another, `--mapset all` = every map on disk; `node dev/balance.js matchup [n] [a] [b]` = the luck-o-meter (pits any two personalities). Bill's main iteration tool. Requires `../game/sim.js` for the fold.
- `db.js` — SQLite per-skirmish store on Node's built-in `node:sqlite` → `logs/woa.db` (gitignored, regenerable). `insertRun`/`insertSkirmish` take a finished skirmish state; every skirmish source funnels through it. `db-query.js` — read-only SQL console.
- `llm-client.js` — cold-spawn `claude -p` transport (zero-dep, fail-open fallback). `llm-session.js` — persistent piped `claude` session, one per player per match.
- `claude-plays.js` — an LLM plays real skirmishes or first-to-N matches (`--match [w]`), with ranked option shortlists, persistent sessions, `--mapset`/`--battalion`/`--seed`/`--effort`, live scoreboard, JSONL log + one `.md` transcript per run. Honesty invariant: the model only sees what a player sees — `stateView()` is the single serialization point and its test asserts a sentinel enemy card never leaks.
- `balance-report.js` — runs the balance report and SAVES it under `logs/reports/balance/<version>/`, folding into the per-version `accumulated.json` (`--fresh` resets, `--once` skips); `--parallel [k]` = process-per-map workers; `--mapset`; prints `BEST_MAP:`.
- `tune-weights.js` — offline `AI_WEIGHTS` sweeper (coordinate descent, common random numbers, fitness = the shared balance score). Suggestions only — never writes engine files.
- `gen-docs.js` — regenerates the drift-prone doc tables between `<!-- GEN:x -->` markers (the AI weights table + personalities in [[ai-heuristic-model]], and the content block below). Run it after touching `AI_WEIGHTS`, personalities, or `content/`.
- `check-context.js` — keeps the term→code spine (`docs/context/` + `context-ui-components.md`) honest (every term's anchor still appears in its `file` — no line numbers, so only a rename/move/delete drifts; retired aliases stay at zero).
- `check-prose.js` — the grep-clean backstop: docs and comments stay free of war-story residue (ticket refs, round/dated narration, era labels). See [[code-style]].
- `smoke.js` — jsdom UI harness (`node dev/smoke.js`; `npm i --prefix dev jsdom` once). Boots `index.html` (inlining every `<script src>` and asserting none survived), plays a skirmish through the real DOM.
- Focused test files: `db.test.js`, `llm-session.test.js`, `llm-client.test.js`, `claude-plays.test.js`, `content-api.test.js`, `server.test.js`, `boot.test.js`, `balance-parallel.test.js` — run the ones matching the area you touched.

### logs/ — generated data (see `.gitignore` for what's tracked)

Reports live under `logs/reports/` (`balance/`, `skirmish/`, `analysis/`), each filed by rules version; `logs/debug/` holds Debug-button state dumps; `logs/woa.db` (+ `-wal`/`-shm`) is the regenerable SQLite index — gitignored, delete freely.

### Current content

<!-- GEN:content -->
_Generated by `node dev/gen-docs.js` — rerun it after content changes._

- **Maps (18):** `causeway` (compact), `frontier` (classic), `killing-ground` (classic), `long-march` (spear), `riverbend` (classic), `saber-ridge` (ridge), `the-cauldron` (carved outline, 19 hexes, custom), `the-clearing` (compact, custom), `the-cockpit` (compact), `the-col` (hourglass, custom), `the-ford` (compact), `the-marshes` (carved outline, 19 hexes, custom), `the-narrows` (hourglass), `the-salient` (ridge, custom), `the-sluice` (hourglass, custom), `the-void` (carved outline, 22 hexes, custom), `the-weir` (ridge, custom), `twin-gates` (hourglass)
- **Battalions (9):** `bestof` (12 cards / 16 copies), `cavsplit-16` (12 cards / 16 copies), `cavsplit-17` (13 cards / 17 copies), `cavsplit17-raid-paid` (12 cards / 17 copies, ACTIVE), `cavsplit17-raid` (13 cards / 17 copies), `cavsplit17-tempo` (13 cards / 17 copies), `default` (13 cards / 16 copies), `iter2` (13 cards / 16 copies), `iter3` (13 cards / 16 copies)
- **Mapsets (6):** `bestof` (12 maps), `core7` (6 maps, ACTIVE — this is the match pool), `iter2` (12 maps), `iter3` (12 maps), `rivers` (4 maps), `tournament` (12 maps)
- **Unit-sets (2):** `default` (10 pieces, ACTIVE), `shock-army` (10 pieces, experimental)
- **Commanders (1):** `fortress` (1 strength / 1 weakness)
<!-- /GEN:content -->

## Related

[[engine-model]] · [[ui-invariants]] · [[workflow]] · [[report-model]] · [[ai-heuristic-model]] · [[card-cheatsheet]] · [[War Of Attrition rule book]] · [[balance-baselines]] · [[code-style]]
