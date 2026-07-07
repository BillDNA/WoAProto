#human-instructions
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

**The tunable knobs live in `maps.js`** as plain JSON: board shapes, **unit stats and piece counts, the trench count, the AI personalities, and the physical terrain stock**. The **map roster and card decks are their own files** under `game/content/` — one file per map (`content/maps/<name>.js`) and per deck (`content/decks/<name>.js`), so you delete a map by deleting its file. Edit any of it in a text editor, save, refresh the browser — the files explain their own format. Want to know what cavalry with 1 defense feels like, or a 20-card deck? Change a number, refresh, play (or run `node balance.js` on it). `node test.js` validates everything and points at exactly what's wrong.

The map roster lives in `game/content/maps/` — one file per map — and is browsable with previews on the **Maps & Map Editor** screen. Every map sits on one of five boards (or carries its own carved outline), all at or under the 24-hex laser-cutter ceiling:

- **Classic** 4-5-6-5-4 (24 hexes) — the physical prototype board
- **Compact** 3-4-5-4-3 (19) — fast brawls
- **Hourglass** 5-4-3-4-5 (21) — a fortified waist between two fields
- **Ridge** four slanted rows of 5 (20) — fighting along a diagonal
- **Spear** 2-3-4-5-4-3-2 (23) — a long lens with distant HQs

The old 37-hex Grand and 29-hex Wide boards are gone: they played slow and empty (both armies fully deployed only ever control 22 hexes) and can't be laser-cut at a sane hex size. Adding a board back is one JSON entry in `maps.js` — shapes must be point-symmetric so Mirror and fair HQ placement work; the tests check this.

**Maps & Map Editor** on the main menu lists every battlefield with a preview. **Play** starts a quick AI campaign on just that map; **Balance** opens the Balance Dashboard scoped to it (the same full report as the CLI, run in the browser). **New Map** opens the editor: pick a board, paint terrain (click just inside a hex's border to cycle forest → mountain → river → empty on that hex's side), place both HQs, and **Mirror** to copy everything point-symmetrically — its **Balance** button runs the dashboard on the map as drawn, before you even save. Terrain pieces behave like the physical ones — each piece lives inside one hex and wraps its corners; the editor and engine both enforce it.

