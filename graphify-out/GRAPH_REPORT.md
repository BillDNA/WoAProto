# Graph Report - board-house-337  (2026-09-05)

## Corpus Check
- 275 files · ~285,276 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1480 nodes · 2012 edges · 247 communities (91 shown, 36 thin omitted)
- Extraction: 93% EXTRACTED · 7% INFERRED · 0% AMBIGUOUS · INFERRED: 136 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `0d512f99`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Report model (reporting subsystem)
- chart-model.js
- War of Attrition Rule Book (v1.1)
- report-model.js
- llm-session.test.js
- claude-plays.js
- Game concepts
- board.js
- 04-skirmish.js
- ui/skirmish.js
- llm-client.js
- ui/manual.js
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
- done
- claude-plays.test.js
- test.ui.js
- fx.js
- sim.js
- commander-panel.js
- balance-parallel.test.js
- test.maps.js
- compilerOptions
- test.cards.js
- test.helpers.js
- testSkirmish
- test.ai.js
- hex.js
- check-context.test.js
- crosscuts.js
- check-prose.js
- check-prose.test.js
- Hex adjacency clarification diagram (hexes A, B, C sharing edges)
- unit.js
- pr-check.js
- db-query.js
- test.integration.js
- optimize-art.ps1
- Code architecture — start here (front door)
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
- terrain.js
- Domain docs consumption guide
- panes/maps.js
- db-query.test.js
- build-battalion.js
- check-deck-scope.test.js
- Root index.html redirect
- units.js
- WarOfAttrition project doctrine (CLAUDE.md)
- runParallel
- Query cookbook — asking the balance store new questions
- server.test.js
- Balance target bands & north stars
- Hand-off seams & real-path gates
- panes/cards.js
- board-marks.test.js
- dashboard.js
- board-marks.js
- AI heuristic model
- terrain-marks.js
- War of Attrition digital edition manual
- ADR-0002: army-points is a descriptive yardstick
- run
- sweep.js
- Commander schema
- unit-marks.js
- 03a-commander-effects.js
- commander-picker.js
- defineKind
- tune-weights.js
- lab-config.test.js
- modal.js
- overview.js
- test.combat.js
- pane.js
- tables.js
- Terrain
- Engine model (rules kernel)
- lab-config.js
- LlmSession
- live-board.js
- UI invariants (browser app)
- Board
- hex-screen.js
- unit.test.js
- board.test.js
- Unit
- Hex

## God Nodes (most connected - your core abstractions)
1. `Code architecture — start here (front door)` - 20 edges
2. `War of Attrition Rule Book (v1.1)` - 16 edges
3. `renderAll()` - 15 edges
4. `Engine model (rules kernel)` - 15 edges
5. `testSkirmish()` - 13 edges
6. `Report model (reporting subsystem)` - 13 edges
7. `llmTurn()` - 12 edges
8. `maybeAI()` - 11 edges
9. `LlmSession()` - 10 edges
10. `done()` - 10 edges

## Surprising Connections (you probably didn't know these)
- `Balance lab (dev/balance.js + Balance Dashboard)` --conceptually_related_to--> `Report model (reporting subsystem)`  [INFERRED]
  game/README.md → docs/reference/report-model.md
- `Balance target bands & north stars` --references--> `Tolerance temperature (strict/explore/hot)`  [INFERRED]
  docs/balance/README.md → CONTEXT.md
- `Five built-in boards (Classic/Compact/Hourglass/Ridge/Spear)` --conceptually_related_to--> `Engine model (rules kernel)`  [INFERRED]
  game/README.md → docs/reference/engine-model.md
- `logs/ playtest data (reports by version)` --conceptually_related_to--> `Standard runs runbook`  [INFERRED]
  logs/README.md → docs/human-instructions/standard-runs-runbook.md
- `logs/ playtest data (reports by version)` --conceptually_related_to--> `Report model (reporting subsystem)`  [INFERRED]
  logs/README.md → docs/reference/report-model.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Army-points descriptive-yardstick fairness system** — context_army_points, context_points_cap, context_mispricing_residual, context_timing_blind_spot, docs_adr_0002_army_points_descriptive_yardstick_adr [EXTRACTED 1.00]
