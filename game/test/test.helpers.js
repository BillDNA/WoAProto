/* Shared fixtures for the split engine test files (ADR-0003). Extracted verbatim
   from the old game/test.js preamble; the bespoke ok()/fails harness is retired
   in favour of node:test + node:assert. */
'use strict';
var E = require('../engine.js');
// The batch/measurement layer (sweeps + balance folds), separate from the engine.
// simSkirmish/balanceMap/etc live here, not on E.
var SIM = require('../sim.js');

// A bare classic-board map so rules tests are deterministic regardless of the
// built-in map library. HQs in opposite corners, no terrain.
var TESTMAP = { name: 'Test Range', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2], pieces: [] };
function testSkirmish(seed) {
  var m = E.newBattle({ seed: seed, firstPlayer: 'red', maps: [TESTMAP] });
  return E.newSkirmish(m);
}

// Card-behaviour fixtures: pin a card's DEF from the shared pool (content/cards/ — the
// full catalog, not just the active battalion's resolved list) so a test can exercise a
// card the active battalion cut. Registers into E.CARD_BY_ID without touching E.CARDS,
// so the fixture never leaks into a shuffled draw pile.
var ALL_BATTALION_CARDS = (E.CARD_POOL || []).slice();
function fixtureCard(id) {
  if (!E.CARD_BY_ID[id]) {
    var def = ALL_BATTALION_CARDS.filter(function (c) { return c.id === id; })[0];
    if (!def) throw new Error('fixtureCard: "' + id + '" not found in the card pool');
    E.CARD_BY_ID[id] = def;
  }
  return E.CARD_BY_ID[id];
}

// A house's contract test proves "one more room, live" by registering a fixture
// room, and a registry has a define and no undefine — so the fixture would be in
// every suite that ran after it. Hand the test its own engine instead: drop the
// module cache and the globals the classic scripts hang off, and require again.
// The screen street already works this way (the mark tests build their registry
// in a fresh vm context per test); this is the engine street's version.
//
// The invariant a registry actually has is "a room is defined once, at load" —
// which a private engine satisfies exactly. Ordering the gate around a leaked
// fixture does not.
function freshEngine() {
  Object.keys(require.cache).forEach(function (k) { if (k.indexOf('/game/') >= 0) delete require.cache[k]; });
  ['Engine', 'WOA_E', 'WOA_BUILTIN', 'WOA_CONTENT', 'WOA_LOAD_ORDER', 'WOA_SIM'].forEach(function (g) { delete globalThis[g]; });
  var FE = require('../engine.js');
  return { E: FE, SIM: require('../sim.js') };
}

module.exports = { E, SIM, TESTMAP, testSkirmish, fixtureCard, ALL_BATTALION_CARDS, freshEngine };
