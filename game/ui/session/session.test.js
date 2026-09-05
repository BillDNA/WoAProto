/* The session house's own tests. Its two bases are decidable without a browser:
   a seat is a table of answers, and a stored record is a key, a version and what
   happens to an older one. The files are classic scripts, so they load into a vm
   context with the browser stubbed.

   Run alone with `node game/ui/session/session.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const GAME = path.join(__dirname, '..', '..');
const ORDER = require(path.join(GAME, 'load-order.js'));
// the two bases and every room of each, in the order the page loads them
const HOUSE = ORDER.APP.filter(p => /^ui\/session\/(store|seat)/.test(p));

// A fresh house per test: the files declare their seats and records at load, so
// re-running them in a new context is how a test gets a clean registry.
function loadSession(view) {
  const store = {};
  const ctx = {
    localStorage: {
      getItem: k => (k in store ? store[k] : null),
      setItem: (k, v) => { store[k] = String(v); },
      removeItem: k => { delete store[k]; }
    },
    raw: store,
    APP: { mode: 'ai', mySide: 'red', diff: 'normal', st: {}, ui: {}, net: {} },
    E: { view: () => view || { current: 'red', phase: 'choose-card' } },
    capName: p => p.charAt(0).toUpperCase() + p.slice(1),
    called: [],
    maybeAI(){ ctx.called.push('maybeAI'); },
    modalOpen(id){ ctx.called.push('modal:' + id); },
    renderHand(){},
    clearSave(){},
    syncBattalionFile(){},
    $: () => null,
    show(){}, renderAll(){}, showSkirmishOver(){}, syncCommandersFromState(){},
    seatPersists: () => true, seatGatesHand: () => false, seatBeginTurn(){}
  };
  vm.createContext(ctx);
  HOUSE.forEach(p =>
    vm.runInContext(fs.readFileSync(path.join(GAME, p), 'utf8'), ctx, { filename: p }));
  return ctx;
}

/* ---- the stored record ---- */
test('a versioned record round-trips, and a stale one is discarded', () => {
  const ctx = loadSession();
  const rec = ctx.uiStore({ id: 'fixture', key: 'woa-fixture', version: 3 });
  rec.write({ a: 1 });
  assert.deepEqual(rec.read(), { a: 1 }, 'reads back what it wrote');
  assert.ok(rec.has(), 'has() sees it');
  ctx.raw['woa-fixture'] = JSON.stringify({ v: 2, d: { a: 1 } });
  assert.strictEqual(rec.read(), null, 'a record from an older version is discarded');
  rec.clear();
  assert.strictEqual(rec.has(), false, 'cleared');
});

test('migrate is how an older spelling survives a version', () => {
  const ctx = loadSession();
  const rec = ctx.uiStore({ id: 'fixture', key: 'woa-fixture', version: 1,
    migrate: v => (v === '1' ? true : null) });
  ctx.raw['woa-fixture'] = '"1"';
  assert.strictEqual(rec.read(), true, 'the legacy spelling still reads');
  ctx.raw['woa-fixture'] = '"nonsense"';
  assert.strictEqual(rec.read(), null, 'anything else is discarded');
});

test('an unversioned record is stored bare, for a reader that predates the app', () => {
  const ctx = loadSession();
  // game/applied-battalion.js JSON.parses this key directly, before any ui file
  // loads — so the stored bytes must be the payload, with no envelope.
  ctx.STORE_BATTALION.write([{ id: 'x' }]);
  assert.deepEqual(JSON.parse(ctx.raw['woa-custom-battalion']), [{ id: 'x' }]);
});

test('a record survives a browser that refuses storage', () => {
  const ctx = loadSession();
  ctx.localStorage.setItem = () => { throw new Error('private mode'); };
  ctx.localStorage.getItem = () => { throw new Error('private mode'); };
  assert.strictEqual(ctx.STORE_SAVE.write({ a: 1 }), false, 'write reports the refusal');
  assert.strictEqual(ctx.STORE_SAVE.read(), null, 'read degrades to nothing stored');
});

/* ---- the seat ---- */
const QUESTIONS = ['live', 'viewSide', 'drives', 'you', 'aiSide', 'waiting', 'beginTurn',
  'persists', 'wire', 'concedable', 'gatesHand', 'aiName', 'runKind'];

