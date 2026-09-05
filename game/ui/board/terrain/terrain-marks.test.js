/* The drawing half's own tests. The mark files are classic scripts, so they are
   loaded into a vm context with the geometry they call stubbed out — enough to
   test the registry, which is all of this house that is decidable without a
   browser. What a glyph actually paints is a picture, and dev/smoke.js renders
   real boards in jsdom for that.

   Run alone with `node game/ui/board/terrain/terrain-marks.test.js`, or the
   whole gate with `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const E = require('../../../engine.js');

const HERE = __dirname;
const ROOMS = path.join(HERE, '..', '..', '..', 'engine', 'board', 'terrain');

// The shipped types, read off the engine house's files rather than the live
// registry — the registry is append-only, so a test that declares a fixture type
// stays in it, and this house is accountable for the types that actually ship.
function shippedTypes() {
  return fs.readdirSync(ROOMS)
    .filter(f => /\.js$/.test(f) && !/\.test\.js$/.test(f) && f !== 'terrain.js' && f !== 'terrain-config.js')
    .map(f => {
      const src = fs.readFileSync(path.join(ROOMS, f), 'utf8');
      return { file: f, letter: (src.match(/letter:\s*'([A-Z])'/) || [])[1],
               name: (src.match(/name:\s*'([a-z]+)'/) || [])[1] };
    });
}

// A fresh registry per test: the mark files register at load, so re-running them
// in a new context is how a test gets a clean one.
function loadMarks() {
  const ctx = {
    E, S: 44, BOARD: { outline: '#000', brass: '#b5a642', barrage: '#a33' },
    svgEl: (tag, attrs) => ({ tag, attrs, appendChild() {} }),
    hexXY: () => [0, 0],
    cornerPt: () => [0, 0],
    cornerAngles: () => [0, 0],
    bpEdgePts: () => [[0, 0], [1, 1]]
  };
  vm.createContext(ctx);
  ['terrain-marks.js']
    .concat(fs.readdirSync(HERE).filter(f => /-mark\.js$/.test(f)).sort())
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(HERE, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}

test('every shipped terrain type has a mark', () => {
  const ctx = loadMarks();
  const shipped = shippedTypes();
  assert.ok(shipped.length >= 4, 'found the engine house rooms (' + shipped.length + ')');
  shipped.forEach(t => {
    assert.ok(t.letter, t.file + ' declares a letter');
    assert.ok(ctx.terrainMark(t.letter), t.name + ' has a mark file in this directory');
  });
});

test('a type with no mark fails at load, not silently on the board', () => {
  const ctx = loadMarks();
  // stand in for a room that was added without its mark
  const realTypes = E.terrainTypes;
  E.terrainTypes = () => [{ letter: 'Z', name: 'unmarked' }];
  try {
    assert.throws(() => ctx.terrainMarksCheck(), /unmarked/,
      'terrainMarksCheck names the type that has no mark');
  } finally { E.terrainTypes = realTypes; }
  // and passes for the set that does have marks
  E.terrainTypes = () => shippedTypes();
  try { ctx.terrainMarksCheck(); } finally { E.terrainTypes = realTypes; }
});

test('a mark declares stroke, ink and inset, and each is rejected if missing', () => {
  const ctx = loadMarks();
  ['stroke', 'ink', 'inset'].forEach(field => {
    const spec = { letter: 'Q', stroke: 'red', ink: 'red', inset: 0.8 };
    delete spec[field];
    assert.throws(() => ctx.defineTerrainMark(spec), new RegExp('missing ' + field),
      'a mark without ' + field + ' is rejected');
  });
  assert.throws(() => ctx.defineTerrainMark({ letter: 'F', stroke: 'x', ink: 'x', inset: 1 }),
    /duplicate/, 'two marks may not claim the same letter');
});

// The inset is what keeps a dug trench off the map-terrain line in the same hex,
// and it is what a barrage highlight lands on — so it is per type, not one board
// constant, and the trench's is the tighter of the two.
test('inset is per type: a trench sits inside map terrain', () => {
  const ctx = loadMarks();
  const trench = ctx.terrainInset('T'), forest = ctx.terrainInset('F');
  assert.ok(trench < forest, 'the trench mark sits closer to the hex centre (' + trench + ' < ' + forest + ')');
  assert.strictEqual(ctx.terrainInset('F'), ctx.terrainInset('M'),
    'map terrain types share one inset, so their sides line up');
  assert.strictEqual(ctx.terrainInset('?'), 0.85 * 44, 'an unknown letter falls back to the terrain inset');
});

test('the stroke a board draws comes off the mark', () => {
  const ctx = loadMarks();
  shippedTypes().forEach(t => {
    assert.strictEqual(ctx.BOARD.terrainStroke(t.letter), ctx.terrainMark(t.letter).stroke,
      t.name + "'s side is stroked with its own declared colour");
  });
  assert.strictEqual(ctx.BOARD.terrainStroke('?'), ctx.BOARD.outline,
    'an unknown letter falls back to board ink rather than drawing nothing');
});