- **Runnable balance-grading math (bands, best-map score, baselines)** — docs_balance_readme_targets, docs_balance_best_map_score_sot, docs_balance_balance_baselines_anchors [EXTRACTED 1.00]
- **Balance-iteration loop skills (gather → generate → grade)** — _claude_skills_balance_loop_skill_balance_loop, _claude_skills_generate_reports_skill_generate_reports, _claude_skills_review_reports_skill_review_reports, _claude_skills_create_card_skill_create_card, _claude_skills_create_map_skill_create_map [EXTRACTED 1.00]
- **Balance measurement pipeline (sweep to graded report)** — docs_human_instructions_standard_runs_runbook_standard_runs, docs_reference_report_model_report_model, game_readme_balance_lab, logs_readme_playtest_data [INFERRED 0.75]
- **docs/reference how-the-code-works set** — docs_reference_engine_model_engine_model, docs_reference_report_model_report_model, docs_reference_ai_heuristic_model_ai_heuristic_model, docs_reference_card_cheatsheet_card_cheatsheet, docs_reference_ui_invariants_ui_invariants, docs_reference_context_ui_components_ui_components, docs_reference_testing_seams_testing_seams, docs_reference_workflow_workflow [INFERRED 0.80]
- **War of Attrition content rubrics (findings-not-score)** — docs_rubrics_card_rubric_card_rubric, docs_rubrics_map_rubric_map_rubric, docs_rubrics_personality_rubric_personality_rubric, docs_rubrics_ui_rubric_ui_rubric, docs_rubrics_unit_rubric_unit_rubric [INFERRED 0.85]

## Communities (247 total, 36 thin omitted)

### Community 0 - "Report model (reporting subsystem)"
Cohesion: 0.22
Nodes (11): Apples-to-apples determinism, Standard runs runbook, Golden-diff oracle (determinism), Play metrics (playLog / seen / stats), foldSkirmishes (DB rows to aggregate), hexLenses spatial reconstruction, Report model (reporting subsystem), Trace envelope data contract (+3 more)

### Community 1 - "chart-model.js"
Cohesion: 0.12
Nodes (8): assert, ADR-0003, { test }, buildOverviewModel(), ovAvg(), ovFmt(), ovHist(), ovPacing()

### Community 2 - "War of Attrition Rule Book (v1.1)"
Cohesion: 0.10
Nodes (23): create-card skill, AI personality, Attack, Attrition (skirmish ending), Battle, Campaign, Card (one-shot order), Commander trait (+15 more)

### Community 3 - "report-model.js"
Cohesion: 0.08
Nodes (40): mapReport(), seedBaseFor(), matchup(), pad(), sweepMaps(), sweepWorkers(), actionOctileLanes(), actionTotal() (+32 more)

### Community 4 - "llm-session.test.js"
Cohesion: 0.13
Nodes (17): buildPrompt(), encodeUserTurn(), errored(), LAB, parseEventLine(), { resolveBinary }, { spawn }, splitLines() (+9 more)

### Community 5 - "claude-plays.js"
Cohesion: 0.07
Nodes (43): ARGS, cap(), cardOptions(), CHOICE_SCHEMA, describeChoice(), E, feltNotes(), fs (+35 more)

### Community 6 - "Game concepts"
Cohesion: 0.05
Nodes (35): review-with-rubric skill, War of Attrition domain glossary (CONTEXT.md), Dev-tooling, Judging, Organising the code, Reading the numbers, Running games in bulk, The loop (+27 more)

### Community 7 - "board.js"
Cohesion: 0.13
Nodes (22): boardHexes(), buildGeo(), buildShape(), builtinNames(), defaultShape(), edgeFrom(), ensureMapShape(), formFor() (+14 more)

### Community 8 - "04-skirmish.js"
Cohesion: 0.15
Nodes (28): advanceStep(), applyStep(), buildDeck(), cardsRemaining(), concede(), concedeAdvised(), copyReserves(), currentStep() (+20 more)

### Community 9 - "ui/skirmish.js"
Cohesion: 0.11
Nodes (32): act(), afterChange(), canReset(), cardAbbr(), cardsGlossaryHtml(), checkResume(), clearIfBattleOver(), clearSave() (+24 more)

### Community 10 - "llm-client.js"
Cohesion: 0.18
Nodes (14): buildPrompt(), errored(), fs, LAB, parseEnvelope(), path, resolveBinary(), send() (+6 more)

### Community 11 - "ui/manual.js"
Cohesion: 0.16
Nodes (14): manualKey(), manualStep(), manualTabClick(), mpAftermathWords(), mpDrawFrame(), mpDrawHQ(), mpDrawUnit(), mpSideName() (+6 more)

