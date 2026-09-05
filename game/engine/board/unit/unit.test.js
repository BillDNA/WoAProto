/* The unit house's own tests — they live with the code they cover.
   Run alone with `node game/engine/board/unit/unit.test.js`, or as part of the gate
   with `node game/test/test.js`, which requires this file. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, SIM, TESTMAP, testSkirmish, freshEngine } = require('../../../test/test.helpers.js');

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
  const full = { type: 'q', name: f, atk: f, def: f, sup: f, worth: f, count: f, deployCost: f };
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
    assert.match(String(E.orphanRowProblem()), /"tank".*no room in engine\/board\/unit\//,
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

// A piece is worth its bounty plus a premium for what it can still do. Derived,
// not tabulated, so a new type is priced with no number to keep in step.
test('the AI prices a unit off its bounty, by a weight anyone may shift', () => {
  E.unitTypes().forEach(t => assert.strictEqual(E.unitValue(t), E.UNITS[t].worth + E.AI_WEIGHTS.unitValueBase,
    t + ' is priced at its bounty plus the premium'));
  assert.strictEqual(E.unitValue('cavalry', { unitValueBase: 10 }), E.UNITS.cavalry.worth + 10,
    "a personality's or Commander's merged weights shift the premium");
  const was = E.CONFIG.unit.cavalry.worth;
  try {
    E.CONFIG.unit.cavalry.worth = was + 3;
    assert.strictEqual(E.unitValue('cavalry'), was + 3 + E.AI_WEIGHTS.unitValueBase,
      'and retuning the bounty moves the price with it');
  } finally { E.CONFIG.unit.cavalry.worth = was; }
});

// AI tuning must never move the digest stamped on DB rows: sweeping what the
// search pays for a piece cannot make new runs incomparable with old ones.
test('the AI premium is an AI weight, so it is outside the rules digest', () => {
  const was = E.CONFIG.digest;
  E.AI_WEIGHTS.unitValueBase += 1;
  try { assert.strictEqual(E.CONFIG.digest, was, 'repricing leaves CONFIG.digest alone'); }
  finally { E.AI_WEIGHTS.unitValueBase -= 1; }
  E.CONFIG.unit.cavalry.deployCost += 1;
  try {
    assert.notStrictEqual(E.CONFIG.digest, was, 'while a rules dial on the same row does move it');
  } finally { E.CONFIG.unit.cavalry.deployCost -= 1; }
});

// The house owns the pieces, not just their numbers: every deploy, march, kill
// and reserve spend goes through this one door.
test('the pieces themselves live behind the house door', () => {
  const st = testSkirmish(410);
  E.Units.place(st, '0,0', 'infantry', 'red');
  assert.deepStrictEqual(E.Units.at(st, '0,0'), { type: 'infantry', owner: 'red' }, 'placed and read back');
  assert.strictEqual(E.Units.at(st, '2,0'), null, 'an empty hex answers null, not undefined');
  E.Units.advance(st, '0,0', '1,0');
  assert.ok(!E.Units.at(st, '0,0') && E.Units.at(st, '1,0'), 'a march moves the piece, leaving nothing behind');
  E.Units.place(st, '0,0', 'cavalry', 'red');
  E.Units.swap(st, '0,0', '1,0');
  assert.strictEqual(E.Units.at(st, '0,0').type, 'infantry', 'a swap exchanges them');
  const seen = [];
  E.Units.each(st, (h, u) => seen.push(u.type));
  assert.strictEqual(seen.length, 2, 'each() walks every piece on the board');
  const held = E.Units.reserve(st, 'red', 'cavalry');
  E.Units.spendReserve(st, 'red', 'cavalry');
  assert.strictEqual(E.Units.reserve(st, 'red', 'cavalry'), held - 1, 'a spend comes off the reserve');
  E.Units.remove(st, '0,0');
  assert.strictEqual(E.Units.at(st, '0,0'), null, 'and a kill clears the hex');
  assert.deepStrictEqual(E.Units.fullReserve(), E.unitStock(), "a side's untouched stock is the box's");
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
// Runs on its OWN engine (freshEngine), so the fixture type is real everywhere
// inside this test and exists nowhere outside it.
test('the unit house: a fourth type needs only its own answers', () => {
  const { E, SIM } = freshEngine();
  const testSkirmish = seed => E.newSkirmish(E.newBattle({ seed, firstPlayer: 'red', maps: [TESTMAP] }));
  const dial = { name: 'Sapper', atk: 2, def: 2, sup: 0, worth: 4, count: 0, deployCost: 3 };
  E.CONFIG.unit.sapper = dial;
  E.defineUnit({
    type: 'sapper',
    name:       function () { return E.CONFIG.unit.sapper.name; },
    atk:        function () { return E.CONFIG.unit.sapper.atk; },
    def:        function () { return E.CONFIG.unit.sapper.def; },
    sup:        function () { return E.CONFIG.unit.sapper.sup; },
    worth:      function () { return E.CONFIG.unit.sapper.worth; },
    count:      function () { return E.CONFIG.unit.sapper.count; },
    deployCost: function () { return E.CONFIG.unit.sapper.deployCost; }
  });

  assert.ok(E.unitTypes().indexOf('sapper') >= 0, 'the registry lists it');
  assert.strictEqual(E.UNITS.sapper.atk, dial.atk, 'its stat record resolves');

  // combat: it attacks, defends and hands over its bounty, with no edit to the rules
  const st = testSkirmish(321);
  E.Units.place(st, '0,0', 'sapper', 'red');
  E.Units.place(st, '1,0', 'infantry', 'blue');
  const r = E.computeAttack(st, { from: '0,0', to: '1,0' });
  assert.strictEqual(r.attackerPower, dial.atk, 'it attacks at its own strength');
  assert.ok(r.attackerParts.some(p => p.indexOf('Sapper attack') >= 0),
    'the combat breakdown names it: ' + JSON.stringify(r.attackerParts));
  const r2 = E.computeAttack(st, { from: '1,0', to: '0,0' });
  assert.strictEqual(r2.defenderPower, dial.def, 'and defends at its own strength');
  assert.strictEqual(E.fieldScore(st, 'red'), dial.worth, 'it counts for its own field score');

  // the AI's valuation
  assert.strictEqual(E.unitValue('sapper'), dial.worth + E.AI_WEIGHTS.unitValueBase,
    "the search prices it with no number added anywhere");

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

  // it plays: a whole AI skirmish on an engine that has four types
  assert.strictEqual(SIM.simSkirmish(TESTMAP, 42, 'red', 'normal', 'normal').flow.phase,
    'skirmish-over', 'and a skirmish runs to a result with it registered');
});

test('a contract fixture never reaches the shipped registry', () => {
  assert.strictEqual(E.unitTypes().indexOf('sapper'), -1,
    'the live engine still ships exactly the types in content/units/');
});
