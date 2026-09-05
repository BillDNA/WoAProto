/* The unit house's own tests — they live with the code they cover.
   Run alone with `node game/engine/unit/unit.test.js`, or as part of the gate
   with `node game/test/test.js`, which requires this file. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, testSkirmish } = require('../../test/test.helpers.js');

test('the stat record is a live view of the dials, not a snapshot', () => {
  const was = E.CONFIG.unit.infantry.atk;
  try {
    E.CONFIG.unit.infantry.atk = was + 5;
    assert.strictEqual(E.UNITS.infantry.atk, was + 5, 'retuning the dial shows through E.UNITS');
  } finally { E.CONFIG.unit.infantry.atk = was; }
  assert.strictEqual(E.UNITS.infantry.atk, was, 'and back again');
  assert.ok(JSON.parse(JSON.stringify(E.UNITS)).infantry.name,
    'the record still stringifies for the report and DB layers');
});

test('a room must answer every question, and only those questions', () => {
  const full = { type: 'q', name: f, atk: f, def: f, sup: f, worth: f, count: f, aiValue: f, deployCost: f };
  function f() { return 0; }
  Object.keys(full).forEach(field => {
    if (field === 'type') return;
    const spec = Object.assign({}, full, { type: 'z' + field.toLowerCase() });
    delete spec[field];
    assert.throws(() => E.defineUnit(spec), new RegExp('missing ' + field),
      'a room without ' + field + ' is rejected');
  });
  assert.throws(() => E.defineUnit(Object.assign({ extra: 1 }, full, { type: 'zextra' })),
    /unknown field/, 'a room may not invent a field');
  assert.throws(() => E.defineUnit(Object.assign({}, full, { type: 'infantry' })),
    /duplicate type/, 'two rooms may not claim the same type');
  assert.throws(() => E.defineUnit(Object.assign({}, full, { type: 'zorphan' })),
    /no row in CONFIG.unit/, 'a room with no dial row is rejected at load, not silently zeroed');
});

test('the stock guardrail counts what the rooms declare', () => {
  assert.strictEqual(E.unitStockProblem(), null, 'the shipped composition is legal');
  const was = E.CONFIG.unit.infantry.count;
  try {
    E.CONFIG.unit.infantry.count = was + 1;
    assert.match(String(E.unitStockProblem()), /must total/,
      'one piece too many is a problem, named as one');
  } finally { E.CONFIG.unit.infantry.count = was; }
  const stock = E.unitStock();
  E.unitTypes().forEach(t => assert.strictEqual(stock[t], E.UNITS[t].count, t + "'s stock is its count"));
});

test('the AI prices a unit from its own dial, and falls back to the bounty', () => {
  assert.strictEqual(E.unitValue('cavalry'), E.CONFIG.unit.cavalry.aiValue, 'the dial is what the search reads');
  const was = E.CONFIG.unit.cavalry.aiValue;
  try {
    delete E.CONFIG.unit.cavalry.aiValue;
    assert.strictEqual(E.unitValue('cavalry'), E.UNITS.cavalry.worth + 2,
      'a type with no aiValue is priced off its bounty rather than vanishing from the search');
  } finally { E.CONFIG.unit.cavalry.aiValue = was; }
});

test('a deploy step is priced by the unit it places', () => {
  assert.strictEqual(E.deployPoints('artillery'), E.CONFIG.unit.artillery.deployCost);
  assert.strictEqual(E.deployPoints(undefined), 0, 'a step with no unit carries no surcharge');
  const base = E.cardPoints({ steps: [{ type: 'deploy', unit: 'infantry' }] });
  const heavy = E.cardPoints({ steps: [{ type: 'deploy', unit: 'artillery' }] });
  assert.strictEqual(heavy - base, E.deployPoints('artillery') - E.deployPoints('infantry'),
    'the card yardstick reads the surcharge through the house');
});

// The house's contract: a fourth type is written once, in one room file plus its
// dial row, and is then live in combat, in the AI's valuation, in the reserve
// model, on the board and on the mat — none of which names a unit type.
// Registered LAST so the shipped three are asserted against a three-type registry.
test('the unit house: a fourth type needs only its own answers', () => {
  const dial = { name: 'Sapper', atk: 2, def: 2, sup: 0, worth: 4, count: 0, aiValue: 7, deployCost: 3 };
  E.CONFIG.unit.sapper = dial;
  E.defineUnit({
    type: 'sapper',
    name:       function () { return E.CONFIG.unit.sapper.name; },
    atk:        function () { return E.CONFIG.unit.sapper.atk; },
    def:        function () { return E.CONFIG.unit.sapper.def; },
    sup:        function () { return E.CONFIG.unit.sapper.sup; },
    worth:      function () { return E.CONFIG.unit.sapper.worth; },
    count:      function () { return E.CONFIG.unit.sapper.count; },
    aiValue:    function () { return E.CONFIG.unit.sapper.aiValue; },
    deployCost: function () { return E.CONFIG.unit.sapper.deployCost; }
  });

  assert.ok(E.unitTypes().indexOf('sapper') >= 0, 'the registry lists it');
  assert.strictEqual(E.UNITS.sapper.atk, dial.atk, 'its stat record resolves');

  // combat: it attacks, defends and hands over its bounty, with no edit to the rules
  const st = testSkirmish(321);
  E.Pieces.place(st, '0,0', 'sapper', 'red');
  E.Pieces.place(st, '1,0', 'infantry', 'blue');
  const r = E.computeAttack(st, { from: '0,0', to: '1,0' });
  assert.strictEqual(r.attackerPower, dial.atk, 'it attacks at its own strength');
  assert.ok(r.attackerParts.some(p => p.indexOf('Sapper attack') >= 0),
    'the combat breakdown names it: ' + JSON.stringify(r.attackerParts));
  const r2 = E.computeAttack(st, { from: '1,0', to: '0,0' });
  assert.strictEqual(r2.defenderPower, dial.def, 'and defends at its own strength');
  assert.strictEqual(E.fieldScore(st, 'red'), dial.worth, 'it counts for its own field score');

  // the AI's valuation
  assert.strictEqual(E.unitValue('sapper'), dial.aiValue, "the search knows what it's worth");

  // the reserve model + the mat's slot count
  const fresh = E.newSkirmish(E.newBattle({ seed: 5, firstPlayer: 'red' }));
  assert.strictEqual(fresh.pieces.reserves.red.sapper, dial.count,
    'a fresh reserve holds its stock');
  E.unitTypes().filter(t => t !== 'sapper').forEach(t => assert.strictEqual(E.PIECE_TOTALS[t], E.UNITS[t].count,
    "the mat's slot count for " + t + ' is the house\'s stock (a room loaded with the engine is in it)'));
  assert.ok(Object.prototype.hasOwnProperty.call(fresh.journal.unitMetrics, 'sapper'),
    'the per-type metrics fold has a row for it');

  // the card yardstick
  assert.strictEqual(E.deployPoints('sapper'), dial.deployCost, 'a deploy step of it is priced');

  // and the stock guardrail still counts it (count 0 keeps the shipped total legal)
  assert.strictEqual(E.unitStockProblem(), null, 'the composition is still legal');
});
