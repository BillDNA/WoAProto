# War of Attrition — digital edition

A browser version of the board game, built from the design docs. Three ways to play, all from this folder — or just open the hosted page.

## Play in the browser (GitHub Pages)

The game is published from this repo: **https://billdna.github.io/WoAProto/** — single player vs the AI and hotseat work right from that link, nothing to install. (Two-device LAN play still needs the little server below, because Pages only serves files.)

## Play vs the AI (no setup)

Double-click **index.html**. Pick your side and the enemy general's skill, then **March Against the AI**. Tip: `index.html?autostart=ai` jumps straight into a battle.

Three generals to fight:

- **Green Recruit** — judges positions with noisy eyes; makes real mistakes.
- **Old Veteran** — plays its best one-turn-deep plan.
- **Field Marshal** — shortlists its best plans, then imagines your strongest reply (sampling possible hands from the public deck information — it never peeks at your cards) before committing.

**Watch: AI vs AI** on the menu lets you spectate two generals fighting at your chosen skill level — useful for getting a feel for a new map without playing it.

## Hotseat (two players, one device)

Open **index.html**, click **Hotseat**. The game shows a hand-off screen between turns so you don't see each other's cards.

## Two devices in the same room

Needs Node.js (nodejs.org) on one computer — the server is plain Node and runs on Windows, Mac, or Linux.

1. Start the server: **run-server.bat** (Windows) or **run-server.command** (Mac — if double-clicking is blocked, open Terminal in this folder and run `sh run-server.command` or just `node server.js`). It prints an address like `http://192.168.1.23:8420`.
2. Open that address in a browser on **both** devices (same wifi).
3. One player clicks **Host a Room** and reads out the 4-letter code; the other types it in and joins. Host is Red, joiner is Blue. The room code stays visible in the top bar during the game, and the server's terminal logs every room as it's hosted, joined, and expired (idle rooms vanish after 6 hours, so stray clicks on Host are harmless).

## Boards, maps, units & cards — built for rapid tinkering

**Everything tunable lives in `maps.js`** as plain JSON: board shapes, the map roster, **unit stats and piece counts, the trench count, the full card deck, and the physical terrain stock**. Edit it in any text editor, save, refresh the browser — the file explains its own format. Want to know what cavalry with 1 defense feels like, or a 20-card deck? Change a number, refresh, play (or run the balance lab on it). `node test.js` validates everything and points at exactly what's wrong.

There are 12 built-in maps (matching the physical 12-card map deck) across five boards, all at or under the 24-hex laser-cutter ceiling:

- **Classic** 4-5-6-5-4 (24 hexes) — the physical prototype board: Frontier, The Bulge, Twin Woods, Killing Ground
- **Compact** 3-4-5-4-3 (19) — fast brawls: The Cockpit, Highwater
- **Hourglass** 5-4-3-4-5 (21) — a fortified waist between two fields: The Narrows, Twin Gates
- **Ridge** four slanted rows of 5 (20) — fighting along a diagonal: Saber Ridge, Thornfield
- **Spear** 2-3-4-5-4-3-2 (23) — a long lens with distant HQs: Long March, Vanguard

The old 37-hex Grand and 29-hex Wide boards are gone: they played slow and empty (both armies fully deployed only ever control 22 hexes) and can't be laser-cut at a sane hex size. Adding a board back is one JSON entry in `maps.js` — shapes must be point-symmetric so Mirror and fair HQ placement work; the tests check this.

**Maps & Map Editor** on the main menu lists every battlefield with a preview. Untick a map to remove it from the draw pile; **Play** starts a quick AI campaign on just that map; **Balance** runs 20 AI-vs-AI battles on it and reports the win rates right there. **New Map** opens the editor: pick a board, paint terrain (click just inside a hex's border to cycle forest → mountain → empty on that hex's side), place both HQs, and **Mirror** to copy everything point-symmetrically — its **Balance Report** button works on the map as drawn, before you even save. Terrain pieces behave like the physical ones — each piece lives inside one hex and wraps its corners; the editor and engine both enforce it.

### Sharing custom maps (zip the folder)

When you play through the server, custom maps are automatically written to **custom-maps.js** in this folder — zip the folder, send it, and friends get your maps. If you play by double-clicking index.html instead, maps live only in that browser: click **Export maps file** on the maps screen and drop the downloaded custom-maps.js into this folder before zipping. **Heads up:** the browser treats served pages and double-clicked files as different sites, so maps made one way won't automatically appear the other way — Export/Import bridges them, and opening the maps screen while the server runs re-syncs the file.

## The balance lab

`node balance.js` runs AI-vs-AI battles on every map (custom maps included) and prints a report: win rate by side, by first/second mover, HQ-capture vs attrition share, battle length, and how often each card sat in the winner's spent pile.

- `node balance.js 60` — bigger samples; `node balance.js 60 hard` — with the Field Marshal
- `node balance.js 40 narrows` — only maps whose name matches "narrows"
- `node balance.js matchup` — **the luck-o-meter**: better AIs fight worse ones, and the stronger side's win rate is the skill premium. If a clearly better player only wins ~55%, the card draw decides most battles; 65%+ means skill decides. The normal-vs-normal line is a ~50% sanity check.

