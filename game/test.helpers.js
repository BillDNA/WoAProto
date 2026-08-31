/* Shared fixtures for the split engine test files (ADR-0003). Extracted verbatim
   from the old game/test.js preamble; the bespoke ok()/fails harness is retired
   in favour of node:test + node:assert. */
'use strict';
var E = require('./engine.js');
var nodeTest = require('node:test');
var REG = require('./test-registry.js');

/* Invariant/pin labelling (ADR-0004, #189). Every test file imports `test` from
   HERE instead of from node:test, so that registering a test also records its
   name (and whether it is skipped) into a shared collection the suite-guards read.
   The DEFAULT label is PIN: a bare `test('name', fn)` is a pin of this era's
   behaviour, movable by the test-writer role atomically with a RULES_VERSION bump.
   An INVARIANT — a property that must hold every rules era — must say so
   explicitly with `invariant('<category>', 'name', fn)`; it may not hide behind
   the default. The registry in test-registry.js is the exhaustive, audited list. */
var _ALL_TESTS = [];        // [{name, skipped}] — every registered test
var _INVARIANTS = [];       // [{category, name}] — the labelled invariant set
var _ONLY = [];             // names registered with .only (illegal in committed code)

function record(name, skipped) { _ALL_TESTS.push({ name: name, skipped: !!skipped }); }

// Drop-in for node:test's `test`: same signature, records the name as an active
// (non-skipped) pin, then delegates. `.skip`/`.todo` record as skipped so the
// deletion guard treats a `.skip`-ed base test as removed.
function test(name) {
  record(name, false);
  return nodeTest.test.apply(nodeTest, arguments);
}
test.skip = function (name) { record(name, true); return nodeTest.test.skip.apply(nodeTest.test, arguments); };
test.todo = function (name) { record(name, true); return nodeTest.test.todo.apply(nodeTest.test, arguments); };
test.only = function (name) { _ONLY.push(name); record(name, false); return nodeTest.test.only.apply(nodeTest.test, arguments); };

// Explicit pin — identical to the default `test`, for a site that wants to say so.
function pin(name, fn) { record(name, false); return nodeTest.test(name, fn); }

// Label a test as an INVARIANT under one of the frozen categories. Records into
// both collections; the registry guard reds if this set drifts from the registry.
function invariant(category, name, fn) {
  if (REG.CATEGORIES.indexOf(category) < 0) {
    throw new Error('invariant(): unknown category "' + category + '" (frozen set: ' + REG.CATEGORIES.join(', ') + ')');
  }
  _INVARIANTS.push({ category: category, name: name });
  record(name, false);
  return nodeTest.test(name, fn);
}

function collectedInvariants() { return _INVARIANTS.slice(); }
function activeTestNames() { return _ALL_TESTS.filter(function (t) { return !t.skipped; }).map(function (t) { return t.name; }); }
function allTests() { return _ALL_TESTS.slice(); }
function onlyTests() { return _ONLY.slice(); }
function duplicateTestNames() {
  var seen = {}, dups = {};
  _ALL_TESTS.forEach(function (t) { if (seen[t.name]) dups[t.name] = true; seen[t.name] = true; });
  return Object.keys(dups);
}

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

module.exports = {
  E, TESTMAP, testSkirmish, fixtureCard, ALL_DECK_CARDS,
  test, pin, invariant, collectedInvariants, activeTestNames, allTests, onlyTests, duplicateTestNames,
};
