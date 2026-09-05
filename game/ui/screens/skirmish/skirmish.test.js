/* The skirmish screen's own tests: the region base — the paint order and the
   small-screen mirror. Loaded into a vm with a small DOM stand-in, which is
   enough for what the base decides; dev/smoke.js drives the real screen.

   Run alone with `node game/ui/screens/skirmish/skirmish.test.js`, or the whole
   gate with `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function node(html) {
  return {
    innerHTML: html || '', scrollTop: 0, scrollHeight: 99, onclick: null,
    removed: [],
    querySelector(sel){ return this.innerHTML.includes(sel.slice(1)) ? { remove: () => this.removed.push(sel) } : null; }
  };
}

function loadScreen(els) {
  const ctx = {
    els: els,
    $: id => els[id] || null,
    open: {},
    modalIsOpen: id => !!ctx.open[id]
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'region.js'), 'utf8'), ctx,
    { filename: 'region.js' });
  return ctx;
}

test('a region with no household to paint it is a throw', () => {
  const ctx = loadScreen({});
  assert.throws(() => ctx.uiRegion({ id: 'x', el: 'x' }), /missing paint/);
  ctx.uiRegion({ id: 'x', el: 'x', paint(){} });
  assert.throws(() => ctx.uiRegion({ id: 'x', el: 'x', paint(){} }), /duplicate/);
});

test('the screen repaints in declaration order', () => {
  const ctx = loadScreen({});
  const order = [];
  ['topbar', 'mats', 'board'].forEach(id =>
    ctx.uiRegion({ id: id, el: id, paint(){ order.push(id); } }));
  ctx.regionsPaint();
  assert.deepEqual(order, ['topbar', 'mats', 'board']);
});

test('a mirror copies the rail, drops what the modal already shows, and re-wires it', () => {
  const els = { log: node('<div class="jhead">head</div><div class="jturn">turn</div>'),
                journalOvrBody: node() };
  const ctx = loadScreen(els);
  let wired = 0;
  ctx.uiRegion({ id: 'journal', el: 'log', paint(){},
    mirror: { modal: 'journal', body: 'journalOvrBody', strip: '.jhead', wire(){ wired++; } } });
  ctx.regionMirror('journal');
  assert.strictEqual(els.journalOvrBody.innerHTML, els.log.innerHTML, 'the rail is copied');
  assert.deepEqual(els.journalOvrBody.removed, ['.jhead'], 'the duplicate header goes');
  assert.strictEqual(wired, 1, 'the handlers innerHTML dropped are put back');
});

test('only an open mirror is refreshed on a repaint', () => {
  const els = { log: node('x'), journalOvrBody: node(), leftcol: node('y'), matsOvrBody: node() };
  const ctx = loadScreen(els);
  let journal = 0, mats = 0;
  ctx.uiRegion({ id: 'journal', el: 'log', paint(){},
    mirror: { modal: 'journal', body: 'journalOvrBody', wire(){ journal++; } } });
  ctx.uiRegion({ id: 'mats', el: 'leftcol', paint(){},
    mirror: { modal: 'mats', body: 'matsOvrBody', wire(){ mats++; } } });
  ctx.open.journal = true;
  ctx.regionsSync();
  assert.strictEqual(journal, 1);
  assert.strictEqual(mats, 0, 'a closed mirror is not touched');
});

test('a rail whose mirror is not on the page is a no-op, not a crash', () => {
  const ctx = loadScreen({ log: node('x') });
  ctx.uiRegion({ id: 'journal', el: 'log', paint(){},
    mirror: { modal: 'journal', body: 'journalOvrBody', wire(){ throw new Error('wired'); } } });
  ctx.regionMirror('journal');
});
