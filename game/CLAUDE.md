# War of Attrition — orientation for Claude

You are working on a digital version of Bill's physical board game **War of Attrition**.
Read this first; it will save you from re-deriving (or breaking) decisions that are already settled.

## Source of truth

- `../design-docs/War Of Attrition rule book.md` — the rules. When code and rule book disagree, ask Bill; don't silently pick one.
- `../design-docs/prototype pictures/HexClarificationDiagram.png` — defines DIRECTIONAL terrain (see below). This overrode an earlier symmetric-edge implementation; do not regress it.
- `README.md` here — player-facing docs, including every ruling made where the rule book was silent, and Bill's house rules.

## Files

- `maps.js` — **ALL tunable game data as hand-editable JSON** (`WOA_BUILTIN`): board shapes, map roster, unit stats/counts, trench count, terrain stock, and the full card deck. Loaded by the engine in both browser (script tag BEFORE engine.js) and node (`require`). Bill edits this directly for rapid prototyping — keep it pure JSON with the explanatory header comment. Card ids `airdrop` and the `starting:true` card are meaningful to the engine.
- `engine.js` — ALL rules, state, the three AIs, and the battle simulator (`simBattle`, `balanceMap`). Pure JS, no DOM, runs in browser (window.Engine) and node (module.exports). Every gameplay change goes here, never in the UI.
- `index.html` — the entire UI in one file: menu, board rendering (SVG), player mats, card hand, map gallery, map editor, in-game balance lab (`runBalanceUI`, chunked sims), watch mode, glossary, LAN client, board FX. Talks to the engine only through its exported API.
- `balance.js` — the balance lab CLI: `node balance.js [n] [easy|normal|hard] [name-filter]` per-map reports (custom maps included); `node balance.js matchup [n]` = the luck-o-meter (stronger AI vs weaker; win rate = skill premium). This is Bill's main iteration tool — keep it working.
- `server.js` — zero-dependency node LAN server: static files, room create/join/push/poll (whole-state sync, seq-numbered), and `/api/savemaps` which writes `custom-maps.js`.
- `custom-maps.js` — generated; `window.WOA_CUSTOM_MAPS = [...]`. Never hand-edit semantics; keep its include after engine.js in index.html.
- `test.js` — engine test suite. Run with `node test.js`. Keep it green; extend it for every rules change. Controlled tests pin `TESTMAP` (bare classic board) so the random roster can't break them.
- `../dev/smoke.js` — jsdom UI harness (`node dev/smoke.js` from repo root; `npm i --prefix dev jsdom` once). Boots index.html, plays a battle through the real DOM, pokes mats/editor/journal.

## Core model (engine.js)