### Community 12 - "chart-primitives.js"
Cohesion: 0.12
Nodes (15): chBindHits(), chCdf(), chEsc(), chHatchDefs(), chLine(), chMakePlacer(), chPolyline(), chSettleSvg() (+7 more)

### Community 13 - "03-rules.js"
Cohesion: 0.20
Nodes (15): borderBlocked(), computeAttack(), controlledHexes(), deployTargets(), edgeFreeForTrench(), hexTerrain(), isEmpty(), isHQ() (+7 more)

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
Cohesion: 0.26
Nodes (15): aiConfig(), aiPlanTurn(), clone(), cloneForSim(), enumerateChoices(), enumerateWithOptions(), evalState(), greedyResolve() (+7 more)

### Community 18 - "db.js"
Cohesion: 0.15
Nodes (22): addMissingTerrainColumns(), aggregate(), archiveIfLegacy(), badRequest(), boardHexList(), cardKind(), cardTiming(), close() (+14 more)

### Community 19 - "db.test.js"
Cohesion: 0.13
Nodes (11): assert, cp, db, dbFile, E, fs, os, path (+3 more)

### Community 20 - "map-editor.js"
Cohesion: 0.22
Nodes (12): edBuildDef(), edHexPairs(), edHexSet(), edInternalSides(), edLiveShape(), edRemoveHex(), edTerrainRule(), groupEdgesToPieces() (+4 more)

### Community 21 - "server.js"
Cohesion: 0.23
Nodes (8): cleanup(), handler(), json(), listen(), logRooms(), readBody(), saveUnderRepo(), stamp()

### Community 22 - "01-core.js"
Cohesion: 0.20
Nodes (12): activeMaps(), activeMapset(), battalionPoints(), battalionRegistry(), cardPoints(), comboWeight(), hydrateBattalionCards(), hydrateCardRef() (+4 more)

### Community 23 - "app.js"
Cohesion: 0.15
Nodes (5): aiDisplayName(), capName(), copyText(), fallback(), flash()

### Community 24 - "done"
Cohesion: 0.12
Nodes (24): assert, bootHtml(), fs, harness, { JSDOM }, makeDom(), path, { test } (+16 more)

### Community 25 - "claude-plays.test.js"
Cohesion: 0.18
Nodes (9): assert, cp, E, match, path, SENTINEL, st, surfaces (+1 more)

### Community 26 - "test.ui.js"
Cohesion: 0.20
Nodes (7): assert, fs, path, SVG_LITERAL, SVG_TAGS, { test }, UI_DIR

### Community 27 - "fx.js"
Cohesion: 0.35
Nodes (9): fxPieceHex(), fxStrike(), ghostUnit(), playFX(), popUnit(), ringAt(), shakeBoard(), slideUnit() (+1 more)

### Community 28 - "sim.js"
Cohesion: 0.36
Nodes (8): balanceAdd(), balanceFP(), balanceMap(), balanceNew(), balanceSeed(), foldFacts(), simSkirmish(), skirmishFacts()

### Community 29 - "commander-panel.js"
Cohesion: 0.25
Nodes (16): bindCommanderPanel(), commanderActivate(), commanderDemoLoad(), commanderFeedback(), commanderFor(), commanderInit(), commanderInteractive(), commanderPips() (+8 more)

### Community 30 - "balance-parallel.test.js"
Cohesion: 0.18
Nodes (9): assert, cp, db, fs, os, path, ROOT, sweep (+1 more)

### Community 31 - "test.maps.js"
Cohesion: 0.22
Nodes (6): buildManifest(), regen(), assert, { E }, ADR-0003, { test }

### Community 32 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowJs, checkJs, module, moduleResolution, target, exclude, **/node_modules

### Community 33 - "test.cards.js"
Cohesion: 0.20
Nodes (4): assert, { E, SIM, testSkirmish, fixtureCard }, ADR-0003, { test }

### Community 34 - "test.helpers.js"
Cohesion: 0.29
Nodes (5): assert, { E, testSkirmish, fixtureCard }, { test }, fixtureCard(), ADR-0003

### Community 35 - "testSkirmish"
Cohesion: 0.16
Nodes (11): fresh(), assert, { E, TESTMAP, testSkirmish }, fightSkirmish(), { test }, testSkirmish(), assert, burnGame() (+3 more)

### Community 36 - "test.ai.js"
Cohesion: 0.25
Nodes (4): assert, { E, SIM, testSkirmish }, ADR-0003, { test }

