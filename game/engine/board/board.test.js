/* The board house's own tests, engine half: the shape base and its form rooms.

   Run alone with `node game/engine/board/board.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const E = require(path.join(__dirname, '..', '..', 'engine.js'));
const ORDER = require(path.join(__dirname, '..', '..', 'load-order.js'));

test('every authored outline form is a room of its own, scheduled by load-order', () => {
  assert.deepEqual(E.shapeForms().map(f => f.id).sort(), ['hexes', 'rows']);
  ['rows', 'hexes'].forEach(id =>
    assert.ok(ORDER.ENGINE.includes('engine/board/shapes/' + id + '.js'), id + ' has its own room'));
  assert.ok(!ORDER.ENGINE.some(p => /engine\/0\d-board/.test(p)), 'the board is a house, not a numbered part');
});

test('both forms describe the same board', () => {
  const rows = E.buildShape('fixture-rows', { rows: [[0, 0, 2], [1, 0, 1]] });
  const hexes = E.buildShape('fixture-hexes', { hexes: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]] });
  assert.deepEqual(rows.list.slice().sort(), hexes.list.slice().sort());
  assert.deepEqual(rows.rowQFrom, hexes.rowQFrom, 'the grid labels count from the same place');
});

test('an outline no room recognises is a throw, not an empty board', () => {
  assert.throws(() => E.buildShape('fixture', { label: 'nothing' }), /no authored outline/);
  assert.throws(() => E.buildShape('fixture', { rows: [[0, 0, 1], [0, 0, 1]] }), /listed twice/);
  assert.throws(() => E.buildShape('fixture', { hexes: [[0, 0], [0, 0]] }), /duplicate hex/);
});

// What the base owns, once, for every form: symmetry is what makes a map fair.
test('the base answers symmetry for any form it is handed', () => {
  assert.ok(E.buildShape('fixture', { rows: [[0, 0, 2], [1, 0, 2]] }).centre, 'a regular block is symmetric');
  assert.strictEqual(E.buildShape('fixture', { hexes: [[0, 0], [1, 0], [0, 1]] }).centre, null);
});

// The house's "one more form" proof.
test('a form registered from nothing builds a board through the same base', () => {
  E.defineShapeForm({
    id: 'fixture-ring',
    has: def => !!def.ring,
    hexes: (def, add) => { add(0, 0); for (let d = 0; d < 6; d++) add(E.DIRS[d][0], E.DIRS[d][1]); }
  });
  const s = E.buildShape('fixture', { ring: 1 });
  assert.strictEqual(s.list.length, 7);
  assert.ok(s.centre, 'and gets symmetry, labels and containment for free');
  assert.throws(() => E.defineShapeForm({ id: 'fixture-ring', has: () => false, hexes: () => {} }), /duplicate/);
});

test('the hex ceiling is the board answering, not the validator', () => {
  const big = { name: 'big', shapeDef: { rows: [[0, 0, 40]] } };
  E.ensureMapShape(big);
  assert.match(E.boardShapeProblem(big), /exceeds the .* ceiling/);
  assert.strictEqual(E.boardShapeProblem({ name: 'ok', shape: E.DEFAULT_SHAPE }), null);
});
