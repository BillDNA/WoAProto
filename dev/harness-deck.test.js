#!/usr/bin/env node
/* dev/harness-deck.test.js — red-test for the harness-deck builder (#167).
   The BALANCE pass PINS one authored card into a legal harness deck so the
   engine — which plays decks — can measure that one card. This proves the
   builder seats the card at count 1 in a legal, playable 16-card deck, and
   that an illegal card comes back as problems (never a throw, never fed to the
   engine as a broken deck). Run: node dev/harness-deck.test.js */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const E = require(path.join(__dirname, '..', 'game', 'engine.js'));
const harness = require(path.join(__dirname, 'harness-deck.js'));

// A small real catalog to seat into (the active deck's resolved cards).
const CATALOG = E.CARDS.slice();

test('seatCard pins the card at count 1 in a legal, playable 16-card deck', function () {
  const card = CATALOG.find(c => (c.steps || []).some(s => s.type === 'attack')) || CATALOG[0];
  const r = harness.seatCard(card, { catalog: CATALOG });

  assert.deepStrictEqual(r.problems, [], 'a real catalog card seats legally: ' + JSON.stringify(r.problems));
  // The engine's own legality primitive agrees (one implementation of "legal").
  assert.deepStrictEqual(E.deckProblems(r.deck.cards), [], 'E.deckProblems agrees the harness is legal');

  const total = r.deck.cards.reduce((s, c) => s + c.count, 0);
  assert.strictEqual(total, 16, 'harness totals 16 cards (got ' + total + ')');
  const starting = r.deck.cards.filter(c => c.starting);
  assert.strictEqual(starting.length, 1, 'exactly one starting card');
  assert.notStrictEqual(starting[0].id, card.id, 'the pinned card is not the opener/starting card');

  const pin = r.deck.cards.find(c => c.id === card.id);
  assert.ok(pin, 'the pinned card is present in the harness');
  assert.strictEqual(pin.count, 1, 'the pinned card sits at count 1 (measured directly, not hoarded)');
  assert.ok(!pin.starting, 'the pinned card is not marked starting');
});

test('the harness deck actually plays (a real AI sweep finishes skirmishes)', function () {
  const card = CATALOG[0];
  const r = harness.seatCard(card, { catalog: CATALOG });
  const map = E.mapPool()[0];
  // The real sweep path the loop uses: balanceMap runs the harness on both sides.
  const agg = E.balanceMap(map, 2, { diffRed: 'normal', diffBlue: 'normal', seedBase: 4242,
    decks: { red: r.deck, blue: r.deck } });
  assert.ok(agg.n >= 2 && (agg.n - (agg.unfinished || 0)) >= 1, 'the pinned harness plays real skirmishes to completion');
  // The pinned card actually saw play in the harness (it is measurable, not dead weight).
  assert.ok(agg.cards && agg.cards[card.id] && agg.cards[card.id].plays >= 1,
    'the pinned card is drawn + played in its harness (measurable columns exist)');
});

test('an illegal card comes back as problems, never a throw and never a deck', function () {
  const bad = { id: 'bad_probe', name: 'Bad Probe', text: 'nope', steps: [{ type: 'teleport' }] };
  let r;
  assert.doesNotThrow(() => { r = harness.seatCard(bad, { catalog: CATALOG }); }, 'seatCard never throws on a bad card');
  assert.ok(r.problems.length >= 1, 'the illegal card is reported as problems (got ' + JSON.stringify(r.problems) + ')');
  // The problems are attributable to the card (its bad step), not spurious deck noise.
  assert.ok(r.problems.some(p => /teleport|step|type/i.test(p)), 'the problem names the card fault: ' + JSON.stringify(r.problems));
});

test('seatCard is honest when the catalog is too thin to build an opener + filler', function () {
  const card = CATALOG[0];
  const r = harness.seatCard(card, { catalog: [card] });   // nothing else to draw opener/filler from
  assert.ok(r.problems.length >= 1, 'a one-card catalog cannot seat a harness — reported, not thrown');
});