### Community 37 - "hex.js"
Cohesion: 0.20
Nodes (8): dirBetween(), dist(), facingSide(), key(), oppositeDir(), parseKey(), sideKey(), step()

### Community 38 - "check-context.test.js"
Cohesion: 0.24
Nodes (10): checkHomes(), main(), parseTerms(), scanAliases(), assert, { checkHomes }, path, { spawnSync } (+2 more)

### Community 40 - "crosscuts.js"
Cohesion: 0.29
Nodes (15): ccBalanceChart(), ccBalanceMetrics(), ccBarChart(), ccCardChart(), ccControls(), ccDimLabel(), ccFmt(), ccInit() (+7 more)

### Community 41 - "check-prose.js"
Cohesion: 0.70
Nodes (4): lineHits(), main(), scan(), walk()

### Community 42 - "check-prose.test.js"
Cohesion: 0.40
Nodes (4): assert, path, { spawnSync }, { test }

### Community 44 - "Hex adjacency clarification diagram (hexes A, B, C sharing edges)"
Cohesion: 0.70
Nodes (5): Hex A (top hex), Hex adjacency / shared-edge clarification, Hex adjacency clarification diagram (hexes A, B, C sharing edges), Hex B (lower-left hex), Hex C (lower-right hex)

### Community 45 - "unit.js"
Cohesion: 0.24
Nodes (7): bad(), checkUnitStock(), defineUnit(), orphanRowProblem(), record(), unitStock(), unitStockProblem()

### Community 47 - "pr-check.js"
Cohesion: 0.50
Nodes (3): fs, os, path

### Community 48 - "db-query.js"
Cohesion: 0.36
Nodes (4): fmt(), printAnchors(), printTable(), run()

### Community 49 - "test.integration.js"
Cohesion: 0.40
Nodes (4): assert, { E, testSkirmish }, SIM, { test }

### Community 51 - "Code architecture — start here (front door)"
Cohesion: 0.20
Nodes (12): create-map skill, Map, Mapset, Code architecture — start here (front door), Card editing cheat sheet, Comment & doc style guide, No war stories rule, Progressive disclosure in docs (+4 more)

### Community 83 - "terrain.js"
Cohesion: 0.18
Nodes (11): bad(), buildTerrain(), defineTerrain(), deployBlocked(), mapTerrainTypes(), pieceProblem(), sideEffect(), supportBlocker() (+3 more)

### Community 85 - "panes/maps.js"
Cohesion: 0.24
Nodes (12): mdBandBoard(), mdFsDiffTrackHtml(), mdHeaderHtml(), mdHexLensSection(), mdLaneBars(), mdLensFill(), mdMapDef(), mdOutlineOf() (+4 more)

### Community 86 - "db-query.test.js"
Cohesion: 0.13
Nodes (12): assert, CLI, cp, db, dbFile, E, fs, os (+4 more)

### Community 87 - "build-battalion.js"
Cohesion: 0.27
Nodes (12): openBuildBattalion(), pbAdd(), pbBump(), pbCount(), pbLoad(), pbMarchOut(), pbPickOpponent(), pbPool() (+4 more)

### Community 88 - "check-deck-scope.test.js"
Cohesion: 0.38
Nodes (5): scan(), assert, { scan }, { test }, walk()

### Community 152 - "units.js"
Cohesion: 0.24
Nodes (9): chartUnitsRoleMap(), renderUnits(), unBreakthroughSection(), unColor(), unExchangeSection(), unLifespanRow(), unLifespanSection(), unRenderBody() (+1 more)

### Community 153 - "WarOfAttrition project doctrine (CLAUDE.md)"
Cohesion: 0.15
Nodes (11): WarOfAttrition project doctrine (CLAUDE.md), ADR-0001: file:// double-click not a supported target, ADR-0003: adopt node:test as the one test harness, ADR-0004 — The balance fold moves from JS to SQL, Consequences, Context, Decision, ADR-0006 — The script chain is declared in one manifest, not inferred from filenames (+3 more)

### Community 154 - "runParallel"
Cohesion: 0.16
Nodes (19): finish(), recordSkirmish(), runParallel(), assign(), done(), killAll(), onMapDone(), onSkirmish() (+11 more)

### Community 155 - "Query cookbook — asking the balance store new questions"
Cohesion: 0.29
Nodes (6): Adding a question, Over HTTP, Query cookbook — asking the balance store new questions, The grains and dimensions, The litmus, The query surface (`dev/db.js`)

