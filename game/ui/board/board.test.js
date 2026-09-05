/* The board house's own tests: the mark base and its rooms — what the live
   board, the field manual's diagram and the map editor now share. Classic
   scripts, so they load into a vm with the geometry stubbed; the rooms are taken
   from load-order.js, so a room that exists but is not scheduled fails here.

   What a mark actually paints is a picture, and dev/smoke.js renders real boards
   in jsdom for that. What is decidable without a browser is the registry, the
   two lifetimes and the scaling.

   Run alone with `node game/ui/board/board.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const GAME = path.join(__dirname, '..', '..');
const ORDER = require(path.join(GAME, 'load-order.js'));
const HOUSE = ORDER.APP.filter(p => /^ui\/board\/(mark\.js|marks\/)/.test(p));

function el(tag, attrs) {
  return { tag, attrs: attrs || {}, kids: [], parentNode: null, dataset: {},
           appendChild(c){ this.kids.push(c); c.parentNode = this; },
           removeChild(c){ this.kids = this.kids.filter(k => k !== c); },
           setAttribute(k, v){ this.attrs[k] = v; } };
}

function loadBoard() {
  const timers = [];
  const ctx = {
    S: 44,
    BOARD_R: { unit: 0.5, hqOuter: 0.62, hqInner: 0.5, chitHW: 0.295, chitHH: 0.205,
               art: 0.102, starSize: 0.455, starDrop: 0.159 },
    BOARD_SW: { unit: 0.057, chit: 0.032, glyph: 0.045, hqOuter: 0.045, hqBrass: 0.036 },
    BOARD: { outline: '#000', star: '#fff', redDark: '#800', brass: '#b90', chit: '#ece1c4',
             ghostFill: '#fff1', ghostStroke: '#0004',
             hint: { attacker: 'a', tie: 't', defender: 'd', neutral: 'n' },
             side: () => ({ fill: '#f00', dark: '#800' }) },
    E: { hexLabel: k => k },
    svgEl: el,
    // one hex-width apart, so a scaled draw is checkable
    hexXY: (k, s) => [(k.charCodeAt(0) - 65) * (s || 44), 0],
    hexPoints: (cx, cy, rad) => cx + ',' + cy + ' r' + rad,
    bpEdgePts: (k, d, rad) => [[0, 0], [rad, 0]],
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); },
    timers: timers
  };
  vm.createContext(ctx);
  HOUSE.forEach(p =>
    vm.runInContext(fs.readFileSync(path.join(GAME, p), 'utf8'), ctx, { filename: p }));
  return ctx;
}

const KEPT = ['tile', 'coord', 'hq', 'unit', 'highlight', 'ghost-hex', 'edge-hit'];
const TRANSIENT = ['strike', 'ring', 'pill', 'fallen', 'struck', 'fell-badge', 'side-glow'];
const ARGS = { hex: 'B', from: 'A', to: 'C', text: '3 vs 2', tone: 'tie', side: 'red',
               unit: { owner: 'red', type: 'infantry' }, owner: 'red', color: '#f00',
               kind: 'hl-target', dir: 0, sw: 4 };

test('every mark on the board is a room of its own, and load-order schedules it', () => {
  const ctx = loadBoard();
  assert.ok(HOUSE.length > 10, 'the house is read from load-order, not from disk');
  assert.deepEqual(Object.keys(ctx.BOARD_MARKS).sort(), KEPT.concat(TRANSIENT).sort());
  // one file per mark, named for it
  KEPT.concat(TRANSIENT).forEach(id =>
    assert.ok(HOUSE.includes('ui/board/marks/' + id + '.js'), id + ' has its own room'));
});

test('an undeclared mark is a throw, not a silent no-draw', () => {
  const ctx = loadBoard();
  assert.throws(() => ctx.bpDraw(el('svg'), 'nosuch', {}), /no mark/);
  assert.throws(() => ctx.bpMark({ id: 'ring', lifetime: 'transient', draw(){} }), /duplicate/);
  assert.throws(() => ctx.bpMark({ id: 'x', lifetime: 'forever', draw(){} }), /kept or transient/);
  assert.throws(() => ctx.bpMark({ id: 'x', lifetime: 'kept' }), /missing draw/);
});

test('every mark draws something and hands back what it drew', () => {
  const ctx = loadBoard();
  KEPT.concat(TRANSIENT).forEach(id => {
    const svg = el('svg');
    const drawn = ctx.bpDraw(svg, id, Object.assign({}, ARGS));
    assert.strictEqual(svg.kids.length, 1, id + ' lands one element on the board');
    assert.ok(drawn, id + ' returns it');
  });
});

test('a transient mark is wrapped and named; a kept mark is the element itself', () => {
  const ctx = loadBoard();
  const t = ctx.bpDraw(el('svg'), 'ring', Object.assign({}, ARGS, { cls: 'fx-ring' }));
  assert.strictEqual(t.attrs['class'], 'bpm bpm-ring fx-ring');
  assert.strictEqual(t.attrs['pointer-events'], 'none', 'what just happened is not clickable');
  const k = ctx.bpDraw(el('svg'), 'highlight', ARGS);
  assert.strictEqual(k.attrs['class'], 'hl hl-target', 'the caller wires this one directly');
});

// Scale is the only thing that varies between the live board and the diagram.
test('a mark at half scale is the same mark, half size', () => {
  const ctx = loadBoard();
  const strike = s => {
    const g = ctx.bpDraw(el('svg'), 'strike', { from: 'A', to: 'C', color: '#f00', s: s });
    return parseFloat(g.kids[0].attrs['stroke-width']);
  };
  assert.ok(Math.abs(strike(22) * 2 - strike(44)) < 0.01, 'stroke width follows the hex size');
  const unit = s => ctx.bpDraw(el('svg'), 'unit', Object.assign({}, ARGS, { s: s })).kids[0].attrs;
  assert.ok(Math.abs(unit(22).r * 2 - unit(44).r) < 0.01, 'so does the unit token');
  assert.ok(Math.abs(unit(22)['stroke-width'] * 2 - unit(44)['stroke-width']) < 0.01,
    'and its stroke, which is why the diagram no longer tunes its own');
});

test('a mark with a lifetime removes itself; one without stays', () => {
  const ctx = loadBoard();
  const svg = el('svg');
  ctx.bpDraw(svg, 'ring', { hex: 'B', color: '#f00', ttl: 600 });
  assert.strictEqual(svg.kids.length, 1);
  assert.strictEqual(ctx.timers[0].ms, 600);
  ctx.timers[0].fn();
  assert.strictEqual(svg.kids.length, 0, 'gone when its time is up');
  ctx.bpDraw(svg, 'ring', { hex: 'B', color: '#f00' });
  assert.strictEqual(ctx.timers.length, 1, 'a still frame schedules no removal');
});

// The house's "one more mark" proof.
test('a mark registered from nothing draws through the same door', () => {
  const ctx = loadBoard();
  ctx.bpMark({ id: 'fixture', lifetime: 'transient',
    draw: (g, o, s) => g.appendChild(el('circle', { r: s })) });
  const svg = el('svg');
  const g = ctx.bpDraw(svg, 'fixture', { s: 10, cls: 'mine', ttl: 5 });
  assert.strictEqual(g.attrs['class'], 'bpm bpm-fixture mine');
  assert.strictEqual(g.kids[0].attrs.r, 10, 'the base hands it the scale');
  assert.strictEqual(ctx.timers[0].ms, 5, 'and gives it a lifetime for free');
});