**Map-sets** decide which maps are actually in the draw pile. The maps screen holds up to five named sets (like the deck editor's deck slots) — say a rivers-only training set next to the full tournament roster — with exactly one set **active**: campaigns draw from the active set, and so do the balance tools. Tick maps in and out of the set you're viewing, and sets are saved as files (`content/mapsets/*.js`) when the local server runs, so both LAN players and every command-line tool see the same pool.

### Sharing custom maps (zip the folder)

Maps you make or edit are saved as **files in `game/content/maps/`** (one file per map) when you play through the server — delete a map on the maps screen and its file is deleted for good; zip the folder and friends get your exact roster. Editing, adding, or deleting a map needs the local server (it writes the files). If you double-click index.html instead, you can still play and edit map-sets for the session, but nothing persists — no saving or deleting map or set files; **Export maps** downloads the whole roster as a `maps-bundle.json` you can **Import** on another machine (which writes the files there).

## The balance lab

`node balance.js` runs AI-vs-AI battles on every map in the active map-set (`--mapset <id>` picks another set, `--mapset all` runs every map on disk) and prints a report: win rate by side, by first/second mover, HQ-capture vs attrition share, battle length, AI behaviour health (attacks & swaps per battle, zero-kill stalemates, share of units fielded), decisiveness (tiebreak share, first-blood conversion, board control vs winning), and how often each card sat in the winner's spent pile.

- `node balance.js 60` — bigger samples; `node balance.js 60 hard` — with the Field Marshal
- `node balance.js 40 narrows` — only maps whose name matches "narrows"
- `node balance.js matchup` — **the luck-o-meter**: better AIs fight worse ones, and the stronger side's win rate is the skill premium. If a clearly better player only wins ~55%, the card draw decides most battles; 65%+ means skill decides. The normal-vs-normal line is a ~50% sanity check.

The same report lives in the browser as the **Balance Dashboard** (main menu): pick battles-per-map, the AI for each side, and a map or the whole pool — every table is click-to-sort. The **Balance** buttons on the maps screen and in the editor open it too (the editor's runs the map as drawn). After any battle, **Rematch this map** restarts on the same battlefield — tweak, rematch, compare. That's the loop this prototype exists for.

## Art

Card illustrations, the title plaque, the table felt, and the board parchment live in `game/art/`, looked up **by card id** (`art/<id>.jpg`, falling back to `.png`). A card with no matching file simply renders the text-only face — new cards never break for lack of art. To add art: drop the raw AI render into `game/art/` as `<id>.png` and run `dev/optimize-art.ps1` — it trims transparent margins, shrinks the file ~100×, and squirrels the original away in `dynamic-scrum/planning/specs/original-specs/art-originals/` (kept out of the public repo).

## What's implemented

Everything in the rule book: the full 16-card deck, infantry/cavalry/artillery, HQs, trenches with chosen facings, directional forest/mountain terrain, combat with support + terrain + card modifiers (a confirm dialog shows the full power calculation before every attack), HQ-capture and attrition victories, and the campaign — loser moves first next battle, first to 3 battles wins.

Reading the table at a glance:

- **Player mats** mirror the physical ones: one slot per piece — solid icon = in reserve, dashed empty slot = out on the field, ✕ = destroyed. Below them, all 16 orders as chips that gray out as each side spends them — you always know exactly what the enemy has burned and what might still be coming.
- **Grid references**: every hex wears a faint label (A1…E4) and the campaign journal speaks them — "Red deploys Infantry at D2."
- The **campaign score card** sits centred in the top bar; the **journal** (lower right) marks battles, turns, and victories.
- Small animations: hands deal in, deployments pop, marches glide, attacks ring and fallen units fade, the board shakes when an HQ falls.

The in-game **Field Manual** has a rules summary plus **animated worked examples** — step through Support, Ties, and Trench vs River on a mini board, with the same rings, arrows, and A-vs-D pills the live board uses (every number is computed by the real rules engine). **Cards** opens a glossary showing exactly which copies each side has spent (✖ spent / ○ remaining). Local games auto-save; use **Resume Campaign** on the menu.

### Terrain is directional (per the HexClarificationDiagram)

Terrain belongs to the hex it sits in and is drawn inset inside it. A **forest** in hex X gives +1 attack when X's occupant attacks *out* across a covered edge. A **mountain** in hex X gives +1 defense when X is attacked across a covered edge. Neither does anything in the other direction, and both hexes of one border can each hold their own piece.

A **river** (drawn in blue, in the same 2- and 3-side pieces as forest and mountain) sits on a border. **Support crosses it freely** for both sides, but **control doesn't extend across it**: you can't deploy a unit onto a hex whose only link to a hex you control runs across a river — adjacency control stops at the water. Attacks and movement still cross freely, Airdrop lands beyond it just fine, and Naval Barrage can't remove it. Whichever hex the piece is drawn in, the border is read both ways. *(0.3 river revision — Feedback Round 3/4: rivers used to block support instead.)*

## House rules (per Bill's prototyping)

- **Flexible orders**: any card may resolve as the printed action, a basic Attack, or a basic Reposition — the card is removed from the game regardless. A basic Reposition is only offered when no basic Attack is possible: if you can fight, you can't spend the order just shuffling pieces.
- **Every order must do something**: you may skip an individual step of a multi-step card, but not skip *every* step — if the card can accomplish any action, at least one must be played (the **Skip step** button hides on the last playable step). An order that genuinely has no legal action anywhere is still spent to no effect.
- **Reset turn**: mid-way through a multi-step card you can reset back to the start of your turn (button next to Skip). Once the card fully resolves the turn is final.
- **No stacking**: a hex side with terrain can't also hold a trench; to place one, pick the hex then click the brass corner knob of the orientation you want (hovering a knob previews its two edges).
- **Reading a fight**: hover any of your units to see the attack math against every hex it could hit (green = you win, brass = tie, red = you lose — the same numbers the confirm dialog shows). When an attack lands, an arrow shows where it came from (bending through an HQ on a through-HQ strike) and rings mark every unit whose support actually counted — gold for the attacker's, steel for the defender's.
- **Airdrop nerf**: Airdrop never appears in your opening hand (it returns to the deck for later turns).
- **Concession**: at the start of your turn you may concede the battle (button in the top bar); the enemy takes the battle and the campaign moves on. When the maths say the battle is decided (the field-score gap is bigger than the best plausible swing — about 3 VP a turn — in the turns you have left, and no unit can reach the enemy HQ in time), the game quietly suggests it — and the AI concedes on its own rather than playing out a foregone conclusion.

## Rulings made where the rule book was silent

- **Controlled hex** = a hex occupied by your unit or HQ (per Bill).
- **Trenches** cover 2 chosen edges and are **support denial, not armour** (V0 terrain-crossing revision, July 2026): an attacker's support may not cross a trenched border to reach the battle hex. They add **no** defense (mountains do that), never block the attack itself, never hinder the defender's support, and a unit in a trenched hex still supports out across its free borders. Ownership is irrelevant — lose the hex and the enemy uses your trench just fine. (Previously: +1 defense across covered edges.)
- **Rivers** no longer block support — support crosses freely for both players. Instead a river **denies deploy-control extension**: a hex reachable only across a river is not a legal deploy target (see Terrain above). (0.3 river revision, Feedback Round 3/4, July 2026; previously rivers blocked support.)
- **A hex may hold several trenches** as long as their covered edges don't overlap each other or that hex's own terrain sides (per Bill's DoubleTrenchNotAllowed report).
- HQ's +1 support applies to adjacent hexes for both attack and defense calculations.
- The attacking unit's own support value is not added to its attack.
- Moving/attacking "through a headquarters": a unit adjacent to any HQ may move to, swap with, or attack a hex on the far side of that HQ. Terrain on the crossing edge applies.
- **Same-type swaps are not legal** (Round-3 ruling, enforced in 1.0): swapping two identical units changes nothing on the board — it's a hidden skipped turn — so only units of different types may swap.
- Attrition VP counts your **surviving units on the board** (1/2/3 for infantry/cavalry/artillery); reserves never deployed count for nothing, and neither do kills as such — destroying a unit matters because it leaves the enemy less on the field. Tie goes to whoever moved second in the battle. (June 2026 revision; the rule book is updated. Previously kills were what scored, which let a one-kill turtle beat a side that dominated the board.)
- Ordered Withdraw: the attacker survives a tie, and never advances into the target hex — even on a clear win it holds its ground (June 2026 change). A successful attack on the HQ still captures it; entering isn't required.
- Naval Barrage may remove **any** trench or whole forest piece on the board (June 2026 ruling — the old "in or adjacent to your controlled hexes" zone is gone); the barrage is optional, the attack can still be ordered.
- Any card step can be skipped if you can't or don't want to complete it ("up to three" marches, etc.).
- The "Depot" engraved on the prototype player mats isn't in the rule book, so it's not in the game.

## Files

- `index.html` + `style.css` + `ui/` — the game's screens and chrome (menu, board, mats, editors, Balance Dashboard, Field Manual); index.html is just the markup and the ordered script list
- `engine.js` + `engine/` — the rules engine, loaded as seven ordered parts: all rules, the six AI personalities (the easy/normal/hard presets plus the `maps.js` data rows), and the battle simulator (shared by tests and every balance report)
- `report-model.js` — the one copy of the balance-report scoring/format, shared by the CLI and the Balance Dashboard
- `maps.js` — **core tunable data, hand-editable JSON**: board shapes, units, terrain stock, AI personalities
- `content/` — **the map library, card decks, and map-sets, one file each** (`content/maps/*.js`, `content/decks/*.js`, `content/mapsets/*.js`): delete a map/deck by deleting its file. The map editor carves the **board outline itself** (Board hexes tool, add/remove under the 24-hex ceiling) and deletes maps for real (floor of 5); saving/deleting needs the local server.
- `balance.js` — AI-vs-AI balance reports: `node balance.js`, `node balance.js matchup`
  (the same report lives in the browser: **Balance Dashboard** on the main menu)
- `server.js` / `run-server.bat` / `run-server.command` — tiny zero-dependency LAN + save server
- `custom-deck.js` — the **applied** deck from the **Deck Editor** (menu): edit cards in the browser — name, copies, text, steps — with validation (16 cards, one starting card); Save reloads with the new deck (it overrides `content/decks/default.js`). The 5 editing slots live in the browser; the applied deck is a file.
- `test.js` — engine test suite: `node test.js`
- `CLAUDE.md` — pointer to the orientation notes for AI coding assistants working on this project
