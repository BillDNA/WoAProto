we are taking a board game prototype and turning it into a playable prototype in the web browser, the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

Start in [[code-overview]] — it is the orientation file for this project and stays current. [[game/README]] is the player-facing manual.  [[workflow]] has guide lines for our workflow.
## Standing goals

* rapid balance iteration is the point of this prototype — prefer data files + small tools over hardcoding
* keep `game/` zero-dependency plain files (zippable); dev-only tooling lives in `dev/`
	* we can talk about if some feature in v0 might break this goal which might be fine
	* v1 - we can deffinatly move away from this goal -
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

* ~~ai things~~
	* ~~in [[ai-heuristic-model]] can we add a col for reward vs penalty~~ 
		* ~~the default is helpful but i also want a general sense of scale / acceptable range~~
	* ~~how dose the model pick the orientation of a trench~~
	* ~~I would like to start to get an idea of where the time for the search is coming from, there should be some optimizations we could do.~~
		*  ~~efficiency of running the balance.js - what would it look like to have it run the maps in parallel~~
* ~~claude plays~~
	* ~~time stamp in logs so i can gauge if something went wrong or we are just waiting~~
	* ~~in the active logs lets see a scoreboard~~ 
	* ~~what are the limitations / how would it work if we had a watch capability like we do for the heruistic one~~ 
	* ~~what if we didn't run it headless but just piped the input and out put to get a full game on one session per side might need an mcp or something the manage the link~~  
* ~~rule changes~~
	* ~~river goes from no support to not deploy control extension support still ok - the goal is to make repositioning stronger situationally and reduce swaps that are infantry for infantry~~ 
	* ~~actually i'm thinking the no reposition rules around basic resolve could maybe be solved by no swapping two units of the same type, cause doing that is functionally just a skip turn and our metrics wouldn't catch it.~~
* ~~a review of data~~
	* ~~we are going to have to start having game versioning in the logs and reports~~
	* ~~take a look at these reports and logs, use the [[design-docs/grading-rubrics|grading-rubrics]] - give me your thoughts on~~ 
		* ~~game rules whats working whats not and if its rules cards or maps that are the issue~~
		* ~~give me three cards to potentially eliminate and how the address an issue you saw in the data then present 3 options using the make-card skill that could adress an issue you saw in the data~~
		* ~~give me 3 maps to remove and why, then give me three maps useing the create map~~
	* ~~[[2026-07-04T01-13-47-690Z-black-forest-haiku-v-haiku]]~~ 
		* ~~rush game which is expected every so often thats why we do first to 3~~
	* ~~[[2026-07-04T02-55-27-522Z-black-forest-haiku-v-haiku]]~~
		* ~~whats happening with the sips ?~~
	* ~~[[2026-07-02-2319-hard-vs-hard-n60]]~~
		* ~~the attack cards are being resolved simple is that mean they are repositions?~~
