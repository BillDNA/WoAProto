/* Shared fixtures for the split engine test files (ADR-0003). Extracted verbatim
   from the old game/test.js preamble; the bespoke ok()/fails harness is retired
   in favour of node:test + node:assert. */
'use strict';
var E = require('./engine.js');

// A bare classic-board map so rules tests are deterministic regardless of the
// built-in roster. HQs in opposite corners, no terrain.
var TESTMAP = { name: 'Test Range', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2], pieces: [] };
function testSkirmish(seed) {
  var m = E.newMatch({ seed: seed, firstPlayer: 'red', maps: [TESTMAP] });
  return E.newSkirmish(m);
}

// Card-behaviour fixtures: pin a card's DEF from the card catalog (#159:
// WOA_CONTENT.cards is the single definition site — every card, including
// catalog-only cards in no shipped deck) so a test can exercise a card the
// active deck cut. Registers into E.CARD_BY_ID without touching E.CARDS, so the
// fixture never leaks into a shuffled deck.
var ALL_DECK_CARDS = ((typeof global !== 'undefined' && global.WOA_CONTENT && global.WOA_CONTENT.cards) || []).slice();
function fixtureCard(id) {
  if (!E.CARD_BY_ID[id]) {
    var def = ALL_DECK_CARDS.filter(function (c) { return c.id === id; })[0];
    if (!def) throw new Error('fixtureCard: "' + id + '" not found in the card catalog (content/cards/)');
    E.CARD_BY_ID[id] = def;
  }
  return E.CARD_BY_ID[id];
}

module.exports = { E, TESTMAP, testSkirmish, fixtureCard, ALL_DECK_CARDS };
