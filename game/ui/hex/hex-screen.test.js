/* The hex house's own tests — the screen dialect. The file is a classic script,
   so it is loaded into a vm context holding only the engine; nothing about a
   board, a palette or the DOM is needed to decide any of this, which is the
   check that the dialect really is only geometry.

   Run alone with `node game/ui/hex/hex-screen.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const E = require('../../engine.js');

function load() {
  const ctx = { E };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'hex-screen.js'), 'utf8'), ctx,
    { filename: 'hex-screen.js' });
  return ctx;
}
const G = load();
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 1e-9, msg + ' (' + a + ' vs ' + b + ')');

test('the screen reads the engine\'s key — a hex\'s identity is not respelled here', () => {
  const src = fs.readFileSync(path.join(__dirname, 'hex-screen.js'), 'utf8');
  assert.ok(/E\.parseKey/.test(src), 'positions start from the engine key');
  assert.ok(/E\.DIRS/.test(src), 'face angles start from the engine direction table');
  assert.ok(!/split\(','\)/.test(src), 'no second parser for the key');
  assert.ok(!/\[0\s*,\s*-60/.test(src), 'no second table of the six directions');
});

test('the origin is at the origin, and a step of one hex is one hex of pixels', () => {
  assert.deepEqual(G.hexXY('0,0'), [0, 0]);
  const S = G.S;
  for (let d = 0; d < 6; d++) {
    const a = G.hexXY('0,0'), b = G.hexXY(E.step('0,0', d));
    const gap = Math.hypot(b[0] - a[0], b[1] - a[1]);
    near(gap, S * Math.sqrt(3), 'neighbour ' + E.dirName(d) + ' sits one hex away');
  }
});

test('a face points where the engine says that direction points', () => {
  for (let d = 0; d < 6; d++) {
    const c = G.hexXY('0,0'), n = G.hexXY(E.step('0,0', d));
    const toNeighbour = Math.atan2(n[1] - c[1], n[0] - c[0]) * 180 / Math.PI;
    const aa = G.hexCornerAngles(d);
    const mid = (aa[0] + aa[1]) / 2;
    near(Math.cos((mid - toNeighbour) * Math.PI / 180), 1,
      'the face in direction ' + E.dirName(d) + ' faces its neighbour');
    near(aa[1] - aa[0], 60, 'a face spans a sixth of the hex');
  }
});

test('the two hexes on a border draw the same line', () => {
  const a = '0,0';
  for (let d = 0; d < 6; d++) {
    const b = E.step(a, d);
    const here = G.hexEdgePts(a, d, G.S), there = G.hexEdgePts(b, E.oppositeDir(d), G.S);
    const mid = p => [(p[0][0] + p[1][0]) / 2, (p[0][1] + p[1][1]) / 2];
    const m1 = mid(here), m2 = mid(there);
    near(m1[0], m2[0], 'shared border, same x');
    near(m1[1], m2[1], 'shared border, same y');
  }
});

test('the six corners of a hex are its six face corners', () => {
  const pts = G.hexPoints(0, 0, G.S).split(' ').map(p => p.split(',').map(Number));
  assert.equal(pts.length, 6);
  pts.forEach(p => near(Math.round(Math.hypot(p[0], p[1])), G.S, 'a corner is a radius out'));
  // every face endpoint is one of the corners
  for (let d = 0; d < 6; d++) {
    G.hexEdgePts('0,0', d, G.S).forEach(e => {
      assert.ok(pts.some(p => Math.abs(p[0] - e[0]) < 0.2 && Math.abs(p[1] - e[1]) < 0.2),
        'face ' + E.dirName(d) + ' ends on a corner');
    });
  }
});

/* The screen dialect's extension check: the one thing that varies between the
   boards in this game is the SCALE, and a new one is live with no edit here. */
test('one more scale: an unseen hex size works with no edit anywhere', () => {
  const s = 7.5;
  assert.deepEqual(G.hexXY('0,0', s), [0, 0]);
  const gap = Math.hypot.apply(null, G.hexXY(E.step('0,0', 0), s));
  near(gap, s * Math.sqrt(3), 'positions scale');
  const pts = G.hexEdgePts('1,1', 3, s * 0.85, s);
  const c = G.hexXY('1,1', s);
  pts.forEach(p => near(Math.hypot(p[0] - c[0], p[1] - c[1]), s * 0.85, 'insets scale'));
});
