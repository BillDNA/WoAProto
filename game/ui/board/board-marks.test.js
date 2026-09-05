/* The drawing half's own tests. The mark files are classic scripts, so they are
   loaded into a vm context with the geometry and palettes they call stubbed out
   — enough to test the registry, the lifetimes, that a caller's scale reaches
   every mark, and that a new mark is one file. What a mark actually paints is a
   picture, and dev/smoke.js renders real boards in jsdom for that.

   Run alone with `node game/ui/board/board-marks.test.js`, or the whole gate
   with `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');
const E = require('../../engine.js');

const HERE = __dirname;
const UI = path.join(HERE, '..');

// A fresh registry per test: the mark files register at load, so re-running them
// in a new context is how a test gets a clean one.
function loadMarks(){
  const timers = [];
  const ctx = {
    E,
    window: { Engine: E },
    HEX_CONFIG: {
      board:   { size: 44, tile: 43 },
      manual:  { size: 34, tile: 33 },
      thumb:   { size: 11, tile: 10.4 },
      mapPane: { size: 44, tile: 40 },
      ink: { tile:'tile-ink', tileStroke:'tile-stroke', ghost:'ghost', ghostStroke:'ghost-stroke' }
    },
    BOARD: { side: o => ({ fill: o, dark: o + '-dark' }), redDark: 'red-dark' },
    svgEl: (tag, attrs) => ({
      tag, attrs: Object.assign({}, attrs), children: [], parentNode: null,
      appendChild(c){ c.parentNode = this; this.children.push(c); },
      removeChild(c){ this.children.splice(this.children.indexOf(c), 1); c.parentNode = null; },
      setAttribute(k, v){ this.attrs[k] = v; },
      set textContent(v){ this.attrs.text = v; },
      get textContent(){ return this.attrs.text; },
      get innerHTML(){ return this.children.map(c => '<' + c.tag + '/>').join(''); },
      get firstChild(){ return this.children[0] || null; },
      dataset: {}
    }),
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); return timers.length; },
    hexXY: (k, s) => { const p = E.parseKey(k); return [p[0] * s, p[1] * s]; },
    hexPoints: (cx, cy, rad) => cx + ':' + cy + ':' + rad,
    hexEdgePts: (k, d, rad) => [[0, 0], [rad, rad]]
  };
  ctx.timers = timers;
  vm.createContext(ctx);
  markFiles().forEach(f => vm.runInContext(fs.readFileSync(path.join(HERE, f), 'utf8'), ctx, { filename: f }));
  return ctx;
}
// the base, then every room — the same list load-order.js schedules
function markFiles(){
  return ['board-config.js', 'board-marks.js']
    .concat(fs.readdirSync(HERE).filter(f => /-mark\.js$/.test(f)).sort());
}
function group(ctx){ return ctx.svgEl('g', {}); }

test('every mark is a file, and a file is one mark', () => {
  const ctx = loadMarks();
  const rooms = markFiles().filter(f => /-mark\.js$/.test(f));
  assert.ok(rooms.length >= 10, 'found the mark rooms (' + rooms.length + ')');
  rooms.forEach(f => {
    const src = fs.readFileSync(path.join(HERE, f), 'utf8');
    const calls = src.match(/defineBoardMark\(/g) || [];
    assert.strictEqual(calls.length, 1, f + ' defines exactly one mark');
    const name = (src.match(/mark:\s*'([A-Za-z]+)'/) || [])[1];
    assert.ok(ctx.boardMark(name), f + " registers '" + name + "'");
  });
});

test('a mark declares its lifetime, and only the two', () => {
  const ctx = loadMarks();
  Object.keys(ctx.BOARD_MARK).forEach(n => {
    const life = ctx.boardMark(n).lifetime;
    assert.ok(life === 'standing' || life === 'transient', n + ' declares a lifetime (' + life + ')');
  });
  assert.throws(() => ctx.defineBoardMark({ mark:'nope', lifetime:'forever', draw(){} }),
    /standing or transient/, 'a third lifetime is refused at load');
  assert.throws(() => ctx.defineBoardMark({ mark:'tile', lifetime:'standing', draw(){} }),
    /duplicate/, 'two files may not claim the same mark');
  assert.throws(() => ctx.defineBoardMark({ mark:'half', lifetime:'standing' }),
    /missing draw/, 'a mark with no drawing is refused');
});

test('a transient mark is taken away again; a standing one is not', () => {
  const ctx = loadMarks();
  const svg = group(ctx);
  svg.appendChild(ctx.svgEl('g', {}));            // bpPlay only draws on a drawn board
  const ring = ctx.bpPlay(svg, 'ring', { hex:'0,0', color:'#f00' });
  assert.ok(svg.children.indexOf(ring) >= 0, 'the ring goes on the board');
  const t = ctx.timers[ctx.timers.length - 1];
  assert.strictEqual(t.ms, ctx.BOARD_CONFIG.board.ring.ms, 'for exactly the life it declares');
  t.fn();
  assert.strictEqual(svg.children.indexOf(ring), -1, 'and is taken away again');
  assert.throws(() => ctx.bpPlay(svg, 'tile', { hex:'0,0' }), /standing mark/,
    'a standing mark cannot be played and left to expire');
  // the same transient mark held still is what a diagram frame draws
  const held = ctx.bpMark('ring', group(ctx), { hex:'0,0', on:'manual' });
  assert.ok(held, 'and bpMark freezes it instead');
});

test('scale is the caller\'s: one mark, every board', () => {
  const ctx = loadMarks();
  const at = on => {
    const g = group(ctx);
    ctx.bpMark('hq', g, { hex:'1,0', side:'red', on:on });
    return g.children[0].attrs.points;
  };
  assert.notStrictEqual(at('board'), at('manual'), 'the HQ is drawn at each board\'s own size');
  assert.notStrictEqual(at('manual'), at('thumb'), 'and again at the thumbnails\'');
  // and the dials follow the same row name
  const g = group(ctx);
  ctx.bpMark('pill', g, { hex:'0,0', text:'5 vs 3', outcome:'attacker', on:'manual' });
  assert.strictEqual(g.children[0].children[0].attrs.height, ctx.BOARD_CONFIG.manual.pill.h,
    'the manual\'s pill is the manual row\'s height');
  const g2 = group(ctx);
  ctx.bpMark('pill', g2, { hex:'0,0', text:'5 vs 3', outcome:'attacker' });
  assert.strictEqual(g2.children[0].children[0].attrs.height, ctx.BOARD_CONFIG.board.pill.h,
    'and the live board\'s is the board row\'s');
});

test('a row names only what its board does differently', () => {
  const ctx = loadMarks();
  // the manual names no HQ fractions, so it inherits the live board's
  assert.strictEqual(ctx.boardDial('hq', 'manual').outer, ctx.BOARD_CONFIG.board.hq.outer,
    'an unnamed dial falls through to the board row');
  assert.strictEqual(ctx.boardDial('hq', 'manual').starFS, ctx.BOARD_CONFIG.manual.hq.starFS,
    'a named one wins');
});

// The Red / Blue house is not built (docs/context, "Red / Blue"); ui/kit/palette.js
// is its share. When it is built, this is the seam it takes over, and this test is
// what says the board house will not have to move.
test('the board paints whatever the seat says red and blue are', () => {
  const ctx = loadMarks();
  ctx.BOARD.side = o => ({ fill: 'SEAT-' + o, dark: 'SEAT-' + o + '-dark' });
  const g = group(ctx);
  ctx.bpMark('hq', g, { hex:'0,0', side:'red' });
  assert.strictEqual(g.children[0].attrs.fill, 'SEAT-red',
    'the HQ takes its fill from the seat, and names no colour of its own');
  const src = markFiles().map(f => fs.readFileSync(path.join(HERE, f), 'utf8')).join('\n');
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src),
    'no mark spells a colour: every one is a seat answer or a var(--…) in board-config');
});

test('a row may name one dial inside a group without dropping its siblings', () => {
  const ctx = loadMarks();
  ctx.BOARD_CONFIG.manual.struck = { r: { unit: 9 } };   // a row naming half a group
  const d = ctx.boardDial('struck', 'manual');
  assert.strictEqual(d.r.unit, 9, 'the named one wins');
  assert.strictEqual(d.r.hq, ctx.BOARD_CONFIG.board.struck.r.hq, 'its sibling still falls through');
  assert.strictEqual(d.sw, ctx.BOARD_CONFIG.board.struck.sw, 'and so does the rest of the mark');
});

test('a new mark is one file, live with no edit anywhere else', () => {
  const ctx = loadMarks();
  // the file a next session would add: one defineBoardMark call, nothing else
  vm.runInContext(`defineBoardMark({
    mark: 'flag', lifetime: 'standing',
    draw: function(g, o){
      var xy = hexXY(o.hex, o.s);
      var p = svgEl('polygon', { points: hexPoints(xy[0], xy[1], o.s * 0.4), fill: o.ink.brass });
      g.appendChild(p);
      return p;
    }
  });`, ctx, { filename: 'flag-mark.js' });
  const g = group(ctx);
  const el = ctx.bpMark('flag', g, { hex:'1,0', on:'manual' });
  assert.strictEqual(g.children[0], el, 'it draws');
  assert.strictEqual(el.attrs.fill, ctx.BOARD_CONFIG.board.ink.brass, 'with the board\'s ink');
  assert.strictEqual(el.attrs.points, '34:0:' + (34 * 0.4), 'at the caller\'s scale, with no dial of its own');
  assert.ok(ctx.boardMark('flag'), 'and the registry has it');
});

test('the frame is one answer, at whatever scale it is asked for', () => {
  const ctx = loadMarks();
  const small = ctx.viewBoxFor(['0,0', '1,0'], null, 'thumb');
  const big = ctx.viewBoxFor(['0,0', '1,0'], null, 'board');
  assert.notStrictEqual(small, big, 'a thumbnail frames tighter than the live board');
  assert.strictEqual(ctx.viewBoxFor(['0,0', '1,0'], 44), big, 'an explicit size says the same as its row');
});

test('drawing a mark nobody wrote throws where it is asked for, not blank on screen', () => {
  const ctx = loadMarks();
  assert.throws(() => ctx.bpMark('trebuchet', group(ctx), { hex:'0,0' }), /trebuchet/,
    'and names the one that is missing');
  assert.throws(() => ctx.bpPlay(group(ctx), 'trebuchet', { hex:'0,0' }), /trebuchet/,
    'played or drawn alike');
});

test('every board rule in the stylesheet lives in the board house\'s own sheet', () => {
  const page = fs.readFileSync(path.join(UI, '..', 'style.css'), 'utf8');
  const mine = fs.readFileSync(path.join(HERE, 'board.css'), 'utf8');
  assert.match(page, /@import url\('ui\/board\/board\.css'\)/, 'style.css imports it');
  ['--attack:', '--hl-from-rgb:', '--hl-swap-fill:', '\\.hl-target\\{', '\\.hl-attack\\{',
   '\\.hl-swap\\{', '\\.edge-hit\\{', '\\.fx-ring\\{', '\\.fx-strike\\{', '\\.mring\\{',
   '\\.medge-glow\\{', '@keyframes ringOut', '@keyframes mringIn'].forEach(rule => {
    assert.match(mine, new RegExp(rule), rule + ' is here');
    assert.ok(!new RegExp(rule).test(page), rule + ' is no longer in style.css');
  });
});

test('nothing outside the house builds a board mark by hand', () => {
  const offenders = [];
  (function walk(dir){
    fs.readdirSync(dir, { withFileTypes: true }).forEach(e => {
      const p = path.join(dir, e.name);
      if (e.isDirectory()){ if (p !== HERE) walk(p); return; }
      if (!/\.js$/.test(e.name) || /\.test\.js$/.test(e.name)) return;
      if (p.startsWith(HERE + path.sep) || p === HERE) return;
      const src = fs.readFileSync(p, 'utf8');
      // the shapes a board mark is made of: a hex outline, or a mark's own layer
      [/svgEl\(\s*'polygon'/, /svgEl\(\s*'polyline'/, /hexPoints\s*\(/].forEach(re => {
        if (re.test(src)) offenders.push(path.relative(UI, p) + ' — ' + re.source);
      });
    });
  })(UI);
  assert.deepStrictEqual(offenders, [],
    'a board mark spelt outside ui/board/ — give it a file in the house instead');
});