The same reports are available in-game via the **Balance** buttons on the maps screen and in the editor. After any battle, **Rematch this map** restarts on the same battlefield — tweak, rematch, compare. That's the loop this prototype exists for.

## Art

Card illustrations, the title plaque, the table felt, and the board parchment live in `game/art/`, looked up **by card id** (`art/<id>.jpg`, falling back to `.png`). A card with no matching file simply renders the text-only face — new cards in `maps.js` never break for lack of art. To add art: drop the raw AI render into `game/art/` as `<id>.png` and run `dev/optimize-art.ps1` — it trims transparent margins, shrinks the file ~100×, and squirrels the original away in `design-docs/art-originals/` (kept out of the public repo).

## What's implemented

Everything in the rule book: the full 16-card deck, infantry/cavalry/artillery, HQs, trenches with chosen facings, directional forest/mountain terrain, combat with support + terrain + card modifiers (a confirm dialog shows the full power calculation before every attack), HQ-capture and attrition victories, and the campaign — loser moves first next battle, first to 3 battles wins.

Reading the table at a glance:

- **Player mats** mirror the physical ones: one slot per piece — solid icon = in reserve, dashed empty slot = out on the field, ✕ = destroyed. Below them, all 16 orders as chips that gray out as each side spends them — you always know exactly what the enemy has burned and what might still be coming.
- **Grid references**: every hex wears a faint label (A1…E4) and the campaign journal speaks them — "Red deploys Infantry at D2."
- The **campaign score card** sits centred in the top bar; the **journal** (lower right) marks battles, turns, and victories.
- Small animations: hands deal in, deployments pop, marches glide, attacks ring and fallen units fade, the board shakes when an HQ falls.

The in-game **Field Manual** has a rules summary, **Cards** opens a glossary showing exactly which copies each side has spent (✖ spent / ○ remaining). Local games auto-save; use **Resume Campaign** on the menu.

### Terrain is directional (per the HexClarificationDiagram)

Terrain belongs to the hex it sits in and is drawn inset inside it. A **forest** in hex X gives +1 attack when X's occupant attacks *out* across a covered edge. A **mountain** in hex X gives +1 defense when X is attacked across a covered edge. Neither does anything in the other direction, and both hexes of one border can each hold their own piece.

## House rules (per Bill's prototyping)

- **Flexible orders**: any card may resolve as the printed action, a basic Attack, or a basic Reposition — the card is removed from the game regardless.
- **Reset turn**: mid-way through a multi-step card you can reset back to the start of your turn (button next to Skip). Once the card fully resolves the turn is final.
- **No stacking**: a hex side with terrain can't also hold a trench; trenches are placed by clicking their two edges, one at a time.
- **Airdrop nerf**: Airdrop never appears in your opening hand (it returns to the deck for later turns).
- **Concession**: at the start of your turn you may concede the battle (button in the top bar); the enemy takes the battle and the campaign moves on. When the maths say the battle is decided (the VP gap can't be closed even by destroying every enemy unit on the field, and no unit can reach the enemy HQ in the turns you have left), the game quietly suggests it — and the AI concedes on its own rather than playing out a foregone conclusion.

## Rulings made where the rule book was silent

- **Controlled hex** = a hex occupied by your unit or HQ (per Bill).
- **Trenches** cover 2 chosen edges; +1 defense only across those edges, helps any defender, never an attacker (per Bill).
- **A hex may hold several trenches** as long as their covered edges don't overlap each other or that hex's own terrain sides (per Bill's DoubleTrenchNotAllowed report).
- HQ's +1 support applies to adjacent hexes for both attack and defense calculations.
- The attacking unit's own support value is not added to its attack.
- Moving/attacking "through a headquarters": a unit adjacent to any HQ may move to, swap with, or attack a hex on the far side of that HQ. Terrain on the crossing edge applies.
- Attrition VP counts enemy units you destroyed; tie goes to whoever moved second in the battle.
- Ordered Withdraw: the attacker survives a tie, and never advances into the target hex — even on a clear win it holds its ground (June 2026 change). A successful attack on the HQ still captures it; entering isn't required.
- Naval Barrage may remove **any** trench or whole forest piece on the board (June 2026 ruling — the old "in or adjacent to your controlled hexes" zone is gone); the barrage is optional, the attack can still be ordered.
- Any card step can be skipped if you can't or don't want to complete it ("up to three" marches, etc.).
- The "Depot" engraved on the prototype player mats isn't in the rule book, so it's not in the game.

## Files

- `index.html` — the whole game (UI, AI driver, map editor, in-game balance lab)
- `engine.js` — rules engine + the three AIs + battle simulator (shared by tests and the balance lab)
- `maps.js` — **all tunable game data, hand-editable JSON**: boards, maps, units, cards, terrain stock
- `balance.js` — AI-vs-AI balance reports: `node balance.js`, `node balance.js matchup`
- `server.js` / `run-server.bat` / `run-server.command` — tiny zero-dependency LAN server
- `custom-maps.js` — your custom maps (generated; travels with the folder)
- `test.js` — engine test suite: `node test.js`
- `CLAUDE.md` — orientation notes for AI coding assistants working on this project
