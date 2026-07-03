# Graph Report - .  (2026-07-02)

## Corpus Check
- 57 files · ~122,064 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 414 nodes · 824 edges · 25 communities (17 shown, 8 thin omitted)
- Extraction: 92% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 60 edges (avg confidence: 0.82)
- Token cost: 449,660 input · 0 output

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

## God Nodes (most connected - your core abstractions)
1. `applyStep()` - 20 edges
2. `computeAttack()` - 16 edges
3. `evalState()` - 16 edges
4. `renderAll (master render orchestrator)` - 15 edges
5. `newBattle()` - 14 edges
6. `stepOptions()` - 14 edges
7. `aiPlanTurn()` - 14 edges
8. `War of Attrition — player manual (README)` - 13 edges
9. `other()` - 12 edges
10. `fieldScore()` - 12 edges

## Surprising Connections (you probably didn't know these)
- `Unit Rubric (role distinctness, dominated units)` --references--> `UNITS (unit table: inf 1 / cav 2 / art 3 vp)`  [INFERRED]
  specs/V0 Specs/grading-rubrics.md → game/engine.js
- `Hex Clarification Diagram` --references--> `sideKey()`  [INFERRED]
  design-docs/prototype pictures/HexClarificationDiagram.png → game/engine.js
- `Deck validation (16 copies, one starting card, airdrop rule)` --references--> `drawHand()`  [EXTRACTED]
  specs/V0 Specs/deck-editor.md → game/engine.js
- `One-action trench placement` --references--> `trenchOrientations()`  [EXTRACTED]
  specs/V0 Specs/combat-clarity-qol.md → game/engine.js
- `Directional Terrain-on-a-Side Rule` --references--> `computeAttack()`  [INFERRED]
  design-docs/prototype pictures/HexClarificationDiagram.png → game/engine.js

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

## Communities (25 total, 8 thin omitted)

### Community 0 - "Engine Rules & AI Core"
Cohesion: 0.09
Nodes (66): Anti-degeneracy AI guards, Combat clarity QoL (hover attack pills, strike arrows, one-click trenches), Flexible orders house rule (attack/reposition fallback), No-op turn penalty + visible dead turns (Skip%), River terrain (support denial both ways), Trenches (attacker-support denial), advanceStep(), aiConfig() (+58 more)

### Community 1 - "Game UI Render & Turn Loop"
Cohesion: 0.06
Nodes (56): Campaign Journal (turn-grouped bound book), Concession + advisory heuristic (concedeAdvised), Layout V2 (2A + topbar scoreboard), E.CARD_BY_ID (card index), E.CARDS (card deck data), cardsRemaining(), concedeAdvised(), fieldScore() (+48 more)

### Community 2 - "Board Geometry & Map Editor"
Cohesion: 0.07
Nodes (45): Custom board outlines (inline shapeDef), Directional hex-owned terrain (forest/mountain), Map Editor (terrain paint + Board hexes carve), Physical terrain stock + single-hex piece rule, boardHexes(), buildShape(), buildTerrain(), currentShape() (+37 more)

### Community 3 - "Orientation, Docs & Tooling"
Cohesion: 0.10
Nodes (27): Project root CLAUDE.md (orientation index), create-card skill, create-map skill, Grading Rubrics, run-tournament Skill, balance-80 report sample (80 battles/map), matchup-16 skill-vs-luck report sample, loadCustomMaps() (+19 more)

### Community 4 - "Rubrics & Design Specs"
Cohesion: 0.11
Nodes (26): Claude Skills (create-card / create-map / run-tournament), balance.js (CLI balance lab), validateMaps (in-browser editor validation), maps.js data (WOA_BUILTIN cards + AI/personality rows), Personalities as data not code, Claude Skills Spec (run-tournament / create-card / create-map), create-card skill, create-map skill (+18 more)

### Community 5 - "Claude-Plays LLM Harness"
Cohesion: 0.11
Nodes (18): cap(), CARD_KEEP, CHOICE_SCHEMA, DIRN, E, fs, HEURISTIC, llm (+10 more)

### Community 6 - "Combat Rules & Terrain"
Cohesion: 0.12
Nodes (21): attack Step Type, barrage Step Type, reposition Step Type, trench Step Type, Attack Action, Attack +1 (Card), Attacker's Power, Careful Maneuvers (Card) (+13 more)

### Community 7 - "Layout & Combat-Clarity UI"
Cohesion: 0.12
Nodes (20): frontend-design skill, Board FX layer (capturePre / playFX / slide-pop-ghost-ring), playFX / FX layer (slide/pop/ring), renderBoard(), syncJournalOverlay() (journal overlay), viewBoxFor() (hex bounding box), test.js (rules test harness), Combat Clarity + Quality-of-Life Spec (+12 more)