test('every seat and every record is a room of its own, scheduled by load-order', () => {
  const ctx = loadSession();
  ['none', 'ai', 'hotseat', 'net', 'watch'].forEach(m =>
    assert.ok(HOUSE.includes('ui/session/seats/' + m + '.js'), m + ' has its own room'));
  ['save', 'dev', 'battalions', 'battalion'].forEach(r =>
    assert.ok(HOUSE.includes('ui/session/stores/' + r + '.js'), r + ' has its own room'));
  assert.deepEqual(Object.keys(ctx.UI_STORES).sort(),
    ['battalion', 'battalions', 'dev', 'save']);
});

test('every seat answers every question', () => {
  const ctx = loadSession();
  const modes = Object.keys(ctx.UI_SEATS);
  assert.deepEqual(modes.sort(), ['ai', 'hotseat', 'net', 'none', 'watch']);
  modes.forEach(m => QUESTIONS.forEach(q =>
    assert.notStrictEqual(ctx.UI_SEATS[m][q], undefined, m + ' answers ' + q)));
});

test('a seat that half-answers throws while the page loads', () => {
  const ctx = loadSession();
  assert.throws(() => ctx.uiSeat({ mode: 'fixture', live: () => true }), /missing/);
  assert.throws(() => ctx.uiSeat({ mode: 'ai' }), /missing|duplicate/);
});

// The house's "one more variant" proof: a fifth mode, registered from nothing,
// is live everywhere the four are with no edit to any caller.
test('a mode registered from nothing is live in every question the screen asks', () => {
  const ctx = loadSession({ current: 'blue', phase: 'choose-card' });
  ctx.uiSeat({
    mode: 'fixture',
    live: () => true, viewSide: () => 'blue', drives: (v, p) => p === 'blue',
    you: () => 'blue', aiSide: p => p === 'red',
    waiting: () => 'fixture waiting', beginTurn(){ ctx.called.push('fixtureTurn'); },
    persists: false, wire: true, concedable: false, gatesHand: true,
    aiName: () => 'fixture-ai', runKind: 'fixture'
  });
  ctx.APP.mode = 'fixture';
  assert.strictEqual(ctx.inputLive(), true);
  assert.strictEqual(ctx.viewSide(), 'blue');
  assert.strictEqual(ctx.seatYou(), 'blue');
  assert.strictEqual(ctx.seatDrives('blue'), true);
  assert.strictEqual(ctx.seatAiSide('red'), true);
  assert.strictEqual(ctx.seatWaiting(ctx.E.view()), 'fixture waiting');
  assert.strictEqual(ctx.seatPersists(), false);
  assert.strictEqual(ctx.seatWire(), true);
  assert.strictEqual(ctx.seatConcedable(), false);
  assert.strictEqual(ctx.seatAiName('red'), 'fixture-ai');
  assert.strictEqual(ctx.seatRunKind(), 'fixture');
  ctx.APP.ui.handoffPending = true;
  assert.strictEqual(ctx.seatHidesHand(), true);
  ctx.seatBeginTurn();
  assert.ok(ctx.called.includes('fixtureTurn'), 'the new mode opens its own turn');
});

test('a decided skirmish and a busy screen kill input whatever the seat says', () => {
  const over = loadSession({ current: 'red', phase: 'skirmish-over' });
  over.APP.mode = 'hotseat';
  assert.strictEqual(over.inputLive(), false, 'skirmish over');
  const busy = loadSession();
  busy.APP.mode = 'hotseat';
  busy.APP.ui.busy = true;
  assert.strictEqual(busy.inputLive(), false, 'mid-AI-turn');
});

test('nothing seated is a seat of its own — no guessing on the menu', () => {
  const ctx = loadSession();
  ctx.APP.mode = null;
  assert.strictEqual(ctx.seat().mode, 'none');
  assert.strictEqual(ctx.inputLive(), false);
  assert.strictEqual(ctx.seatYou(), null);
  assert.strictEqual(ctx.seatPersists(), false);
  assert.strictEqual(ctx.seatConcedable(), false);
});

test('watch mode has no "you" and cannot concede', () => {
  const ctx = loadSession();
  ctx.APP.mode = 'watch';
  assert.strictEqual(ctx.seatYou(), null);
  assert.strictEqual(ctx.seatConcedable(), false);
  assert.strictEqual(ctx.seatAiSide('red'), true);
  assert.strictEqual(ctx.seatAiSide('blue'), true);
});
