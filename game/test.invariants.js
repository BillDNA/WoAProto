/* The invariant suite + the two suite-guards (ADR-0004, #189).

   This file is the ONE home of the auditable invariant set. Each `invariant(cat,
   name, fn)` below is a property that must hold in EVERY rules era — determinism,
   GUI==CLI parity, legal-move generation, terminal-state reachability, and the
   stock conservation laws. They are sacred: changing one is a loud PR callout, not
   routine test-writer work (that is what separates them from pins, whose default
   label lets them move atomically with a RULES_VERSION bump — docs/context/test.md).

   The registry that names them lives in test-registry.js; the guard at the bottom
   reds if the two ever drift apart, so the sacred list cannot silently grow or
   shrink. A second guard reds if a test present at the base commit is deleted or
   `.skip`-ed without a surfaced act (pin-prune record / RULES_VERSION bump). */
'use strict';
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const H = require('./test.helpers.js');
const REG = require('./test-registry.js');
const { E, testSkirmish, invariant } = H;

// Requiring every sibling test file here means the collections the guards read
// (H.collectedInvariants / H.activeTestNames) are fully populated no matter the
// entry point — `node game/test.js` or `node --test game/test.invariants.js`.
// The file list is single-sourced in test-files.js so a new subsystem file
// cannot be wired into the runner yet slip past the guards. Requires are cached,
// so this never double-registers.
require('./test-files.js').forEach(function (f) { require(f); });

function classicMap() { return E.MAPS.filter(function (m) { return m.shape === 'classic'; })[0] || E.MAPS[0]; }

/* ---------------------------------------------------------------- invariants */

invariant('determinism', 'invariant/determinism: same seed reproduces the skirmish', () => {
  var map = classicMap();
  [7, 42, 1001].forEach(function (seed) {
    var a = E.simSkirmish(map, seed, 'red', 'normal', 'normal');
    var b = E.simSkirmish(map, seed, 'red', 'normal', 'normal');
    assert.strictEqual(a.skirmishWinner, b.skirmishWinner, 'seed ' + seed + ': same winner');
    assert.strictEqual(a.turnNumber, b.turnNumber, 'seed ' + seed + ': same turn count');
    assert.deepStrictEqual(a.units, b.units, 'seed ' + seed + ': byte-identical terminal board');
  });
});

invariant('parity', 'invariant/parity: interactive step path equals the batch sim', () => {
  // The GUI drives the engine one interaction at a time (playCard, then applyStep
  // per queued choice); the CLI/balance path drives the whole plan through the
  // batch helper (simSkirmish -> playToEnd). Both are callers of the ONE engine
  // and must never diverge. Re-drive a skirmish through the interactive API and
  // assert it lands on the same terminal state the batch path produces.
  var map = classicMap();
  [3, 55, 808].forEach(function (seed) {
    var batch = E.simSkirmish(map, seed, 'red', 'normal', 'normal');

    var st = E.newSkirmish(E.newMatch({ seed: seed, maps: [map], firstPlayer: 'red' }));
    var guard = 0;
    while (st.phase !== 'skirmish-over' && guard++ < 400) {
      var plan = E.aiPlanTurn(st, 'normal');
      if (!plan) break;
      E.playCard(st, plan.cardId, plan.mode || 'normal');
      var g2 = 0;
      while (st.phase === 'step' && g2++ < 12) {
        var c = plan.choices.shift() || { skip: true };
        try { E.applyStep(st, c); } catch (e) { try { E.applyStep(st, { skip: true }); } catch (e2) { break; } }
      }
    }
    assert.strictEqual(st.phase, 'skirmish-over', 'seed ' + seed + ': interactive drive terminated');
    assert.strictEqual(st.skirmishWinner, batch.skirmishWinner, 'seed ' + seed + ': GUI==CLI winner');
    assert.strictEqual(st.turnNumber, batch.turnNumber, 'seed ' + seed + ': GUI==CLI turn count');
    assert.deepStrictEqual(st.units, batch.units, 'seed ' + seed + ': GUI==CLI terminal board');
  });
});

invariant('legality', 'invariant/legality: every generated choice is a legal move', () => {
  // The move generator must offer only legal moves: every choice it enumerates
  // has to apply cleanly to the state it was generated from. Drive a few turns
  // and, at each step-phase, apply each enumerated choice to a fresh clone.
  var map = classicMap();
  [11, 234].forEach(function (seed) {
    var st = E.newSkirmish(E.newMatch({ seed: seed, maps: [map], firstPlayer: 'red' }));
    var turns = 0;
    while (st.phase !== 'skirmish-over' && turns++ < 20) {
      var plan = E.aiPlanTurn(st, 'normal');
      if (!plan) break;
      E.playCard(st, plan.cardId, plan.mode || 'normal');
      var g2 = 0;
      while (st.phase === 'step' && g2++ < 12) {
        var choices = E.enumerateChoices(st);
        assert.ok(Array.isArray(choices) && choices.length > 0, 'seed ' + seed + ': step phase offers at least one choice');
        choices.forEach(function (choice) {
          // A bare `skip` (end this card's steps) is only legal once a step has
          // been played (the mustPlayStep rule, tested in test.terrain/cards); it
          // is not a generated *move*, so the move-legality invariant skips it.
          if (choice && choice.skip) return;
          var probe = E.clone(st);
          assert.doesNotThrow(function () { E.applyStep(probe, choice); },
            'seed ' + seed + ': enumerated choice ' + JSON.stringify(choice) + ' applies legally');
        });
        var c = plan.choices.shift() || { skip: true };
        try { E.applyStep(st, c); } catch (e) { try { E.applyStep(st, { skip: true }); } catch (e2) { break; } }
      }
    }
  });
});