### Community 8 - "Units, Art & Aesthetic"
Cohesion: 0.13
Nodes (20): game/art/ Directory, Art Pipeline (id-based lookup + fallback), Priority 2 Card Illustrations, dev/optimize-art.ps1, Steampunk Napoleonic Field-Journal Style, Priority 1 Unit Emblems, Card Fields (id/name/count/text/starting/steps), game/maps.js (cards + units data) (+12 more)

### Community 9 - "Card/Map Rules & Metrics"
Cohesion: 0.13
Nodes (20): Card Editing Cheat Sheet, game/balance.js (balance report), CARD_KEEP Table (engine.js), Card Report Metrics (Win%/Simple%/Skip%/1stSight%/AvgSeen), House Rule (basic attack/reposition fallback), deploy Step Type, game/test.js (deck legality validator), Card Rubric (+12 more)

### Community 10 - "Balance Simulation & Dashboard"
Cohesion: 0.20
Nodes (18): Balance Dashboard (in-browser balance report), Balance lab CLI (balance.js), balanceAdd(), balanceFP(), balanceMap(), balanceNew(), balanceSeed(), simBattle() (+10 more)

### Community 11 - "LLM Client Transport"
Cohesion: 0.21
Nodes (12): buildPrompt(), errored(), fs, parseEnvelope(), path, resolveBinary(), send(), { spawn, spawnSync } (+4 more)

### Community 12 - "LLM Transport Design"
Cohesion: 0.26
Nodes (12): Claude Plays Spec (LLM player), Felt-notes (free-text post-battle notes), Pick from numbered legal-move list, Luck-vs-skill probe (LLM as non-heuristic reference), Warm session reuse (--resume/--continue, cache not carryover), CLI-Responder LLM Transport Spec (claude -p), BuildPrompt (pure helper: user msg + schema instruction), ClaudeCliLlmClient (subprocess LLM transport) (+4 more)

### Community 13 - "LAN Server"
Cohesion: 0.38
Nodes (3): cleanup(), logRooms(), stamp()

### Community 14 - "UI Smoke Harness"
Cohesion: 0.60
Nodes (3): done(), ok(), tick()

### Community 15 - "Art Prompt Kits"
Cohesion: 0.50
Nodes (4): Art Prompt Kit, Shared Negative Prompt, Priority 3 Table Dressing, Player Card Prompt Kit (Front + Back)

### Community 17 - "Skill-over-Luck Goal"
Cohesion: 0.67
Nodes (3): Game-level Rubric, North Star: Skill over Luck, Skill Premium (matchup luck-o-meter)

## Ambiguous Edges - Review These
- `Grading Rubrics` → `Steampunk Napoleonic Field-Journal Style`  [AMBIGUOUS]
  design-docs/art-prompts.md · relation: semantically_similar_to
- `Three Adjacent Hexes (A/B/C) Sharing a Vertex` → `Forest Side (Green) — +1 Attacking Out Across a Covered Side`  [AMBIGUOUS]
  design-docs/prototype pictures/HexClarificationDiagram.png · relation: conceptually_related_to
- `Three Adjacent Hexes (A/B/C) Sharing a Vertex` → `Mountain Side (Gray) — +1 Defending Across the Side`  [AMBIGUOUS]
  design-docs/prototype pictures/HexClarificationDiagram.png · relation: conceptually_related_to

## Knowledge Gaps
- **77 isolated node(s):** `allow`, `fs`, `path`, `E`, `llm` (+72 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Grading Rubrics` and `Steampunk Napoleonic Field-Journal Style`?**
  _Edge tagged AMBIGUOUS (relation: semantically_similar_to) - confidence is low._
- **What is the exact relationship between `Three Adjacent Hexes (A/B/C) Sharing a Vertex` and `Forest Side (Green) — +1 Attacking Out Across a Covered Side`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **What is the exact relationship between `Three Adjacent Hexes (A/B/C) Sharing a Vertex` and `Mountain Side (Gray) — +1 Defending Across the Side`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Grading Rubrics` connect `Orientation, Docs & Tooling` to `Units, Art & Aesthetic`, `Card/Map Rules & Metrics`?**
  _High betweenness centrality (0.172) - this node is a cross-community bridge._
- **Why does `run-tournament skill` connect `Orientation, Docs & Tooling` to `Claude-Plays LLM Harness`?**
  _High betweenness centrality (0.143) - this node is a cross-community bridge._
- **Why does `Steampunk Napoleonic Field-Journal Style` connect `Units, Art & Aesthetic` to `Orientation, Docs & Tooling`?**
  _High betweenness centrality (0.125) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `computeAttack()` (e.g. with `Directional hex-owned terrain (forest/mountain)` and `Directional Terrain-on-a-Side Rule`) actually correct?**
  _`computeAttack()` has 2 INFERRED edges - model-reasoned connections that need verification._