we are taking a board game prototype and turning it into a playable prototype in the web browser, the goal of this project is to have something that allows me to playtest and rapidly iterate on balance in the game.

Start in `game/CLAUDE.md` — it is the orientation file for this project and stays current. `game/README.md` is the player-facing manual.

## History — shipped (June 2026)

Six feedback rounds, all closed. Terse log; current state and every ruling live in `game/CLAUDE.md`, `game/README.md`, and git history.

1. **Visual + infra base** — physical-style player mats, campaign journal with grid refs (A1…E4), centred scorecard, board FX/animations, spent-orders track; `maps.js` map-save system (12 maps / 5 boards, 24-hex ceiling); git + GitHub Pages hosting; art-by-card-id pipeline; `balance.js` AI-vs-AI lab.
2. **Rules + lab** — multiple trenches per hex allowed; LAN room codes persist; `balance.js [n] [diff] [map]` + in-game Balance buttons; Field Marshal (hard) AI searching one reply deep on sampled hands; `balance.js matchup` luck-o-meter.
3. **Art + card metrics** — art wired by card id with text fallback; editor splits terrain runs into physical 2s/3s; card report gains Simple% / 1stSight% / AvgSeen.
4. **Responsive** — small-screen menu (shrink, don't scroll), width-clamped title, `1fr auto 1fr` topbar that stacks, journal overlay.
5. **Legibility + concede** — no-op turns logged + Skip% column; Naval Barrage reaches the whole board; three-column battle layout (journal to window bottom); Concede button + advisory heuristic.
6. **Anti-degeneracy** — hard turn-1 dead turns 9%→0; attrition scored by **surviving units on the board**; eval projects the deck-out attrition winner (kills the swap-dance stalemate); Behaviour/Decisiveness metrics in `balance.js`.

## V0 roadmap → `specs/`

Each bullet is a self-contained spec a future session can pick up and build. Grouped, not ordered; cross-linked with `[[wikilinks]]`.

**Tooling / app**
- [[metrics-dashboard]] — GUI to run and read the balance metrics that are terminal-only in `balance.js` today.
- [[deck-editor]] — in-browser deck construction, modeled on the map editor.
- [[map-roster-and-shapes]] — let base maps be deleted (floor of 5 so a first-to-3 match always fits) and edit board shapes hex-by-hex (add/remove under the 24-hex ceiling).
- [[claude-plays]] — an LLM player wired through [[cli-responder-transport]]; model/effort knobs, short rules + state as the whole prompt, picks from a legal-move list, gives "how it felt" notes.
- [[claude-skills]] — run-tournament, create-card, create-map skills (build on [[claude-plays]] and [[grading-rubrics]]).
- [[grading-rubrics]] — north-star goals + graded rubrics for cards, maps, units, and the game, tied to `balance.js` numbers.
- [[ai-variety]] — more, more-varied heuristic AIs as data, along two axes: search space (depth × breadth) and heuristic weights.

**Rules / game**
- [[terrain-crossing-rules]] — trenches block attacker support from crossing (instead of flat +1 def); new river edge that blocks control counting across it. (Both need a one-sentence ruling from Bill before coding.)
- [[combat-clarity-qol]] — one-action trench placement, hover unit attack-score preview, attack-source animation (esp. through-HQ).
- [[layout-design-pass]] — `frontend-design` handoff: board wastes width on tall maps, campaign journal is exiled to a thin rail. Ready to hand off.  This has been processed int [[layout-v2-implementation]] and is now ready for implementation.

Already speced: [[cli-responder-transport]] — the `claude -p` transport [[claude-plays]] sits on.

### The Dynamic Image Generation MCP

you have access to a local MCP server called dig-mcp is available — it generates images through a locally-running ComfyUI instance. Tools: generate_images, generate_set, list_checkpoints. Call list_checkpoints first to see installed models; omit checkpoint to use the first available. Requires ComfyUI to be running locally and uv installed.

I will note that is works great for the hero shots like card art. but i haven't really fine tuned it yet for UI elements.  It functions for UI elements like icons but might not be the cleanest results (which is ok if you think an icon is needed in places this can at lest give us a starting point that i can punch up manually) 

## Vision (post-V0, not speced — YAGNI until V0 lands)

- **Roguelite deck-builder**: a card pool larger than the 20-card deck plus a deck-building loop between battles.
- **Side asymmetry**: different decks per side, and Commander abilities that bend the rules (e.g. guaranteed Conscription in the opening hand). Expect bigger balance swings — which is why the rubrics + metrics tooling above come first.

## Standing goals

* rapid balance iteration is the point of this prototype — prefer data files + small tools over hardcoding
* keep `game/` zero-dependency plain files (zippable); dev-only tooling lives in `dev/`
	* we can talk about if some feature in v0 might break this goal which might be fine
* keep `node game/test.js` green and extend it with every rules change
