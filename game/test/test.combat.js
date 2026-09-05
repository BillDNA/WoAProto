/* Combat and movement over the rules kernel (engine/03-rules.js): fight power,
   support, and the through-HQ routes. Terrain's own answers are tested in its
   house (engine/board/terrain/terrain.test.js); these are the parts of a fight
   that no terrain type owns.

   Run alone with `node game/test/test.combat.js`, or the whole gate with
   `node game/test/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, testSkirmish } = require('./test.helpers.js');

test('combat math', () => {
(function () {
  // Powers relative to live stats: base = infantry atk/def, each
  // infantry supporter adds its sup, artillery adds its sup; terrain/HQ/card mod
  // are flat +1 rules constants. Retuning a unit stat reds nothing here.
  var U = E.UNITS, Ia = U.infantry.atk, Id = U.infantry.def, Is = U.infantry.sup, As = U.artillery.sup;
  function winner(a, d) { return a > d ? 'attacker' : a < d ? 'defender' : 'tie'; }
  var st = testSkirmish(42);
  st.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.pieces.units['0,1'] = { type: 'infantry', owner: 'blue' };
  var res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia && res.defenderPower === Id && res.outcome === winner(Ia, Id),
    'inf vs inf bare = atk vs def, higher wins / equal ties (got ' + res.attackerPower + 'v' + res.defenderPower + ' ' + res.outcome + ')');
  // attacker support: red artillery adjacent to skirmish hex
  st.pieces.units['-1,1'] = { type: 'artillery', owner: 'red' };
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia + As && res.outcome === winner(Ia + As, Id), 'artillery adds its sup to attacker (got ' + res.attackerPower + ')');
  // defender support: blue infantry adjacent to skirmish hex
  st.pieces.units['1,1'] = { type: 'infantry', owner: 'blue' };
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.defenderPower === Id + Is, 'defender gains one infantry support (got ' + res.defenderPower + ')');
  // trench across the artillery's support border: that support is denied
  st.pieces.trenches['0,1'] = [{ dirs: [2, 3], owner: 'blue' }]; // covers borders toward 0,0 and -1,1
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia && res.defenderPower === Id + Is,
    'trench denies attacker support and adds no defense (got ' + res.attackerPower + 'v' + res.defenderPower + ')');
  st.pieces.trenches['0,1'] = [{ dirs: [0, 1], owner: 'blue' }]; // clear of the support borders; covers blue supporter's border
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia + As, 'trench clear of the attacker-support border denies nothing (got ' + res.attackerPower + ')');
  assert.ok(res.defenderPower === Id + Is, 'defender support is never trench-blocked (got ' + res.defenderPower + ')');
  // terrain is hex-owned and directional (HexClarificationDiagram)
  st.board.terrainEdges[E.sideKey('0,0', 5)] = 'F'; // forest in the attacker's hex facing 0,1
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia + As + 1, 'forest +1 attacking out of its hex (got ' + res.attackerPower + ')');
  delete st.board.terrainEdges[E.sideKey('0,0', 5)];
  st.board.terrainEdges[E.sideKey('0,1', 2)] = 'F'; // forest in DEFENDER hex: no effect
  st.board.terrainEdges[E.sideKey('0,0', 5)] = 'M'; // mountain in ATTACKER hex: no effect
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia + As && res.defenderPower === Id + Is, 'reversed sides give no bonus (got ' + res.attackerPower + 'v' + res.defenderPower + ')');
  delete st.board.terrainEdges[E.sideKey('0,1', 2)];
  delete st.board.terrainEdges[E.sideKey('0,0', 5)];
  st.board.terrainEdges[E.sideKey('0,1', 2)] = 'M'; // mountain in the defender's hex facing 0,0
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia + As && res.defenderPower === Id + Is + 1, 'mountain +1 defending its hex (got ' + res.defenderPower + ')');
  // card mod
  res = E.computeAttack(st, { from: '0,0', to: '0,1', mod: 1 });
  assert.ok(res.attackerPower === Ia + As + 1, 'card +1 mod applied');
  // HQ support: blue HQ adjacent to skirmish hex
  st.board.hq.blue = '1,0';
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.defenderPower === Id + Is + 1 + 1, 'HQ gives +1 support to adjacent skirmish hex (mountain + HQ, got ' + res.defenderPower + ')');
  // attack the HQ itself
  st.pieces.units['2,0'] = { type: 'cavalry', owner: 'red' };
  var hqAtk = E.computeAttack(st, { from: '2,0', to: '1,0' });
  assert.ok(hqAtk.defenderIsHQ, 'HQ recognized as target');
})();
});

test('through-HQ movement & attacks', () => {
(function () {
  var st = testSkirmish(7);
  st.board.hq.red = '0,0';
  st.pieces.units['-1,0'] = { type: 'infantry', owner: 'red' };
  st.pieces.units['1,0'] = { type: 'infantry', owner: 'blue' };
  var atks = E.listAttacks(st, 'red');
  var thr = atks.filter(function (a) { return a.via === '0,0'; });
  assert.ok(thr.length >= 1 && thr[0].to === '1,0', 'attack through HQ available');
  var rep = E.listRepositions(st, 'red');
  var thrMove = rep.moves.filter(function (mv) { return mv.via === '0,0'; });
  assert.ok(thrMove.length > 0, 'reposition through HQ available');
})();
});
