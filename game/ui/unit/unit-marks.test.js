/* The drawing half's own tests. The mark files are classic scripts, so they are
   loaded into a vm context with the geometry and palettes they call stubbed out
   — enough to test the registry and what a token is built from, which is all of
   this house that is decidable without a browser. What a glyph actually paints
   is a picture, and dev/smoke.js renders real boards in jsdom for that.

   Run alone with `node game/ui/unit/unit-marks.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const E = require('../../engine.js');

const HERE = __dirname;
const ROOMS = path.join(HERE, '..', '..', 'engine', 'unit');

// The shipped types, read off the engine house's files rather than the live
// registry — the registry is append-only, so a test that declares a fixture type
// stays in it, and this house is accountable for the types that actually ship.
function shippedTypes() {
  return fs.readdirSync(ROOMS)
    .filter(f => /\.js$/.test(f) && !/\.test\.js$/.test(f) && f !== 'unit.js' && f !== 'unit-config.js')
    .map(f => {
      const src = fs.readFileSync(path.join(ROOMS, f), 'utf8');
      return { file: f, type: (src.match(/type:\s*'([a-z-]+)'/) || [])[1] };
    });
}

// A fresh registry per test: the mark files register at load, so re-running them
// in a new context is how a test gets a clean one.
function loadMarks() {
  const ctx = {
    E,
    window: { Engine: E },
    HEX_CONFIG: { board: { size: 44 } },
    CHART: { divRed: ['a', 'chart-red', 'c'], divBlue: ['a', 'chart-blue', 'c'], improve: 'chart-improve' },
    BOARD: { side: o => ({ fill: o, dark: o + '-dark' }) },
    svgEl: (tag, attrs) => ({ tag, attrs, children: [], appendChild(c) { this.children.push(c); } }),
    hexXY: () => [0, 0]
  };
  vm.createContext(ctx);
  ['unit-config.js', 'unit-marks.js']
    .concat(fs.readdirSync(HERE).filter(f => /-mark\.js$/.test(f)).sort())
    .forEach(f => vm.runInContext(fs.readFileSync(path.join(HERE, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}

// draw a token into a throwaway group and return the elements it built
function token(ctx, type, o) {
  const g = ctx.svgEl('g', {});
  ctx.bpUnitToken(g, 10, 20, 'red', type, o || {});
  return g.children;
}

test('every shipped unit type has a mark', () => {
  const ctx = loadMarks();
  const shipped = shippedTypes();
  assert.strictEqual(shipped.length, E.unitTypes().filter(t => shipped.some(s => s.type === t)).length,
    'every engine room has a file here');
  assert.ok(shipped.length >= 3, 'found the engine house rooms (' + shipped.length + ')');
  shipped.forEach(t => {
    assert.ok(t.type, t.file + ' declares a type');
    assert.ok(ctx.unitMark(t.type), t.type + ' has a mark file in this directory');
  });
});

test('a type with no mark fails at boot, not silently on the board', () => {
  const ctx = loadMarks();
  const real = E.unitTypes;
  E.unitTypes = () => ['unmarked'];
  try {
    assert.throws(() => ctx.unitMarksCheck(), /unmarked/,
      'unitMarksCheck names the type that has no mark');
  } finally { E.unitTypes = real; }
  E.unitTypes = () => shippedTypes().map(t => t.type);
  try { ctx.unitMarksCheck(); } finally { E.unitTypes = real; }
});

test('a mark declares a board glyph, a mat glyph and a chart colour', () => {
  const ctx = loadMarks();
  ['board', 'mat', 'chart'].forEach(field => {
    const spec = { type: 'q', board: () => {}, mat: () => '', chart: () => 'x' };
    delete spec[field];
    assert.throws(() => ctx.defineUnitMark(spec), new RegExp('missing ' + field),
      'a mark without ' + field + ' is rejected');
  });
  assert.throws(() => ctx.defineUnitMark({ type: 'infantry', board: () => {}, mat: () => '', chart: () => 'x' }),
    /duplicate/, 'two marks may not claim the same type');
});

// The disc, the chit and the side colours are the house's, not each type's:
// every token is built from the same two shapes before its glyph goes on.
test('every token is the same disc and chit, whatever type it is', () => {
  const ctx = loadMarks();
  shippedTypes().forEach(t => {
    const els = token(ctx, t.type);
    assert.strictEqual(els[0].tag, 'circle', t.type + ': the side-coloured disc comes first');
    assert.strictEqual(els[0].attrs.fill, 'red', 'in the seat\'s colour');
    assert.strictEqual(els[0].attrs.r, ctx.unitTokenR(), 'at the house\'s radius');
    assert.strictEqual(els[1].tag, 'rect', t.type + ': then the chit');
    assert.strictEqual(els[1].attrs.fill, ctx.UNIT_CONFIG.ink.chit, 'in the chit ink');
    assert.ok(els.length > 2, t.type + ' draws a glyph of its own on top');
  });
  assert.strictEqual(token(ctx, 'infantry').length, 4, 'infantry is the crossed pair');
  assert.strictEqual(token(ctx, 'cavalry').length, 3, 'cavalry is the single slash');
});

test('the token scales from the hex, so a mini-board draws the same mark', () => {
  const ctx = loadMarks();
  assert.strictEqual(ctx.unitTokenR(), 44 * ctx.UNIT_CONFIG.token.r, 'the board radius is a fraction of the hex');
  assert.strictEqual(ctx.unitTokenR(34), 34 * ctx.UNIT_CONFIG.token.r, 'and follows a smaller board down');
  const small = token(ctx, 'artillery', { r: 8, artR: 2 });
  assert.strictEqual(small[0].attrs.r, 8, 'an explicit radius still wins');
  assert.strictEqual(small[2].attrs.r, 2, "and the glyph's own option reaches it");
});

test('the mat glyph and the chart colour come off the mark too', () => {
  const ctx = loadMarks();
  shippedTypes().forEach(t => {
    const svg = ctx.bpUnitGlyph(t.type, '#f00', '#900');
    assert.match(svg, /^<svg viewBox="0 0 20 20">.*<\/svg>$/s, t.type + ': one 20x20 glyph');
    assert.ok(svg.indexOf(ctx.UNIT_CONFIG.ink.chit) > 0, t.type + "'s mark is cut out of the chit ink");
    assert.ok(ctx.unitChartColor(t.type), t.type + ' has an identity colour for the dashboard');
  });
  assert.strictEqual(ctx.unitChartColor('nosuch'), null,
    'an unknown type falls back to the pane\'s sequential ramp rather than drawing colourless');
});

test('every unit rule in the stylesheet lives in the unit house\'s own sheet', () => {
  const page = fs.readFileSync(path.join(HERE, '..', '..', 'style.css'), 'utf8');
  const mine = fs.readFileSync(path.join(HERE, 'unit.css'), 'utf8');
  assert.match(page, /@import url\('ui\/unit\/unit\.css'\)/, 'style.css imports it');
  assert.match(mine, /#board g\.unit\{/, "the token's own element rule is here");
  assert.ok(!/#board g\.unit\{/.test(page), 'and no longer in style.css');
});
