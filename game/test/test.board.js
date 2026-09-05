/* The board's outline: which hexes a shape has, what a map's own shapeDef adds,
   and the grid reference each hex ends up with. The hex vocabulary these are
   written in has its own suite (game/engine/board/hex/hex.test.js) — every test here
   needs a board, which is what makes it the board's.

   Moves into the board house when that is built. Run alone with
   `node game/test/test.board.js`, or the whole gate with `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, SIM } = require('./test.helpers.js');

test('shapes (data-driven from maps.js)', () => {
(function () {
  var names = Object.keys(E.SHAPES);
  assert.ok(names.length >= 4, names.length + ' board shapes defined');
  assert.ok(!E.SHAPES.grand && !E.SHAPES.wide, 'grand and wide boards are gone');
  var floor = E.CONFIG.mapHexFloor, ceiling = E.CONFIG.mapHexCeiling;
  names.forEach(function (n) {
    var hexes = E.boardHexes(n);
    assert.ok(hexes.length >= floor && hexes.length <= ceiling,
      n + ': ' + hexes.length + ' hexes (physical band is ' + floor + '-' + ceiling + ')');
    assert.ok(E.SHAPES[n].centre !== null, n + ': point-symmetric (Mirror & fair HQs work)');
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
  var rows = {};
  hexes.forEach(function (k) { var r = E.parseKey(k)[1]; rows[r] = (rows[r] || 0) + 1; });
  assert.ok(rows[-2] === 4 && rows[-1] === 5 && rows[0] === 6 && rows[1] === 5 && rows[2] === 4,
    'row counts are 4,5,6,5,4 (got ' + JSON.stringify(rows) + ')');
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

test('custom board shapes (explicit hex sets)', () => {
(function () {
  // explicit hex set builds like a rows shape
  var s = E.buildShape('tst', { hexes: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]] });
  assert.ok(s.list.length === 5, 'hex-set shape builds (5 hexes)');
  // a hole in a row leaves a GAP in the labels: hexes keep their columns
  var holed = E.buildShape('holed', { hexes: [[0, 0], [2, 0]] });
  assert.ok(holed.rowQFrom[0] === 0, 'row starts at its leftmost hex');
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
  assert.ok(E.SHAPES['@irr1'].centre !== null, 'symmetric hex set gets a rot180 centre');
  // a hole in a row leaves a GAP in the labels (hexes keep their columns)
  var HOLED = { name: 'Holed', id: 'hole1', redHQ: [0, -1], blueHQ: [0, 1],
    shapeDef: { hexes: [[0, -1], [1, -1], [-1, 0], [0, 0], [2, 0], [-1, 1], [0, 1]] }, pieces: [] };
  var m2 = E.newBattle({ seed: 6, firstPlayer: 'red', maps: [HOLED] });
  E.newSkirmish(m2);
  assert.ok(E.hexLabel('2,0') === 'B4', 'a hole leaves a gap in the numbering (2,0 stays B4, got ' + E.hexLabel('2,0') + ')');
  assert.ok(E.neighbor('0,0', 0) === null, 'the missing hex is truly off-board');
  E.setBoard('@irr1');
  var asym = E.buildShape('asym', { hexes: [[0, 0], [1, 0], [0, 1]] });
  assert.ok(asym.centre === null, 'asymmetric hex set has no centre (Mirror disabled)');
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
