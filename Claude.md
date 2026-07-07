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

Ten specs built in one autonomous run (July 2, 2026) + five feedback rounds, all closed. Terse log; the full arc lives in `specs/V0-specs/V0-summary.md`, current behaviour in `game/CLAUDE.md` + [[code-overview]], every ruling in git history.

**The ten specs** — terrain rework (trenches = attacker-support denial; directional rivers), combat clarity (hover attack pills, strike arrows, supporter rings from engine truth), 2A layout (mats left, journal-as-book right, VP tug-bar), Balance Dashboard (CLI-identical aggregation), Quartermaster's Ledger deck editor, deletable maps + hex-carved board shapes, parameterized AI personalities as data rows, grading rubrics, claude-plays (`claude -p` transport, honest info only, felt-notes), claude skills (run-tournament / create-card / create-map).

1. **Round 1 — polish + rules nudges.** River parity with forest/mountain, interior terrain placement, no-reposition-while-a-basic-attack-exists rule, Airdrop `noOpener` deck toggle, deck-builder + dashboard whiteboard passes, misc UI QoL; graphify added.
2. **Round 2 — AI transparency + metrics.** [[ai-heuristic-model]] doc, no-skip rule, **Drag** + **Swings** pacing metrics, rule-book versioning starts at **0.2**, 5 deck slots, claude-plays logs + human-instructions, doc reorg + tags, rule book rewritten to match code.
3. **Round 3 — rules refinement.** River: support crosses freely but no deploy-control extension; no same-type swaps (a hidden skip); trench-orientation + search-cost questions raised (answered in V1 specs); first rubric-graded data review; version stamps in logs/reports.
4. **Round 4 — data infrastructure (0.3).** Per-version accumulation (`accumulated.json`), Typicality footer on LLM battles, `content/` reorg (every map + deck a deletable file, one roster for all modes), reports → `logs/reports/{balance,battle,analysis}/<version>/`, Debug state-dump button, generate-reports + review-reports skills, [[graphs-spec]] drafted; river-deploy bug fixed.
5. **Round 5 — specced V1.** The `specs/V1-specs/` thinking docs (data persistence, AI search + tuning, claude-plays sessions, content curation, field-manual animations); Bill answered every open question inline in the specs.

**Baselines to protect** (post-V0, details in V0-summary): first mover ~46%, Red ~52%, tie-goes-to-2nd decides ~26% (biggest open lever), hard>normal 60% / hard>easy 78% skill premium, behaviour band ~4.9 attacks / ~6.5 swaps per battle. Sharp moves in these = regression even if win rates look fine.
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

