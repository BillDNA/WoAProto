/* The drawing half's own tests. The mark files are classic scripts, so they are
   loaded into a vm context with the geometry and palettes they call stubbed out
   — enough to test the registry, what a token is built from, and that the seat's
   colours reach it, which is all of this house that is decidable without a
   browser. What a glyph actually paints is a picture, and dev/smoke.js renders
   real boards in jsdom for that.

   Run alone with `node game/ui/board/unit/unit-marks.test.js`, or the whole gate
   with `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const E = require('../../../engine.js');

const HERE = __dirname;
const ROOMS = path.join(HERE, '..', '..', '..', 'engine', 'board', 'unit');

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
// in a new context is how a test gets a clean one. `seat` stands in for whatever
// the faction/seat owner ends up being — the marks only ever ask it for colours.
function loadMarks(seat) {
  const ctx = {
    E,
    window: { Engine: E },
    HEX_CONFIG: { board: { size: 44 }, manual: { size: 34 } },
    CHART: { divRed: ['a', 'chart-red', 'c'], divBlue: ['a', 'chart-blue', 'c'], improve: 'chart-improve' },
    BOARD: { side: seat || (o => ({ fill: o, dark: o + '-dark' })) },
    svgEl: (tag, attrs) => ({
      tag, attrs, children: [],
      appendChild(c) { this.children.push(c); },
      get outerHTML() { return '<' + tag + '>' + this.children.length + '</' + tag + '>'; }
    }),
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

test('a mark declares a glyph and a chart colour, and nothing else is required', () => {
  const ctx = loadMarks();
  ['glyph', 'chart'].forEach(field => {
    const spec = { type: 'q', glyph: () => {}, chart: () => 'x' };
    delete spec[field];
    assert.throws(() => ctx.defineUnitMark(spec), new RegExp('missing ' + field),
      'a mark without ' + field + ' is rejected');
  });
  assert.throws(() => ctx.defineUnitMark({ type: 'infantry', glyph: () => {}, chart: () => 'x' }),
    /duplicate/, 'two marks may not claim the same type');
});

// The seam this house reads across: a unit is painted in whatever colours the
// side's owner hands back, and knows nothing about which colours those are. The
// stand-in below is any future faction/seat house.
test("the token paints whatever the seat says red and blue are", () => {
  const ctx = loadMarks(owner => ({ fill: 'var(--faction-' + owner + ')', dark: '#111' }));
  const els = token(ctx, 'infantry');
  assert.strictEqual(els[0].attrs.fill, 'var(--faction-red)',
    "the disc takes the seat's fill verbatim — a CSS var resolves in an SVG attribute");
  assert.strictEqual(els[0].attrs.stroke, '#111', "and its outline the seat's dark");
  assert.strictEqual(els[1].attrs.stroke, '#111', "so does the chit's border");
  assert.ok(els.slice(2).every(e => e.attrs.stroke === '#111'),
    'and the glyph, so a seat recolour reaches every part of the token with no edit here');
  // no colour of the seat's is written down in this house
  const src = fs.readdirSync(HERE).filter(f => /\.js$/.test(f) && !/\.test\.js$/.test(f))
    .map(f => fs.readFileSync(path.join(HERE, f), 'utf8')).join('\n');
  assert.ok(!/--red|--blue|#9e2b25|#28527a/.test(src),
    'and no seat colour is spelled anywhere in ui/board/unit/');
});

// The disc, the chit and the sizes are the house's, not each type's: every token
// is built from the same shapes before its glyph goes on.
test('every token is the same disc and chit, whatever type it is', () => {
  const ctx = loadMarks();
  shippedTypes().forEach(t => {
    const els = token(ctx, t.type);
    assert.strictEqual(els[0].tag, 'circle', t.type + ': the side-coloured disc comes first');
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
  // a caller names a BOARD, never a number: the disc scales from that board's
  // hex and every weight is that board's row
  const big = token(ctx, 'artillery', {});
  const small = token(ctx, 'artillery', { on: 'manual' });
  assert.strictEqual(big[0].attrs.r, 44 * ctx.UNIT_CONFIG.token.r, 'the live board draws at its own hex');
  assert.strictEqual(small[0].attrs.r, 34 * ctx.UNIT_CONFIG.token.r, "and the manual's at its");
  assert.strictEqual(small[2].attrs.r, ctx.UNIT_CONFIG.manual.dotR, "the glyph reads that board's row too");
  assert.strictEqual(big[2].attrs.r, ctx.UNIT_CONFIG.token.dotR, 'and the live board reads its own');
});

test('a row names only what its board does differently', () => {
  const ctx = loadMarks();
  assert.strictEqual(ctx.unitDial('manual').r, ctx.UNIT_CONFIG.token.r,
    'an unnamed dial falls through to the live board (a fraction scales itself)');
  assert.strictEqual(ctx.unitDial('manual').chitSW, ctx.UNIT_CONFIG.manual.chitSW, 'a named one wins');
});

// The mat slot is not a second drawing path: same builder, same glyph, the mat
// row of the config. A type that changes its glyph changes both at once.
test('the mat slot is the board token at the mat\'s sizes', () => {
  const ctx = loadMarks();
  const cfg = ctx.UNIT_CONFIG;
  shippedTypes().forEach(t => {
    const g = ctx.svgEl('g', {});
    ctx.bpUnitShape(g, cfg.mat.box / 2, cfg.mat.box / 2, t.type, '#f00', '#900', {}, cfg.mat);
    assert.strictEqual(g.children[0].attrs.r, cfg.mat.r, t.type + ': the disc at the mat radius');
    assert.ok(g.children.every(e => e.tag !== 'rect'), t.type + ': no chit at slot size');
    assert.ok(g.children.length > 1, t.type + ': and its own glyph on top');
    assert.ok(g.children.slice(1).every(e => (e.attrs.stroke || e.attrs.fill) === cfg.ink.chit),
      t.type + "'s slot glyph is cut in the chit ink");
    assert.strictEqual(ctx.bpUnitSlot(t.type, '#f00', '#900').indexOf('<svg>'), 0,
      t.type + ': and the mat gets it back as markup');
  });
  // one glyph function, two callers
  shippedTypes().forEach(t => {
    assert.strictEqual(typeof ctx.unitMark(t.type).glyph, 'function', t.type + ' declares exactly one glyph');
    assert.strictEqual(ctx.unitMark(t.type).mat, undefined, t.type + ' has no second, mat-only drawing path');
  });
});

test('the chart colour comes off the mark too', () => {
  const ctx = loadMarks();
  shippedTypes().forEach(t => assert.ok(ctx.unitChartColor(t.type),
    t.type + ' has an identity colour for the dashboard'));
  assert.strictEqual(ctx.unitChartColor('nosuch'), null,
    'an unknown type falls back to the pane\'s sequential ramp rather than drawing colourless');
});

test('every unit rule in the stylesheet lives in the unit house\'s own sheet', () => {
  const page = fs.readFileSync(path.join(HERE, '..', '..', '..', 'style.css'), 'utf8');
  const mine = fs.readFileSync(path.join(HERE, 'unit.css'), 'utf8');
  assert.match(page, /@import url\('ui\/board\/unit\/unit\.css'\)/, 'style.css imports it');
  ['#board g\\.unit\\{', '@keyframes popIn', '@keyframes ghostOut'].forEach(rule => {
    assert.match(mine, new RegExp(rule), rule + ' is here');
    assert.ok(!new RegExp(rule).test(page), rule + ' is no longer in style.css');
  });
});