invariant('terminal', 'invariant/terminal: AI-vs-AI always reaches a terminal state', () => {
  // No seed may leave a skirmish stuck: every game reaches a scored terminal
  // state (skirmish-over) within the engine's loop guard.
  var map = classicMap();
  [1, 2, 3, 4, 5, 6].forEach(function (seed) {
    var st = E.simSkirmish(map, seed * 13, 'red', 'hard', 'normal');
    assert.strictEqual(st.phase, 'skirmish-over', 'seed ' + (seed * 13) + ': reached a terminal state');
    assert.ok(st.turnNumber > 0, 'seed ' + (seed * 13) + ': at least one turn played');
    assert.ok(st.skirmishWinner === 'red' || st.skirmishWinner === 'blue', 'seed ' + (seed * 13) + ': a winner was scored');
  });
});

invariant('conservation', 'invariant/conservation: piece and terrain stocks stay finite', () => {
  // Unit conservation: the engine can never field more of a unit type than the
  // finite piece stock (PIECE_TOTALS) — nothing is created from nothing.
  var map = classicMap();
  [42, 99, 314, 271].forEach(function (seed) {
    var st = E.simSkirmish(map, seed, 'red', 'normal', 'normal');
    var counts = { red: {}, blue: {} };
    Object.keys(st.units).forEach(function (k) {
      var u = st.units[k];
      counts[u.owner][u.type] = (counts[u.owner][u.type] || 0) + 1;
    });
    ['red', 'blue'].forEach(function (side) {
      Object.keys(counts[side]).forEach(function (type) {
        assert.ok(counts[side][type] <= E.PIECE_TOTALS[type],
          'seed ' + seed + ': ' + side + ' ' + type + ' count ' + counts[side][type] + ' <= stock ' + E.PIECE_TOTALS[type]);
      });
    });
  });
  // Terrain conservation: a map may not place more pieces of a length than the
  // physical terrain stock. Fixture maps, no live content.
  var fit = { name: 'Conserve-fit', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'R', edges: [[0, 0, 0], [0, 0, 1]] }] };
  var over = { name: 'Conserve-over', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'R', edges: [[0, 0, 0], [0, 0, 1], [0, 0, 2]] },
             { t: 'R', edges: [[1, 0, 0], [1, 0, 1], [1, 0, 2]] },
             { t: 'R', edges: [[-1, 0, 0], [-1, 0, 1], [-1, 0, 2]] }] };
  assert.strictEqual(E.validateMaps([fit]).length, 0, 'a within-stock map conserves the terrain stock');
  assert.ok(E.validateMaps([over]).length >= 1, 'an over-stock map is rejected — the stock is finite');
});

/* ------------------------------------------------------------- suite guards */

const test = H.test;

// GUARD 1 — the registry matches the labelled set. Reds if a test is labelled
// `invariant()` but not registered, or the registry names an invariant nothing
// labels, or a category strays from the frozen five. The fixtures below prove it
// reds when a registry member is added or removed.
test('invariant registry matches the labelled invariant set', () => {
  var d = REG.registryDivergence(REG.INVARIANT_REGISTRY, H.collectedInvariants());
  assert.deepStrictEqual(d.badCategory, [], 'no category strays from the frozen five');
  assert.deepStrictEqual(d.missingFromRegistry, [], 'every invariant() test is named in the registry (no invariant hides behind the pin default)');
  assert.deepStrictEqual(d.missingFromSuite, [], 'every registry entry names a test that is actually labelled invariant()');
  // The frozen five are all present and non-empty.
  REG.CATEGORIES.forEach(function (c) {
    assert.ok(Array.isArray(REG.INVARIANT_REGISTRY[c]) && REG.INVARIANT_REGISTRY[c].length > 0,
      'registry category "' + c + '" has at least one invariant');
  });
});

