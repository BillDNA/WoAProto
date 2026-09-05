/* War of Attrition — engine part 07: the public Engine surface.
   Assembles the exact export key list from the shared namespace and publishes
   g.Engine (node's ../engine.js re-exports it; the browser reads window.Engine). */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // The unit stock guardrail runs here, where the whole namespace is up: a units
  // variant that does not total CONFIG.pieceTotal pieces fails at load rather
  // than quietly skewing every skirmish.
  I.checkUnitStock();

  var Engine = {
    VERSION: I.RULES_VERSION,
    UNITS: I.UNITS, CARDS: I.CARDS, CARD_BY_ID: I.CARD_BY_ID, MAPS: I.MAPS,
    MAPSETS: I.MAPSETS, activeMapset: I.activeMapset, activeMaps: I.activeMaps, ACTIVE_BATTALION: I.ACTIVE_BATTALION,
    BATTALIONS: I.BATTALIONS, resolveBattalion: I.resolveBattalion,
    COMMANDERS: I.COMMANDERS, resolveCommander: I.resolveCommander,
    sideCommander: I.sideCommander, commanderCombat: I.commanderCombat,
    commanderDrawDelta: I.commanderDrawDelta, mergeCommanderWeights: I.mergeCommanderWeights,
    CARD_POOL: I.CARD_POOL, hydrateBattalionCards: I.hydrateBattalionCards,
    cardPoints: I.cardPoints, battalionPoints: I.battalionPoints,
    CONFIG: I.CONFIG, configDigest: I.configDigest, defineConfigHome: I.defineConfigHome,
    // The unit house (engine/board/unit/) — the registry, the stat record, where
    // the pieces are, and what a type is worth to each layer. Its screen dialect
    // is game/ui/board/unit/.
    Units: I.Units,
    defineUnit: I.defineUnit, unitTypes: I.unitTypes, unitOf: I.unitOf,
    unitStock: I.unitStock, unitValue: I.unitValue, deployPoints: I.deployPoints,
    unitStockProblem: I.unitStockProblem, orphanRowProblem: I.orphanRowProblem,
    checkUnitStock: I.checkUnitStock,
    SHAPES: I.SHAPES, DEFAULT_SHAPE: I.DEFAULT_SHAPE, boardHexes: I.boardHexes, setBoard: I.setBoard, hexes: I.hexes,
    buildShape: I.buildShape, ensureMapShape: I.ensureMapShape,
    currentShape: I.currentShape, rot180: I.rot180, buildTerrain: I.buildTerrain, hexLabel: I.hexLabel,
    // The terrain house (engine/board/terrain/) — the registry, the side questions
    // and the shared physical model. UI, editor and dev tools read the types from
    // here rather than respelling the list.
    defineTerrain: I.defineTerrain, terrainTypes: I.terrainTypes, terrainOf: I.terrainOf,
    terrainNamed: I.terrainNamed, mapTerrainTypes: I.mapTerrainTypes,
    terrainAt: I.terrainAt, sideEffect: I.sideEffect, Trenches: I.Trenches,
    pieceProblem: I.pieceProblem, stockCap: I.stockCap, splitPieceRun: I.splitPieceRun,
    PIECE_LENGTHS: I.PIECE_LENGTHS,
    // The hex house (engine/board/hex/hex.js) — the coordinate vocabulary everything
    // above is written in. Its screen dialect is game/ui/board/hex/hex-screen.js.
    DIRS: I.DIRS, DIR_NAMES: I.DIR_NAMES, dirName: I.dirName, oppositeDir: I.oppositeDir,
    key: I.key, parseKey: I.parseKey, step: I.step, dist: I.dist, dirBetween: I.dirBetween,
    edgeKey: I.edgeKey, sideKey: I.sideKey, parseSideKey: I.parseSideKey,
    sideHex: I.sideHex, sideDir: I.sideDir, facingSide: I.facingSide,
    // The board's outline question: which of a hex's six neighbours exist.
    inBoard: I.inBoard, neighbor: I.neighbor, neighbors: I.neighbors, edgeFrom: I.edgeFrom,
    other: I.other,
    newBattle: I.newBattle, newSkirmish: I.newSkirmish, view: I.view,
    unitAt: I.unitAt, isHQ: I.isHQ, isEmpty: I.isEmpty, controlledHexes: I.controlledHexes,
    deployTargets: I.deployTargets, deployBlocked: I.deployBlocked, trenchTargets: I.trenchTargets, trenchOrientations: I.trenchOrientations,
    listAttacks: I.listAttacks, listRepositions: I.listRepositions, listBarrageTargets: I.listBarrageTargets,
    computeAttack: I.computeAttack, supportFor: I.supportFor, playCard: I.playCard, currentStep: I.currentStep,
    stepOptions: I.stepOptions, applyStep: I.applyStep, mustPlayStep: I.mustPlayStep, cardsRemaining: I.cardsRemaining,
    enumerateChoices: I.enumerateChoices,
    concede: I.concede, concedeAdvised: I.concedeAdvised, fieldScore: I.fieldScore,
    aiPlanTurn: I.aiPlanTurn, rankChoices: I.rankChoices, clone: I.clone, cloneForSim: I.cloneForSim, evalState: I.evalState, validateMaps: I.validateMaps,
    AI_PRESETS: I.AI_PRESETS, AI_WEIGHTS: I.AI_WEIGHTS, AI_TUNING: I.AI_TUNING, aiConfig: I.aiConfig, CARD_KEEP: I.CARD_KEEP,
    hooks: I.HOOKS,
    // The batch/measurement layer (skirmish sweeps + balance folds) is NOT on the
    // engine surface — it lives in game/sim.js (WOA_SIM), built on playToEnd.
    playToEnd: I.playToEnd
  };
  // One slot per physical piece on the player mat: a reserve nobody has spent.
  // Read live, not snapshotted, so the mat and a full reserve can never disagree
  // about what the box holds.
  Object.defineProperty(Engine, 'PIECE_TOTALS', { enumerable: true, get: I.copyReserves });

  global.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
