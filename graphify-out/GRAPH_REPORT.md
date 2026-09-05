# Graph Report - WoAProto  (2026-09-05)

## Corpus Check
- 259 files · ~275,714 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1394 nodes · 1859 edges · 223 communities (186 shown, 37 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 140 edges (avg confidence: 0.66)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `8c246bc2`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Engine model (rules kernel)
- chart-model.js
- War of Attrition Rule Book (v1.1)
- report-model.js
- llm-session.test.js
- claude-plays.js
- commander-panel.js
- mark.js
- 04-skirmish.js
- seat.js
- 02-board.js
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
- dashboard.js
- claude-plays.test.js
- test.ui.js
- fx.js
- sim.js
- terrain.js
- balance-parallel.test.js
- test.maps.js
- compilerOptions
- test.cards.js
- test.helpers.js
- test.seams.js
- test.ai.js
- turn.js
- check-context.test.js
- skirmish.test.js
- crosscuts.js
- check-prose.js
- check-prose.test.js
- Hex adjacency clarification diagram (hexes A, B, C sharing edges)
- terrain-marks.test.js
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
- session.js
- Domain docs consumption guide
- Game concepts
- db-query.test.js
- build-battalion.js
- check-deck-scope.test.js
- Root index.html redirect
- balance.js
- ADR-0004 — The balance fold moves from JS to SQL
- units.js
- Query cookbook — asking the balance store new questions
- terrain-marks.js
- Dev-tooling
- panes/cards.js
- ADR-0005 — Balance regression is a throwaway diff, never a committed fixture
- Commander schema
- 03a-commander-effects.js
- commander-picker.js
- Heuristic AI
- Integration
- Interface
- board.test.js
- ADR-0006 — The script chain is declared in one manifest, not inferred from filenames
- test.combat.js
- pane.js
- Terrain
- session.test.js
- room.js
- net.js
- turn.test.js
- attack.js
- The session
- snapshot.js
- The board
- region.js
- The skirmish screen
- save.js
- The turn
- board.js
- thumbnail.js
- debug.js
- panes/maps.js
- screens.js
- overview.js
- boot.js

## God Nodes (most connected - your core abstractions)
1. `seat()` - 15 edges
2. `War of Attrition Rule Book (v1.1)` - 15 edges
3. `Engine model (rules kernel)` - 13 edges
4. `Report model (reporting subsystem)` - 11 edges
5. `svgEl()` - 10 edges
6. `LlmSession()` - 10 edges
7. `R` - 10 edges
8. `applyStep()` - 10 edges
9. `Game concepts` - 10 edges
10. `done()` - 9 edges

## Surprising Connections (you probably didn't know these)
- `reportMarkdown()` --indirect_call--> `done()`  [INFERRED]
  game/report-model.js → dev/smoke.js
- `dashReportMarkdown()` --indirect_call--> `done()`  [INFERRED]
  game/ui/screens/dashboard/dashboard.js → dev/smoke.js
- `run()` --indirect_call--> `key()`  [INFERRED]
  dev/tune-weights.js → game/engine/02-board.js
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
- **Balance measurement pipeline (sweep to graded report)** — docs_human_instructions_standard_runs_runbook_standard_runs, docs_reference_report_model_report_model, game_readme_balance_lab, logs_readme_playtest_data [INFERRED 0.75]

## Communities (223 total, 37 thin omitted)

### Community 0 - "Engine model (rules kernel)"
Cohesion: 0.05
Nodes (53): Apples-to-apples determinism, Standard runs runbook, AI heuristic model, AI_PRESETS (easy/normal/hard), AI_WEIGHTS, Anti-degeneracy guards (noopPenalty/antiShuffle/attrWin), CARD_KEEP burn priority, evalState board scoring (+45 more)

### Community 1 - "chart-model.js"
Cohesion: 0.07
Nodes (27): accFilePath(), readAcc(), run(), assert, E, fs, http, os (+19 more)

### Community 2 - "War of Attrition Rule Book (v1.1)"
Cohesion: 0.06
Nodes (52): balance-loop skill, create-card skill, create-map skill, generate-reports skill, review-reports skill, review-with-rubric skill, run-tournament skill, WarOfAttrition project doctrine (CLAUDE.md) (+44 more)

### Community 3 - "report-model.js"
Cohesion: 0.11
Nodes (34): actionOctileLanes(), actionTotal(), balanceScore(), cardAggFromEnvelopes(), cardFleetFireTimes(), cardHqWinSlice(), cardPlayTurnQuartiles(), cardRows() (+26 more)

### Community 4 - "llm-session.test.js"
Cohesion: 0.06
Nodes (39): assert, E, fs, LAB, { LlmSession }, path, { test }, buildPrompt() (+31 more)

### Community 5 - "claude-plays.js"
Cohesion: 0.07
Nodes (30): ARGS, cap(), CHOICE_SCHEMA, DIRN, E, feltNotes(), fs, HEURISTIC (+22 more)

### Community 6 - "commander-panel.js"
Cohesion: 0.25
Nodes (16): bindCommanderPanel(), commanderActivate(), commanderDemoLoad(), commanderFeedback(), commanderFor(), commanderInit(), commanderInteractive(), commanderPips() (+8 more)

### Community 7 - "mark.js"
Cohesion: 0.24
Nodes (18): bpBeginBoard(), bpCoordLabel(), bpEdgeHitLine(), bpEdgePts(), bpGhostHex(), bpHexPoly(), bpHexTile(), bpHighlight() (+10 more)

### Community 8 - "04-skirmish.js"
Cohesion: 0.15
Nodes (28): advanceStep(), applyStep(), buildDeck(), cardsRemaining(), concede(), concedeAdvised(), copyReserves(), currentStep() (+20 more)

### Community 9 - "seat.js"
Cohesion: 0.20
Nodes (15): inputLive(), seat(), seatAiName(), seatAiSide(), seatBeginTurn(), seatConcedable(), seatDrives(), seatGatesHand() (+7 more)

### Community 10 - "02-board.js"
Cohesion: 0.19
Nodes (19): boardHexes(), buildGeo(), buildShape(), buildTerrain(), coordOf(), dirBetween(), dist(), edgeFrom() (+11 more)

### Community 11 - "ui/manual.js"
Cohesion: 0.17
Nodes (15): manualKey(), manualStep(), manualTabClick(), mpAftermathWords(), mpDrawFrame(), mpDrawHQ(), mpDrawUnit(), mpSideName() (+7 more)

### Community 12 - "chart-primitives.js"
Cohesion: 0.16
Nodes (12): chCdf(), chEsc(), chHatchDefs(), chLine(), chPolyline(), chSettleSvg(), chSvgOpen(), chText() (+4 more)

### Community 13 - "03-rules.js"
Cohesion: 0.25
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
Cohesion: 0.31
Nodes (16): aiConfig(), aiPlanTurn(), clone(), cloneForSim(), enumerateChoices(), enumerateWithOptions(), evalState(), greedyResolve() (+8 more)

### Community 18 - "db.js"
Cohesion: 0.15
Nodes (22): addMissingTerrainColumns(), aggregate(), archiveIfLegacy(), badRequest(), boardHexList(), cardKind(), cardTiming(), close() (+14 more)

### Community 19 - "db.test.js"
Cohesion: 0.13
Nodes (11): assert, cp, db, dbFile, E, fs, os, path (+3 more)

### Community 20 - "map-editor.js"
Cohesion: 0.27
Nodes (12): edBuildDef(), edHexPairs(), edHexSet(), edInternalSides(), edLiveShape(), edRemoveHex(), edTerrainRule(), groupEdgesToPieces() (+4 more)

### Community 21 - "server.js"
Cohesion: 0.33
Nodes (5): handler(), json(), listen(), readBody(), saveUnderRepo()

### Community 22 - "01-core.js"
Cohesion: 0.20
Nodes (12): activeMaps(), activeMapset(), battalionPoints(), battalionRegistry(), cardPoints(), comboWeight(), hydrateBattalionCards(), hydrateCardRef() (+4 more)

### Community 24 - "dashboard.js"
Cohesion: 0.08
Nodes (33): assert, bootHtml(), fs, harness, { JSDOM }, makeDom(), path, { test } (+25 more)

### Community 25 - "claude-plays.test.js"
Cohesion: 0.18
Nodes (9): assert, cp, E, match, path, SENTINEL, st, surfaces (+1 more)

### Community 26 - "test.ui.js"
Cohesion: 0.20
Nodes (9): assert, drawsMarks(), fs, path, SVG_LITERAL, SVG_TAGS, { test }, UI_DIR (+1 more)

### Community 27 - "fx.js"
Cohesion: 0.35
Nodes (10): fxPieceHex(), fxStrike(), ghostUnit(), liveBoard(), playFX(), popUnit(), ringAt(), shakeBoard() (+2 more)

### Community 28 - "sim.js"
Cohesion: 0.36
Nodes (8): balanceAdd(), balanceFP(), balanceMap(), balanceNew(), balanceSeed(), foldFacts(), simSkirmish(), skirmishFacts()

### Community 29 - "terrain.js"
Cohesion: 0.18
Nodes (10): bad(), defineTerrain(), deployBlocked(), mapTerrainTypes(), pieceProblem(), sideEffect(), supportBlocker(), terrainAt() (+2 more)

### Community 30 - "balance-parallel.test.js"
Cohesion: 0.18
Nodes (9): assert, cp, db, fs, os, path, ROOT, sweep (+1 more)

### Community 31 - "test.maps.js"
Cohesion: 0.25
Nodes (6): buildManifest(), regen(), assert, { E }, ADR-0003, { test }

### Community 32 - "compilerOptions"
Cohesion: 0.22
Nodes (8): compilerOptions, allowJs, checkJs, module, moduleResolution, target, exclude, **/node_modules

### Community 33 - "test.cards.js"
Cohesion: 0.20
Nodes (4): ADR-0003, assert, { E, SIM, testSkirmish, fixtureCard }, { test }

### Community 34 - "test.helpers.js"
Cohesion: 0.15
Nodes (9): assert, { E, testSkirmish, fixtureCard }, { test }, assert, { E, SIM }, ADR-0003, { test }, fixtureCard() (+1 more)

### Community 35 - "test.seams.js"
Cohesion: 0.25
Nodes (3): assert, { E, TESTMAP, testSkirmish }, { test }

### Community 36 - "test.ai.js"
Cohesion: 0.13
Nodes (10): fresh(), assert, { E, SIM, testSkirmish }, ADR-0003, { test }, assert, { E, TESTMAP, testSkirmish }, fightSkirmish() (+2 more)

### Community 37 - "turn.js"
Cohesion: 0.22
Nodes (3): showSkirmishOver(), turnSettle(), uiAction()

### Community 38 - "check-context.test.js"
Cohesion: 0.24
Nodes (10): checkHomes(), main(), parseTerms(), scanAliases(), assert, { checkHomes }, path, { spawnSync } (+2 more)

### Community 39 - "skirmish.test.js"
Cohesion: 0.20
Nodes (5): assert, fs, path, { test }, vm

### Community 40 - "crosscuts.js"
Cohesion: 0.33
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

### Community 45 - "terrain-marks.test.js"
Cohesion: 0.20
Nodes (7): assert, E, fs, path, ROOMS, { test }, vm

### Community 47 - "pr-check.js"
Cohesion: 0.50
Nodes (3): fs, os, path

### Community 48 - "db-query.js"
Cohesion: 0.70
Nodes (4): fmt(), printAnchors(), printTable(), run()

### Community 49 - "test.integration.js"
Cohesion: 0.40
Nodes (4): assert, { E, testSkirmish }, SIM, { test }

### Community 51 - "Comment & doc style guide"
Cohesion: 0.67
Nodes (3): Comment & doc style guide, No war stories rule, Progressive disclosure in docs

### Community 83 - "session.js"
Cohesion: 0.29
Nodes (5): rematchMap(), seatDown(), startLocal(), startNewCampaign(), startNextSkirmish()

### Community 85 - "Game concepts"
Cohesion: 0.18
Nodes (10): Acting, Budget, Commanders, Ending it, Game concepts, Pieces, Taking a turn, The board (+2 more)

### Community 86 - "db-query.test.js"
Cohesion: 0.13
Nodes (12): assert, CLI, cp, db, dbFile, E, fs, os (+4 more)

### Community 87 - "build-battalion.js"
Cohesion: 0.31
Nodes (12): openBuildBattalion(), pbAdd(), pbBump(), pbCount(), pbLoad(), pbMarchOut(), pbPickOpponent(), pbPool() (+4 more)

### Community 88 - "check-deck-scope.test.js"
Cohesion: 0.38
Nodes (5): scan(), assert, { scan }, { test }, walk()

### Community 152 - "balance.js"
Cohesion: 0.19
Nodes (12): mapReport(), matchup(), pad(), sweepMaps(), sweepWorkers(), planBatches(), runParallelSweep(), configCanon() (+4 more)

### Community 153 - "ADR-0004 — The balance fold moves from JS to SQL"
Cohesion: 0.40
Nodes (4): ADR-0004 — The balance fold moves from JS to SQL, Consequences, Context, Decision

### Community 154 - "units.js"
Cohesion: 0.40
Nodes (9): chartUnitsRoleMap(), renderUnits(), unBreakthroughSection(), unColor(), unExchangeSection(), unLifespanRow(), unLifespanSection(), unRenderBody() (+1 more)

### Community 155 - "Query cookbook — asking the balance store new questions"
Cohesion: 0.29
Nodes (6): Adding a question, Over HTTP, Query cookbook — asking the balance store new questions, The grains and dimensions, The litmus, The query surface (`dev/db.js`)

### Community 157 - "terrain-marks.js"
Cohesion: 0.36
Nodes (5): bpBarrageTerrain(), bpTerrainEdge(), bpTerrainStroke(), terrainInset(), terrainMark()

### Community 158 - "Dev-tooling"
Cohesion: 0.25
Nodes (7): Dev-tooling, Judging, Organising the code, Reading the numbers, Running games in bulk, The loop, What gets recorded

### Community 159 - "panes/cards.js"
Cohesion: 0.43
Nodes (6): chartCardSightQuadrant(), crdFireStrips(), crdRenderBody(), crdSimpleDumbbells(), crdSw(), renderCards()

### Community 160 - "ADR-0005 — Balance regression is a throwaway diff, never a committed fixture"
Cohesion: 0.29
Nodes (5): dev/baselines/ — throwaway refactor baselines (gitignored), ADR-0005 — Balance regression is a throwaway diff, never a committed fixture, Consequences, Context, Decision

### Community 161 - "Commander schema"
Cohesion: 0.29
Nodes (6): Commander, Commander schema, Runtime state (supplied, not authored), Selection → application → render, Trait, What the panel resolves

### Community 162 - "03a-commander-effects.js"
Cohesion: 0.43
Nodes (4): commanderCombat(), commanderDrawDelta(), terrainMatches(), traitLive()

### Community 163 - "commander-picker.js"
Cohesion: 0.48
Nodes (5): openPickCommander(), pickCommanderOptions(), pickCommanderSet(), pickOpponentCommander(), renderPickCommander()

### Community 164 - "Heuristic AI"
Cohesion: 0.33
Nodes (5): Choosing a move, Guards against degenerate play, Heuristic AI, The dials, The seat

### Community 165 - "Integration"
Cohesion: 0.33
Nodes (5): Across the wire, Content to engine, Engine to everything else, Identity of a run, Integration

### Community 166 - "Interface"
Cohesion: 0.33
Nodes (5): Families that share a shell, Interface, Places you go, Staying in the game, The drawing kit

### Community 167 - "board.test.js"
Cohesion: 0.15
Nodes (11): assert, el(), fs, loadBoard(), MARKS, path, { test }, vm (+3 more)

### Community 168 - "ADR-0006 — The script chain is declared in one manifest, not inferred from filenames"
Cohesion: 0.40
Nodes (4): ADR-0006 — The script chain is declared in one manifest, not inferred from filenames, Consequences, Context, Decision

### Community 169 - "test.combat.js"
Cohesion: 0.40
Nodes (3): assert, { E, testSkirmish }, { test }

### Community 170 - "pane.js"
Cohesion: 0.60
Nodes (3): dashPaneNote(), dashPanesBuild(), dashPanesShow()

### Community 195 - "session.test.js"
Cohesion: 0.22
Nodes (6): assert, fs, path, QUESTIONS, { test }, vm

### Community 196 - "room.js"
Cohesion: 0.36
Nodes (5): code4(), create(), log(), stamp(), sweep()

### Community 197 - "net.js"
Cohesion: 0.43
Nodes (6): adoptPeerState(), hostRoom(), joinRoom(), pushState(), seatNet(), startPolling()

### Community 198 - "turn.test.js"
Cohesion: 0.25
Nodes (5): assert, fs, path, { test }, vm

### Community 199 - "attack.js"
Cohesion: 0.52
Nodes (5): attackHoverable(), attackPreviewsFor(), bestPerTarget(), hideAttackHints(), showAttackHints()

### Community 200 - "The session"
Cohesion: 0.33
Nodes (5): Adding a mode, or a stored record, State that must survive the wire, The rooms, The session, The two bases

### Community 201 - "snapshot.js"
Cohesion: 0.40
Nodes (3): canReset(), resetTurn(), renderPrompt()

### Community 202 - "The board"
Cohesion: 0.40
Nodes (4): Adding a mark, The board, The rooms, The two bases

### Community 204 - "The skirmish screen"
Cohesion: 0.40
Nodes (4): Layout rules, The base, The rooms, The skirmish screen

### Community 205 - "save.js"
Cohesion: 0.60
Nodes (3): checkResume(), clearSave(), resumeSaved()

### Community 206 - "The turn"
Cohesion: 0.40
Nodes (4): Adding a way to advance a turn, The base, The rooms, The turn

### Community 207 - "board.js"
Cohesion: 0.83
Nodes (3): hl(), renderBoard(), renderHighlights()

### Community 209 - "thumbnail.js"
Cohesion: 0.83
Nodes (3): bpThumbHex(), bpThumbHQ(), previewSVG()

### Community 219 - "panes/maps.js"
Cohesion: 0.27
Nodes (13): mdBandBoard(), mdFsDiffTrackHtml(), mdHeaderHtml(), mdHexLabelFor(), mdHexLensSection(), mdLaneBars(), mdLensFill(), mdMapDef() (+5 more)

### Community 220 - "screens.js"
Cohesion: 0.42
Nodes (7): applyDevMode(), devHotkey(), devMode(), goScreen(), renderSettings(), screenAllowed(), setDevMode()

### Community 221 - "overview.js"
Cohesion: 0.60
Nodes (5): ovMapDumbbells(), ovPacingMinis(), ovRenderBody(), ovVerdictBanner(), renderOverview()

### Community 222 - "boot.js"
Cohesion: 0.60
Nodes (3): finish(), runParallel(), step()

## Knowledge Gaps
- **356 isolated node(s):** `{ test }`, `assert`, `{ E, SIM, testSkirmish, fixtureCard }`, `ADR-0003`, `{ test }` (+351 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **37 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `done()` connect `dashboard.js` to `balance.js`, `chart-model.js`, `report-model.js`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **Why does `mapReport()` connect `balance.js` to `dashboard.js`, `chart-model.js`, `report-model.js`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **Are the 3 inferred relationships involving `Engine model (rules kernel)` (e.g. with `Anti-degeneracy guards (noopPenalty/antiShuffle/attrWin)` and `Unit rubric`) actually correct?**
  _`Engine model (rules kernel)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `Report model (reporting subsystem)` (e.g. with `Standard runs runbook` and `Balance lab (dev/balance.js + Balance Dashboard)`) actually correct?**
  _`Report model (reporting subsystem)` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `{ test }`, `assert`, `{ E, SIM, testSkirmish, fixtureCard }` to the rest of the system?**
  _356 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Engine model (rules kernel)` be split into smaller, more focused modules?**
  _Cohesion score 0.05224963715529753 - nodes in this community are weakly interconnected._
- **Should `chart-model.js` be split into smaller, more focused modules?**
  _Cohesion score 0.07254623044096728 - nodes in this community are weakly interconnected._