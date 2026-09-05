/* The turn house's own tests: the action base and its rooms — every way of
   advancing a turn. Loaded into a vm with the engine, the screen and the session
   stubbed, so what is under test is the sequence itself; the rooms are taken
   from load-order.js, so a room that exists but is not scheduled fails here.

   Run alone with `node game/ui/turn/turn.test.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const GAME = path.join(__dirname, '..', '..');
const ORDER = require(path.join(GAME, 'load-order.js'));
const HOUSE = ORDER.APP.filter(p => /^ui\/turn\/(turn\.js|actions\/)/.test(p));

function loadTurn(o) {
  o = o || {};
  const log = [];
  const view = { phase: o.phase || 'step', battle: { winner: o.winner || null } };
  const ctx = {
    log: log,
    APP: {},
    E: {
      view: () => view,
      applyStep(){ log.push('applyStep'); if (o.reject) throw new Error('illegal'); },
      playCard(){ log.push('playCard'); if (o.reject) throw new Error('illegal'); },
      concede(){ log.push('concede'); },
      concedeAdvised: () => false,
      aiPlanTurn: () => ({ cardId: 'x', choices: [] }),
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
  ctx.seatAiSide = () => false;
  vm.createContext(ctx);
  HOUSE.forEach(p =>
    vm.runInContext(fs.readFileSync(path.join(GAME, p), 'utf8'), ctx, { filename: p }));
  // the house declares APP.ui itself; a test starts mid-turn with something picked
  ctx.APP.st = {};
  ctx.APP.ui.sel = 'A1';
  return ctx;
}

test('every way of advancing a turn is one declared action, in its own room', () => {
  const ctx = loadTurn();
  assert.deepEqual(Object.keys(ctx.UI_ACTIONS).sort(),
    ['ai-card', 'ai-step', 'card', 'concede', 'step']);
  assert.throws(() => ctx.uiAction({ id: 'step', run(){} }), /duplicate/);
  ['card', 'step', 'concede', 'ai'].forEach(room =>
    assert.ok(HOUSE.includes('ui/turn/actions/' + room + '.js'), room + ' has its own room'));
});

// The AI used to call the engine itself, which is how the sixth spelling of
// advancing a turn drifted from the other five.
test('the AI takes its turn through the same door a player does', () => {
  const ctx = loadTurn({ phase: 'step' });
  ctx.aiStep({ skip: true });
   assert.deepEqual(ctx.log, ['applyStep', 'renderAll', 'playFX'],
    'it repaints but does not settle — the plan is still running');
  const bad = loadTurn({ phase: 'step', reject: true });
  bad.$ = () => null;
  bad.aiStep({ hex: 'B2' });
  assert.ok(!bad.log.includes('toast') || bad.log.filter(l => l === 'toast').length === 1,
    'a stale plan does not accuse the player');
  assert.strictEqual(bad.log.filter(l => l === 'applyStep').length, 2,
    'a refused step is skipped, not abandoned');
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
