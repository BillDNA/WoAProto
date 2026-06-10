we are taking a board game prototype and turning it into a playable prototype in the web browser, the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

Start in `game/CLAUDE.md` — it is the orientation file for this project and stays current. `game/README.md` is the player-facing manual.

## Status — June 2026 work order (all done)

* visualADJ feedback pass:
	* terrain bug (yellow lines) — fixed: pieces straddling hexes are now impossible; every piece lives inside one hex (engine-enforced + tested)
	* red & blue player panels — rebuilt as physical-style mats: one slot per piece with icons (solid = reserve, dashed = fielded, ✕ = lost)
	* purple campaign journal — resized + design pass; hexes use grid references (A1…E4) drawn faintly on the board and spoken in the journal
	* teal — campaign score card centred in the top bar
* simple animations — deal-in, deploy pop, march glide, attack ring, fallen-unit ghosts, HQ-capture shake
* removed-cards visibility — spent-orders track on BOTH mats (all 16 chips per side gray out as cards leave the game)
* save map system — `game/maps.js` holds board shapes AND the map roster as hand-editable JSON; new 12-map roster on 5 boards (24-hex max: laser-cutter ceiling, 22 controlled hexes at full deployment); Grand/Wide removed
* version control — git repo, remote https://github.com/BillDNA/WoAProto.git, PSD/XCS sources gitignored (public repo)
* hosting — root index.html redirects into game/ for GitHub Pages (single player + hotseat free in the browser; LAN PvP still needs the local server)
* art — prompts for image AIs in `design-docs/art-prompts.md`; results go to `game/art/` and Claude wires them in
* balance tooling — `node game/balance.js` simulates AI-vs-AI battles per map and reports side/mover win rates, HQ vs attrition, card win correlation

## Standing goals

* rapid balance iteration is the point of this prototype — prefer data files + small tools over hardcoding
* keep `game/` zero-dependency plain files (zippable); dev-only tooling lives in `dev/`
* keep `node game/test.js` green and extend it with every rules change
