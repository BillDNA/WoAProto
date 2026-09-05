/* The hex house's own tests — the coordinate dialect. Pure vocabulary: no
   board, no map, no state is set up here, which is the point of the house.

   Run alone with `node game/engine/hex/hex.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const E = require('../../engine.js');

test('a hex is its key, and the key round-trips', () => {
  assert.equal(E.key(3, -2), '3,-2');
  assert.deepEqual(E.parseKey('3,-2'), [3, -2]);
  assert.deepEqual(E.parseKey(E.key(-1, 0)), [-1, 0]);
});

test('the six directions are an order, and each is its own opposite twice over', () => {
  assert.equal(E.DIRS.length, 6);
  assert.equal(E.DIR_NAMES.length, 6);
  for (let d = 0; d < 6; d++) {
    assert.equal(E.oppositeDir(E.oppositeDir(d)), d, 'd' + d + ' returns to itself');
    // stepping out and back is the identity, for any hex, on or off a board
    assert.equal(E.step(E.step('4,-1', d), E.oppositeDir(d)), '4,-1');
    assert.equal(E.dirName(d), E.DIR_NAMES[d]);
  }
});

test('step is the abstract neighbour — six of them, always, board or no board', () => {
  const seen = {};
  for (let d = 0; d < 6; d++) seen[E.step('0,0', d)] = true;
  assert.equal(Object.keys(seen).length, 6, 'six distinct neighbours');
  // far off any shipped outline, and still six
  const far = {};
  for (let d = 0; d < 6; d++) far[E.step('99,99', d)] = true;
  assert.equal(Object.keys(far).length, 6);
});

test('dirBetween is the inverse of step, and -1 for non-neighbours', () => {
  for (let d = 0; d < 6; d++) assert.equal(E.dirBetween('0,0', E.step('0,0', d)), d);
  assert.equal(E.dirBetween('0,0', '2,0'), -1, 'two hexes apart is no direction');
  assert.equal(E.dirBetween('0,0', '0,0'), -1, 'a hex is not its own neighbour');
});

test('dist is the hex metric: 0 to itself, 1 to any neighbour, symmetric', () => {
  assert.equal(E.dist('2,3', '2,3'), 0);
  for (let d = 0; d < 6; d++) assert.equal(E.dist('2,3', E.step('2,3', d)), 1);
  assert.equal(E.dist('0,0', '3,0'), 3);
  assert.equal(E.dist('0,0', '0,3'), 3);
  assert.equal(E.dist('0,0', '-2,-1'), 3, 'the third axis, not a taxicab count');
  assert.equal(E.dist('1,-4', '-2,2'), E.dist('-2,2', '1,-4'));
});

test('an edge is named the same from either end; a side is one hex\'s face of it', () => {
  const a = '0,0', b = E.step(a, 0);
  assert.equal(E.edgeKey(a, b), E.edgeKey(b, a));
  assert.notEqual(E.sideKey(a, 0), E.sideKey(b, 3), 'the two faces of one border are distinct');
  assert.equal(E.facingSide(a, 0), E.sideKey(b, E.dirBetween(b, a)));
  // facingSide is its own inverse: the far face's far face is where we started
  for (let d = 0; d < 6; d++) {
    const far = E.parseSideKey(E.facingSide('1,1', d));
    assert.equal(E.facingSide(far[0], far[1]), E.sideKey('1,1', d));
  }
});

test('a side key parses back to the hex and the direction that made it', () => {
  ['0,0', '-3,4', '12,-7'].forEach(h => {
    for (let d = 0; d < 6; d++) {
      const sk = E.sideKey(h, d);
      assert.deepEqual(E.parseSideKey(sk), [h, d]);
      assert.equal(E.sideHex(sk), h);
      assert.equal(E.sideDir(sk), d);
    }
  });
});

/* The house's extension check. A vocabulary house has no variants to add — what
   it must survive instead is a coordinate it has never been shown, arriving from
   a caller it does not know about. Every question below is asked about hexes far
   outside every shipped board outline, with no board set up at all. */
test('one more coordinate: the vocabulary answers off any board, with no edit anywhere', () => {
  const k = E.key(1000, -1000);
  assert.deepEqual(E.parseKey(k), [1000, -1000]);
  assert.equal(E.dist(k, E.step(k, 2)), 1);
  assert.equal(E.dirBetween(k, E.step(k, 2)), 2);
  assert.equal(E.sideHex(E.facingSide(k, 2)), E.step(k, 2));
  assert.equal(E.edgeKey(k, E.step(k, 2)), E.edgeKey(E.step(k, 2), k));
  // and the board's outline answer for the same hex is "none of them exist"
  for (let d = 0; d < 6; d++) assert.equal(E.neighbor(k, d), null);
});

/* The line this house draws with the board: the step is the hex's, the filter is
   the board's. Pinned so a later session cannot quietly move the filter down. */
test('the board filters the six steps; the house does not know about outlines', () => {
  E.setBoard('classic');
  const on = E.hexes();
  on.forEach(h => {
    for (let d = 0; d < 6; d++) {
      const stepped = E.step(h, d);
      const nb = E.neighbor(h, d);
      assert.ok(nb === null || nb === stepped, 'a neighbour is always the step or nothing');
      assert.equal(nb !== null, on.indexOf(stepped) >= 0, 'exactly the on-board steps survive');
    }
    assert.deepEqual(E.neighbors(h).slice().sort(),
      [0, 1, 2, 3, 4, 5].map(d => E.step(h, d)).filter(k => on.indexOf(k) >= 0).sort());
  });
});

test('the parse memo hands back the same pair, and callers may not scribble on it', () => {
  const a = E.parseKey('7,7');
  assert.strictEqual(E.parseKey('7,7'), a, 'memoized by contract, not copied');
  assert.deepEqual(a, [7, 7]);
});
