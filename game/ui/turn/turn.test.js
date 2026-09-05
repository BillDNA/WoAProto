/* The turn house's own tests: the action base, which is what every way of
   advancing a turn now shares. Loaded into a vm with the engine, the screen and
   the session stubbed, so what is under test is the sequence itself.

   Run alone with `node game/ui/turn/turn.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

function loadTurn(o) {
  o = o || {};
  const log = [];
  const view = { phase: o.phase || 'step', battle: { winner: o.winner || null } };
  const ctx = {
    log: log,
    APP: { st: {}, ui: { sel: 'A1' } },
    E: {
      view: () => view,
      applyStep(){ log.push('applyStep'); if (o.reject) throw new Error('illegal'); },
      playCard(){ log.push('playCard'); if (o.reject) throw new Error('illegal'); },
      concede(){ log.push('concede'); },
      listAttacks: () => [], listRepositions: () => ({ moves: [], swaps: [] })
    },
    view: view,
    toast: m => log.push('toast'),
    renderAll(){ log.push('renderAll'); },
    saveLocal(){ log.push('saveLocal'); },
    pushState(){ log.push('pushState'); },
    showSkirmishOver(){ log.push('showSkirmishOver'); },
    clearSave(){ log.push('clearSave'); },
    seatWire: () => !!o.wire,
    seatBeginTurn(){ log.push('beginTurn'); },
    seatConcedable: () => true,
    inputLive: () => true,
    viewSide: () => 'red',
    capName: p => p,
    confirmDialog(){},
    modalOpen(){},
    cardDef: id => ({ id: id, name: id }),
    capturePre: () => ({ fake: true }),
    playFX(){ log.push('playFX'); },
    setTimeout: (fn) => { log.push('deferred'); ctx.deferred = fn; },
    $: () => null
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, 'turn.js'), 'utf8'), ctx, { filename: 'turn.js' });
  return ctx;
}

test('every way of advancing a turn is one declared action', () => {
  const ctx = loadTurn();
  assert.deepEqual(Object.keys(ctx.UI_ACTIONS).sort(), ['card', 'concede', 'step']);
  assert.throws(() => ctx.uiAction({ id: 'step', run(){} }), /duplicate/);
});

test('a resolved action repaints, persists and hands the turn on', () => {
  const ctx = loadTurn({ phase: 'choose-card' });
  assert.strictEqual(ctx.act({ hex: 'B2' }), true);
  assert.strictEqual(ctx.APP.ui.sel, null, 'the selection is dropped');
  assert.deepEqual(ctx.log, ['applyStep', 'renderAll', 'saveLocal', 'beginTurn', 'playFX']);
});

test('the peer is told only from a seat that is on the wire', () => {
  const dry = loadTurn(); dry.act({});
  assert.ok(!dry.log.includes('pushState'));
  const wet = loadTurn({ wire: true }); wet.act({});
  assert.ok(wet.log.includes('pushState'));
});

test('a rejected action repaints and settles nothing', () => {
  const ctx = loadTurn({ reject: true });
  assert.strictEqual(ctx.act({ hex: 'B2' }), false);
  assert.deepEqual(ctx.log, ['applyStep', 'toast', 'renderAll']);
  assert.strictEqual(ctx.APP.ui.sel, 'A1', 'the selection survives a refusal');
});

test('a quiet action refuses without accusing the player', () => {
  const ctx = loadTurn({ reject: true });
  ctx.resolveCard({ cid: 'x', mode: 'normal' });
  assert.ok(!ctx.log.includes('toast'), 'no "invalid move" for a modal-driven choice');
});

test('a finished skirmish clears the save and holds the win card for the animation', () => {
  const ctx = loadTurn({ phase: 'skirmish-over', winner: 'red' });
  ctx.act({ to: 'C3' });
  assert.ok(ctx.log.includes('clearSave'), 'a decided battle drops the save');
  assert.ok(ctx.log.includes('deferred') && !ctx.log.includes('showSkirmishOver'),
    'the win card waits');
  ctx.deferred();
  assert.ok(ctx.log.includes('showSkirmishOver'));
});

test('an action with no animation to finish shows the win card at once', () => {
  const ctx = loadTurn({ phase: 'skirmish-over', winner: 'red' });
  ctx.concedeTurn('red');
  assert.ok(ctx.log.includes('showSkirmishOver') && !ctx.log.includes('deferred'));
});
