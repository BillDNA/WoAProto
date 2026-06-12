we are taking a board game prototype and turning it into a playable prototype in the web browser, the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

Start in `game/CLAUDE.md` — it is the orientation file for this project and stays current. `game/README.md` is the player-facing manual.

## Status — June 2026 work order (all done)

* ~~visualADJ feedback pass:~~
	* ~~terrain bug (yellow lines) — fixed: pieces straddling hexes are now impossible; every piece lives inside one hex (engine-enforced + tested)~~
	* ~~red & blue player panels — rebuilt as physical-style mats: one slot per piece with icons (solid = reserve, dashed = fielded, ✕ = lost)~~
	* ~~purple campaign journal — resized + design pass; hexes use grid references (A1…E4) drawn faintly on the board and spoken in the journal~~
	* ~~teal — campaign score card centred in the top bar~~
* ~~simple animations — deal-in, deploy pop, march glide, attack ring, fallen-unit ghosts, HQ-capture shake~~
* ~~removed-cards visibility — spent-orders track on BOTH mats (all 16 chips per side gray out as cards leave the game)~~
* ~~save map system — `game/maps.js` holds board shapes AND the map roster as hand-editable JSON; new 12-map roster on 5 boards (24-hex max: laser-cutter ceiling, 22 controlled hexes at full deployment); Grand/Wide removed~~
* ~~version control — git repo, remote https://github.com/BillDNA/WoAProto.git, PSD/XCS sources gitignored (public repo)~~
* ~~hosting — root index.html redirects into game/ for GitHub Pages (single player + hotseat free in the browser; LAN PvP still needs the local server)~~
* ~~art — prompts for image AIs in `design-docs/art-prompts.md`; results go to `game/art/` and Claude wires them in~~
* ~~balance tooling — `node game/balance.js` simulates AI-vs-AI battles per map and reports side/mover win rates, HQ vs attrition, card win correlation~~
## Feedback round 2 (all handled June 2026)
* ~~DoubleTrenchNotAllowed bug~~ — was a ruling I invented, not a rule: hexes now hold multiple trenches as long as edges don't overlap (tested with the exact D3/C3/C4 repro)
* ~~Export maps .js Windows warning~~ — harmless (Windows refuses to RUN downloaded .js); the toast now says so. The file only needs to be moved next to index.html
* ~~LAN~~ — room code stays visible in the top bar; server terminal logs hosted/joined/expired rooms with the open-room list (extra Host clicks just make rooms that expire after 6h idle)
* ~~Balance lab codified~~ — `node balance.js [n] [diff] [map-name]` incl. custom maps; in-game Balance buttons on every map tile and in the editor (works on unsaved drafts); Rematch-this-map button after battles
* ~~AI levels / luck measurement~~ — third AI 'Field Marshal' searches one reply deep using sampled enemy hands (your suggestion, never peeks); `node balance.js matchup` quantifies the skill premium = how luck-based the game is
## Feedback round 3 (all handled June 2026)
* ~~initial art in game/art~~ — wired in: cards pull art BY CARD ID (`art/<id>.jpg` → `.png` → clean text-only fallback, so new cards never break); title plaque behind the menu title, felt table behind everything, board parchment under the hexes. Transparent margins auto-trimmed by `dev/optimize-art.ps1`, which also shrinks raw renders ~100× and sweeps originals to gitignored design-docs/art-originals (P1 unit icons skipped per Bill — drawn glyphs stay)
* ~~TwoSetsOfThree~~ — the editor now splits long same-hex terrain runs into physical 2s and 3s (a full forest ring = two length-3 pieces); validates clean
* ~~card report over-indexing on play share~~ — new per-card columns from a play log: Simple% (resolved as basic attack/reposition = weak printed action), 1stSight% (played the first time it was seen = OP watchlist), AvgSeen (hand appearances before being played = situational). Win% kept but documented as weak in attrition games
## Feedback Round 4
* ~~issues with smaller screens and resizing in general~~
* ~~BugReports/MainMenuScreen - menu is cut off, Probably shrink for smaller vertical space not scroll.~~
* ~~BugReports/TitleTextBug - the text is not placed correctly~~
* ~~BugReports/gameSmallerScreen -~~ 
	* ~~the top menu Gets squeezed,~~ 
	* ~~The campaign Journal Needs better placement Not sure how to fix that on a smaller screen up to you.~~
