/* The terrain house's own tests — they live with the code they cover.
   Run alone with `node game/engine/board/terrain/terrain.test.js`, or as part of
   the gate with `node game/test/test.js`, which requires this file. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, testSkirmish, fixtureCard } = require('../../../test/test.helpers.js');

test('terrain pieces live inside ONE hex', () => {
(function () {
  assert.ok(E.pieceProblem({ t: 'F', edges: [[0, 0, 4], [0, 0, 5], [0, 0, 0]] }) === null, 'contiguous single-hex piece accepted (wraps 4-5-0)');
  assert.ok(E.pieceProblem({ t: 'M', edges: [[0, 0, 2], [0, 0, 1], [1, -1, 3]] }) !== null, 'hex-spanning piece rejected (old High Pass mountain)');
  assert.ok(E.pieceProblem({ t: 'M', edges: [[0, 0, 1], [0, 0, 4]] }) !== null, 'non-contiguous sides rejected');
  assert.ok(E.pieceProblem({ t: 'F', edges: [[0, 0, 2], [0, 0, 2]] }) !== null, 'duplicate side rejected');
  var bad = { name: 'Bad Map', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'F', edges: [[0, 0, 2], [-1, 0, 1]] }] };
  assert.ok(E.validateMaps([bad]).length === 1, 'validateMaps flags a spanning piece');
})();
});

test('trench/terrain edge exclusivity', () => {
(function () {
  var st = testSkirmish(55);
  st.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  assert.ok(E.trenchOrientations(st, '0,0').length === 6, 'all 6 orientations on a clean hex');
  st.board.terrainEdges[E.sideKey('0,0', 1)] = 'F'; // this hex's own dir-1 side
  var ors = E.trenchOrientations(st, '0,0');
  assert.ok(ors.length === 4, 'terrain on one side blocks 2 orientations (got ' + ors.length + ')');
  assert.ok(!ors.some(function (p) { return p.indexOf(1) >= 0; }), 'no orientation uses the terrain side');
  st.board.terrainEdges[E.sideKey('1,-1', 4)] = 'M'; // the NEIGHBOR's side of that border
  assert.ok(E.trenchOrientations(st, '0,0').length === 4, "neighbor-owned terrain across the border doesn't block");
  var thrown = false;
  st.cards.hands.red = ['deploy_inf_trench'];
  E.playCard(st, 'deploy_inf_trench');
  E.applyStep(st, { skip: true }); // skip the deploy
  try { E.applyStep(st, { hex: '0,0', dirs: [1, 2] }); } catch (e) { thrown = true; }
  assert.ok(thrown, 'engine rejects trench over a terrain edge');
})();
});

test('multiple trenches per hex', () => {
(function () {
  // Powers are expressed relative to the LIVE unit stats (mechanism,
  // not pinned integers) so retuning a unit stat reds nothing here.
  var U = E.UNITS, Ia = U.infantry.atk, Id = U.infantry.def, Is = U.infantry.sup;
  var st = testSkirmish(60);
  st.pieces.units['-1,1'] = { type: 'infantry', owner: 'red' };
  st.pieces.trenches['-1,1'] = [{ dirs: [3, 4], owner: 'red' }];
  assert.ok(E.trenchTargets(st, 'red').indexOf('-1,1') >= 0, 'an already-entrenched hex can take a second trench on different edges');
  var ors = E.trenchOrientations(st, '-1,1');
  assert.ok(ors.some(function (pr) { return pr[0] === 1 && pr[1] === 2; }), 'orientation toward C3/C4 (dirs 1-2) offered');
  assert.ok(!ors.some(function (pr) { return pr.indexOf(3) >= 0 || pr.indexOf(4) >= 0; }), 'already-covered edges excluded');
  st.cards.hands.red = ['deploy_inf_trench'];
  E.playCard(st, 'deploy_inf_trench');
  E.applyStep(st, { skip: true }); // skip the deploy
  E.applyStep(st, { hex: '-1,1', dirs: [1, 2] });
  assert.ok(st.pieces.trenches['-1,1'].length === 2, 'second trench dug on the same hex');
  st.pieces.units['0,0'] = { type: 'infantry', owner: 'blue' };
  var r = E.computeAttack(st, { from: '0,0', to: '-1,1' });
  assert.ok(r.defenderPower === Id, 'trenches add no defense (bare def, got ' + r.defenderPower + ')');
  st.pieces.units['-1,0'] = { type: 'infantry', owner: 'blue' }; // its border into the hex is trenched (dir 2)
  var r2 = E.computeAttack(st, { from: '0,0', to: '-1,1' });
  assert.ok(r2.attackerPower === Ia, 'second trench denies attacker support across its edges (bare atk, got ' + r2.attackerPower + ')');
  st.pieces.units['0,1'] = { type: 'infantry', owner: 'blue' }; // untrenched border into the hex
  var r3 = E.computeAttack(st, { from: '0,0', to: '-1,1' });
  assert.ok(r3.attackerPower === Ia + Is, 'support across an untrenched border still counts (atk + one support, got ' + r3.attackerPower + ')');
  // overlap stays illegal
  var st2 = testSkirmish(61);
  st2.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  st2.pieces.trenches['0,0'] = [{ dirs: [1, 2], owner: 'red' }];
  var thrown = false;
  st2.cards.hands.red = ['deploy_inf_trench'];
  E.playCard(st2, 'deploy_inf_trench');
  E.applyStep(st2, { skip: true });
  try { E.applyStep(st2, { hex: '0,0', dirs: [2, 3] }); } catch (e) { thrown = true; }
  assert.ok(thrown, 'overlapping trench edges rejected');
})();
});

test('terrain attack table (A/B/C)', () => {
(function () {
  // A top, B = A's SW neighbor, C = A's SE neighbor. Forest in A on edges A|B and A|C.
  // Mountain in B on edges B|A and B|C.
  // Base powers from live stats; terrain adds a flat +1 (a rules constant, not a
  // unit stat), so retuning unit stats reds nothing here.
  var Ia = E.UNITS.infantry.atk, Id = E.UNITS.infantry.def;
  var A = '0,0', B = '-1,1', C = '0,1';
  function fresh() {
    var st = testSkirmish(77);
    st.board.terrainEdges[E.sideKey(A, 4)] = 'F'; // A -> B
    st.board.terrainEdges[E.sideKey(A, 5)] = 'F'; // A -> C
    st.board.terrainEdges[E.sideKey(B, 1)] = 'M'; // B -> A
    st.board.terrainEdges[E.sideKey(B, 0)] = 'M'; // B -> C
    return st;
  }
  var cases = [
    [A, C, Ia + 1, Id, 'A->C: a+1 c+0'],
    [A, B, Ia + 1, Id + 1, 'A->B: a+1 b+1'],
    [B, A, Ia, Id, 'B->A: b+0 a+0'],
    [B, C, Ia, Id, 'B->C: b+0 c+0'],
    [C, A, Ia, Id, 'C->A: c+0 a+0'],
    [C, B, Ia, Id + 1, 'C->B: c+0 b+1']
  ];
  cases.forEach(function (cs) {
    var st = fresh();
    st.pieces.units[cs[0]] = { type: 'infantry', owner: 'red' };
    st.pieces.units[cs[1]] = { type: 'infantry', owner: 'blue' };
    var r = E.computeAttack(st, { from: cs[0], to: cs[1] });
    assert.ok(r.attackerPower === cs[2] && r.defenderPower === cs[3],
      cs[4] + ' (got ' + r.attackerPower + 'v' + r.defenderPower + ')');
  });
})();
});

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

test('terrain-crossing rules: trench support denial + rivers', () => {
(function () {
  // Trench on the SUPPORTER's hex blocks just the same (ownership of the
  // border piece is irrelevant): red attacks 0,1 from 0,0; red support at 1,1.
  // Powers relative to live stats.
  var Ia = E.UNITS.infantry.atk, Id = E.UNITS.infantry.def, Is = E.UNITS.infantry.sup;
  var st = testSkirmish(130);
  st.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.pieces.units['1,1'] = { type: 'infantry', owner: 'red' };
  st.pieces.units['0,1'] = { type: 'infantry', owner: 'blue' };
  var res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia + Is, 'baseline: supporter counts (got ' + res.attackerPower + ')');
  st.pieces.trenches['1,1'] = [{ dirs: [3, 4], owner: 'red' }]; // covers the 1,1 -> 0,1 border
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia, "trench in the supporter's hex blocks its support out across it (got " + res.attackerPower + ')');
  assert.ok(res.attackerParts.some(function (p) { return p.indexOf('blocked by trench') >= 0; }),
    'breakdown names the blocked support');
  // ...but a trench NOT on that border never locks a unit in:
  st.pieces.trenches['1,1'] = [{ dirs: [0, 1], owner: 'red' }];
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === Ia + Is, 'a unit in a trenched hex still supports out across a free border');
  // The attack itself may always cross a trenched border:
  st.pieces.trenches['0,1'] = [{ dirs: [2, 3], owner: 'blue' }]; // covers the attack border from 0,0
  var atks = E.listAttacks(st, 'red').filter(function (a) { return a.from === '0,0' && a.to === '0,1'; });
  assert.ok(atks.length === 1, 'attacks still cross trenched borders');

  // Rivers no longer block support: it crosses freely for both sides. Fixture:
  // red holds B3 and C2, blue holds C3, river on the C2|C3 border — B3's attack
  // on C3 still gets C2's support across the water. The river's job is now
  // deploy-control (see the deploy section).
  var B3 = '0,-1', C2 = '-2,0', C3 = '-1,0';
  var st2 = testSkirmish(131);
  st2.pieces.units[B3] = { type: 'infantry', owner: 'red' };
  st2.pieces.units[C2] = { type: 'infantry', owner: 'red' };
  st2.pieces.units[C3] = { type: 'infantry', owner: 'blue' };
  st2.board.terrainEdges[E.sideKey(C2, 0)] = 'R'; // river on C2's side toward C3
  var rB = E.computeAttack(st2, { from: B3, to: C3 });
  assert.ok(rB.attackerPower === Ia + Is, 'B3->C3: support crosses the river now (got ' + rB.attackerPower + ')');
  assert.ok(!rB.attackerParts.some(function (p) { return p.indexOf('blocked by river') >= 0; }), 'river no longer blocks support');
  // Defender support crosses the river too (neither hex's side blocks):
  var D3 = '-1,1';
  st2.pieces.units[D3] = { type: 'infantry', owner: 'blue' };
  st2.board.terrainEdges[E.sideKey(C3, 5)] = 'R'; // river owned by the SKIRMISH hex side toward D3
  var rD = E.computeAttack(st2, { from: B3, to: C3 });
  assert.ok(rD.defenderPower === Id + Is, "D3's defender support crosses the river (got " + rD.defenderPower + ')');

  // River pieces come in the same lengths as forest/mountain (2- and 3-side),
  // validated against the R3/R2 stock; still not barrageable.
  assert.ok(E.pieceProblem({ t: 'R', edges: [[0, 0, 0], [0, 0, 1]] }) === null, 'two-side river piece accepted');
  var riverMap = { name: 'River Test', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'R', edges: [[0, 0, 0], [0, 0, 1]] }, { t: 'R', edges: [[0, 0, 3], [0, 0, 4]] }] };
  assert.ok(E.validateMaps([riverMap]).length === 0, 'two 2-side rivers fit the R2 stock');
  var tooMany = { name: 'Flooded', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'R', edges: [[0, 0, 0], [0, 0, 1], [0, 0, 2]] },
             { t: 'R', edges: [[1, 0, 0], [1, 0, 1], [1, 0, 2]] },
             { t: 'R', edges: [[-1, 0, 0], [-1, 0, 1], [-1, 0, 2]] }] };
  assert.ok(E.validateMaps([tooMany]).length === 1, 'a third 3-side river exceeds the R3 stock');
  var single = { name: 'Trickle', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'R', edges: [[0, 0, 1]] }] };
  assert.ok(E.validateMaps([single]).length === 1, 'a single-side river has no physical counterpart (R1 removed)');
  var m3 = E.newBattle({ seed: 99, firstPlayer: 'red', maps: [riverMap] });
  var st3 = E.newSkirmish(m3);
  var bt = E.listBarrageTargets(st3, 'red');
  assert.ok(bt.terrainTargets.length === 0, 'rivers are not barrage targets (they act like mountains)');
  // rivers occupy the border: no trench may share it
  st3.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  assert.ok(!E.trenchOrientations(st3, '0,0').some(function (pr) { return pr.indexOf(1) >= 0 || pr.indexOf(4) >= 0; }),
    'trenches may not overlap river sides');
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

test('deploy / control rules', () => {
(function () {
  var st = testSkirmish(9);
  var t = E.deployTargets(st, 'red', false);
  assert.ok(t.length === 3, 'deploy targets adjacent to corner HQ only at skirmish start (got ' + t.length + ')');
  assert.ok(t.indexOf('-3,2') < 0, 'cannot deploy onto enemy HQ');
  // A river on the border to a would-be deploy hex stops control from extending
  // across it: put a river on the HQ|target border and that target drops out.
  var hq = st.board.hq.red, target = t[0];
  st.board.terrainEdges[E.sideKey(hq, E.dirBetween(hq, target))] = 'R';
  var t2 = E.deployTargets(st, 'red', false);
  assert.ok(t2.indexOf(target) < 0, 'cannot deploy across a river (control does not extend over water)');
  assert.ok(t2.length === 2, 'river removes exactly the one across-water target (got ' + t2.length + ')');
  // reading the far hex's side of the same border blocks it just as well:
  var st4 = testSkirmish(9), target4 = E.deployTargets(st4, 'red', false)[0];
  st4.board.terrainEdges[E.sideKey(target4, E.dirBetween(target4, st4.board.hq.red))] = 'R';
  assert.ok(E.deployTargets(st4, 'red', false).indexOf(target4) < 0, 'river read from the target hex side also blocks deploy');
})();
});

test('a trench lets the defender survive a combat tie', () => {
(function () {
  fixtureCard('ordered_withdraw'); // fixture, not the active battalion (used in (b) below)
  // dirs of a trench covering the attacked border of `defHex` (the side facing
  // `fromHex`), plus its clockwise neighbour so it's a legal 2-edge orientation.
  function coverDir(defHex, fromHex) { var d = E.dirBetween(defHex, fromHex); return [d, (d + 1) % 6]; }

  // (a) tie vs a trenched defender: defender HOLDS, attacker is destroyed.
  var st = testSkirmish(201);
  st.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.pieces.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st.pieces.trenches['1,0'] = [{ dirs: coverDir('1,0', '0,0'), owner: 'blue' }];
  assert.ok(E.computeAttack(st, { from: '0,0', to: '1,0' }).outcome === 'tie', 'setup: 1v1 is still a tie across the trench');
  st.cards.hands.red = ['mass_assault'];
  E.playCard(st, 'mass_assault', 'attack'); // basic attack: plain, no mod/tieSpare
  E.applyStep(st, { from: '0,0', to: '1,0' });
  assert.ok(st.pieces.units['1,0'] && st.pieces.units['1,0'].owner === 'blue', 'tie vs trenched defender: the defender survives');
  assert.ok(!st.pieces.units['0,0'], 'tie vs trenched defender: the attacker is destroyed');

  // (b) tieSpare attacker (Ordered Withdraw) vs a trenched defender = a WHIFF:
  //     the card spares the attacker, the trench spares the defender — nobody dies.
  var st2 = testSkirmish(202);
  st2.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  st2.pieces.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st2.pieces.trenches['1,0'] = [{ dirs: coverDir('1,0', '0,0'), owner: 'blue' }];
  st2.cards.hands.red = ['ordered_withdraw'];
  E.playCard(st2, 'ordered_withdraw');
  E.applyStep(st2, { from: '0,0', to: '1,0' });
  assert.ok(st2.pieces.units['1,0'] && st2.pieces.units['0,0'], 'tieSpare tie vs trenched defender: nobody dies (whiff)');

  // (e) REGRESSION — a plain tie on an UNtrenched border still kills both units.
  var st3 = testSkirmish(203);
  st3.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  st3.pieces.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st3.cards.hands.red = ['mass_assault'];
  E.playCard(st3, 'mass_assault', 'attack');
  E.applyStep(st3, { from: '0,0', to: '1,0' });
  assert.ok(!st3.pieces.units['0,0'] && !st3.pieces.units['1,0'], 'untrenched plain tie: both units destroyed (unchanged)');

  // (c) tie vs a trenched HQ border: the HQ is NOT captured (trench your HQ and a
  //     tie can't take it). Power-0 attacker (infantry 1 with a -1 card) vs HQ def 0.
  var st4 = testSkirmish(204);
  st4.pieces.units['-2,2'] = { type: 'infantry', owner: 'red' }; // adjacent to blue HQ at -3,2
  st4.pieces.trenches['-3,2'] = [{ dirs: coverDir('-3,2', '-2,2'), owner: 'blue' }];
  assert.ok(E.computeAttack(st4, { from: '-2,2', to: '-3,2', mod: -1 }).outcome === 'tie', 'setup: infantry(-1) vs HQ is a 0v0 tie');
  st4.cards.hands.red = ['careful_maneuvers']; // [reposition, attack mod -1]
  E.playCard(st4, 'careful_maneuvers');
  if (E.currentStep(st4).type === 'reposition') E.applyStep(st4, { skip: true });
  E.applyStep(st4, { from: '-2,2', to: '-3,2' });
  assert.ok(st4.board.hqAlive.blue && st4.flow.phase !== 'skirmish-over', 'tie at a trenched HQ does NOT capture it');
  assert.ok(!st4.pieces.units['-2,2'], 'the attacker still dies on that tie (no tieSpare)');

  // (d) REGRESSION — a tie at an UNtrenched HQ still captures it exactly as before.
  var st5 = testSkirmish(205);
  st5.pieces.units['-2,2'] = { type: 'infantry', owner: 'red' };
  st5.cards.hands.red = ['careful_maneuvers'];
  E.playCard(st5, 'careful_maneuvers');
  if (E.currentStep(st5).type === 'reposition') E.applyStep(st5, { skip: true });
  E.applyStep(st5, { from: '-2,2', to: '-3,2' });
  assert.ok(st5.flow.phase === 'skirmish-over' && st5.result.skirmishWinner === 'red' && st5.result.winType === 'hq',
    'tie at an untrenched HQ still captures it (unchanged)');
})();
});

test('trench orientations are never fully off-board', () => {
(function () {
  var st = testSkirmish(77);
  var offBoard = 0, total = 0;
  E.hexes().forEach(function (h) {
    E.trenchOrientations(st, h).forEach(function (pr) {
      total++;
      if (!E.neighbor(h, pr[0]) && !E.neighbor(h, pr[1])) offBoard++;
    });
  });
  assert.ok(total > 0 && offBoard === 0, 'no offered trench faces fully off-board (' + offBoard + '/' + total + ' bad)');
})();
});

// A border has TWO facing sides and each hex owns its own, so the two may carry
// different types. Every border question must ask both — a type answering "no"
// must never mask the other side's "yes".
test('both facing sides of a border are asked, not just the first', () => {
  var st = testSkirmish(88);
  var A = '0,0', B = E.neighbor(A, 0), C = E.neighbor(A, 1);

  // support: a forest on A's side (blocks nothing) must not hide a trench dug on
  // the supporter's side of the same border
  E.Pieces.place(st, A, 'infantry', 'blue');          // the defender under attack
  E.Pieces.place(st, B, 'infantry', 'red');           // the attacker
  E.Pieces.place(st, C, 'infantry', 'red');           // C supports the attack on A
  st.board.terrainEdges[E.sideKey(A, E.dirBetween(A, C))] = 'F';
  assert.ok(E.supportFor(st, 'red', A, B, true).hexes.indexOf(C) >= 0,
    'a forest on the border blocks nothing, so C still supports');
  st.pieces.trenches[C] = [{ dirs: [E.dirBetween(C, A), (E.dirBetween(C, A) + 1) % 6], owner: 'red' }];
  var sup = E.supportFor(st, 'red', A, B, true);
  assert.ok(sup.hexes.indexOf(C) < 0 && sup.parts.some(function (p) { return p.indexOf('blocked by trench') >= 0; }),
    "the trench on the OTHER side of that border still denies support: " + JSON.stringify(sup.parts));

  // deploy: a river on one hex's side must still block when the facing side
  // carries a trench, which blocks nothing
  var st2 = testSkirmish(89);
  st2.board.terrainEdges[E.sideKey(B, E.dirBetween(B, A))] = 'R';
  assert.ok(E.deployBlocked(st2, A, B), 'the river blocks deploy from A across the border');
  st2.pieces.trenches[A] = [{ dirs: [E.dirBetween(A, B), (E.dirBetween(A, B) + 1) % 6], owner: 'red' }];
  assert.ok(E.deployBlocked(st2, A, B),
    "a trench on A's own side does not cancel the river facing it");
});

// The house's contract: a fifth type is written once, in one file, and is then
// live in the physical model, combat, support, deploy, barrage, map validation
// and the commander terrain gate — none of which names a terrain type.
// Registered LAST so the shipped four are asserted against a four-type registry.
test('the terrain house: a fifth type needs only its own answers', () => {
  E.CONFIG.terrain.marsh = { defense: 3, pieces: { 2: 4 } };
  E.defineTerrain({
    letter: 'X', name: 'marsh', label: 'Marsh', storage: 'edges',
    attack: function () { return 0; },
    defense: function () { return E.CONFIG.terrain.marsh.defense; },
    blocksSupport: true, blocksDeploy: true, holdsOnTie: true, barrageable: true
  });

  assert.ok(E.pieceProblem({ t: 'X', edges: [[0, 0, 0], [0, 0, 1]] }) === null,
    'the shared physical model accepts the new type');
  assert.ok(E.pieceProblem({ t: 'X', edges: [[0, 0, 0], [0, 0, 3]] }) !== null,
    'and still enforces contiguity on it');

  var marshMap = { name: 'Marsh Test', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'X', edges: [[0, 0, 0], [0, 0, 1]] }] };
  assert.ok(E.validateMaps([marshMap]).length === 0, 'validateMaps accepts a map of the new type');

  var st = E.newSkirmish(E.newBattle({ seed: 7, firstPlayer: 'red', maps: [marshMap] }));
  var A = '0,0', B = E.neighbor(A, 0), C = E.neighbor(A, 1);
  E.Pieces.place(st, A, 'infantry', 'red');
  E.Pieces.place(st, C, 'infantry', 'red');   // A's supporter
  E.Pieces.place(st, B, 'infantry', 'blue');

  // defence keys on the DEFENDER's own side toward the hex the attack crosses from
  st.board.terrainEdges[E.sideKey(B, E.dirBetween(B, A))] = 'X';
  var r = E.computeAttack(st, { from: A, to: B });
  assert.ok(r.defenderParts.some(function (p) { return p === 'Marsh +3'; }),
    "the new type's defence answer reaches combat: " + JSON.stringify(r.defenderParts));

  // attacker support is denied across the marsh on A's own side toward C
  var supBefore = E.supportFor(st, 'red', B, null, true);
  assert.ok(supBefore.hexes.indexOf(C) >= 0, 'C supports the attack before the marsh is laid');
  st.board.terrainEdges[E.sideKey(C, E.dirBetween(C, B))] = 'X';
  var supAfter = E.supportFor(st, 'red', B, null, true);
  assert.ok(supAfter.hexes.indexOf(C) < 0 &&
    supAfter.parts.some(function (p) { return p.indexOf('blocked by marsh') >= 0; }),
    'the new type denies attacker support: ' + JSON.stringify(supAfter.parts));

  assert.ok(E.deployBlocked(st, B, A), 'deploy-control stops at the new type');
  assert.ok(E.listBarrageTargets(st, 'red').terrainTargets.some(function (pc) { return pc.t === 'X'; }),
    'the new type is a legal barrage target');
  assert.ok(!E.trenchOrientations(st, A).some(function (pr) { return pr.indexOf(0) >= 0 || pr.indexOf(1) >= 0; }),
    'a trench may not share the new type\'s sides');

  // holdsOnTie, isolated from defence: zero the marsh's defence dial so the fight
  // is a genuine tie, then check the defender is left standing anyway.
  var tie = testSkirmish(90);
  tie.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  tie.pieces.units['1,0'] = { type: 'infantry', owner: 'blue' };
  tie.board.terrainEdges[E.sideKey('1,0', E.dirBetween('1,0', '0,0'))] = 'X';
  var marshDef = E.CONFIG.terrain.marsh.defense;
  try {
    E.CONFIG.terrain.marsh.defense = 0;
    assert.strictEqual(E.computeAttack(tie, { from: '0,0', to: '1,0' }).outcome, 'tie',
      'setup: with the dial at 0 the fight across the marsh is an even tie');
    tie.cards.hands.red = ['mass_assault'];
    E.playCard(tie, 'mass_assault', 'attack');
    E.applyStep(tie, { from: '0,0', to: '1,0' });
  } finally { E.CONFIG.terrain.marsh.defense = marshDef; }
  assert.ok(tie.pieces.units['1,0'] && !tie.pieces.units['0,0'],
    'the new type holds the defender on a tie and the attacker falls, with no edit to resolveAttack');

  assert.ok(E.commanderCombat({ name: 'Bog Marshal', traits: [
    { primitive: 'combatMod', source: 'passive', when: 'defense', terrain: 'marsh', delta: 2 }
  ] }, 'defense', ['X']).delta === 2, 'a commander trait gates on the new type by its game word');
});
