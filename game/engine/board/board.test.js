/* The board's outline: which hexes a shape has, what a map's own shapeDef adds,
   the grid reference each hex ends up with, and that a new authored form is one
   file. The hex vocabulary these are written in has its own suite (hex/hex.test.js)
   — every test here needs an outline, which is what makes it the board's.

   Run alone with `node game/engine/board/board.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, SIM } = require('../../test/test.helpers.js');

test('shapes (data-driven from maps.js)', () => {
(function () {
  var names = E.shapeNames();
  assert.ok(names.length >= 4, names.length + ' board shapes defined');
  assert.ok(!E.hasShape('grand') && !E.hasShape('wide'), 'grand and wide boards are gone');
  var floor = E.CONFIG.mapHexFloor, ceiling = E.CONFIG.mapHexCeiling;
  names.forEach(function (n) {
    var hexes = E.boardHexes(n);
    assert.ok(hexes.length >= floor && hexes.length <= ceiling,
      n + ': ' + hexes.length + ' hexes (physical band is ' + floor + '-' + ceiling + ')');
    assert.ok(E.outlineSymmetric(E.outline(n)), n + ': point-symmetric (Mirror & fair HQs work)');
    var set = {};
    hexes.forEach(function (k) { set[k] = true; });
    var symOk = hexes.every(function (k) {
      var qr = E.parseKey(k);
      var rr = E.rot180(n, qr[0], qr[1]);
      return set[E.key(rr[0], rr[1])];
    });
    assert.ok(symOk, n + ': 180-degree rotation maps the board onto itself');
  });
})();
});

test('classic board (physical prototype, rows 4-5-6-5-4)', () => {
(function () {
  var hexes = E.boardHexes('classic');
  assert.ok(hexes.length === 24, '24 hexes (got ' + hexes.length + ')');
  var rows = E.outlineRows(E.outline('classic')).map(function (r) { return r.length; });
  assert.deepStrictEqual(rows, [4, 5, 6, 5, 4], 'row counts are 4,5,6,5,4 (got ' + JSON.stringify(rows) + ')');
})();
});

test('human-readable grid labels', () => {
(function () {
  E.setBoard('classic');
  assert.ok(E.hexLabel('-1,-2') === 'A1', 'top-left of classic is A1 (got ' + E.hexLabel('-1,-2') + ')');
  assert.ok(E.hexLabel('0,0') === 'C4', 'centre-ish hex is C4 (got ' + E.hexLabel('0,0') + ')');
  assert.ok(E.hexLabel('0,2') === 'E4', 'bottom-right of classic is E4 (got ' + E.hexLabel('0,2') + ')');
  assert.ok(E.hexLabel('9,9') === '9,9', 'off-board key falls back to raw coords');
})();
});

test('an outline that is not the live board answers without moving it', () => {
(function () {
  E.setBoard('classic');
  var other = E.shapeNames().filter(function (n) { return n !== 'classic'; })[0];
  var o = E.outline(other);
  assert.ok(E.outlineHexes(o).length > 0, other + ' answers its hex list');
  assert.ok(E.outlineLabel(o, E.outlineHexes(o)[0]) === 'A1', 'and its own grid labels');
  assert.ok(E.currentShape() === 'classic', 'the live board did not move');
  // a shapeDef map likewise: nothing is registered, nothing switches
  var def = { name: 'Ad hoc', id: 'adhoc1', shapeDef: { hexes: [[0, 0], [1, 0], [0, 1]] } };
  assert.ok(E.outlineHexes(E.outline(def)).length === 3, 'a shapeDef map answers off the live board');
  assert.ok(!E.hasShape('@adhoc1'), 'and registers nothing');
  assert.ok(E.currentShape() === 'classic', 'and still does not move it');
})();
});

test('custom board shapes (explicit hex sets)', () => {
(function () {
  // explicit hex set builds like a rows shape
  var s = E.buildShape('tst', { hexes: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]] });
  assert.ok(E.outlineHexes(s).length === 5, 'hex-set shape builds (5 hexes)');
  // a hole in a row leaves a GAP in the labels: hexes keep their columns
  var holed = E.buildShape('holed', { hexes: [[0, 0], [2, 0]] });
  assert.ok(E.outlineLabel(holed, '2,0') === 'A3', 'a hole leaves a gap: the far hex is still A3');
  // label check needs the shape current: run it through a map + newSkirmish
  var IRR = { name: 'Irregular', id: 'irr1', redHQ: [0, -1], blueHQ: [0, 1],
    shapeDef: { hexes: [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1]] }, pieces: [] };
  assert.ok(E.validateMaps([IRR]).length === 0, 'irregular map validates: ' + E.validateMaps([IRR]).join('; '));
  var m = E.newBattle({ seed: 5, firstPlayer: 'red', maps: [IRR] });
  var st = E.newSkirmish(m);
  assert.ok(st.board.boardShape === '@irr1', 'inline shapeDef registered under @<map id> (got ' + st.board.boardShape + ')');
  assert.ok(E.hexes().length === 7, 'skirmish runs on the 7-hex board');
  assert.ok(E.hexLabel('-1,0') === 'B1' && E.hexLabel('0,0') === 'B2', 'labels count from the leftmost hex');
  // point-symmetry from a hex set (this outline is symmetric about 0,0 -> Mirror works)
  assert.ok(E.outlineSymmetric(E.outline('@irr1')), 'symmetric hex set gets a rot180 centre');
  // a hole in a row leaves a GAP in the labels (hexes keep their columns)
  var HOLED = { name: 'Holed', id: 'hole1', redHQ: [0, -1], blueHQ: [0, 1],
    shapeDef: { hexes: [[0, -1], [1, -1], [-1, 0], [0, 0], [2, 0], [-1, 1], [0, 1]] }, pieces: [] };
  var m2 = E.newBattle({ seed: 6, firstPlayer: 'red', maps: [HOLED] });
  E.newSkirmish(m2);
  assert.ok(E.hexLabel('2,0') === 'B4', 'a hole leaves a gap in the numbering (2,0 stays B4, got ' + E.hexLabel('2,0') + ')');
  assert.ok(E.neighbor('0,0', 0) === null, 'the missing hex is truly off-board');
  E.setBoard('@irr1');
  var asym = E.buildShape('asym', { hexes: [[0, 0], [1, 0], [0, 1]] });
  assert.ok(!E.outlineSymmetric(asym), 'asymmetric hex set has no centre (Mirror disabled)');
  // the hex ceiling is enforced for edited shapes
  var big = [];
  for (var q = 0; q < 5; q++) for (var r = 0; r < 5; r++) big.push([q, r]);
  var BIGMAP = { name: 'Too Big', id: 'big1', redHQ: [0, 0], blueHQ: [4, 4],
    shapeDef: { hexes: big }, pieces: [] };
  assert.ok(E.validateMaps([BIGMAP]).some(function (p) { return p.indexOf(E.CONFIG.mapHexCeiling + '-hex ceiling') >= 0; }),
    'edited shape past the hex ceiling rejected by validateMaps');
  // an edited shape can play a full AI skirmish
  var sim = SIM.simSkirmish(IRR, 99, 'red', 'normal', 'normal');
  assert.ok(sim.flow.phase === 'skirmish-over', 'AI skirmish completes on an irregular board (winner ' + sim.result.skirmishWinner + ')');
})();
});

test('a row reads left to right, whatever order it was authored in', () => {
(function () {
  // the hexes form is what the shape editor writes, and it has no order to it
  var jumbled = E.buildShape('jumbled', { hexes: [[2, 0], [0, 0], [1, 0], [0, 1], [1, 1]] });
  assert.deepStrictEqual(E.outlineRows(jumbled)[0], ['0,0', '1,0', '2,0'],
    'the top row comes back in grid order');
  assert.deepStrictEqual(E.outlineRows(jumbled).map(function (r) { return r.length; }), [3, 2],
    'and the rows themselves are top-first');
  // which is what makes a label and its column agree
  assert.strictEqual(E.outlineLabel(jumbled, E.outlineRows(jumbled)[0][0]), 'A1',
    'the first hex of a row is that row\'s column 1');
})();
});

test('a malformed outline is a problem, not a board left switched under a live game', () => {
(function () {
  E.setBoard('classic');
  var BAD = { name: 'Bad', id: 'bad1', redHQ: [0, 0], blueHQ: [1, 0],
    shapeDef: { hexes: [[0, 0], [0, 0]] }, pieces: [] };   // the same hex twice
  var problems = E.validateMaps([BAD]);
  assert.ok(problems.some(function (p) { return /duplicate hex/.test(p); }),
    'the duplicate is reported: ' + problems.join('; '));
  assert.strictEqual(E.currentShape(), 'classic', 'and the live board is put back');
})();
});

test('a new authored outline form is one file, live with no edit anywhere else', () => {
(function () {
  // The third form the ticket names — the shape editor's future output, a ring
  // written as a centre and a radius. One defineOutlineForm call, nothing else
  // touched, and every question the board answers works over it.
  E.defineOutlineForm({
    form: 'ring',
    has: function (def) { return !!def.ring; },
    hexes: function (def) {
      var out = [], rad = def.ring;
      for (var q = -rad; q <= rad; q++)
        for (var r = -rad; r <= rad; r++)
          if (Math.abs(q + r) <= rad) out.push([q, r]);
      return out;
    }
  });
  var RING = { name: 'Ring', id: 'ring1', redHQ: [-1, 0], blueHQ: [1, 0],
    shapeDef: { ring: 1 }, pieces: [] };
  assert.strictEqual(E.validateMaps([RING]).length, 0,
    'a ring-form map validates: ' + E.validateMaps([RING]).join('; '));
  var st = E.newSkirmish(E.newBattle({ seed: 7, firstPlayer: 'red', maps: [RING] }));
  assert.strictEqual(st.board.boardShape, '@ring1', 'the ring outline is the live board');
  assert.strictEqual(E.hexes().length, 7, 'radius-1 ring is 7 hexes');
  assert.strictEqual(E.hexLabel('0,0'), 'B2', 'grid labels read off the new form');
  assert.ok(E.outlineSymmetric(E.outline('@ring1')), 'and point-symmetry is answered over it');
  assert.strictEqual(E.neighbors('0,0').length, 6, 'and the neighbour filter is built from it');
  var sim = SIM.simSkirmish(RING, 42, 'red', 'normal', 'normal');
  assert.strictEqual(sim.flow.phase, 'skirmish-over', 'an AI skirmish plays out on it');
  E.setBoard('classic');
})();
});
