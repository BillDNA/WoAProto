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
| Board geometry, shapes, terrain | `game/engine/02-board.js` | [[engine-model]] (Board, Terrain) |
| AI behaviour / strength | `game/engine/05-ai.js` (`AI_WEIGHTS`, presets) | [[ai-heuristic-model]]; re-run `dev/gen-docs.js` |
| A card, battalion, map, mapset, unit-set | `game/content/<kind>/<slug>.js` (+ `content/kinds.js`) | [[card-cheatsheet]]; edit in-app while the server runs |
| Core tunables (unit stats, shapes, personalities) | `game/maps.js` | keep it pure JSON |
| A game-setting dial (points cap, weight table, stocks, trench count, map hex ceiling) | `Engine.CONFIG` in `game/engine/00-config.js` | the config home + digest; flat exports alias into it — see below |
| A UI guardrail (battalion size band) | `UI_CONFIG` in `game/ui/ui-config.js` | the SAME standard, UI tier; read by the builders |
| The board / a screen's look or interaction | `game/ui/*.js` (+ `style.css`) | [[ui-invariants]], [[context-ui-components]] |
| The balance report / metrics / dashboard | `game/report-model.js` | [[report-model]] |
| The batch/sweep fold | `game/sim.js` | [[report-model]] |
| A server route (save/record) | `game/server.js` | restart the server after editing it |
| A balance/tooling CLI | `dev/*.js` | [[workflow]] |
| Build / test / run conventions | — | [[workflow]] |
| Domain terms / naming | `CONTEXT.md` | one home per term (`dev/check-context.js` guards it) |
| How comments & docs should read | — | [[code-style]] |

Every gameplay change goes in the engine, never in the UI. Any card/map/unit/personality/rubric change gets a rubric pass (`docs/rubrics/`) before it's done — a code review can't see a checklist hiding in prose.

## Drill-downs

- [[engine-model]] — the rules kernel: board, terrain, trenches, combat, cards, victory, AI, the throwaway refactor diff.
- [[ui-invariants]] — what the browser app guarantees; the constraints a UI change must not break.
- [[workflow]] — build/test/tooling: the server, `npm test`, the balance CLIs, `gen-docs.js`.
- [[report-model]] — the reporting subsystem: score, metric bands, trace envelope, the one balance fold.
- [[ai-heuristic-model]] — the AI weights and personalities, human-readable.
- [[card-cheatsheet]] — the card/step data shape for the battalion editor.
- [[War Of Attrition rule book]] · [[balance-baselines]] · [[code-style]] · `CONTEXT.md` (domain glossary).

---

*Below is reference — the file-by-file map. Skim it when you need to place a file, not to get oriented.*

## Files

### game/ — the playable app (zero-dependency, zippable)