### Community 157 - "server.test.js"
Cohesion: 0.15
Nodes (11): assert, E, fs, http, os, path, R, server (+3 more)

### Community 158 - "Balance target bands & north stars"
Cohesion: 0.32
Nodes (12): balance-loop skill, generate-reports skill, review-reports skill, run-tournament skill, Balance loop (concept), Drag (trailing kill-less turns), No-op (dead turn), Rules era (RULES_VERSION) (+4 more)

### Community 159 - "Hand-off seams & real-path gates"
Cohesion: 0.18
Nodes (10): dev/baselines/ — throwaway refactor baselines (gitignored), ADR-0005 — Balance regression is a throwaway diff, never a committed fixture, Consequences, Context, Decision, Metric bands (BANDS) & balanceScore, Assert the mechanism, never the value (AC1), Real-path gate (nothing mocked) (+2 more)

### Community 160 - "panes/cards.js"
Cohesion: 0.26
Nodes (8): chartCardSightQuadrant(), crdFireFill(), crdFireStrips(), barHtml(), crdRenderBody(), crdSimpleDumbbells(), crdSw(), renderCards()

### Community 161 - "board-marks.test.js"
Cohesion: 0.04
Nodes (33): assert, E, { test }, assert, E, fs, loadMarks(), markFiles() (+25 more)

### Community 162 - "dashboard.js"
Cohesion: 0.33
Nodes (8): dashFillRunSelect(), dashLoadRuns(), dashPickDefaultRuns(), dashRunLabel(), openDash(), openDashDef(), renderDash(), renderDashChrome()

### Community 163 - "board-marks.js"
Cohesion: 0.27
Nodes (7): boardDial(), boardDialMerge(), bpBeginBoard(), bpMark(), bpPlay(), isDialGroup(), viewBoxFor()

### Community 164 - "AI heuristic model"
Cohesion: 0.28
Nodes (9): AI heuristic model, AI_WEIGHTS, Anti-degeneracy guards (noopPenalty/antiShuffle/attrWin), CARD_KEEP burn priority, evalState board scoring, AI personalities (brawler/turtle/hawk/tuned), Personality rubric, Punch-Out (readable, beatable puzzle) (+1 more)

### Community 165 - "terrain-marks.js"
Cohesion: 0.36
Nodes (5): bpBarrageTerrain(), bpTerrainEdge(), bpTerrainStroke(), terrainInset(), terrainMark()

### Community 166 - "War of Attrition digital edition manual"
Cohesion: 0.25
Nodes (8): AI_PRESETS (easy/normal/hard), Flexible-orders house rule, Applied-deck bootstrap (localStorage over custom-deck.js), index.html markup + ordered script chain, Balance lab (dev/balance.js + Balance Dashboard), Five built-in boards (Classic/Compact/Hourglass/Ridge/Spear), War of Attrition digital edition manual, Three AI generals (Green Recruit/Old Veteran/Field Marshal)

### Community 167 - "ADR-0002: army-points is a descriptive yardstick"
Cohesion: 0.43
Nodes (7): Army-points, Exploration temperature, Mispricing residual, Points cap (deck budget), Timing blind spot, Tolerance temperature (strict/explore/hot), ADR-0002: army-points is a descriptive yardstick

### Community 168 - "run"
Cohesion: 0.43
Nodes (3): accFilePath(), readAcc(), run()

### Community 169 - "sweep.js"
Cohesion: 0.43
Nodes (5): planBatches(), runParallelSweep(), fail(), flushReady(), launch()

### Community 170 - "Commander schema"
Cohesion: 0.29
Nodes (6): Commander, Commander schema, Runtime state (supplied, not authored), Selection → application → render, Trait, What the panel resolves

### Community 171 - "unit-marks.js"
Cohesion: 0.33
Nodes (7): bpUnit(), bpUnitShape(), bpUnitSlot(), bpUnitToken(), unitChartColor(), unitMark(), unitTokenR()

### Community 172 - "03a-commander-effects.js"
Cohesion: 0.43
Nodes (4): commanderCombat(), commanderDrawDelta(), terrainMatches(), traitLive()

### Community 173 - "commander-picker.js"
Cohesion: 0.48
Nodes (5): openPickCommander(), pickCommanderOptions(), pickCommanderSet(), pickOpponentCommander(), renderPickCommander()

### Community 174 - "defineKind"
Cohesion: 0.43
Nodes (5): defineKind(), bad(), mountId(), register(), typeOk()

