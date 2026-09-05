/* The board house's own tests: the overlay base, which is what the live board
   and the field manual's diagram now share. Classic scripts, so they load into a
   vm with the geometry stubbed — enough to test the registry and the scaling,
   which is the part decidable without a browser. What a mark actually paints is
   a picture, and dev/smoke.js renders real boards in jsdom for that.

   Run alone with `node game/ui/board/board.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function el(tag, attrs) {
  return { tag, attrs: attrs || {}, kids: [], parentNode: null,
           appendChild(c){ this.kids.push(c); c.parentNode = this; },
           removeChild(c){ this.kids = this.kids.filter(k => k !== c); } };
}

function loadBoard() {
  const timers = [];
  const ctx = {
    S: 44,
    BOARD_R: { unit: 22 }, BOARD_SW: { unit: 2.5 },
    BOARD: { outline: '#000', star: '#fff', redDark: '#800',
             hint: { attacker: 'a', tie: 't', defender: 'd', neutral: 'n' },
             side: () => ({ fill: '#f00', dark: '#800' }) },
    svgEl: el,
    // one hex-width apart, so a scaled draw is checkable
    hexXY: (k, s) => [(k.charCodeAt(0) - 65) * (s || 44), 0],
    bpEdgePts: (k, d, rad) => [[0, 0], [rad, 0]],
    setTimeout: (fn, ms) => { timers.push({ fn, ms }); },
    timers: timers
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'overlay.js'), 'utf8'), ctx,
    { filename: 'overlay.js' });
  return ctx;
}

const MARKS = ['strike', 'ring', 'pill', 'fallen', 'struck', 'fellbadge', 'sideglow'];

test('every transient mark on the board is declared here', () => {
  const ctx = loadBoard();
  assert.deepEqual(Object.keys(ctx.BOARD_MARKS).sort(), MARKS.slice().sort());
});

test('an undeclared mark is a throw, not a silent no-draw', () => {
  const ctx = loadBoard();
  assert.throws(() => ctx.bpOverlay(el('svg'), 'nosuch', {}), /no mark/);
  assert.throws(() => ctx.bpOverlayMark({ id: 'ring', draw(){} }), /duplicate/);
});

test('every mark draws something, into its own named group', () => {
  const ctx = loadBoard();
  const args = { hex: 'B', from: 'A', to: 'C', text: '3 vs 2', tone: 'tie',
                 owner: 'red', color: '#f00', dir: 0, sw: 4 };
  MARKS.forEach(id => {
    const svg = el('svg');
    const g = ctx.bpOverlay(svg, id, args);
    assert.strictEqual(svg.kids.length, 1, id + ' lands one group on the board');
    assert.ok(/\bbpm-/.test(g.attrs['class']), id + ' names its group');
    assert.ok(g.kids.length > 0, id + ' draws something');
  });
});

// Scale is the only thing that varies between the live board and the diagram.
test('a mark at half scale is the same mark, half size', () => {
  const ctx = loadBoard();
  const width = s => {
    const g = ctx.bpOverlay(el('svg'), 'strike', { from: 'A', to: 'C', color: '#f00', s: s });
    return parseFloat(g.kids[0].attrs['stroke-width']);
  };
  assert.ok(Math.abs(width(22) * 2 - width(44)) < 0.01, 'stroke width follows the hex size');
});

test('a mark with a lifetime removes itself; one without stays', () => {
  const ctx = loadBoard();
  const svg = el('svg');
  ctx.bpOverlay(svg, 'ring', { hex: 'B', color: '#f00', ttl: 600 });
  assert.strictEqual(svg.kids.length, 1);
  assert.strictEqual(ctx.timers[0].ms, 600);
  ctx.timers[0].fn();
  assert.strictEqual(svg.kids.length, 0, 'gone when its time is up');
  ctx.bpOverlay(svg, 'ring', { hex: 'B', color: '#f00' });
  assert.strictEqual(ctx.timers.length, 1, 'a still frame schedules no removal');
});

// The house's "one more mark" proof.
test('a mark registered from nothing draws through the same door', () => {
  const ctx = loadBoard();
  ctx.bpOverlayMark({ id: 'fixture', draw: (g, o, s) => g.appendChild(el('circle', { r: s })) });
  const svg = el('svg');
  const g = ctx.bpOverlay(svg, 'fixture', { s: 10, cls: 'mine', ttl: 5 });
  assert.strictEqual(g.attrs['class'], 'bpm bpm-fixture mine');
  assert.strictEqual(g.kids[0].attrs.r, 10, 'the base hands it the scale');
  assert.strictEqual(ctx.timers[0].ms, 5, 'and gives it a lifetime for free');
});
