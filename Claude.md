we are taking a board game prototype and turning it into a playable prototype in the web browser, the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

Start in [[code-overview]] — it is the orientation file for this project and stays current. [[game/README]] is the player-facing manual.  [[workflow]] has guide lines for our workflow.
## Standing goals

* rapid balance iteration is the point of this prototype — prefer data files + small tools over hardcoding
* keep `game/` zero-dependency plain files (zippable); dev-only tooling lives in `dev/`
	* we can talk about if some feature in v0 might break this goal which might be fine
* keep `node game/test.js` green and extend it with every rules change

## History — shipped (June 2026)

Six feedback rounds, all closed. Terse log; current state and every ruling live in `game/CLAUDE.md`, `game/README.md`, and git history.

1. **Visual + infra base** — physical-style player mats, campaign journal with grid refs (A1…E4), centred scorecard, board FX/animations, spent-orders track; `maps.js` map-save system (12 maps / 5 boards, 24-hex ceiling); git + GitHub Pages hosting; art-by-card-id pipeline; `balance.js` AI-vs-AI lab.
2. **Rules + lab** — multiple trenches per hex allowed; LAN room codes persist; `balance.js [n] [diff] [map]` + in-game Balance buttons; Field Marshal (hard) AI searching one reply deep on sampled hands; `balance.js matchup` luck-o-meter.
3. **Art + card metrics** — art wired by card id with text fallback; editor splits terrain runs into physical 2s/3s; card report gains Simple% / 1stSight% / AvgSeen.
4. **Responsive** — small-screen menu (shrink, don't scroll), width-clamped title, `1fr auto 1fr` topbar that stacks, journal overlay.
5. **Legibility + concede** — no-op turns logged + Skip% column; Naval Barrage reaches the whole board; three-column battle layout (journal to window bottom); Concede button + advisory heuristic.
6. **Anti-degeneracy** — hard turn-1 dead turns 9%→0; attrition scored by **surviving units on the board**; eval projects the deck-out attrition winner (kills the swap-dance stalemate); Behaviour/Decisiveness metrics in `balance.js`.

## V0 — SHIPPED (July 2026)

All ten V0 specs in `specs/` were built and committed in one autonomous run (July 2, 2026). The specs stay as design rationale; current behaviour lives in `game/CLAUDE.md`. Terse log:

**Rules / game**
- [[terrain-crossing-rules]] ✓ — trenches are now attacker-support denial (no +1 def, ownership irrelevant); new single-side **river** terrain (`R`) blocks support both ways, attacks/moves/Airdrop cross freely, not barrageable. Rule book updated to match the implementation, per Bill's ruling notes in the spec.
- [[combat-clarity-qol]] ✓ — one-click trench placement (brass corner knobs), hover-a-unit attack-math pills (engine's own computeAttack), strike arrows + supporter rings on every attack (through-HQ bends shown).
- [[layout-v2-implementation]] ✓ — 2A layout: both mats left, Campaign Journal owns the right rail as a bound book with collapsible turns, board bounded by its hex geometry (gutter fix), topbar VP tug-bar scoreboard, hamburger drawers on small screens.

**Tooling / app**
- [[metrics-dashboard]] ✓ — Balance Dashboard on the menu: full balance.js report in-browser, sortable tables, per-side AI pickers; aggregation shared with the CLI (`balanceNew/balanceAdd`, smoke-tested identical).
- [[deck-editor]] ✓ — Quartermaster's Ledger: in-browser card editing with validation (16 copies, one starting card, step vocabulary), saved to localStorage + `custom-deck.js` (`/api/savedeck`), applied on reload.
- [[map-roster-and-shapes]] ✓ — built-in maps deletable (tombstones, floor of 5, restore button); editor carves board outlines hex-by-hex (`shapeDef` travels inline with the map, 24-hex ceiling enforced).
- [[ai-variety]] ✓ — one parameterized AI engine; personalities are maps.js `"ai"` data rows (shipped brawler/turtle); `balance.js matchup` pits any two; presets verified byte-identical to the old easy/normal/hard.
- [[specs/V0-specs/grading-rubrics]] ✓ — `design-docs/grading-rubrics.md`: north stars + card/map/unit/game rubrics (goal / evidence + data origin / score meaning), baselines and tune-me targets.
- [[cli-responder-transport]] + [[claude-plays]] ✓ — `dev/llm-client.js` (zero-dep `claude -p` transport, fail-open) + `dev/claude-plays.js` (LLM plays real battles from numbered legal-move lists, honest info only, felt-notes after; verified live with haiku).
- [[claude-skills]] ✓ — `.claude/skills/`: run-tournament, create-card, create-map (thin orchestrators over balance.js + the rubrics; suggestions only, Bill decides).

### Feedback round 1
* ~~Map building -~~
	* ~~rivers should be in the same number and sizes as mountains and forest~~
	* ~~allow terrain placement on interior map hex allows (see the void custom map)~~
	* ~~balance btn should take you to the balance dashboard and run it not just in place~~
* ~~Deck builder~~
	* ~~how is airdrop being excluded from opening hand should be part of starting toggle~~
* ~~rule tweaks~~
	* ~~should only be allowed to resolve as reposition if you can't resolve as basic attack - should encourage more attacking~~
* ~~little ui things~~
	* ~~add the ai name to the player mats~~ 
	* ~~when all cards are played the map snaps to larger~~ 
	* ~~should let the last attack animation finish b4 showing win/lose card~~ 
	* ~~the shape col in balance dashboard should just say custom instead of the string of numbers~~
* ~~bigger ui things~~
	* ~~deck builder - see the whiteboard page "WoA deck builder"~~
	* ~~balance dashboard - see the whiteboard page "WoA Ballance Dashboard"~~
* ~~this code base is probably big enough to put graphify in (https://github.com/safishamsi/graphify)~~
### Feedback round 2
* ~~ai things~~
	* ~~on the "Thornfield" map blue played entrench and then place the trench on C4 facing away from the board so that the trench was not doing anything~~
	* ~~can you make me a human-instructions doc on the heuristic model and what the weights are~~
		* ~~where are the 5 ai I see are set cause in the engine.js i see the AI_PRESETS but there are only 3 not 5~~
* ~~ui things~~
	* ~~when a battle is over let me copy the campaign journal to clipboard with btn~~
	* ~~allow the metrics dash board to be wider so we can add more columns~~
	* ~~for the card editor~~ 
		* ~~put the card picture over the text input sot the aspect ratio fits~~
		* ~~allow the window to get bigger so we have more vertical space~~ 
* ~~metrics~~
	* ~~remove the skip % stat on card we rules now make it so you can't skip~~
	* ~~add map stat number of turn with no kill leading to game end, 0 is a HQ kill, 32 is no kill game - the goal is to help identify how soon was the game over and the ais are just marching in circles~~
	* ~~add decisiveness stat to number of times the leading player change, bringing it to a tie doesn't count as changed - the goal is to se if there really is a back and forth of who's winning the thought being the more it happens the more a player would feel like the can 'come back' from a bad turn.~~
	* ~~Start versioning the rule book this would be 0.2 as this is v0 feedback round 2.  that way we can compare apples to apples and archive data from older versions of the game.~~
* ~~Builder feature~~
	* ~~allow me 5 "decks" with one selected as active - deck is a set of 16 cards~~
* ~~Claude plays~~
	* ~~can we have logs dumped in design-docs/game-logs~~
	* ~~can you give me an human-instructions doc~~
		* ~~can we set the map?~~
		* ~~can we set the effort level for the headless Claude cli~~
* ~~skills~~
	* ~~add instructions to use DIG (if connected) to generate an image for the card if user approves of one~~ 
	* ~~create a skill to read game-log(s) file and then give a one page summary report of suggestions~~
* ~~work flow / doc updates~~
	* ~~i moved your CLUADE code review from the game doe to the design-doc/onboarding and changed the name to code-overview why don't you take out the workflow and make that its own onboarding doc~~
	* ~~lets scan our docs and apply tags and do some org~~ 
		* ~~onboarding~~
		* ~~claude-skills~~
		* ~~game-rules~~
		* ~~code-architecture~~
		* ~~workflow~~
		* ~~human-instructions~~ 
		* ~~game-logs~~
	* ~~lets rewrite the rule book to reflect reality of code~~ 
### Feedback round 3

* ai things
	* in [[ai-heuristic-model]] can we add a col for reward vs penalty 
		* the default is helpful but i also want a general sense of scale / acceptable range
	* how dose the model pick the orientation of a trench
* efficiency of running the balance.js 
	* what would it look like to have it run the maps in parallel 

## Vision (post-V0, not speced — YAGNI until V0 lands)

- **Roguelite deck-builder**: a card pool larger than the 20-card deck plus a deck-building loop between battles.
- **Side asymmetry**: different decks per side, and Commander abilities that bend the rules (e.g. guaranteed Conscription in the opening hand). Expect bigger balance swings — which is why the rubrics + metrics tooling above come first.