- `index.html` — markup + the inline battalion-override bootstrap + the ordered script-tag chain (`style.css` → `maps.js` → `custom-battalion.js` → `content/manifest.js` → the inline bootstrap (stays inline: after `WOA_CONTENT` is populated, before the engine snapshots the active battalion) → `engine/01…07` → `sim.js` → `report-model.js` → `ui/*` with `boot.js` LAST). All behaviour lives in `ui/`.
- `style.css` — all CSS.
- `maps.js` — **core tunable data as hand-editable JSON** (`WOA_BUILTIN`): board shapes, unit stats/counts, trench count, terrain stock, and AI personalities. Loaded first in browser and node alike; keep it pure JSON with the header comment.
- `content/` — **the deletable game content**, one tiny file per item, each `push`ing itself into the `WOA_CONTENT` global: `cards/<id>.js` (the shared **card pool** — each card's intrinsics: name, text, steps, opener behaviour, a reserved `faction:null` stub), `battalions/<slug>.js` (a battalion references pool cards by id and sets each `count` — the only battalion-scoped field, mirroring mapset→map), `maps/<slug>.js`, `mapsets/<slug>.js` (named mapsets, one `active:true` = the match pool for every play mode and CLI tool), `units/<slug>.js` (unit-stat variants selected by the same `active:true` flag; an active variant fully replaces the `maps.js` default unit block; total pieces must stay 10, a load-time throw). `content/kinds.js` is the ONE place the kind list lives. `content/manifest.js` (regenerated by the server at boot and on every save/delete) writes the item scripts into the page before the engine runs; node loads the dirs by `readdir` in `engine/01-core.js`, which hydrates each battalion's `{cardId,count}` refs against the pool. A card's `starting`/`noOpener` fields are meaningful to the engine (the opener and never-in-opener flags).
- `engine.js` — the node loader (~10 lines): readdir `engine/` sorted → require each → `module.exports = globalThis.Engine`.
- `engine/00-config.js … 07-export.js` — the engine as eight classic-script parts. Each is an IIFE sharing the internal namespace `g.WOA_E` (alias `I`); cross-part names go through `I.*` at the call site, never captured at load time — that convention (plus `boot.js` owning all load-time wiring) is what makes filename order the only ordering constraint. Deep detail: [[engine-model]].
  - `00-config` — **`Engine.CONFIG`**, the single home for rules-facing game-setting tunables (points cap, the `POINTS` weight table, terrain stock, trench count, the map hex ceiling — enforced by `validateMaps` and the map editor alike). THE config standard: one namespace object owns the dials as named data, the flat exports (`BATTALION_POINTS_CAP`, `POINTS`, `TERRAIN_STOCK`, `TRENCH_COUNT`) alias INTO it (one value, two paths), and `Engine.configDigest(obj)` fingerprints it (`CONFIG.digest`). Adding a tunable is a one-place edit — the digest picks it up. Its peer, the same shape a tier down, is `ui/ui-config.js`. `AI_WEIGHTS` deliberately stays out (lands on this pattern with Commanders).
  - `01-core` — `RULES_VERSION` (exported as `Engine.VERSION`), content assembly, rng, static data snapshot. The army-points flat exports alias into `00-config`'s `Engine.CONFIG`.
  - `02-board` — hex geometry, shapes + per-map `shapeDef` registration, the current board, terrain pieces.
  - `03-rules` — queries + combat (`supportFor`/`computeAttack`, `deployTargets`, `listAttacks`/`listRepositions`); the `Engine.Pieces` storage seam.
  - `04-skirmish` — match/skirmish lifecycle + turn flow; the de-flattened skirmish state and `Engine.view(st)`; fires `Engine.hooks.onSkirmishEnd`.
  - `05-ai` — `AI_WEIGHTS`, `AI_PRESETS`, `evalState`, `CARD_KEEP`, the shortlist search, `rankChoices`. The only part AI work edits.
  - `06-drive` — `playToEnd` (the one decision-injected skirmish drive-loop) + `validateMaps`.
  - `07-export` — assembles the public `Engine` object (browser `window.Engine`, node export).
- `sim.js` — **the batch/measurement layer** (skirmish sweeps + balance aggregation): `simSkirmish` + the ONE balance fold + `balanceMap`. Browser global `WOA_SIM` + node module, built on `Engine.playToEnd`. The CLI reporters, the in-browser dashboard, and `dev/db.js` all fold through this one file. It sits under `game/` (not `dev/`) because the shipped dashboard runs the same fold; deleting it leaves a game that still boots and plays by hand.
- `report-model.js` — **ONE copy of the report model**: the balance score, the per-map health thresholds, aggregate folds, card-row derivation, markdown rendering. Browser global `WOA_REPORT` + node module. Detail: [[report-model]].
- `ui/*.js` — the UI, classic scripts with NO wrappers (top-level names attach to `window`; files cross-reference by bare name). Key parts: `app.js` (APP state hub + helpers + `openOverlay`/`closeOverlay`), `ui-config.js` (**`UI_CONFIG`** — the UI-tier config home: the battalion size band (genuinely UI-only), same object→digest pattern as `Engine.CONFIG`, read by the builders; `boot.js` renders both digests as the read-only corner **config bug**), `ui-primitives.js` (shared HTML-chrome toolkit), `board-primitives.js` (shared board toolkit — hex geometry + `svgEl` + `BOARD` palette + `bp*` builders, reused by every board renderer), `board.js` (game-board orchestration), `fx.js`, `skirmish.js`, `net.js` (LAN client), `maps-screen.js`, `map-editor.js`, `battalion-editor.js`, `dashboard.js` (the Balance Dashboard), `manual.js` (Field Manual + step-through diagram player), and **`boot.js` — loaded LAST, owns EVERY top-level statement that executes at page load**. All other ui files only declare. Invariants: [[ui-invariants]].
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
- `test/` — the engine test suite. `test/test.js` (run with `node game/test/test.js`) is a thin shim that `require`s the subsystem files beside it — `test.{geometry,terrain,cards,maps,ai,reports,ui,seams,integration}.js`, each a `node:test` file; add a new section to whichever subsystem file it fits. `test.seams.js` + `test.integration.js` are the verification tracer (mechanism-not-value seam + real-path integration gate) — see [[testing-seams]]. Controlled tests pin `TESTMAP` (bare classic board, in `test/test.helpers.js`).
- `CLAUDE.md` — a pointer stub at this doc.

### dev/ — node-only tooling (may carry deps; absent from a zipped game/)

- `balance.js` — the balance-lab CLI: `node dev/balance.js [n] [ai] [name-filter]` per-map reports; default pool is the active mapset, `--mapset <id>` picks another, `--mapset all` = every map on disk; `node dev/balance.js matchup [n] [a] [b]` = the luck-o-meter (pits any two personalities). Bill's main iteration tool. Requires `../game/sim.js` for the fold.
- `db.js` — SQLite per-skirmish store on Node's built-in `node:sqlite` → `logs/woa.db` (gitignored, regenerable). `insertRun`/`insertSkirmish` take a finished skirmish state; every skirmish source funnels through it. `db-query.js` — read-only SQL console.
- `llm-client.js` — cold-spawn `claude -p` transport (zero-dep, fail-open fallback). `llm-session.js` — persistent piped `claude` session, one per player per match.
- `claude-plays.js` — an LLM plays real skirmishes or first-to-N matches (`--match [w]`), with ranked option shortlists, persistent sessions, `--mapset`/`--battalion`/`--seed`/`--effort`, live scoreboard, JSONL log + one `.md` transcript per run. Honesty invariant: the model only sees what a player sees — `stateView()` is the single serialization point and its test asserts a sentinel enemy card never leaks.
- `balance-report.js` — runs the balance report and SAVES it under `logs/reports/balance/<version>/`, folding into the per-version `accumulated.json` (`--fresh` resets, `--once` skips); `--parallel [k]` = process-per-map workers; `--mapset`; prints `BEST_MAP:`.
- `tune-weights.js` — offline `AI_WEIGHTS` sweeper (coordinate descent, common random numbers, fitness = the shared balance score). Suggestions only — never writes engine files.
- `gen-docs.js` — regenerates the drift-prone doc tables between `<!-- GEN:x -->` markers (the AI weights table + personalities in [[ai-heuristic-model]], and the content block below). Run it after touching `AI_WEIGHTS`, personalities, or `content/`.
- `check-context.js` — keeps `CONTEXT.md`'s term→code spine honest (every term resolves to a real `file:line` home; retired aliases stay at zero).
- `check-prose.js` — the grep-clean backstop: docs and comments stay free of war-story residue (ticket refs, round/dated narration, era labels). See [[code-style]].
- `smoke.js` — jsdom UI harness (`node dev/smoke.js`; `npm i --prefix dev jsdom` once). Boots `index.html` (inlining every `<script src>` and asserting none survived), plays a skirmish through the real DOM.
- Focused test files: `db.test.js`, `llm-session.test.js`, `llm-client.test.js`, `claude-plays.test.js`, `content-api.test.js`, `server.test.js`, `boot.test.js`, `balance-parallel.test.js` — run the ones matching the area you touched.

### logs/ — generated data (see `.gitignore` for what's tracked)

Reports live under `logs/reports/` (`balance/`, `skirmish/`, `analysis/`), each filed by rules version; `logs/debug/` holds Debug-button state dumps; `logs/woa.db` (+ `-wal`/`-shm`) is the regenerable SQLite index — gitignored, delete freely.

### Current content

<!-- GEN:content -->
_Generated by `node dev/gen-docs.js` — rerun it after content changes._

- **Maps (18):** `causeway` (compact), `frontier` (classic), `killing-ground` (classic), `long-march` (spear), `riverbend` (classic), `saber-ridge` (ridge), `the-cauldron` (carved outline, 19 hexes, custom), `the-clearing` (compact, custom), `the-cockpit` (compact), `the-col` (hourglass, custom), `the-ford` (compact), `the-marshes` (carved outline, 19 hexes, custom), `the-narrows` (hourglass), `the-salient` (ridge, custom), `the-sluice` (hourglass, custom), `the-void` (carved outline, 22 hexes, custom), `the-weir` (ridge, custom), `twin-gates` (hourglass)
- **Card pool (21):** the shared catalog in `content/cards/` — every battalion's cards reference it by id.
- **Battalions (9):** `bestof` (12 cards / 16 copies), `cavsplit-16` (12 cards / 16 copies), `cavsplit-17` (13 cards / 17 copies), `cavsplit17-raid-paid` (12 cards / 17 copies, ACTIVE), `cavsplit17-raid` (13 cards / 17 copies), `cavsplit17-tempo` (13 cards / 17 copies), `default` (13 cards / 16 copies), `iter2` (13 cards / 16 copies), `iter3` (13 cards / 16 copies)
- **Mapsets (6):** `bestof` (12 maps), `core7` (6 maps, ACTIVE — this is the match pool), `iter2` (12 maps), `iter3` (12 maps), `rivers` (4 maps), `tournament` (12 maps)
- **Unit-sets (1):** `shock-army` (10 pieces, experimental)
<!-- /GEN:content -->

## Related

[[engine-model]] · [[ui-invariants]] · [[workflow]] · [[report-model]] · [[ai-heuristic-model]] · [[card-cheatsheet]] · [[War Of Attrition rule book]] · [[balance-baselines]] · [[code-style]]