## Feedback Round 5 (all handled June 2026)
* ~~Confused on what the AI actually did~~ — a play that resolves zero actions now logs "finds no opening — the order is spent to no effect" in the journal, is marked `noop` in the play log, and shows up as a **Skip%** column in the card report. Root cause found AND fixed: the AI's -12 "prefer printed actions" bias made it play unplayable attack cards instead of repositioning; zero-action plans now take a -25 penalty, which took Skip% on Attack +1 / Mass Assault / Ordered Withdraw from 65–75% to ~0 (those turns became basic repositions — visible as Simple%)
* ~~BarrageTargetSelection~~ — ruled as asked: Naval Barrage now targets ANY forest or trench on the board (engine + card text + README + tests)
* ~~BattleLogDisplayIssues~~ — layout reworked per the maybeBLSolution sketch: three full-height columns (red mat | board+prompt+hand | blue mat+journal), so the journal runs to the window bottom and can't be clipped; card plays get a separator rule so turns read as paragraphs; the journal-to-overlay breakpoint dropped to ≤580px height now that the inline journal has room
* ~~concede design question~~ — Concede button in the topbar (confirm dialog; works in AI/hotseat/LAN). Detection heuristic `concedeAdvised`: hopeless = the VP gap exceeds every enemy VP still ON the field (reserves can stay home) AND nothing can reach the enemy HQ in the turns left (a live Airdrop keeps hope alive). It's advisory only for humans (a hint appears in the prompt bar); the AI concedes on its own. Balance sims deliberately play battles out in full
## Feedback Round 6 (all handled June 2026)
* ~~AI skipped with their attack +1 on turn one (not really repeatable)~~ — repro found: it was the HARD AI (watch mode uses the menu difficulty), which skipped turn 1 in 9% of games. Its reply-sampling diluted the dead-turn penalty and compared candidates on different sampled enemy hands — one candidate could randomly eat an Airdrop-at-the-HQ sample (-600) another never saw. Fixed: penalty -25→-80, applied at full strength after the hard blend, candidates scored on common random numbers. Hard turn-1 dead turns now 0, with a regression test
* ~~WhyBlueWin — VP should be calculated by standing troops on the board~~ — rule changed as asked: attrition is now scored by **surviving units on the board** (1/2/3 inf/cav/art; undeployed reserves count for nothing; tie still goes to the second player). Rule book, README, engine, mats, concede heuristic and tests all updated. Board control now correlates with winning (79% in the lab)
* ~~the infinite swap issue~~ — kept the resolve-into-reposition house rule (no-dead-hand principle); fixed AI-side instead. Root cause: the eval treated a 0-0 standstill as neutral when the tie rule means the FIRST player is losing it, so smart AIs turtled (zero-kill battles: easy 5% / normal 15% / hard 44%, and a watched game ended "blue wins, nobody died"). The eval now projects the attrition winner if the decks ran out (ramping up as cards dwindle) so the side losing the standstill must force combat, plus a -10 anti-shuffle penalty for re-swapping the same pair. Zero-kill at hard 44%→3%, attacks up at every level, 2nd-player win 78%→56%. New **Behaviour/Decisiveness metrics** in balance.js (attacks & swaps per battle, zero-kill%, tie-rule share, first-blood conversion, hex-control-vs-win, deployed share) so this class of bug is a number from now on



## Standing goals

* rapid balance iteration is the point of this prototype — prefer data files + small tools over hardcoding
* keep `game/` zero-dependency plain files (zippable); dev-only tooling lives in `dev/`
* keep `node game/test.js` green and extend it with every rules change