### Feed back round 4
 * stats interpurtation
	 * ~~high swings low drag attrition only i s a good map becuase the victor changed hands multiple times right up to the end - lots of tention and counter play~~ — encoded: balance-report.js Balance score rewards Swings + doesn't penalize attrition-only; review-reports + graphs-spec treat high-Swings/low-Drag as good.
	 * ~~i think we might need to start thinking about what kinda graphs we want and how to display them - probably a spec document put you first impressions into ./specs with questions for me to consider - the goal of graphs is to view the data from different perspectives so patterns and insights can be seen~~ → `specs/graphs-spec.md` (7 candidate views + 6 questions for Bill; awaiting your answers).
 * metrics
	 * ~~while still on same version more runs should add to data - data should be persistant until version pump or user manually dose it.~~ — `dev/balance-report.js` folds each run into `logs/reports/balance/<version>/accumulated.json` (keyed by version + AI matchup); `--fresh` resets, `--once` skips. (Dashboard-run accumulation not wired yet — CLI/generate-reports path only.)
	 * ~~add the metrics for the game played to the end of the claude battle report - should tell us how "typical" that game was for that map compared to the balance report~~ — claude-plays.js now appends a **Typicality vs the map baseline** table (this game vs a hard-AI baseline for the map, `--typical-n`, default 40).
 * ~~game content - probably a bit of a folder reorg (game/content/)~~ — `game/content/{maps,decks}/<slug>.js`, each pushing into a `WOA_CONTENT` global; `content/manifest.js` (server-regenerated) document.write's them so file:// double-click still works; engine assembles core (maps.js) + content. Tombstones gone.
	 * ~~lets have maps be their own json file so i can delete them fro real there is some descrepency around whats default across the driffrent play modes - the friction point is 'defaults' keep coming back i want an actual file to delete.~~ — every map is `content/maps/<slug>.js`; the maps screen Delete removes the file (`/api/deletemap`) and splices `E.MAPS`. One roster for all play modes (no more per-origin localStorage defaults). custom-maps.js + tombstones removed.
	 * ~~similar treatment for cards/ decks - similar reason~~ — the default card deck is now a file (`content/decks/default.js`, `active`) and the engine reads cards from it; the Deck Editor's applied deck is also a file (`custom-deck.js` → active override). **Note:** the 5 editing slots still live in localStorage (buffer) — full per-slot deck files can be a follow-up if you want them.
 * skills - about generating and anynalizing reports
	 * ~~lets move reports from design-docs -> ./logs/reports - battle and balance reports can have their own dir and sub dirs for older versions.~~ — done: `logs/reports/{balance,battle,analysis}/<version>/`; game-logs→battle; existing 0.2 data migrated; `logs/debug/` added.
	 * ~~review-reports - reviews battle reports (change name of dir please) and balance reports.  the resulting analysis should be saved to ./logs/reports/analysis.  make sure we use [[design-docs/grading-rubrics|grading-rubrics]] for the analysis.~~ — new `review-reports` skill (folds in the old game-log-report, which is removed); reads both report types, saves graded analysis to `logs/reports/analysis/`.
	 * ~~generate-reports - runs a 60 game balance report with default hard vs hard.  then selects a map to run two claude-plays.js … --seed (1234|5678) … map selection should be the map that has the "best" balance numbers …~~ — new `generate-reports` skill over `dev/balance-report.js` (saves the report + emits `BEST_MAP:`), then two parallel claude-plays on that map.
 * Bug reports -
	 * ~~lets have a btn in the game that allows me to save a game state to a debug-log dir so i can refrence exactly whats going on with out having to paste and image in here.~~ — **Debug** button in the battle topbar → `/api/savedebug` → `logs/debug/<stamp>-<map>-T<turn>-<phase>.json` (downloads a copy off-server).
	 * ~~River should be preventing me from deploying to D2 - adjacency control should not extend adjacency control. (please clean image from project after fixed)~~ — fixed 0.3: `deployTargets` now skips empties reached only across a river (`riverBetween`); support crosses rivers freely again per Round-3 semantics. Image cleaned.
### Feedback Round 5 - prepping specs for V1
*  ~~spec out what it would mean to capture data in a db rather than these loose json files. - goal would be to have better data querying and allow us to plot improvements overtime~~ 
* ~~heuristic ai update & balance report speed~~
	* ~~lets review how we do our search of valid plays (probably can do some automatic pruning to speed up especially the balance report.) - goal speed up the simulated battles~~
	* ~~can also use this to probably give the Claude plays a more concentrated set of options reducing the context usage each volley.  goal - reduce claude plays token usage so we can do more runs and get a better overall picture.~~
	* ~~a review of base line weights - goal use the data we have gathered to tune the heuristic~~
		* ~~question on how the ai picks the orientation for trenches with these weights not clear in [[ai-heuristic-model]]~~
* ~~major upgrades to Claude plays~~ 
	* ~~can we have it open a shell and pipe the msgs back and forth (we are doing something in dynamic scrum can give you a brief md on how that project is doing it) - goals~~
		* ~~goal - get a better view of how playing multiple battles feels, when a rush draw happens they say it feels to luck driven but that should be mitigated by the fact that it's first to 3 wins~~
		* ~~goal - faster response times because we are not starting a fresh session we shouldn't have to pipe in the game rules each time just the~~ 
* ~~skills~~ 
	* ~~lets change the generate reports to just run the balance and start the claude plays (updating that to a first to 3) probably open a new shell to run, no need to have Claude listening to it waiting for reports to come back.~~ 
* ~~game content~~ 
	* ~~lets trim down to 12 maps - might also want a similar deck mechanic like we do for the action cards~~ 
## V1
* a general code review looking at how future versions are looking and sugest a more formalize code architecture - we might establish some new standing goals
		- start aiming for a steam release of a roughlite deck builder needs more noodling on what exactly that looks like but probably informs some code architecture dessisions get made with that new guiding goal.  we can start to drift away from the physical constraints but i like to keep them around cause the limitation helps focus the game and prevent systems creep.  
		- then lets implement that overview
- [[v1-data-persistence]]
- [[v1-ai-search-and-tuning]]
- [[v1-content-curation]]
- [[graphs-spec]]
- [[v1-claude-plays-and-reports]]
	- [[claude-session-hub-pipeline]] might help but is not required if you think of something better go for it
- [[v1-field-manual-animations]] — Ui update to field manual to have animation explanations of the rules (especialy around support and ties), more human readable

## Vision (post-V1, not speced — YAGNI until V1 lands)

- **Roguelite deck-builder**: a card pool larger than the 20-card deck plus a deck-building loop between battles.
- **Side asymmetry**: different decks per side, and Commander abilities that bend the rules (e.g. guaranteed Conscription in the opening hand). Expect bigger balance swings — which is why the rubrics + metrics tooling above come first.
- 

