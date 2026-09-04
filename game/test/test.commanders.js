/* Commander-system seam tests. Assert the MECHANISM, never the content VALUE
   (ADR-0005): a passive modifier is applied only in its declared context, a
   weakness subtracts, a weight override merges, selection routes to the right
   per-side seat, and "None" is a no-op — all proved as RELATIONSHIPS against a
   synthetic Commander, so tuning the shipped Fortress numbers reds nothing here.

   Frozen-API entry game/test.js delegates here; run alone with
   `node game/test/test.commanders.js` or the whole gate with `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, TESTMAP, testSkirmish } = require('./test.helpers.js');

// A synthetic Commander built to the schema — a defense combatMod gated to
// mountain, plus a normal-draw weakness — so every assertion is a relationship
// on THESE deltas, never a shipped number.
function synthCommander(delta, drawDelta) {
  return {
    id: 'synth', name: 'Synth', story: '', weights: {},
    traits: [
      { primitive: 'combatMod', source: 'passive', role: 'strength', terrain: 'mountain', when: 'defense', delta: delta },
      { primitive: 'drawMod', source: 'passive', role: 'weakness', phase: 'normal', delta: drawDelta }
    ]
  };
}

// Seat a fight: red infantry ('0,0') attacks blue infantry ('0,1') across their
// border. `place` puts a mountain: 'attacked' = the defender's attacked edge,
// 'other' = a DIFFERENT edge of the defender's hex, 'attacker' = the attacker's
// edge, else none.
function fightSkirmish(seed, place) {
  const st = testSkirmish(seed);
  E.Pieces.place(st, '0,0', 'infantry', 'red');
  E.Pieces.place(st, '0,1', 'infantry', 'blue');
  const atkDir = E.dirBetween('0,1', '0,0'); // the defender's edge toward the attacker
  if (place === 'attacked') st.board.terrainEdges[E.sideKey('0,1', atkDir)] = 'M';
  else if (place === 'other') st.board.terrainEdges[E.sideKey('0,1', (atkDir + 3) % 6)] = 'M'; // a non-attacked edge of the DEFENDER hex
  else if (place === 'attacker') st.board.terrainEdges[E.sideKey('0,0', E.dirBetween('0,0', '0,1'))] = 'M'; // the ATTACKER's edge
  return st;
}

test('seam: selection routes to the correct per-side seat; None is a no-op', () => {
  // A per-side selection rides the same route as battalions: newBattle → newSkirmish
  // seats st.commanders; sideCommander is the ONE reader of that shape.
  const battle = E.newBattle({ seed: 1, firstPlayer: 'red', maps: [TESTMAP], commanders: { red: 'fortress', blue: 'none' } });
  const st = E.newSkirmish(battle);
  assert.ok(E.sideCommander(st, 'red') && E.sideCommander(st, 'red').id === 'fortress', 'red seat carries the picked Commander');
  assert.strictEqual(E.sideCommander(st, 'blue'), null, 'the "none" seat carries no Commander');

  // both seats independent: seating red must not leak to blue
  const st2 = E.newSkirmish(E.newBattle({ seed: 2, firstPlayer: 'red', maps: [TESTMAP], commanders: { red: 'fortress', blue: null } }));
  assert.ok(E.sideCommander(st2, 'red'), 'red carries a Commander');
  assert.strictEqual(E.sideCommander(st2, 'blue'), null, 'blue carries none — no leak across the seam');

  // a plain battle (no selection) seats nothing — sideCommander falls back to null
  const plain = E.newSkirmish(E.newBattle({ seed: 3, firstPlayer: 'red', maps: [TESTMAP] }));
  assert.strictEqual(E.sideCommander(plain, 'red'), null, 'no selection → no Commander (both seats)');
  assert.strictEqual(E.sideCommander(plain, 'blue'), null, 'no selection → no Commander (both seats)');

  // an all-None selection is the baseline too: it resolves to nothing, so no
  // redundant Commander block is seated (the 'none' sentinel is not a real pick)
  const allNone = E.newSkirmish(E.newBattle({ seed: 4, firstPlayer: 'red', maps: [TESTMAP], commanders: { red: 'none', blue: 'none' } }));
  assert.ok(!allNone.commanders, 'an all-None selection seats no Commander block (baseline, not a pick)');

  // resolveCommander: null and the "none" sentinel both mean the baseline
  assert.strictEqual(E.resolveCommander(null), null, 'null resolves to the None baseline');
  assert.strictEqual(E.resolveCommander('none'), null, "'none' resolves to the None baseline");
});

test('seam: a passive combatMod applies at the combat hook, gated by the DEFENDER HEX terrain', () => {
  const D = 2; // synthetic delta — the relationship, not a shipped number
  const cmd = synthCommander(D, -1); // a defense combatMod gated to mountain
  const defPow = (st) => E.computeAttack(st, { from: '0,0', to: '0,1' }).defenderPower;
  // The Commander's contribution = same board WITH minus WITHOUT it, so base
  // per-edge terrain cancels and only the Commander delta remains.
  const contrib = (place) => {
    const on = fightSkirmish(11, place); on.commanders = { red: null, blue: cmd };
    return defPow(on) - defPow(fightSkirmish(11, place));
  };

  // Mountain on the attacked edge → applies (+D).
  assert.strictEqual(contrib('attacked'), D, 'applies when the attacked edge is the terrain');
  // Mountain on a DIFFERENT edge of the defender hex → STILL applies. This is the
  // rule: the bonus keys on the HELD HEX, not the single attacked edge.
  assert.strictEqual(contrib('other'), D, 'applies from ANY edge of the defender hex (dug-in / hex rule, not attacked-edge)');
  // Terrain only on the ATTACKER's hex → the defender hex is bare → no bonus.
  assert.strictEqual(contrib('attacker'), 0, "does not apply for the attacker's terrain (ownership/context gate)");
  // No terrain in the defender hex at all → no bonus.
  assert.strictEqual(contrib('none'), 0, 'no terrain in the defender hex → no bonus (context gate)');

  // The modifier is when-scoped: a defense mod on the ATTACKER never touches attack power.
  const stWhen = fightSkirmish(11, 'attacked');
  const baseAtk = E.computeAttack(fightSkirmish(11, 'attacked'), { from: '0,0', to: '0,1' }).attackerPower;
  stWhen.commanders = { red: cmd, blue: null }; // attacker holds a DEFENSE mod
  assert.strictEqual(E.computeAttack(stWhen, { from: '0,0', to: '0,1' }).attackerPower, baseAtk,
    "a when:'defense' mod on the attacker does not raise attack power (when gate)");
});

test('seam: a drawMod weakness subtracts at the draw hook', () => {
  // A drawMod is a phase-scoped draw-size change. Prove the fold first: it sums
  // for its phase and is silent on the other.
  const cmd = synthCommander(1, -1); // normal-draw weakness of -1
  assert.strictEqual(E.commanderDrawDelta(cmd, 'normal'), -1, 'the weakness subtracts on its phase');
  assert.strictEqual(E.commanderDrawDelta(cmd, 'opener'), 0, 'it is silent on the other phase (phase gate)');
  assert.strictEqual(E.commanderDrawDelta(null, 'normal'), 0, 'no Commander → no draw change');

  // And at the real draw hook: an opener-phase weakness shrinks the opening hand
  // by its magnitude vs the no-Commander baseline (opener is drawn in newSkirmish).
  const openerWeak = { id: 's', name: 'S', story: '', weights: {},
    traits: [{ primitive: 'drawMod', source: 'passive', role: 'weakness', phase: 'opener', delta: -1 }] };
  const baseHand = E.newSkirmish(E.newBattle({ seed: 7, firstPlayer: 'red', maps: [TESTMAP] })).cards.hands.red.length;
  const weakHand = E.newSkirmish(E.newBattle({ seed: 7, firstPlayer: 'red', maps: [TESTMAP], commanders: { red: openerWeak, blue: null } })).cards.hands.red.length;
  assert.strictEqual(baseHand - weakHand, 1, 'the opener-draw weakness draws exactly one fewer card');
});

test('seam: a Commander weight override merges over the base weight vector', () => {
  const base = Object.assign({}, E.AI_WEIGHTS);
  const term = Object.keys(base)[0]; // any real weight term
  const cmd = { id: 'w', name: 'W', story: '', weights: {}, traits: [] };
  cmd.weights[term] = base[term] + 1000;
  const merged = E.mergeCommanderWeights(base, cmd);
  assert.strictEqual(merged[term], base[term] + 1000, "the Commander's weight overrides the base term");
  assert.notStrictEqual(merged, base, 'the merge is a copy — the base vector is left intact');
  assert.strictEqual(base[term], Object.assign({}, E.AI_WEIGHTS)[term], 'the base AI_WEIGHTS term is untouched by the merge');
  assert.strictEqual(E.mergeCommanderWeights(base, null), base, 'no Commander → the base vector passes through unchanged');
});

test('seam: the shipped Fortress is a well-formed, selectable Commander', () => {
  // Shape/budget mechanism only — never a delta or terrain VALUE, so tuning
  // Fortress reds nothing here.
  const f = E.resolveCommander('fortress');
  assert.ok(f && f.id === 'fortress', 'Fortress resolves by id');
  assert.ok(Array.isArray(f.traits) && f.traits.length >= 1 && f.traits.length <= 3, 'trait budget: 1–3 traits');
  assert.ok(f.traits.some(t => t.role === 'strength'), 'carries at least one strength');
  assert.ok(f.traits.some(t => t.role === 'weakness'), 'carries at least one weakness (a real, exploitable one)');
  assert.ok(f.traits.every(t => t.source === 'passive'), 'this slice ships passives only');
  assert.ok('weights' in f && typeof f.weights === 'object', 'carries an inline AI weights override home');
});