- Hexes: pointy-top axial coords, key `'q,r'`. **Board shapes are data** from maps.js: `rows: [[r,qFrom,qTo],...]`; the engine builds the hex set, grid labels, and (for point-symmetric outlines) the rot180 centre. Five shapes: classic 24 (the physical board), compact 19, hourglass 21, ridge 20, spear 23. Grand(37)/Wide(29) were REMOVED June 2026 (Bill: slow, empty, and over the 24-hex laser-cutter ceiling; both armies fully deployed control only 22 hexes). `setBoard()` switches a module-level current shape — always set from `st.boardShape`.
- `hexLabel(k)` — human grid reference ('C4'): row letter from top + position from left ON THE CURRENT BOARD. All engine log messages use it; the UI draws it faintly on every hex. Off-board keys fall back to raw coords.
- **Terrain is hex-owned and directional.** A side is keyed `sideKey(hex,dir)` = `'q,r>d'`. Forest in hex X: +1 attack when X's occupant attacks OUT across a covered side. Mountain in hex X: +1 defense when X is attacked across a covered side. Both hexes of one border can each own a piece on their side. Map defs list pieces as `{t, edges:[[q,r,d],...]}`.
- **A terrain piece must live inside ONE hex with contiguous directions** (like the physical pieces; `pieceProblem()` enforces, `buildTerrain` throws, tests cover). This fixed the June 2026 "yellow lines" bug where old map defs straddled hexes. Don't relax it.
- Trenches: `st.trenches[hex]` is an ARRAY of `{dirs:[d,d+1], owner}` — a hex may hold several trenches (Bill's DoubleTrenchNotAllowed ruling, June 2026), but edges may not overlap each other or that hex's own terrain sides (`trenchOrientations` filters). +1 defense across covered edges, help any defender, never an attacker. `owner` is UI-only (mat bookkeeping) — rules ignore it. Barrage targets individual trenches: choice `{trenchHex, trenchIdx}`.
- Combat: attacker = atk + allied support adjacent to battle hex (excluding the attacker itself) + adjacent-own-HQ +1 + own forest side + card mod. Defender = def + support + adjacent-own-HQ +1 + own mountain side + trench. Higher wins, tie kills both (Ordered Withdraw spares attacker). HQ has def 0; capturing (tie included) wins the battle.
- Through-HQ: units adjacent to ANY HQ can move/swap/attack to hexes on its far side; terrain checks use the HQ hex as the crossing hex.
- Cards: 16 per deck, each played card is removed from the game; rest of hand discarded and recycled. House rules: any card may instead resolve as a basic attack or basic reposition (`playCard(st,id,mode)`); Airdrop never appears in the opening hand (handled in `drawHand`); mid-card the UI can reset to a turn-start snapshot (UI-level JSON snapshot, `APP.snap`).
- Victory: HQ capture, or attrition when a player cannot draw (VP from enemy units destroyed: inf 1 / cav 2 / art 3; tie goes to the second player). Match: pool of maps travels inside `match.maps`; first to 3 battle wins.
- AI: `aiPlanTurn(st, 'easy'|'normal'|'hard')` — greedy per-step search over cloned states, returns `{cardId, mode, choices}` which the UI replays with delays. It knows the basic-attack/reposition fallback (burns lowest CARD_KEEP card). 'easy' adds evaluation noise; 'hard' (Field Marshal) re-scores the top-3 candidates by the opponent's best sampled reply (`sampledReplyScore` — resamples the hidden hand from public deck+hand contents, NEVER reads the real hand; keep that honesty). A full hard battle sims in ~1s, so it's fine live and in the lab.

## UI invariants

- Multiplayer = whole-state JSON push/poll; anything you add to state must stay JSON-serializable and self-contained (e.g. match.maps carries full map defs so the joiner needs nothing local).
- Local saves are versioned (`SAVE_V` in index.html, currently 3). Bump it whenever old saved states would break (board removed, trench arrays, state shape changed) — resume then silently clears instead of crashing.
- Modes: 'ai' | 'hotseat' | 'net' | 'watch' (AI plays both sides; `maybeAI` re-arms itself at turn end). Rematch button on battle-over restarts a single-map match in the current mode (local modes only).
- Player mats render one slot per physical piece (solid = reserve, dashed = fielded, ✕ = lost — needs trench `owner`) plus a 16-chip spent-orders track per side. Bill's explicit ask: enemy card attrition must be visible at a glance.
- Board FX layer (`capturePre`/`playFX` + slide/pop/ghost/ring helpers) is pure flourish wired through `act()` and the AI driver — it must never touch rules and must survive a full board re-render (it animates AFTER renderAll using from/to info captured before applyStep).
- Custom maps: localStorage (`woa-custom-maps`, tombstones in `woa-deleted-maps`) merged with `window.WOA_CUSTOM_MAPS`; over http they auto-sync to the server file. file:// and http origins have SEPARATE localStorage — that's why Export/Import buttons exist. The server refuses to blank a maps file unless `allowEmpty`.
- The editor paints terrain per SIDE (click inside a hex near its border); its shape dropdown builds itself from `E.SHAPES`; Mirror applies the shape's rot180; saving groups same-type corner-sharing sides of one hex into pieces.
- `index.html?autostart=ai` deep-links straight into a battle (screenshots, quick testing).

## Workflow

- After ANY engine change: `node game/test.js`. After UI changes: `node dev/smoke.js`. For balance questions: `node game/balance.js 60`.
- Headless screenshots: `chrome --headless --screenshot=... "file:///...index.html?autostart=ai"` works (use classic `--headless`, not `--headless=new`).
- Git: repo root is the project; remote `https://github.com/BillDNA/WoAProto.git`; GitHub Pages serves `main` (root `index.html` redirects into `game/`). PSD/XCS art sources and prototype photos are gitignored on purpose (public repo) — HexClarificationDiagram.png is the whitelisted exception.
- Don't add build steps, frameworks, or dependencies to `game/`. Everything is intentionally plain files Bill can zip and share. (`dev/` may hold dev-only deps like jsdom.)
- Aesthetic: steampunk Napoleonic field journal (see `../design-docs/Player Card Art direction drafts.md`, prompts in `../design-docs/art-prompts.md`) — parchment, brass, earthy tones; no modern UI chrome.

## Known balance signals (from balance.js, June 2026 — verify before acting; present findings to Bill, he decides rule changes)

- Second mover wins ~60% of AI battles (last card + attrition tiebreak both favour them). Note the campaign rule "loser moves first" therefore *punishes* the loser further — worth discussing with Bill before changing anything.
- Attrition ends ~80% of battles; HQ captures are rare on spread-out maps (HQs 6 apart ≈ never captured; the compact dist-4 maps are healthiest).
- Skill premium (matchup mode, n=192/pairing): normal beats easy 71%, hard beats easy 80%, hard beats normal 57%, normal-vs-normal sanity 46%. Read: learning the game is rewarded heavily; between two competent players the card draw decides more (~57%). Caveat: measured with these AIs, not humans.