### Community 175 - "tune-weights.js"
Cohesion: 0.60
Nodes (5): guardrails(), measure(), parseArgs(), pickMaps(), run()

### Community 176 - "lab-config.test.js"
Cohesion: 0.25
Nodes (7): assert, E, fs, LAB, { LlmSession }, path, { test }

### Community 177 - "modal.js"
Cohesion: 0.47
Nodes (3): modalClose(), modalOpen(), uiModalsBuild()

### Community 178 - "overview.js"
Cohesion: 0.60
Nodes (5): ovMapDumbbells(), ovPacingMinis(), ovRenderBody(), ovVerdictBanner(), renderOverview()

### Community 179 - "test.combat.js"
Cohesion: 0.40
Nodes (3): assert, { E, testSkirmish }, { test }

### Community 180 - "pane.js"
Cohesion: 0.60
Nodes (3): dashPaneNote(), dashPanesBuild(), dashPanesShow()

### Community 181 - "tables.js"
Cohesion: 0.70
Nodes (4): dashSort(), dbar(), dstat(), renderDashTables()

### Community 205 - "Engine model (rules kernel)"
Cohesion: 0.22
Nodes (10): Card step types (deploy/trench/attack/reposition/barrage), Combat resolution (attacker/defender/support), Engine model (rules kernel), Directional hex-owned terrain, Trenches (attacker-support denial), Victory conditions (HQ capture / attrition), Card rubric, Map rubric (+2 more)

### Community 206 - "lab-config.js"
Cohesion: 0.48
Nodes (5): configCanon(), configDigest(), defineConfigHome(), homeDigest(), ADR-0002

### Community 208 - "live-board.js"
Cohesion: 0.67
Nodes (6): attackPreviewsFor(), hideAttackHints(), hl(), renderBoard(), renderHighlights(), showAttackHints()

### Community 209 - "UI invariants (browser app)"
Cohesion: 0.33
Nodes (7): One primitive per fact contract, UI component primitive set, Board FX layer (pure flourish, never rules), Responsive ladder (mats never scroll), UI invariants (browser app), Whole-state JSON push/poll multiplayer, UI rubric

### Community 210 - "Board"
Cohesion: 0.33
Nodes (5): Adding a mark, Adding an authored outline form, Asking about a board that is not the live one, Board, Retuning a board

### Community 211 - "hex-screen.js"
Cohesion: 0.53
Nodes (4): hexCornerAngles(), hexCornerPt(), hexEdgePts(), hexXY()

### Community 212 - "unit.test.js"
Cohesion: 0.40
Nodes (3): assert, { E, testSkirmish }, { test }

### Community 213 - "board.test.js"
Cohesion: 0.50
Nodes (3): assert, { E, SIM }, { test }

### Community 214 - "Unit"
Cohesion: 0.50
Nodes (3): Adding a type, Trying a whole other army, Unit

## Knowledge Gaps
- **352 isolated node(s):** `fs`, `os`, `path`, `{ test }`, `assert` (+347 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 688 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **36 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Code architecture — start here (front door)` connect `Code architecture — start here (front door)` to `Report model (reporting subsystem)`, `War of Attrition Rule Book (v1.1)`, `AI heuristic model`, `Game concepts`, `Commander schema`, `Engine model (rules kernel)`, `UI invariants (browser app)`, `WarOfAttrition project doctrine (CLAUDE.md)`, `Balance target bands & north stars`, `Hand-off seams & real-path gates`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **Why does `War of Attrition domain glossary (CONTEXT.md)` connect `Game concepts` to `WarOfAttrition project doctrine (CLAUDE.md)`, `Code architecture — start here (front door)`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Why does `War of Attrition Rule Book (v1.1)` connect `War of Attrition Rule Book (v1.1)` to `Code architecture — start here (front door)`, `Engine model (rules kernel)`, `Game concepts`?**
  _High betweenness centrality (0.004) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Engine model (rules kernel)` (e.g. with `Anti-degeneracy guards (noopPenalty/antiShuffle/attrWin)` and `Unit rubric`) actually correct?**
  _`Engine model (rules kernel)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `fs`, `os`, `path` to the rest of the system?**
  _352 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `chart-model.js` be split into smaller, more focused modules?**
  _Cohesion score 0.12105263157894737 - nodes in this community are weakly interconnected._
- **Should `War of Attrition Rule Book (v1.1)` be split into smaller, more focused modules?**
  _Cohesion score 0.10276679841897234 - nodes in this community are weakly interconnected._