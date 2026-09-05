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
  assert.strictEqual(E.defineUnit(Object.assign({}, full, { type: 'zstanddown' })), null,
    'a room whose type the active stat block dropped stands down rather than registering');
  assert.ok(E.unitTypes().indexOf('zstanddown') < 0, 'and is nowhere in the registry');
});

// The two halves of "the stat block and the rooms agree": a room with no row
// stands down (above), and a row with no room is a piece nothing could draw.
test('a stat row nobody claimed is named, not silently dropped', () => {
  E.CONFIG.unit.tank = { name: 'Tank', atk: 4, def: 4, sup: 0, worth: 5, count: 2 };
  try {
    assert.match(String(E.orphanRowProblem()), /"tank".*no room in engine\/unit\//,
      'the orphan row is named, with where its stats came from');
    assert.throws(() => E.checkUnitStock(), /tank/,
      'and the load-time check fails on it rather than on the piece count it skews');
  } finally { delete E.CONFIG.unit.tank; }
  assert.strictEqual(E.orphanRowProblem(), null, 'clean again');
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

test('the AI prices a unit from its own weight, overridably, and falls back to the bounty', () => {
  assert.strictEqual(E.unitValue('cavalry'), E.AI_WEIGHTS.unitValue.cavalry, 'the weight is what the search reads');
  assert.strictEqual(E.unitValue('cavalry', { unitValue: { cavalry: 99 } }), 99,
    "a personality's or Commander's merged weights reprice the piece");
  assert.strictEqual(E.unitValue('infantry', { unitValue: { cavalry: 99 } }),
    E.AI_WEIGHTS.unitValue.infantry, 'a partial override leaves the other types at base');
  const was = E.AI_WEIGHTS.unitValue.cavalry;
  try {
    delete E.AI_WEIGHTS.unitValue.cavalry;
    assert.strictEqual(E.unitValue('cavalry'), E.UNITS.cavalry.worth + 2,
      'a type with no price is valued off its bounty rather than vanishing from the search');
  } finally { E.AI_WEIGHTS.unitValue.cavalry = was; }
});

// AI tuning must never move the digest stamped on DB rows: sweeping what the
// search pays for a cavalry cannot make new runs incomparable with old ones.
test('the AI price is an AI weight, so it is outside the rules digest', () => {
  const was = E.CONFIG.digest;
  E.AI_WEIGHTS.unitValue.cavalry += 1;
  try { assert.strictEqual(E.CONFIG.digest, was, 'repricing a unit leaves CONFIG.digest alone'); }
  finally { E.AI_WEIGHTS.unitValue.cavalry -= 1; }
  E.CONFIG.unit.cavalry.deployCost += 1;
  try {
    assert.notStrictEqual(E.CONFIG.digest, was, 'while a rules dial on the same row does move it');
  } finally { E.CONFIG.unit.cavalry.deployCost -= 1; }
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
  const dial = { name: 'Sapper', atk: 2, def: 2, sup: 0, worth: 4, count: 0, deployCost: 3 };
  E.CONFIG.unit.sapper = dial;
  E.AI_WEIGHTS.unitValue.sapper = 7;
  E.defineUnit({
    type: 'sapper',
    name:       function () { return E.CONFIG.unit.sapper.name; },
    atk:        function () { return E.CONFIG.unit.sapper.atk; },
    def:        function () { return E.CONFIG.unit.sapper.def; },
    sup:        function () { return E.CONFIG.unit.sapper.sup; },
    worth:      function () { return E.CONFIG.unit.sapper.worth; },
    count:      function () { return E.CONFIG.unit.sapper.count; },
    aiValue:    function (price) { return price.sapper; },
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
  assert.strictEqual(E.unitValue('sapper'), E.AI_WEIGHTS.unitValue.sapper, "the search knows what it's worth");

  // the reserve model + the mat's slot count
  const fresh = E.newSkirmish(E.newBattle({ seed: 5, firstPlayer: 'red' }));
  assert.strictEqual(fresh.pieces.reserves.red.sapper, dial.count,
    'a fresh reserve holds its stock');
  E.unitTypes().forEach(t => assert.strictEqual(E.PIECE_TOTALS[t], E.UNITS[t].count,
    "the mat's slot count for " + t + " is the house's stock, the new type included"));
  assert.ok(Object.prototype.hasOwnProperty.call(fresh.journal.unitMetrics, 'sapper'),
    'the per-type metrics fold has a row for it');

  // the card yardstick
  assert.strictEqual(E.deployPoints('sapper'), dial.deployCost, 'a deploy step of it is priced');

  // and the stock guardrail still counts it (count 0 keeps the shipped total legal)
  assert.strictEqual(E.unitStockProblem(), null, 'the composition is still legal');
});
