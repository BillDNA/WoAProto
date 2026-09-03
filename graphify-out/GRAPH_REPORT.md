# Graph Report - game-config-250  (2026-09-02)

## Corpus Check
- 180 files · ~233,425 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1014 nodes · 1487 edges · 153 communities (118 shown, 35 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 121 edges (avg confidence: 0.7)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `ed2510b9`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Engine model (rules kernel)
- chart-model.js
- War of Attrition Rule Book (v1.1)
- report-model.js
- llm-session.test.js
- claude-plays.js
- dashboard.js
- board-primitives.js
- 04-skirmish.js
- skirmish.js
- 02-board.js
- manual.js
- chart-primitives.js
- 03-rules.js
- battalion-editor.js
- maps-screen.js
- content-api.test.js
- 05-ai.js
- db.js
- db.test.js
- map-editor.js
- server.js
- 01-core.js
- app.js
- boot.test.js
- claude-plays.test.js
- test.ui.js
- fx.js
- sim.js
- pane-units.js
- balance-parallel.test.js
- test.maps.js
- compilerOptions
- test.cards.js
- test.terrain.js
- test.helpers.js
- test.ai.js
- board.js
- check-context.js
- check-context.test.js
- check-prose.js
- check-prose.test.js
- Hex adjacency clarification diagram (hexes A, B, C sharing edges)
- test.geometry.js
- pr-check.js
- db-query.js
- test.integration.js
- optimize-art.ps1
- Comment & doc style guide
- scripts
- prune-worktrees.sh
- GitHub issue tracker conventions
- Airdrop card
- Attack +1 card
- Board background art: aged, stained parchment texture with a thin double-line border
- Careful Maneuvers (card)
- Conscription (card)
- Creeping Barrage (card)
- Deploy Artillery (card)
- Deploy Cavalry (card)
- Deploy Infantry (card)
- Entrench / Deploy Infantry to trench (card)
- Forced March (card)
- Mass Assault (card concept)
- Naval Barrage (card concept)
- Ordered Withdraw (card concept)
- Over the Top (card concept)
- Reckless Maneuvers (game card)
- Sappers (game card)
- Shock Troops (game card)
- Storm and Hold (game card)
- Game table / play surface background
- Game title banner
- Vanguard card
- First mover
- HQ (Headquarters)
- Skirmish fact
- balance-80 normal-AI sweep output
- matchup-16 skill-premium report
- ADR-0001: parked ideas as idea-labeled GitHub issues
- Domain docs consumption guide
- screens.js
- pane-maps.js
- build-battalion.js
- check-deck-scope.test.js
- Root index.html redirect
- 00-config.js

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

## Communities (153 total, 35 thin omitted)

### Community 0 - "Engine model (rules kernel)"
Cohesion: 0.05
Nodes (55): Apples-to-apples determinism, Standard runs runbook, AI heuristic model, AI_PRESETS (easy/normal/hard), AI_WEIGHTS, Anti-degeneracy guards (noopPenalty/antiShuffle/attrWin), CARD_KEEP burn priority, evalState board scoring (+47 more)

### Community 1 - "chart-model.js"
Cohesion: 0.09
Nodes (23): accFilePath(), readAcc(), run(), assert, E, fs, http, os (+15 more)

### Community 2 - "War of Attrition Rule Book (v1.1)"
Cohesion: 0.06
Nodes (52): balance-loop skill, create-card skill, create-map skill, generate-reports skill, review-reports skill, review-with-rubric skill, run-tournament skill, WarOfAttrition project doctrine (CLAUDE.md) (+44 more)

### Community 3 - "report-model.js"
Cohesion: 0.09
Nodes (37): mapReport(), matchup(), pad(), actionOctileLanes(), actionTotal(), balanceScore(), cardAggFromEnvelopes(), cardFleetFireTimes() (+29 more)

### Community 4 - "llm-session.test.js"
Cohesion: 0.08
Nodes (30): buildPrompt(), errored(), fs, parseEnvelope(), path, resolveBinary(), send(), { spawn, spawnSync } (+22 more)

### Community 5 - "claude-plays.js"
Cohesion: 0.07
Nodes (29): ARGS, cap(), CHOICE_SCHEMA, DIRN, E, feltNotes(), fs, HEURISTIC (+21 more)

### Community 6 - "dashboard.js"
Cohesion: 0.11
Nodes (24): done(), realSetTimeout(), tick(), ADR-0001, dashFillRunSelect(), dashLoadRuns(), dashPickDefaultRuns(), dashReportMarkdown() (+16 more)

### Community 7 - "board-primitives.js"
Cohesion: 0.16
Nodes (31): bpAttackLayer(), bpAttackPill(), bpBarrageForestEdge(), bpBarrageTrench(), bpBeginBoard(), bpCoordLabel(), bpEdgeHitLine(), bpEdgePts() (+23 more)

### Community 8 - "04-skirmish.js"
Cohesion: 0.15
Nodes (27): advanceStep(), applyStep(), buildDeck(), cardsRemaining(), concede(), concedeAdvised(), copyReserves(), currentStep() (+19 more)

### Community 9 - "skirmish.js"
Cohesion: 0.17
Nodes (25): act(), afterChange(), canReset(), cardAbbr(), checkResume(), clearIfBattleOver(), clearSave(), confirmAttack() (+17 more)

### Community 10 - "02-board.js"
Cohesion: 0.15
Nodes (22): guardrails(), measure(), parseArgs(), pickMaps(), run(), boardHexes(), buildShape(), buildTerrain() (+14 more)

### Community 11 - "manual.js"
Cohesion: 0.17
Nodes (16): manualKey(), manualStep(), manualTabClick(), mpAftermathWords(), mpDrawFrame(), mpDrawHQ(), mpDrawStrike(), mpDrawUnit() (+8 more)

### Community 12 - "chart-primitives.js"
Cohesion: 0.16
Nodes (12): chCdf(), chEsc(), chHatchDefs(), chLine(), chPolyline(), chSettleSvg(), chSvgOpen(), chText() (+4 more)

### Community 13 - "03-rules.js"
Cohesion: 0.27
Nodes (16): borderBlocked(), computeAttack(), controlledHexes(), deployTargets(), edgeFreeForTrench(), isEmpty(), isHQ(), listAttacks() (+8 more)

### Community 14 - "battalion-editor.js"
Cohesion: 0.22
Nodes (20): addPoolCard(), battalionProblems(), battalionToShip(), dkEsc(), dkPool(), dkPts(), dkStatus(), flushSlot() (+12 more)

### Community 15 - "maps-screen.js"
Cohesion: 0.26
Nodes (14): allMaps(), deleteMapById(), libraryRemove(), msCurrent(), msNewSet(), msSave(), msSetActive(), msSets() (+6 more)

### Community 16 - "content-api.test.js"
Cohesion: 0.12
Nodes (13): assert, customBattalionBackup, customBattalionPath, fs, GAME, http, os, path (+5 more)

### Community 17 - "05-ai.js"
Cohesion: 0.33
Nodes (14): aiConfig(), aiPlanTurn(), cloneForSim(), enumerateChoices(), enumerateWithOptions(), evalState(), greedyResolve(), prescoreChoice() (+6 more)

### Community 18 - "db.js"
Cohesion: 0.25
Nodes (9): ensureColumn(), insertRun(), insertSkirmish(), migrateBattleNames(), nz(), open(), pinBaseline(), setBaseline() (+1 more)

### Community 19 - "db.test.js"
Cohesion: 0.14
Nodes (11): assert, cp, db, dbFile, E, fs, os, path (+3 more)

### Community 20 - "map-editor.js"
Cohesion: 0.29
Nodes (11): edBuildDef(), edHexPairs(), edHexSet(), edInternalSides(), edLiveShape(), edRemoveHex(), groupEdgesToPieces(), openEditor() (+3 more)

### Community 21 - "server.js"
Cohesion: 0.23
Nodes (8): cleanup(), handler(), json(), listen(), logRooms(), readBody(), saveUnderRepo(), stamp()

### Community 22 - "01-core.js"
Cohesion: 0.22
Nodes (12): activeMaps(), activeMapset(), battalionPoints(), battalionRegistry(), cardPoints(), comboWeight(), hydrateBattalionCards(), hydrateCardRef() (+4 more)

### Community 24 - "boot.test.js"
Cohesion: 0.24
Nodes (10): assert, bootHtml(), fs, GAME, { JSDOM }, makeDom(), path, read() (+2 more)

### Community 25 - "claude-plays.test.js"
Cohesion: 0.18
Nodes (9): assert, cp, E, match, path, SENTINEL, st, surfaces (+1 more)

### Community 26 - "test.ui.js"
Cohesion: 0.18
Nodes (8): assert, fs, path, SPINE_DOC, SVG_LITERAL, SVG_TAGS, { test }, UI_DIR

### Community 27 - "fx.js"
Cohesion: 0.35
Nodes (9): fxPieceHex(), fxStrike(), ghostUnit(), playFX(), popUnit(), ringAt(), shakeBoard(), slideUnit() (+1 more)

### Community 28 - "sim.js"
Cohesion: 0.36
Nodes (8): balanceAdd(), balanceFP(), balanceMap(), balanceNew(), balanceSeed(), foldFacts(), simSkirmish(), skirmishFacts()

### Community 29 - "pane-units.js"
Cohesion: 0.40
Nodes (9): chartUnitsRoleMap(), renderUnits(), unBreakthroughSection(), unColor(), unExchangeSection(), unLifespanRow(), unLifespanSection(), unRenderBody() (+1 more)

### Community 30 - "balance-parallel.test.js"
Cohesion: 0.22
Nodes (8): assert, cp, db, fs, os, path, ROOT, { test }

### Community 31 - "test.maps.js"
Cohesion: 0.25
Nodes (6): buildManifest(), regen(), assert, { E }, ADR-0003, { test }

### Community 32 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowJs, checkJs, module, moduleResolution, target, exclude, **/node_modules

### Community 33 - "test.cards.js"
Cohesion: 0.22
Nodes (4): assert, { E, SIM, testSkirmish, fixtureCard }, ADR-0003, { test }

### Community 34 - "test.terrain.js"
Cohesion: 0.25
Nodes (6): testSkirmish(), assert, { E, testSkirmish, fixtureCard }, fresh(), ADR-0003, { test }

### Community 35 - "test.helpers.js"
Cohesion: 0.25
Nodes (5): fixtureCard(), ADR-0003, assert, { E }, { test }

### Community 36 - "test.ai.js"
Cohesion: 0.25
Nodes (4): assert, { E, SIM, testSkirmish }, ADR-0003, { test }

### Community 37 - "board.js"
Cohesion: 0.67
Nodes (6): attackPreviewsFor(), hideAttackHints(), hl(), renderBoard(), renderHighlights(), showAttackHints()

### Community 38 - "check-context.js"
Cohesion: 0.60
Nodes (5): checkHomes(), main(), parseTerms(), scanAliases(), walk()

### Community 40 - "check-context.test.js"
Cohesion: 0.40
Nodes (4): assert, path, { spawnSync }, { test }

### Community 41 - "check-prose.js"
Cohesion: 0.70
Nodes (4): lineHits(), main(), scan(), walk()

### Community 42 - "check-prose.test.js"
Cohesion: 0.40
Nodes (4): assert, path, { spawnSync }, { test }

### Community 44 - "Hex adjacency clarification diagram (hexes A, B, C sharing edges)"
Cohesion: 0.70
Nodes (5): Hex A (top hex), Hex adjacency / shared-edge clarification, Hex adjacency clarification diagram (hexes A, B, C sharing edges), Hex B (lower-left hex), Hex C (lower-right hex)

### Community 45 - "test.geometry.js"
Cohesion: 0.40
Nodes (4): assert, { E, SIM }, ADR-0003, { test }

### Community 47 - "pr-check.js"
Cohesion: 0.50
Nodes (3): fs, os, path

### Community 48 - "db-query.js"
Cohesion: 0.83
Nodes (3): fmt(), printTable(), run()

### Community 49 - "test.integration.js"
Cohesion: 0.50
Nodes (3): assert, { E, testSkirmish }, { test }

### Community 51 - "Comment & doc style guide"
Cohesion: 0.67
Nodes (3): Comment & doc style guide, No war stories rule, Progressive disclosure in docs

### Community 85 - "screens.js"
Cohesion: 0.23
Nodes (9): finish(), step(), applyDevMode(), devHotkey(), devMode(), goScreen(), renderSettings(), screenAllowed() (+1 more)

### Community 86 - "pane-maps.js"
Cohesion: 0.12
Nodes (22): assert, ADR-0003, row(), { test }, mdBandBoard(), mdFsDiffTrackHtml(), mdHeaderHtml(), mdHexLabelFor() (+14 more)

### Community 87 - "build-battalion.js"
Cohesion: 0.31
Nodes (12): openBuildBattalion(), pbAdd(), pbBump(), pbCount(), pbLoad(), pbMarchOut(), pbPickOpponent(), pbPool() (+4 more)

### Community 88 - "check-deck-scope.test.js"
Cohesion: 0.38
Nodes (5): scan(), assert, { scan }, { test }, walk()

### Community 152 - "00-config.js"
Cohesion: 0.67
Nodes (3): ADR-0002, configCanon(), configDigest()

## Knowledge Gaps
- **235 isolated node(s):** `fs`, `os`, `path`, `{ test }`, `assert` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **35 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `done()` connect `dashboard.js` to `chart-model.js`, `02-board.js`, `report-model.js`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **Why does `mapReport()` connect `report-model.js` to `chart-model.js`, `dashboard.js`, `skirmish.js`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `row()` connect `pane-maps.js` to `chart-model.js`, `battalion-editor.js`?**
  _High betweenness centrality (0.016) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Engine model (rules kernel)` (e.g. with `Anti-degeneracy guards (noopPenalty/antiShuffle/attrWin)` and `Unit rubric`) actually correct?**
  _`Engine model (rules kernel)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `os`, `path` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Engine model (rules kernel)` be split into smaller, more focused modules?**
  _Cohesion score 0.050505050505050504 - nodes in this community are weakly interconnected._
- **Should `chart-model.js` be split into smaller, more focused modules?**
  _Cohesion score 0.09247311827956989 - nodes in this community are weakly interconnected._