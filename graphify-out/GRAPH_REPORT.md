# Graph Report - .  (2026-09-02)

## Corpus Check
- 180 files · ~228,542 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 952 nodes · 1417 edges · 126 communities (91 shown, 35 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 118 edges (avg confidence: 0.71)
- Token cost: 262,851 input · 0 output

## Community Hubs (Navigation)
- AI Config & Balance Runs
- Server Integration Tests
- Game Content Skills
- Balance Lab & Reporting
- LLM Client
- Claude-Plays Harness
- Balance Report CLI
- Board Rendering Primitives
- Skirmish Engine Core
- Skirmish UI Screen
- AI Weight Tuner
- Boot & Manual Setup
- Chart Primitives
- Rules & Combat Resolution
- Deck Editor
- Maps Library Screen
- Content API Tests
- AI Turn Planner
- Skirmish Database
- Database Tests
- Map Editor
- Local Server
- Engine Core & Points
- App Shell UI
- Boot Tests
- Claude-Plays Tests
- UI Doc-Sync Tests
- Board FX Animations
- Simulation & Balance Fold
- Units Pane UI
- Parallel Balance Tests
- Manifest Gen & Map Tests
- JS Config
- Card Rules Tests
- Terrain Tests
- Engine Surface & Seams
- AI Tests
- Board Screen Rendering
- Context Doc Checker
- Context Checker Tests
- Prose Doc Checker
- Prose Checker Tests
- Hex Adjacency Diagram
- Geometry Tests
- PR Check Script
- DB Query Tool
- Integration Tests
- Art Optimization Script
- Doc Style Guide
- Package Config
- Worktree Prune Script
- Issue Tracker Conventions
- Airdrop Card
- Attack +1 Card
- Board Background Art
- Careful Maneuvers Card
- Conscription Card
- Creeping Barrage Card
- Deploy Artillery Card
- Deploy Cavalry Card
- Deploy Infantry Card
- Entrench Card
- Forced March Card
- Mass Assault Card
- Naval Barrage Card
- Ordered Withdraw Card
- Over the Top Card
- Reckless Maneuvers Card
- Sappers Card
- Shock Troops Card
- Storm and Hold Card
- Table Background Art
- Title Banner Art
- Vanguard Card
- First Mover Concept
- HQ Concept
- Skirmish Fact
- Balance-80 Sweep Output
- Matchup-16 Report
- ADR: Parked Ideas
- Domain Docs Guide
- Root Redirect Page

## God Nodes (most connected - your core abstractions)
1. `svgEl()` - 19 edges
2. `War of Attrition Rule Book (v1.1)` - 15 edges
3. `renderAll()` - 13 edges
4. `Engine model (rules kernel)` - 13 edges
5. `hexXY()` - 11 edges
6. `Report model (reporting subsystem)` - 11 edges
7. `R` - 10 edges
8. `applyStep()` - 10 edges
9. `bpEdgePts()` - 10 edges
10. `showSkirmishOver()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `mapReport()` --indirect_call--> `act()`  [INFERRED]
  dev/balance.js → game/ui/skirmish.js
- `reportMarkdown()` --indirect_call--> `done()`  [INFERRED]
  game/report-model.js → dev/smoke.js
- `dashReportMarkdown()` --indirect_call--> `done()`  [INFERRED]
  game/ui/dashboard.js → dev/smoke.js
- `generate-reports skill` --conceptually_related_to--> `Balance loop (concept)`  [INFERRED]
  .claude/skills/generate-reports/SKILL.md → CONTEXT.md
- `ADR-0003: adopt node:test as the one test harness` --conceptually_related_to--> `WarOfAttrition project doctrine (CLAUDE.md)`  [INFERRED]
  docs/adr/0003-node-test-harness.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Balance-iteration loop skills (gather → generate → grade)** — _claude_skills_balance_loop_skill_balance_loop, _claude_skills_generate_reports_skill_generate_reports, _claude_skills_review_reports_skill_review_reports, _claude_skills_create_card_skill_create_card, _claude_skills_create_map_skill_create_map [EXTRACTED 1.00]
- **Army-points descriptive-yardstick fairness system** — context_army_points, context_points_cap, context_mispricing_residual, context_timing_blind_spot, docs_adr_0002_army_points_descriptive_yardstick_adr [EXTRACTED 1.00]
- **Runnable balance-grading math (bands, best-map score, baselines)** — docs_balance_readme_targets, docs_balance_best_map_score_sot, docs_balance_balance_baselines_anchors [EXTRACTED 1.00]
- **War of Attrition content rubrics (findings-not-score)** — docs_rubrics_card_rubric_card_rubric, docs_rubrics_map_rubric_map_rubric, docs_rubrics_personality_rubric_personality_rubric, docs_rubrics_ui_rubric_ui_rubric, docs_rubrics_unit_rubric_unit_rubric [INFERRED 0.85]
- **docs/reference how-the-code-works set** — docs_reference_engine_model_engine_model, docs_reference_report_model_report_model, docs_reference_ai_heuristic_model_ai_heuristic_model, docs_reference_card_cheatsheet_card_cheatsheet, docs_reference_ui_invariants_ui_invariants, docs_reference_context_ui_components_ui_components, docs_reference_testing_seams_testing_seams, docs_reference_workflow_workflow [INFERRED 0.80]
- **Balance measurement pipeline (sweep to graded report)** — docs_human_instructions_standard_runs_runbook_standard_runs, docs_reference_report_model_report_model, game_readme_balance_lab, logs_readme_playtest_data [INFERRED 0.75]

## Communities (126 total, 35 thin omitted)

### Community 0 - "AI Config & Balance Runs"
Cohesion: 0.05
Nodes (55): Apples-to-apples determinism, Standard runs runbook, AI heuristic model, AI_PRESETS (easy/normal/hard), AI_WEIGHTS, Anti-degeneracy guards (noopPenalty/antiShuffle/attrWin), CARD_KEEP burn priority, evalState board scoring (+47 more)

### Community 1 - "Server Integration Tests"
Cohesion: 0.06
Nodes (42): assert, E, fs, http, os, path, R, server (+34 more)

### Community 2 - "Game Content Skills"
Cohesion: 0.06
Nodes (52): balance-loop skill, create-card skill, create-map skill, generate-reports skill, review-reports skill, review-with-rubric skill, run-tournament skill, WarOfAttrition project doctrine (CLAUDE.md) (+44 more)

### Community 3 - "Balance Lab & Reporting"
Cohesion: 0.09
Nodes (37): mapReport(), matchup(), pad(), actionOctileLanes(), actionTotal(), balanceScore(), cardAggFromEnvelopes(), cardFleetFireTimes() (+29 more)

### Community 4 - "LLM Client"
Cohesion: 0.08
Nodes (30): buildPrompt(), errored(), fs, parseEnvelope(), path, resolveBinary(), send(), { spawn, spawnSync } (+22 more)

### Community 5 - "Claude-Plays Harness"
Cohesion: 0.07
Nodes (29): ARGS, cap(), CHOICE_SCHEMA, DIRN, E, feltNotes(), fs, HEURISTIC (+21 more)

### Community 6 - "Balance Report CLI"
Cohesion: 0.10
Nodes (27): accFilePath(), readAcc(), run(), done(), realSetTimeout(), tick(), ADR-0001, dashFillRunSelect() (+19 more)

### Community 7 - "Board Rendering Primitives"
Cohesion: 0.16
Nodes (31): bpAttackLayer(), bpAttackPill(), bpBarrageForestEdge(), bpBarrageTrench(), bpBeginBoard(), bpCoordLabel(), bpEdgeHitLine(), bpEdgePts() (+23 more)

### Community 8 - "Skirmish Engine Core"
Cohesion: 0.15
Nodes (27): advanceStep(), applyStep(), buildDeck(), cardsRemaining(), concede(), concedeAdvised(), copyReserves(), currentStep() (+19 more)

### Community 9 - "Skirmish UI Screen"
Cohesion: 0.17
Nodes (25): act(), afterChange(), canReset(), cardAbbr(), checkResume(), clearIfBattleOver(), clearSave(), confirmAttack() (+17 more)

### Community 10 - "AI Weight Tuner"
Cohesion: 0.15
Nodes (22): guardrails(), measure(), parseArgs(), pickMaps(), run(), boardHexes(), buildShape(), buildTerrain() (+14 more)

### Community 11 - "Boot & Manual Setup"
Cohesion: 0.13
Nodes (18): finish(), step(), manualKey(), manualStep(), manualTabClick(), mpAftermathWords(), mpDrawFrame(), mpDrawHQ() (+10 more)

### Community 12 - "Chart Primitives"
Cohesion: 0.16
Nodes (12): chCdf(), chEsc(), chHatchDefs(), chLine(), chPolyline(), chSettleSvg(), chSvgOpen(), chText() (+4 more)

### Community 13 - "Rules & Combat Resolution"
Cohesion: 0.27
Nodes (16): borderBlocked(), computeAttack(), controlledHexes(), deployTargets(), edgeFreeForTrench(), isEmpty(), isHQ(), listAttacks() (+8 more)

### Community 14 - "Deck Editor"
Cohesion: 0.25
Nodes (16): deckProblems(), deckToShip(), dkEsc(), dkStatus(), flushSlot(), loadDecks(), loadSlotIntoEditor(), openDeck() (+8 more)

### Community 15 - "Maps Library Screen"
Cohesion: 0.26
Nodes (14): allMaps(), deleteMapById(), libraryRemove(), msCurrent(), msNewSet(), msSave(), msSetActive(), msSets() (+6 more)

### Community 16 - "Content API Tests"
Cohesion: 0.12
Nodes (13): assert, customDeckBackup, customDeckPath, fs, GAME, http, os, path (+5 more)

### Community 17 - "AI Turn Planner"
Cohesion: 0.33
Nodes (14): aiConfig(), aiPlanTurn(), cloneForSim(), enumerateChoices(), enumerateWithOptions(), evalState(), greedyResolve(), prescoreChoice() (+6 more)

### Community 18 - "Skirmish Database"
Cohesion: 0.25
Nodes (9): ensureColumn(), insertRun(), insertSkirmish(), migrateBattleNames(), nz(), open(), pinBaseline(), setBaseline() (+1 more)

### Community 19 - "Database Tests"
Cohesion: 0.14
Nodes (11): assert, cp, db, dbFile, E, fs, os, path (+3 more)

### Community 20 - "Map Editor"
Cohesion: 0.29
Nodes (11): edBuildDef(), edHexPairs(), edHexSet(), edInternalSides(), edLiveShape(), edRemoveHex(), groupEdgesToPieces(), openEditor() (+3 more)

### Community 21 - "Local Server"
Cohesion: 0.23
Nodes (8): cleanup(), handler(), json(), listen(), logRooms(), readBody(), saveUnderRepo(), stamp()

### Community 22 - "Engine Core & Points"
Cohesion: 0.24
Nodes (9): activeMaps(), activeMapset(), cardPoints(), deckPoints(), deckRegistry(), resolveDeck(), rnd(), shuffle() (+1 more)

### Community 24 - "Boot Tests"
Cohesion: 0.24
Nodes (10): assert, bootHtml(), fs, GAME, { JSDOM }, makeDom(), path, read() (+2 more)

### Community 25 - "Claude-Plays Tests"
Cohesion: 0.18
Nodes (9): assert, cp, E, match, path, SENTINEL, st, surfaces (+1 more)

### Community 26 - "UI Doc-Sync Tests"
Cohesion: 0.18
Nodes (8): assert, fs, path, SPINE_DOC, SVG_LITERAL, SVG_TAGS, { test }, UI_DIR

### Community 27 - "Board FX Animations"
Cohesion: 0.35
Nodes (9): fxPieceHex(), fxStrike(), ghostUnit(), playFX(), popUnit(), ringAt(), shakeBoard(), slideUnit() (+1 more)

### Community 28 - "Simulation & Balance Fold"
Cohesion: 0.36
Nodes (8): balanceAdd(), balanceFP(), balanceMap(), balanceNew(), balanceSeed(), foldFacts(), simSkirmish(), skirmishFacts()

### Community 29 - "Units Pane UI"
Cohesion: 0.40
Nodes (9): chartUnitsRoleMap(), renderUnits(), unBreakthroughSection(), unColor(), unExchangeSection(), unLifespanRow(), unLifespanSection(), unRenderBody() (+1 more)

### Community 30 - "Parallel Balance Tests"
Cohesion: 0.22
Nodes (8): assert, cp, db, fs, os, path, ROOT, { test }

### Community 31 - "Manifest Gen & Map Tests"
Cohesion: 0.25
Nodes (6): buildManifest(), regen(), assert, { E }, ADR-0003, { test }

### Community 32 - "JS Config"
Cohesion: 0.22
Nodes (8): compilerOptions, allowJs, checkJs, module, moduleResolution, target, exclude, **/node_modules

### Community 33 - "Card Rules Tests"
Cohesion: 0.22
Nodes (4): assert, { E, SIM, testSkirmish, fixtureCard }, ADR-0003, { test }

### Community 34 - "Terrain Tests"
Cohesion: 0.25
Nodes (6): testSkirmish(), assert, { E, testSkirmish, fixtureCard }, fresh(), ADR-0003, { test }

### Community 35 - "Engine Surface & Seams"
Cohesion: 0.25
Nodes (5): fixtureCard(), ADR-0003, assert, { E }, { test }

### Community 36 - "AI Tests"
Cohesion: 0.25
Nodes (4): assert, { E, SIM, testSkirmish }, ADR-0003, { test }

### Community 37 - "Board Screen Rendering"
Cohesion: 0.67
Nodes (6): attackPreviewsFor(), hideAttackHints(), hl(), renderBoard(), renderHighlights(), showAttackHints()

### Community 38 - "Context Doc Checker"
Cohesion: 0.60
Nodes (5): checkHomes(), main(), parseTerms(), scanAliases(), walk()

### Community 40 - "Context Checker Tests"
Cohesion: 0.40
Nodes (4): assert, path, { spawnSync }, { test }

### Community 41 - "Prose Doc Checker"
Cohesion: 0.70
Nodes (4): lineHits(), main(), scan(), walk()

### Community 42 - "Prose Checker Tests"
Cohesion: 0.40
Nodes (4): assert, path, { spawnSync }, { test }

### Community 44 - "Hex Adjacency Diagram"
Cohesion: 0.70
Nodes (5): Hex A (top hex), Hex adjacency / shared-edge clarification, Hex adjacency clarification diagram (hexes A, B, C sharing edges), Hex B (lower-left hex), Hex C (lower-right hex)

### Community 45 - "Geometry Tests"
Cohesion: 0.40
Nodes (4): assert, { E, SIM }, ADR-0003, { test }

### Community 47 - "PR Check Script"
Cohesion: 0.50
Nodes (3): fs, os, path

### Community 48 - "DB Query Tool"
Cohesion: 0.83
Nodes (3): fmt(), printTable(), run()

### Community 49 - "Integration Tests"
Cohesion: 0.50
Nodes (3): assert, { E, testSkirmish }, { test }

### Community 51 - "Doc Style Guide"
Cohesion: 0.67
Nodes (3): Comment & doc style guide, No war stories rule, Progressive disclosure in docs

## Knowledge Gaps
- **231 isolated node(s):** `fs`, `os`, `path`, `{ test }`, `assert` (+226 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `done()` connect `Balance Report CLI` to `AI Weight Tuner`, `Balance Lab & Reporting`?**
  _High betweenness centrality (0.031) - this node is a cross-community bridge._
- **Why does `row()` connect `Server Integration Tests` to `Deck Editor`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Why does `mapReport()` connect `Balance Lab & Reporting` to `Server Integration Tests`, `Balance Report CLI`, `Skirmish UI Screen`?**
  _High betweenness centrality (0.020) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Engine model (rules kernel)` (e.g. with `Anti-degeneracy guards (noopPenalty/antiShuffle/attrWin)` and `Unit rubric`) actually correct?**
  _`Engine model (rules kernel)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `os`, `path` to the rest of the system?**
  _231 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `AI Config & Balance Runs` be split into smaller, more focused modules?**
  _Cohesion score 0.050505050505050504 - nodes in this community are weakly interconnected._
- **Should `Server Integration Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.057329462989840346 - nodes in this community are weakly interconnected._