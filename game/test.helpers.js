/* Shared fixtures for the split engine test files (ADR-0003). Extracted verbatim
   from the old game/test.js preamble; the bespoke ok()/fails harness is retired
   in favour of node:test + node:assert. */
'use strict';
var E = require('./engine.js');
// The batch/measurement layer (sweeps + balance folds), separate from the engine.
// simSkirmish/balanceMap/etc live here, not on E.
var SIM = require('./sim.js');

// A bare classic-board map so rules tests are deterministic regardless of the
// built-in map library. HQs in opposite corners, no terrain.
var TESTMAP = { name: 'Test Range', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2], pieces: [] };
function testSkirmish(seed) {
  var m = E.newBattle({ seed: seed, firstPlayer: 'red', maps: [TESTMAP] });
  return E.newSkirmish(m);
}

// Card-behaviour fixtures: pin a card's DEF from the full content catalog (every
// deck loaded from content/decks/, not just the active deck's resolved list) so a
// test can exercise a card the active deck cut. Registers into E.CARD_BY_ID
// without touching E.CARDS, so the fixture never leaks into a shuffled deck.
var ALL_DECK_CARDS = [].concat.apply([], ((typeof global !== 'undefined' && global.WOA_CONTENT && global.WOA_CONTENT.decks) || [])
  .map(function (d) { return d.cards || []; }));
function fixtureCard(id) {
  if (!E.CARD_BY_ID[id]) {
    var def = ALL_DECK_CARDS.filter(function (c) { return c.id === id; })[0];
    if (!def) throw new Error('fixtureCard: "' + id + '" not found in any loaded deck');
    E.CARD_BY_ID[id] = def;
  }
  return E.CARD_BY_ID[id];
}

module.exports = { E, SIM, TESTMAP, testSkirmish, fixtureCard, ALL_DECK_CARDS };
