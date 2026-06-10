# War of Attrition — orientation for Claude

You are working on a digital version of Bill's physical board game **War of Attrition**.
Read this first; it will save you from re-deriving (or breaking) decisions that are already settled.

## Source of truth

- `../design-docs/War Of Attrition rule book.md` — the rules. When code and rule book disagree, ask Bill; don't silently pick one.
- `../design-docs/prototype pictures/HexClarificationDiagram.png` — defines DIRECTIONAL terrain (see below). This overrode an earlier symmetric-edge implementation; do not regress it.
- `README.md` here — player-facing docs, including every ruling made where the rule book was silent, and Bill's house rules.

## Files

- `engine.js` — ALL rules, state, and the AI. Pure JS, no DOM, runs in browser (window.Engine) and node (module.exports). Every gameplay change goes here, never in the UI.
- `index.html` — the entire UI in one file (CSS + inline script): menu, board rendering (SVG), card hand, map gallery, map editor, glossary, LAN client. Talks to the engine only through its exported API.
- `server.js` — zero-dependency node LAN server: static files, room create/join/push/poll (whole-state sync, seq-numbered), and `/api/savemaps` which writes `custom-maps.js`.
- `custom-maps.js` — generated; `window.WOA_CUSTOM_MAPS = [...]`. Shipped with the folder so zipping shares custom maps. Never hand-edit semantics, but keep the include in index.html before the inline script.
- `test.js` — engine test suite. Run with `node test.js`. Keep it green; extend it for every rules change.

## Core model (engine.js)

- Hexes: pointy-top axial coords, key `'q,r'`. Three board shapes: `grand` (rows 4-5-6-7-6-5-4, 37 hexes), `classic` (4-5-6-5-4, 24 — Bill's physical board), `wide` (5-6-7-6-5, 29). Board shape is per-map; `setBoard()` switches a module-level current shape — always set from `st.boardShape` (the UI's renderAll does this).
- **Terrain is hex-owned and directional.** A terrain "side" is keyed `sideKey(hex,dir)` = `'q,r>d'`. Forest in hex X: +1 attack when X's occupant attacks OUT across a covered side. Mountain in hex X: +1 defense when X is attacked across a covered side. Nothing in any other direction. Both hexes of one border can each own a piece on their side. Map defs list pieces as `[q,r,d]` = owner hex + dir.
- Trenches: per-hex `{dirs:[d,d+1]}`, +1 defense across covered edges, help any defender, never an attacker. House rule: a hex side cannot hold both terrain and a trench (`trenchOrientations(st,hex)` filters).
- Combat: attacker = atk + allied support adjacent to battle hex (excluding the attacker itself) + adjacent-own-HQ +1 + own forest side + card mod. Defender = def + support + adjacent-own-HQ +1 + own mountain side + trench. Higher wins, tie kills both (Ordered Withdraw spares attacker). HQ has def 0; capturing (tie included) wins the battle.
- Through-HQ: units adjacent to ANY HQ can move/swap/attack to hexes on its far side; terrain checks use the HQ hex as the crossing hex.
- Cards: 16 per deck, each played card is removed from the game; rest of hand discarded and recycled. House rules: any card may instead resolve as a basic attack or basic reposition (`playCard(st,id,mode)`); Airdrop never appears in the opening hand (handled in `drawHand`); mid-card the UI can reset to a turn-start snapshot (UI-level JSON snapshot, `APP.snap`).
- Victory: HQ capture, or attrition when a player cannot draw (VP from enemy units destroyed: inf 1 / cav 2 / art 3; tie goes to the second player). Match: pool of maps travels inside `match.maps`; first to 3 battle wins.
- AI: `aiPlanTurn(st, 'easy'|'normal')` — greedy per-step search over cloned states, returns `{cardId, mode, choices}` which the UI replays with delays. It knows the basic-attack/reposition fallback (burns lowest CARD_KEEP card).

## UI invariants

- Multiplayer = whole-state JSON push/poll; anything you add to state must stay JSON-serializable and self-contained (e.g. match.maps carries full map defs so the joiner needs nothing local).
- Custom maps: localStorage (`woa-custom-maps`, tombstones in `woa-deleted-maps`) merged with `window.WOA_CUSTOM_MAPS`; over http they auto-sync to the server file. file:// and http origins have SEPARATE localStorage — that's why Export/Import buttons exist. The server refuses to blank a maps file unless `allowEmpty`.
- The editor paints terrain per SIDE (click inside a hex near its border); Mirror applies the shape's `rot180` to sides and HQs; saving groups same-type sides of the same hex into pieces (physical pieces live inside one hex).

## Workflow

- After ANY engine change: `node test.js` (validates all 18 built-in maps too — it catches off-board/duplicate terrain immediately).
- UI smoke-testing headlessly: jsdom works well — load index.html with engine inlined, dispatch click events. Past sessions' harnesses covered: full AI battles through the DOM, editor painting/mirror/save, trench two-click placement, glossary, reset-turn.
- Don't add build steps, frameworks, or dependencies. Everything is intentionally plain files Bill can zip and share.
- Aesthetic: steampunk Napoleonic field journal (see `../design-docs/Player Card Art direction drafts.md`) — parchment, brass, earthy tones; no modern UI chrome.