// The registry-guard's own falsifiers: a fixture that ADDS a registry member the
// suite never labels, and one that REMOVES a labelled invariant from the registry
// — each must be caught. (Red-at-base for AC "guard reds if the registry diverges".)
test('registry guard reds when a member is added to the registry', () => {
  var fixture = Object.assign({}, REG.INVARIANT_REGISTRY, { conservation: REG.INVARIANT_REGISTRY.conservation.concat(['invariant/conservation: PHANTOM never labelled']) });
  var d = REG.registryDivergence(fixture, H.collectedInvariants());
  assert.ok(d.missingFromSuite.length === 1, 'a registry entry with no labelled test is flagged');
});
test('registry guard reds when a labelled invariant is removed from the registry', () => {
  var fixture = Object.assign({}, REG.INVARIANT_REGISTRY, { determinism: [] });
  var d = REG.registryDivergence(fixture, H.collectedInvariants());
  assert.ok(d.missingFromRegistry.length === 1, 'a labelled invariant missing from the registry is flagged');
});
test('registry guard reds when a category strays from the frozen five', () => {
  var fixture = Object.assign({}, REG.INVARIANT_REGISTRY, { bogus: ['x'] });
  var d = REG.registryDivergence(fixture, H.collectedInvariants());
  assert.ok(d.badCategory.length >= 1, 'a category outside the frozen five is flagged');
});

// GUARD 2 — no base-commit test is deleted or `.skip`-ed without a surfaced act.
// The manifest (game/test-manifest.json) is the base set; regenerate it with
// `node dev/gen-test-manifest.js`, atomically with a RULES_VERSION bump. The read
// is lazy (inside the test) so the manifest generator can require this file first.
test('every base-commit test is still present (deletion/skip is itself a red)', () => {
  var MANIFEST = JSON.parse(fs.readFileSync(path.join(__dirname, 'test-manifest.json'), 'utf8'));
  // A RULES_VERSION bump licenses pin moves — but only atomically: the manifest
  // must be regenerated at the new version in the same change. A stale manifest
  // (version drifted from the engine) is itself a RED, so a bump can never
  // silently disable this guard by leaving the old baseline unregenerated.
  assert.strictEqual(MANIFEST.rulesVersion, E.VERSION,
    'test-manifest.json is stale (rules ' + MANIFEST.rulesVersion + ' vs engine ' + E.VERSION +
    ') — regenerate with `node dev/gen-test-manifest.js`, atomically with the RULES_VERSION bump');
  var missing = REG.removalViolations(MANIFEST, H.activeTestNames(), E.VERSION);
  assert.deepStrictEqual(missing, [],
    'these base tests were deleted or .skip-ed without a pin-prune record or RULES_VERSION bump: ' + JSON.stringify(missing));
});

// Both guards key tests by name; a committed `.only` would fool the deletion
// guard (it records every test as active at require time while node runs one),
// and a duplicate name would let one namesake mask the other's deletion. Red on
// either, so the keying assumption the guards rely on is enforced, not assumed.
test('suite hygiene: unique test names, no committed .only', () => {
  assert.deepStrictEqual(H.duplicateTestNames(), [],
    'duplicate test names collapse in the name-keyed guards and can mask a deletion');
  assert.deepStrictEqual(H.onlyTests(), [],
    'a committed test.only() runs one test under --test-only yet reads as all-present to the deletion guard');
});

// The deletion-guard's own falsifiers. These build the manifest from the REAL
// active-name accessor + real E.VERSION the live guard consumes (a phantom base
// test that is not in the active set), so they prove the guard's wiring, not
// just the pure predicate in isolation (ADR-0004 red-at-base).
var PHANTOM = 'invariant/phantom: a base test that no longer exists';
test('deletion guard reds when a base test is removed with no bump', () => {
  var man = { rulesVersion: E.VERSION, tests: H.activeTestNames().concat([PHANTOM]), prunedPins: [] };
  var missing = REG.removalViolations(man, H.activeTestNames(), E.VERSION);   // phantom absent, same version
  assert.deepStrictEqual(missing, [PHANTOM], 'a base test absent at the same version is a violation');
});
test('deletion guard reds when a base test is .skip-ed with no bump', () => {
  // activeTestNames() already excludes skipped tests, so a .skip-ed base test
  // reads exactly like a deleted one — same red, which is the point.
  var man = { rulesVersion: E.VERSION, tests: ['keeper', 'sleepy'], prunedPins: [] };
  assert.deepStrictEqual(REG.removalViolations(man, ['keeper'], E.VERSION), ['sleepy'],
    'a .skip-ed base test (absent from activeTestNames) at the same version is a violation');
});
test('deletion guard goes green when the removal rides a RULES_VERSION bump', () => {
  var man = { rulesVersion: '9.9-old', tests: H.activeTestNames().concat([PHANTOM]), prunedPins: [] };
  assert.deepStrictEqual(REG.removalViolations(man, H.activeTestNames(), E.VERSION), [],
    'a removal that rides a RULES_VERSION bump is licensed (the stale-manifest red surfaces the bump separately)');
});
test('deletion guard goes green when the removal carries a pin-prune record', () => {
  var man = { rulesVersion: E.VERSION, tests: H.activeTestNames().concat([PHANTOM]), prunedPins: [{ name: PHANTOM, note: 'superseded pin' }] };
  assert.deepStrictEqual(REG.removalViolations(man, H.activeTestNames(), E.VERSION), [],
    'a removal with a pin-prune record is a surfaced act, not a red');
});

