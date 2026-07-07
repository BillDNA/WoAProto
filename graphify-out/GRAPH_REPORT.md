# Graph Report - WoAProto  (2026-07-04)

## Corpus Check
- 69 files · ~150,750 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 731 nodes · 1130 edges · 77 communities (67 shown, 10 thin omitted)
- Extraction: 94% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.82)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `00fcdfd9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Engine Rules & AI Core|Engine Rules & AI Core]]
- [[_COMMUNITY_Game UI Render & Turn Loop|Game UI Render & Turn Loop]]
- [[_COMMUNITY_Board Geometry & Map Editor|Board Geometry & Map Editor]]
- [[_COMMUNITY_Orientation, Docs & Tooling|Orientation, Docs & Tooling]]
- [[_COMMUNITY_Rubrics & Design Specs|Rubrics & Design Specs]]
- [[_COMMUNITY_Claude-Plays LLM Harness|Claude-Plays LLM Harness]]
- [[_COMMUNITY_Combat Rules & Terrain|Combat Rules & Terrain]]
- [[_COMMUNITY_Layout & Combat-Clarity UI|Layout & Combat-Clarity UI]]
- [[_COMMUNITY_Units, Art & Aesthetic|Units, Art & Aesthetic]]
- [[_COMMUNITY_CardMap Rules & Metrics|Card/Map Rules & Metrics]]
- [[_COMMUNITY_Balance Simulation & Dashboard|Balance Simulation & Dashboard]]
- [[_COMMUNITY_LLM Client Transport|LLM Client Transport]]
- [[_COMMUNITY_LLM Transport Design|LLM Transport Design]]
- [[_COMMUNITY_LAN Server|LAN Server]]
- [[_COMMUNITY_UI Smoke Harness|UI Smoke Harness]]
- [[_COMMUNITY_Art Prompt Kits|Art Prompt Kits]]
- [[_COMMUNITY_Claude Settings & Permissions|Claude Settings & Permissions]]
- [[_COMMUNITY_Skill-over-Luck Goal|Skill-over-Luck Goal]]
- [[_COMMUNITY_Art Optimization Script|Art Optimization Script]]
- [[_COMMUNITY_Campaign Journal UI|Campaign Journal UI]]
- [[_COMMUNITY_Player Mat UI|Player Mat UI]]
- [[_COMMUNITY_Balanced-Start Goal|Balanced-Start Goal]]
- [[_COMMUNITY_Decisive-Games Goal|Decisive-Games Goal]]
- [[_COMMUNITY_Rule Book|Rule Book]]
- [[_COMMUNITY_Root Redirect|Root Redirect]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]

## God Nodes (most connected - your core abstractions)
1. `applyStep()` - 21 edges
2. `computeAttack()` - 16 edges
3. `evalState()` - 16 edges
4. `renderAll (master render orchestrator)` - 15 edges
5. `newBattle()` - 14 edges
6. `stepOptions()` - 14 edges
7. `aiPlanTurn()` - 14 edges
8. `fieldScore()` - 13 edges
9. `other()` - 12 edges
10. `listAttacks()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Hex Clarification Diagram` --references--> `sideKey()`  [INFERRED]
  design-docs/prototype pictures/HexClarificationDiagram.png → game/engine.js
- `Deck validation (16 copies, one starting card, airdrop rule)` --references--> `drawHand()`  [EXTRACTED]
  specs/V0 Specs/deck-editor.md → game/engine.js
- `One-action trench placement` --references--> `trenchOrientations()`  [EXTRACTED]
  specs/V0 Specs/combat-clarity-qol.md → game/engine.js
- `Hover unit -> preview attack scores` --references--> `computeAttack()`  [EXTRACTED]
  specs/V0 Specs/combat-clarity-qol.md → game/engine.js
- `Heuristic-weights axis (evalState temperament knobs)` --references--> `evalState()`  [EXTRACTED]
  specs/V0 Specs/ai-variety.md → game/engine.js

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Combat Resolution Flow** — design_docs_war_of_attrition_rule_book_combat_resolution, design_docs_war_of_attrition_rule_book_attacker_power, design_docs_war_of_attrition_rule_book_defender_power, design_docs_war_of_attrition_rule_book_support, design_docs_war_of_attrition_rule_book_trench, design_docs_war_of_attrition_rule_book_river [EXTRACTED 1.00]
- **Five Design North Stars** — design_docs_grading_rubrics_north_star_skill_over_luck, design_docs_grading_rubrics_north_star_decisive_games, design_docs_grading_rubrics_north_star_no_dead_turns, design_docs_grading_rubrics_north_star_balanced_start, design_docs_grading_rubrics_north_star_tie_rule [EXTRACTED 1.00]
- **Engine Card Step Vocabulary** — design_docs_card_cheatsheet_step_deploy, design_docs_card_cheatsheet_step_trench, design_docs_card_cheatsheet_step_attack, design_docs_card_cheatsheet_step_reposition, design_docs_card_cheatsheet_step_barrage [EXTRACTED 1.00]
- **Luck-vs-skill / skill-curve measurement** — v0_specs_ai_variety, v0_specs_claude_plays, game_balance_matchup, v0_specs_metrics_dashboard [INFERRED 0.75]
- **Thin Claude skills grading against rubrics** — v0_specs_claude_skills_run_tournament, v0_specs_claude_skills_create_card, v0_specs_claude_skills_create_map, v0_specs_grading_rubrics [EXTRACTED 0.85]
- **LLM transport -> player -> tournament stack** — v0_specs_cli_responder_transport, v0_specs_claude_plays, v0_specs_claude_skills_run_tournament [EXTRACTED 0.85]
- **VP Tug-Bar Scoreboard Mechanic** — v0_specs_layout_v2_implementation_vp_tug_bar, v0_specs_layout_v2_implementation_ceiling, game_engine_fieldscore, game_engine_units, game_index_html_rendertop [EXTRACTED 0.90]
- **Hex-Owned Directional-Edge Terrain (trench + river)** — v0_specs_terrain_crossing_rules_directional_edge, v0_specs_terrain_crossing_rules_river, v0_specs_terrain_crossing_rules_trench_support_block, game_engine_sidekey, game_engine_buildterrain [EXTRACTED 0.90]
- **Shared Balance Aggregation Pipeline (CLI + GUI)** — game_engine_balancemap, game_balance_js, game_index_html_runbalanceui, v0_specs_metrics_dashboard_card_report, v0_specs_metrics_dashboard_behaviour_metrics [EXTRACTED 0.85]
- **Shared balance aggregation (CLI + in-browser dashboard)** — game_balance, game_engine_balancenew, game_engine_balanceadd, game_claude_balance_dashboard, game_index_renderdash [EXTRACTED 1.00]
- **V0 terrain-crossing rules (trench/river/forest border blocking)** — game_claude_trenches, game_claude_river_terrain, game_claude_directional_terrain, game_engine_borderblocked [EXTRACTED 1.00]
- **Anti-degeneracy AI guards (no-op penalty + attrition projection + anti-shuffle)** — game_claude_anti_degeneracy_guards, game_claude_noop_penalty, game_engine_evalstate, game_engine_greedyresolve [EXTRACTED 1.00]
- **Board FX pipeline (capturePre -> playFX -> fxStrike)** — game_index_capturepre, game_index_playfx, game_index_fxstrike [EXTRACTED 1.00]
- **renderAll master render fan-out** — game_index_renderall, game_index_renderboard, game_index_rendermat, game_index_rendertop, game_index_renderhand, game_index_renderlog [EXTRACTED 1.00]
- **Dashboard balance aggregation shared with CLI** — game_index_dashrun, game_engine_balancenew, game_engine_balanceadd, game_engine_simbattle [EXTRACTED 0.95]

## Communities (77 total, 10 thin omitted)

### Community 0 - "Engine Rules & AI Core"
Cohesion: 0.06
Nodes (94): Combat clarity QoL (hover attack pills, strike arrows, one-click trenches), Custom board outlines (inline shapeDef), Map Editor (terrain paint + Board hexes carve), No-op turn penalty + visible dead turns (Skip%), Physical terrain stock + single-hex piece rule, advanceStep(), applyStep(), boardHexes() (+86 more)

### Community 1 - "Game UI Render & Turn Loop"
Cohesion: 0.06
Nodes (56): Attrition victory by surviving field units (fieldScore), Campaign Journal (turn-grouped bound book), Concession + advisory heuristic (concedeAdvised), Layout V2 (2A + topbar scoreboard), E.CARD_BY_ID (card index), cardsRemaining(), concedeAdvised(), endByAttrition() (+48 more)

### Community 2 - "Board Geometry & Map Editor"
Cohesion: 0.33
Nodes (5): create-map, Data shape, Gotchas, Read first, Steps

### Community 3 - "Orientation, Docs & Tooling"
Cohesion: 0.20
Nodes (9): Feed back round 4, Feedback round 1, Feedback round 2, Feedback round 3, History — shipped (June 2026), Standing goals, V0 — SHIPPED (July 2026), Vision (post-V0, not speced — YAGNI until V0 lands) (+1 more)

### Community 4 - "Rubrics & Design Specs"
Cohesion: 0.07
Nodes (28): Claude Skills (create-card / create-map / run-tournament), validateMaps (in-browser editor validation), maps.js data (WOA_BUILTIN cards + AI/personality rows), Personalities as data not code, Claude skills: run-tournament / create-card / create-map, create-card, create-map, Gotchas (+20 more)

### Community 5 - "Claude-Plays LLM Harness"
Cohesion: 0.10
Nodes (21): cap(), CARD_KEEP, CHOICE_SCHEMA, DIRN, E, fs, HEURISTIC, llm (+13 more)

### Community 6 - "Combat Rules & Terrain"
Cohesion: 0.09
Nodes (27): Priority 2 Card Illustrations, Steampunk Napoleonic Field-Journal Style, attack Step Type, barrage Step Type, reposition Step Type, trench Step Type, Steampunk Napoleonic Field-Journal Aesthetic, Card Back Prompt (+19 more)

### Community 7 - "Layout & Combat-Clarity UI"
Cohesion: 0.05
Nodes (42): frontend-design skill, Board FX layer (capturePre / playFX / slide-pop-ghost-ring), playFX / FX layer (slide/pop/ring), renderBoard(), syncJournalOverlay() (journal overlay), viewBoxFor() (hex bounding box), test.js (rules test harness), Animate the attack source + supporters (+34 more)

### Community 8 - "Units, Art & Aesthetic"
Cohesion: 0.33
Nodes (6): game/art/ Directory, Art Pipeline (id-based lookup + fallback), dev/optimize-art.ps1, Card fields, game/maps.js (cards + units data), Special ids the engine knows by name

### Community 9 - "Card/Map Rules & Metrics"
Cohesion: 0.40
Nodes (6): deploy Step Type, Airdrop (Card), Conscription (Card), Deploy / Build Action, Deploy Infantry (Starting Card), Turn Order

### Community 10 - "Balance Simulation & Dashboard"
Cohesion: 0.09
Nodes (31): balance.js (CLI balance lab), Balance Dashboard (in-browser balance report), Balance lab CLI (balance.js), balanceAdd(), balanceFP(), balanceMap(), balanceNew(), balanceSeed() (+23 more)

### Community 11 - "LLM Client Transport"
Cohesion: 0.21
Nodes (12): buildPrompt(), errored(), fs, parseEnvelope(), path, resolveBinary(), send(), { spawn, spawnSync } (+4 more)

### Community 12 - "LLM Transport Design"
Cohesion: 0.06
Nodes (44): Parameterized AI + data personalities (brawler/turtle), Anti-degeneracy AI guards, aiConfig(), aiPlanTurn(), clone(), drawHand(), greedyResolve(), newMatch() (+36 more)

### Community 13 - "LAN Server"
Cohesion: 0.24
Nodes (3): cleanup(), logRooms(), stamp()

### Community 14 - "UI Smoke Harness"
Cohesion: 0.47
Nodes (3): done(), ok(), tick()

### Community 15 - "Art Prompt Kits"
Cohesion: 0.50
Nodes (4): Art Prompt Kit, Shared Negative Prompt, Priority 3 Table Dressing, Player Card Prompt Kit (Front + Back)

### Community 17 - "Skill-over-Luck Goal"
Cohesion: 0.36
Nodes (8): balance-80 report sample (80 battles/map), matchup-16 skill-vs-luck report sample, mapReport(), matchup(), pad(), pct(), Card report metrics (Skip% / Simple% / 1stSight% / AvgSeen), Skill premium / luck-o-meter (matchup)

### Community 25 - "Community 25"
Cohesion: 0.13
Nodes (14): Action Definitions / clarifications, Battle Victory Conditions, Box Contents, Building Types, Card Actions, Game setup, Game Victory Conditions, Glossary (+6 more)

### Community 26 - "Community 26"
Cohesion: 0.14
Nodes (14): Art, Boards, maps, units & cards — built for rapid tinkering, Files, Hotseat (two players, one device), House rules (per Bill's prototyping), Play in the browser (GitHub Pages), Play vs the AI (no setup), Rulings made where the rule book was silent (+6 more)

### Community 27 - "Community 27"
Cohesion: 0.31
Nodes (4): run-tournament Skill, War of Attrition — orientation for Claude, Deck Editor (Quartermaster's Ledger), War of Attrition (board game, digital edition)

### Community 28 - "Community 28"
Cohesion: 0.20
Nodes (8): Every weight (the `AI_WEIGHTS` table), How a turn is decided (the heuristic), How to change or add an AI, The AI, in plain English — how it thinks and every knob you can turn, The three dials that aren't weights, The tie-breaker for burning cards (CARD_KEEP), The two shipped personalities (read them as examples), Where the 5 AIs are (the "AI_PRESETS has only 3" question)

### Community 29 - "Community 29"
Cohesion: 0.20
Nodes (9): After the battle: felt-notes, Claude Plays — human instructions, Fail-open behaviour, Gotchas, Running a battle, The logs: `design-docs/game-logs/`, The logs: `logs/reports/battle/`, What it's for (+1 more)

### Community 30 - "Community 30"
Cohesion: 0.22
Nodes (8): 1. Problem this solves, 2. Core requirements, 3. Things that are genuinely optional, 4. Non-goals, 5. Minimal shape of one decision round-trip, 6. Minimal shape of the report record, 7. Practical LLM-transport notes (whatever CLI/SDK you use), Headless-LLM playtest harness — generalized spec

### Community 31 - "Community 31"
Cohesion: 0.29
Nodes (6): Core model (engine.js), Files, Known balance signals (from balance.js — re-measured July 2026 AFTER the V0 terrain-crossing rules: trench = support denial, rivers added; verify before acting; present findings to Bill, he decides rule changes), Source of truth, UI invariants, War of Attrition — orientation for Claude

### Community 32 - "Community 32"
Cohesion: 0.29
Nodes (5): Art Prompt Kit — War of Attrition digital prototype, Priority 1 — unit emblems (the biggest at-a-glance win), Priority 2 — card illustrations (13, one per order), Priority 3 — table dressing, What I'll do with them

### Community 33 - "Community 33"
Cohesion: 0.40
Nodes (4): game-log-report, Read first, Rules, The one-page report (this exact shape)

### Community 34 - "Community 34"
Cohesion: 0.40
Nodes (4): graphify, The Dynamic Image Generation MCP, Tools available to you, Workflow

### Community 35 - "Community 35"
Cohesion: 0.47
Nodes (4): Back Prompt, Front Prompt, **Global Constraints (apply to both fronts and backs)**, **Player Card Prompt Kit (Front \+ Back)**

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (15): Add, Add — all dist-4, side-balanced by construction (rot180-symmetric terrain), and they, Cards — 3 to cut, 3 to add (create-card shape; deck stays 16), Cards — the real card issues (from the card report), Cut, Cut (three distinct rubric failures), Maps — 3 to cut, 3 to add (create-map shape; all validated), Maps — a third of the roster is biased (the main problem) (+7 more)

### Community 38 - "Community 38"
Cohesion: 0.27
Nodes (9): game/balance.js (balance report), CARD_KEEP Table (engine.js), Card Report Metrics (Win%/Simple%/Skip%/1stSight%/AvgSeen), House Rule (basic attack/reposition fallback), game/test.js (deck legality validator), Card rubric, create-card Skill, North Star: No Dead Turns (+1 more)

### Community 39 - "Community 39"
Cohesion: 0.33
Nodes (9): Priority 1 Unit Emblems, North Star: Tie-rule not deciding too much, Unit rubric, Artillery Unit, Attrition Victory, Cavalry Unit, Headquarters, Headquarters Capture Victory (+1 more)

### Community 40 - "Community 40"
Cohesion: 0.29
Nodes (6): blue (haiku), Campaign journal, Decisions, Felt-notes, red (haiku), War of Attrition — "Black Forest" (seed 1234)

### Community 41 - "Community 41"
Cohesion: 0.29
Nodes (6): blue (haiku), Campaign journal, Decisions, Felt-notes, red (haiku), War of Attrition — "Black Forest" (seed 5678)

### Community 42 - "Community 42"
Cohesion: 0.29
Nodes (6): blue (haiku), Campaign journal, Decisions, Felt-notes, red (haiku), War of Attrition — "The Ford" (seed 1234)

### Community 43 - "Community 43"
Cohesion: 0.29
Nodes (6): blue (haiku), Campaign journal, Decisions, Felt-notes, red (haiku), War of Attrition — "The Ford" (seed 5678)

### Community 44 - "Community 44"
Cohesion: 0.29
Nodes (6): Game-level rubric, Grading rubrics — north stars + what to measure, How to run the numbers, North Star: Skill over Luck, North stars (what "good" means for this game), Skill Premium (matchup luck-o-meter)

### Community 45 - "Community 45"
Cohesion: 0.29
Nodes (6): Candidate views (one per "perspective"), Graphs / data visualization — first impressions & questions, How/where to display — the real constraint, Questions for Bill, The motivation: what tables hide, What data we already have (the corpus)

### Community 46 - "Community 46"
Cohesion: 0.33
Nodes (6): Directional hex-owned terrain (forest/mountain), Flexible orders house rule (attack/reposition fallback), River terrain (support denial both ways), Through-HQ move/swap/attack rule, Tie-goes-to-second-mover attrition rule, Trenches (attacker-support denial)

### Community 47 - "Community 47"
Cohesion: 0.18
Nodes (10): `attack` — order one attack, `barrage` — destroy a terrain feature, Card editing cheat sheet, `deploy` — place a unit from reserve, `reposition` — move or swap one unit, Step types and their options, Things to remember when tinkering, `trench` — dig a trench (+2 more)

### Community 48 - "Community 48"
Cohesion: 0.54
Nodes (7): accFilePath(), addAgg(), balanceScore(), f1(), pct(), readAcc(), run()

### Community 49 - "Community 49"
Cohesion: 0.33
Nodes (5): Read first, review-reports, Rules, Scope (settle first, ask only if genuinely unclear), The analysis (this shape) → save to `logs/reports/analysis/`

### Community 50 - "Community 50"
Cohesion: 0.40
Nodes (4): Balance report — 60 battles/map, hard AI both sides, Card report, Maps, Overall (n=660 battles)

### Community 51 - "Community 51"
Cohesion: 0.40
Nodes (4): Balance report — 60 battles/map, hard AI both sides, Card report, Maps, Overall (n=1020 battles)

### Community 52 - "Community 52"
Cohesion: 0.50
Nodes (3): generate-reports, Notes, Steps

### Community 53 - "Community 53"
Cohesion: 0.33
Nodes (5): create-card, Gotchas, Read first, Shape of a proposal (the deck-editor data shape, verbatim), Steps

### Community 54 - "Community 54"
Cohesion: 0.40
Nodes (4): Gotchas, Inputs to settle first (ask only if genuinely unclear), run-tournament, Steps

### Community 55 - "Community 55"
Cohesion: 0.40
Nodes (4): Change 1 — trenches block attacker support (not flat defense), Change 2 — river (control doesn't count across it), Grounding (both changes), Terrain crossing rules: trench support-block + river

### Community 57 - "Community 57"
Cohesion: 0.50
Nodes (4): create-map Skill, Map rubric, Game Victory (3 Map Cards), Map Cards

## Ambiguous Edges - Review These
- `grading-rubrics.md` → `Steampunk Napoleonic Field-Journal Style`  [AMBIGUOUS]
  design-docs/art-prompts.md · relation: semantically_similar_to
- `Three Adjacent Hexes (A/B/C) Sharing a Vertex` → `Forest Side (Green) — +1 Attacking Out Across a Covered Side`  [AMBIGUOUS]
  design-docs/prototype pictures/HexClarificationDiagram.png · relation: conceptually_related_to
- `Three Adjacent Hexes (A/B/C) Sharing a Vertex` → `Mountain Side (Gray) — +1 Defending Across the Side`  [AMBIGUOUS]
  design-docs/prototype pictures/HexClarificationDiagram.png · relation: conceptually_related_to

## Knowledge Gaps
- **264 isolated node(s):** `PreToolUse`, `allow`, `fs`, `path`, `E` (+259 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **10 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `grading-rubrics.md` and `Steampunk Napoleonic Field-Journal Style`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Three Adjacent Hexes (A/B/C) Sharing a Vertex` and `Forest Side (Green) — +1 Attacking Out Across a Covered Side`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Three Adjacent Hexes (A/B/C) Sharing a Vertex` and `Mountain Side (Gray) — +1 Defending Across the Side`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `War of Attrition — orientation for Claude` connect `Community 27` to `Engine Rules & AI Core`, `Orientation, Docs & Tooling`, `LAN Server`, `Community 46`, `Skill-over-Luck Goal`, `Community 56`?**
  _High betweenness centrality (0.057) - this node is a cross-community bridge._
- **Why does `run-tournament` connect `Rubrics & Design Specs` to `Skill-over-Luck Goal`, `Balance Simulation & Dashboard`, `LLM Transport Design`?**
  _High betweenness centrality (0.055) - this node is a cross-community bridge._
- **Why does `Grading rubrics — north stars + what to measure` connect `Community 44` to `Community 57`, `Community 27`, `Community 38`, `Community 39`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `computeAttack()` (e.g. with `Directional hex-owned terrain (forest/mountain)` and `Directional Terrain-on-a-Side Rule`) actually correct?**
  _`computeAttack()` has 2 INFERRED edges - model-reasoned connections that need verification._