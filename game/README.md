# War of Attrition — digital edition

A browser version of the board game, built from the design docs. Three ways to play, all from this folder.

## Play vs the AI (easiest — no setup)

Double-click **index.html**. Pick your side and the enemy general's skill (Green Recruit = easier, Old Veteran = normal), then **March Against the AI**.

## Hotseat (two players, one device)

Open **index.html**, click **Hotseat**. The game shows a hand-off screen between turns so you don't see each other's cards.

## Two devices in the same room

Needs Node.js (nodejs.org) on one computer — the server is plain Node and runs on Windows, Mac, or Linux.

1. Start the server: **run-server.bat** (Windows) or **run-server.command** (Mac — if double-clicking is blocked, open Terminal in this folder and run `sh run-server.command` or just `node server.js`). It prints an address like `http://192.168.1.23:8420`.
2. Open that address in a browser on **both** devices (same wifi).
3. One player clicks **Host a Room** and reads out the 4-letter code; the other types it in and joins. Host is Red, joiner is Blue.

## Maps & the map editor

**Maps & Map Editor** on the main menu lists every battlefield with a preview. Untick a map to remove it from the draw pile — new campaigns shuffle only the maps in play. There are 18 built-ins: 12 on the Grand board plus 6 smaller ones — Frontier, The Bulge, Twin Woods, Killing Ground (Classic 4-5-6-5-4, 24 hexes) and Long March, Riverlands (Wide 5-6-7-6-5, 29 hexes).

**New Map** opens the editor: pick the board (Classic, Wide, or Grand), paint terrain, place both HQs, and use **Mirror** to copy everything point-symmetrically (design one half, mirror, done). Terrain belongs to a hex — click just inside a hex's border to cycle forest → mountain → empty on that hex's side. The editor groups painted sides into terrain pieces automatically (Naval Barrage removes a whole piece) and warns if a layout exceeds the physical terrain stock — it stays playable digitally either way. **Save & Test vs AI** drops you straight into a battle on the new map.

### Sharing maps (zip the folder)

When you play through the server, custom maps are automatically written to **custom-maps.js** in this folder — zip the folder, send it, and friends get your maps. If you play by double-clicking index.html instead, maps live only in that browser: click **Export maps file** on the maps screen and drop the downloaded custom-maps.js into this folder before zipping. **Heads up:** the browser treats served pages and double-clicked files as different sites, so maps made one way won't automatically appear the other way — Export/Import bridges them, and opening the maps screen while the server runs re-syncs the file.

## What's implemented

Everything in the rule book: the full 16-card deck, infantry/cavalry/artillery, HQs, trenches with chosen facings, directional forest/mountain terrain, combat with support + terrain + card modifiers (a confirm dialog shows the full power calculation before every attack), HQ-capture and attrition victories, and the campaign — loser moves first next battle, first to 3 battles wins. The in-game **Field Manual** has a rules summary, **Cards** opens a glossary showing exactly which copies each side has spent (✖ spent / ○ remaining), and the campaign journal is docked on the lower right, always open. Local games auto-save; use **Resume Campaign** on the menu.

### Terrain is directional (per the HexClarificationDiagram)

Terrain belongs to the hex it sits in and is drawn inset inside it. A **forest** in hex X gives +1 attack when X's occupant attacks *out* across a covered edge. A **mountain** in hex X gives +1 defense when X is attacked across a covered edge. Neither does anything in the other direction, and both hexes of one border can each hold their own piece.

## House rules (per Bill's prototyping)

- **Flexible orders**: any card may resolve as the printed action, a basic Attack, or a basic Reposition — the card is removed from the game regardless.
- **Reset turn**: mid-way through a multi-step card you can reset back to the start of your turn (button next to Skip). Once the card fully resolves the turn is final.
- **No stacking**: a hex side with terrain can't also hold a trench; trenches are placed by clicking their two edges, one at a time.
- **Airdrop nerf**: Airdrop never appears in your opening hand (it returns to the deck for later turns).

## Rulings made where the rule book was silent

- **Controlled hex** = a hex occupied by your unit or HQ (per Bill).
- **Trenches** cover 2 chosen edges; +1 defense only across those edges, helps any defender, never an attacker (per Bill).
- HQ's +1 support applies to adjacent hexes for both attack and defense calculations.
- The attacking unit's own support value is not added to its attack.
- Moving/attacking "through a headquarters": a unit adjacent to any HQ may move to, swap with, or attack a hex on the far side of that HQ. Terrain on the crossing edge applies.
- Attrition VP counts enemy units you destroyed; tie goes to whoever moved second in the battle.
- Ordered Withdraw tie: defender destroyed, attacker survives in place.
- Naval Barrage may remove a trench or a whole forest piece in or adjacent to your controlled hexes; the barrage is optional, the attack can still be ordered.
- Any card step can be skipped if you can't or don't want to complete it ("up to three" marches, etc.).
- The "Depot" engraved on the prototype player mats isn't in the rule book, so it's not in the game.

## Files

- `index.html` — the whole game (UI, AI driver, map editor)
- `engine.js` — rules engine + AI (shared by tests)
- `server.js` / `run-server.bat` / `run-server.command` — tiny zero-dependency LAN server
- `custom-maps.js` — your custom maps (generated; travels with the folder)
- `test.js` — engine test suite: `node test.js`
- `CLAUDE.md` — orientation notes for AI coding assistants working on this project
