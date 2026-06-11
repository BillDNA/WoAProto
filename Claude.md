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
## Feedback Round 4 (display/resize pass — all handled June 2026; CSS-only + a journal toggle, no engine change)
* ~~issues with smaller screens and resizing in general~~ — responsive pass across menu, topbar, mats, board, hand (see "Responsive" bullet in `game/CLAUDE.md`)
* ~~MainMenuScreen - menu cut off~~ — menu now **shrinks to fit** short screens via `max-height` queries; `overflow-y:auto` kept only as a fallback (shrink, don't scroll)
* ~~TitleTextBug - text mis-placed~~ — all-caps rode high in its line box; `line-height:1` + downward-biased plaque padding optically centre it, and the title font width-clamps so it never overflows the panel
* ~~gameSmallerScreen~~:
	* ~~top menu gets squeezed~~ — topbar rebuilt as a `1fr auto 1fr` grid (centred scorecard never overlaps; stacks below 720px)
	* ~~campaign Journal placement~~ — a useless sliver on short/narrow screens, so it's hidden there and reached via a new topbar **Journal** button (mirrors the log into an overlay); inline on roomy screens
## FeedBack Round 5
* Confused on what the AI actually did 
	* So the logs just say blue plays "Attack +1".  then its my turn.
	* Blue could have resolved as a reposition
	* was this actually a skip turn?
* BugReports/BarrageTargetSelection - I can target the forest in E3 even though i (red) don't control an adjacent hex.  let's change the rule for Barrage to allow targeting of any forest or trench.
* 
	
## Standing goals

* rapid balance iteration is the point of this prototype — prefer data files + small tools over hardcoding
* keep `game/` zero-dependency plain files (zippable); dev-only tooling lives in `dev/`
* keep `node game/test.js` green and extend it with every rules change
