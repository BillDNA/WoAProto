/* War of Attrition — engine part 07: the public Engine surface.
   Assembles the exact export key list from the shared namespace and publishes
   g.Engine (node's ../engine.js re-exports it; the browser reads window.Engine). */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  var Engine = {
    VERSION: I.RULES_VERSION,
    DIRS: I.DIRS, UNITS: I.UNITS, CARDS: I.CARDS, CARD_BY_ID: I.CARD_BY_ID, MAPS: I.MAPS,
    PIECE_TOTALS: I.PIECE_TOTALS, TERRAIN_STOCK: I.TERRAIN_STOCK,
    SHAPES: I.SHAPES, DEFAULT_SHAPE: I.DEFAULT_SHAPE, boardHexes: I.boardHexes, setBoard: I.setBoard, hexes: I.hexes,
    buildShape: I.buildShape, ensureMapShape: I.ensureMapShape,
    currentShape: I.currentShape, rot180: I.rot180, buildTerrain: I.buildTerrain, pieceProblem: I.pieceProblem, hexLabel: I.hexLabel,
    key: I.key, parseKey: I.parseKey, inBoard: I.inBoard, neighbor: I.neighbor, neighbors: I.neighbors,
    dist: I.dist, dirBetween: I.dirBetween, edgeKey: I.edgeKey, edgeFrom: I.edgeFrom, sideKey: I.sideKey, other: I.other,
    newMatch: I.newMatch, newBattle: I.newBattle,
    unitAt: I.unitAt, isHQ: I.isHQ, isEmpty: I.isEmpty, controlledHexes: I.controlledHexes,
    deployTargets: I.deployTargets, riverBetween: I.riverBetween, trenchTargets: I.trenchTargets, trenchOrientations: I.trenchOrientations,
    listAttacks: I.listAttacks, listRepositions: I.listRepositions, listBarrageTargets: I.listBarrageTargets,
    computeAttack: I.computeAttack, supportFor: I.supportFor, playCard: I.playCard, currentStep: I.currentStep,
    stepOptions: I.stepOptions, applyStep: I.applyStep, mustPlayStep: I.mustPlayStep, cardsRemaining: I.cardsRemaining,
    enumerateChoices: I.enumerateChoices,
    concede: I.concede, concedeAdvised: I.concedeAdvised, fieldScore: I.fieldScore,
    aiPlanTurn: I.aiPlanTurn, clone: I.clone, cloneForSim: I.cloneForSim, evalState: I.evalState, validateMaps: I.validateMaps,
    AI_PRESETS: I.AI_PRESETS, AI_WEIGHTS: I.AI_WEIGHTS, aiConfig: I.aiConfig, CARD_KEEP: I.CARD_KEEP,
    hooks: I.HOOKS,
    simBattle: I.simBattle, balanceMap: I.balanceMap,
    balanceNew: I.balanceNew, balanceAdd: I.balanceAdd, balanceSeed: I.balanceSeed, balanceFP: I.balanceFP
  };
  global.Engine = Engine;
})(typeof window !== 'undefined' ? window : globalThis);
