#claude-orientation #engine-model
# Engine model — the rules kernel

*The playable rules, as the engine implements them. Pure JS, no DOM. Every gameplay change lands in `game/engine/`, never in the UI. Start in [[code-architecture]]; the domain vocabulary is `CONTEXT.md`.*

## Board & hexes

- Pointy-top axial coords, key `'q,r'`. Board shapes are data from `maps.js`: `rows: [[r,qFrom,qTo],...]` OR an explicit `hexes: [[q,r],...]` set for irregular outlines. The engine builds the hex set, grid labels, and (for point-symmetric outlines) the rot180 centre. Five built-in shapes: classic 24 (the physical board), compact 19, hourglass 21, ridge 20, spear 23. `setBoard()` switches a module-level current shape — always set from `st.boardShape`.
- **Custom outlines**: a map may carry `shapeDef: {label, hexes:[[q,r],...]}` inline — `ensureMapShape(map)` registers it as `'@<map id>'` (rebuilt every call so edits stick) and normalizes `map.shape`; the def travels with the map, so LAN joins and resumes work. `validateMaps` enforces the **24-hex ceiling** for shapeDef maps (a design guardrail: the physical board is laser-cut to 24).
- `hexLabel(k)` — human grid reference (`'C4'`): row letter from top + position from left on the current board. Every engine log message uses it; off-board keys fall back to raw coords. Labels on holed rows keep their columns (a gap in a row is a gap in the numbering).
- **Map library & match pool**: every map is a file in `content/maps/`. The match pool is the **active mapset** (`E.activeMaps()` / `content/mapsets/`, up to 5 named sets, one `active:true`) — the browser, the LAN peer, and every CLI tool all draw from the same set. A **floor of 5 maps** (`MAP_FLOOR`) warns before deleting below a playable library.

## Terrain — hex-owned and directional

A side is keyed `sideKey(hex,dir)` = `'q,r>d'`. Map defs list pieces as `{t, edges:[[q,r,d],...]}`.

- **Forest** in hex X: +1 attack when X's occupant attacks out across a covered side.
- **Mountain** in hex X: +1 defense when X is attacked across a covered side.
- **River** (`'R'`): does not block support — support crosses freely for both sides. Instead a river denies deploy-control extension: `riverBetween(st,a,b)` reads both hexes' sides and `deployTargets` skips any empty neighbour reached only across a river. Attacks/moves/Airdrop cross freely; not barrageable.
- Both hexes of one border can each own a piece on their side. A terrain piece must live inside **one** hex with contiguous directions (like the physical pieces; `pieceProblem()` enforces, `buildTerrain` throws). Stock comes in physical lengths: forest/mountain and rivers alike group into contiguous 2s/3s; a full ring splits 3+3.

## Trenches

`st.trenches[hex]` is an array of `{dirs:[d,d+1], owner}` — a hex may hold several trenches, but edges may not overlap each other or that hex's own terrain sides (`trenchOrientations` filters).

- **Trenches are attacker-support denial**: attacker support may not cross a trenched border into the skirmish hex (`borderBlocked` checks both hexes' trenches on that border). No defense bonus; the attack itself always crosses; defender support is unaffected; ownership is irrelevant to the rules (`owner` is UI mat bookkeeping only).
- Barrage targets an individual trench (choice `{trenchHex, trenchIdx}`) and reaches the whole board — any trench or forest is a legal target.

## Combat

- **Attacker** = atk + allied support adjacent to the skirmish hex (excluding the attacker itself; a supporter is dropped only if its border into the skirmish hex carries a trench) + adjacent-own-HQ +1 (same crossing checks) + own forest side + card mod.
- **Defender** = def + support (never blocked) + adjacent-own-HQ +1 + own mountain side.
- Higher wins; a tie kills both. HQ has def 0; capturing it (tie included) wins the skirmish.
- **Through-HQ**: units adjacent to any HQ can move/swap/attack to hexes on its far side; terrain checks use the HQ hex as the crossing hex.
- Attack-step flags (data-driven from `maps.js`, documented in [[card-cheatsheet]]): `mod` (± attacker power), `tieSpare` (attacker survives ties), `noAdvance` (attacker never enters the hex, even on a win).

## Cards

16 per deck; each played card is removed from the game, the rest of the hand is discarded and recycled. Home of these queries/combat is `engine/03-rules.js`.

- **House rules**: any card may instead resolve as a basic attack or basic reposition (`playCard(st,id,mode)`) — but a basic reposition is refused while a basic attack is possible (`listAttacks(st,p).length>0` throws; the UI greys the button).
- **Same-type swaps are illegal** (`listRepositions` offers only cross-type swaps): swapping two identical units is a hidden skipped turn.
- Cards flagged `noOpener:true` never appear in the opening hand (`drawHand` reads the flag).
- **At least one step of a card must be played**: `mustPlayStep(st)` is true when nothing has acted, the current step can act, and no later step can — `applyStep` throws on a `{skip}` there, so a turn can't be burned for free. Steps with no legal option are auto-skipped (`skipImpossible`); a card where no step can act legitimately no-ops.
- Mid-card the UI can reset to a turn-start snapshot (`APP.snap`, UI-level JSON).

## No-op turns are visible

`st.pending.acted` counts actions actually resolved; if a play ends with 0, the journal logs "finds no opening — the order is spent to no effect" and the playLog entry gets `noop:true` (counted into the card aggregates and the DB). Dead turns must be loud and measured.

## Victory

- **HQ capture** — capturing (tie included) wins the skirmish.
- **Attrition** when a player cannot draw: score is surviving units on the board (`fieldScore`: inf 1 / cav 2 / art 3; reserves never deployed count for nothing; a tie goes to the second player). Kills as such do not score, though `st.result.kills` still tracks them for stats.
- **Concession** — `concede(st,p)`, winType `'concession'`, counts as a normal skirmish loss. `concedeAdvised(st,p)` is an advisory foregone-conclusion heuristic (never enforced): truthy only when the field-score gap exceeds ~3 field-score points per remaining turn and no unit/deploy can reach the enemy HQ within `cardsRemaining(st,p)` turns (a live Airdrop keeps hope alive). The UI hints the human; `maybeAI` auto-concedes; `simSkirmish` never concedes, so balance stats stay full-game.
- **Battle**: a pool of maps travels inside `st.battle.maps`; first to 3 skirmish wins.

## Play metrics

`st.seen[p][cardId]` counts hand appearances (incremented in `drawHand`); `st.playLog` records `{p,id,mode,turn,seen}` per play; `st.stats` counts behaviour (attacks/swaps/marches/deploys/firstBlood) and `st.lastSwap[p]` remembers each player's last swap pair (AI anti-shuffle) — all self-heal on old saves via `ensureStats`. `balanceMap` aggregates these per card and per skirmish; keep them updated if turn flow changes.

## State shape & the play surface

`engine/04-skirmish.js` owns the de-flattened skirmish state: it groups into composable blocks — `st.board` / `st.pieces` / `st.cards` / `st.flow` / `st.result` / `st.journal`, with identity keys (`seed`, `battle`, `mapIndex`, `mapName`) top-level. **`Engine.view(st)`** is the read-only play surface the live-play UI consumes (getters + per-side methods) instead of poking state internals. `04-skirmish.js` fires `Engine.hooks.onSkirmishEnd` (skipped for sims) and appends `st.journal.fsTimeline` per-turn field scores (feeds the DB timeline table).

**Piece storage seam**: `Engine.Pieces` (defined in `03-rules.js`) is the one place unit/trench/reserve layout is known — every mutation (deploy/march/swap/kill, reserve spend) routes through it, so re-keying a piece is a one-place edit.

## AI

`aiPlanTurn(st, personality)` — one parameterized engine, personalities as data. `personality` is a preset name or a raw config `{noise, breadth, replySamples, replyWeight, weights:{...}}`: noise = evaluation randomness, breadth = top candidates re-scored by the enemy's sampled best reply (0 = pure greedy), weights overlay `AI_WEIGHTS` (every `evalState`/threat/penalty term is a named weight). Lives in `engine/05-ai.js` — the only part AI work edits. The human-facing map of the weights and personalities is [[ai-heuristic-model]] (its tables are regenerated by `node dev/gen-docs.js`).

- Per-step branching is a ranked `shortlist` (winning attacks first, advances next, swaps last); trench facings are scored by `trenchFacing` toward live enemy lanes.
- `easy`/`normal`/`hard` are `AI_PRESETS` rows; extra personalities live in `maps.js` `"ai"` (brawler, turtle, hawk, tuned) and auto-appear in the menu/dashboard pickers and `dev/balance.js` (`node dev/balance.js matchup 16 brawler turtle` pits any two).
- Greedy per-step search over cloned states returns `{cardId, mode, choices}` which the UI replays with delays; it knows the basic-attack/reposition fallback (burns lowest `CARD_KEEP` card). `sampledReplyScore` resamples the hidden hand from public deck+hand contents and **never reads the real hand** — keep that honesty invariant. A full hard skirmish sims in ~1s; keep new configs in that ballpark.

Three anti-degeneracy guards (the `noopPenalty` / `antiShuffle` weights and the attrition projection — don't zero them in a preset without re-measuring `balance.js` Behaviour lines):

- **Zero-action plans** take a −80 `noopPenalty` (greater than the −12 fallback bias and the hard AI's reply noise). At hard it is re-applied at full strength after the reply blend (`cand.pen`), and candidates are compared on common random numbers (fresh same-seeded rng per candidate).
- **Attrition projection**: `evalState` projects the attrition winner if battalions ran out now (fieldScore diff + tie-goes-to-second, ramping as `cardsRemaining` shrinks). The side losing the standstill is pushed to force combat — this removes the swap-dance stalemate.
- **Anti-shuffle**: re-swapping the pair a player swapped last turn costs −10 in `greedyResolve` (`st.lastSwap`).

## Refactor discipline — the throwaway balance diff

Determinism is the free regression net: the same seed schedule produces **byte-identical `balance.js` aggregates**. Before moving code around, generate a throwaway baseline on demand into the gitignored `dev/baselines/` (`node dev/balance.js 24 normal` and `24 easy` — easy-AI noise is enumeration-order-sensitive) and diff before/after; a pure refactor commit must reproduce it byte-identically, on top of `node game/test/test.js` and `node dev/smoke.js` green. Nothing here is committed or gated — you capture the numbers by hand into `dev/baselines/` (ignored so a forgotten baseline can't leak into main), diff them, and discard them. A change that legitimately moves the numbers is not a refactor — it is a rules/AI-strength change: **bump `RULES_VERSION`** (`engine/01-core.js`, tracking the rule book header) atomically with its test-pin updates, so playtest data stays apples-to-apples per version.

## Related

[[code-architecture]] · [[ui-invariants]] · [[ai-heuristic-model]] · [[card-cheatsheet]] · [[report-model]] · [[War Of Attrition rule book]]
