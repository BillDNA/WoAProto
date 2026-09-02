/* Auto-split from game/test.js (ADR-0003: node:test). Subsystem: terrain.
   Frozen-API entry game/test.js delegates here; run this file directly with
   `node game/test.terrain.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, testSkirmish, fixtureCard } = require('./test.helpers.js');

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
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  assert.ok(E.trenchOrientations(st, '0,0').length === 6, 'all 6 orientations on a clean hex');
  st.terrainEdges[E.sideKey('0,0', 1)] = 'F'; // this hex's own dir-1 side
  var ors = E.trenchOrientations(st, '0,0');
  assert.ok(ors.length === 4, 'terrain on one side blocks 2 orientations (got ' + ors.length + ')');
  assert.ok(!ors.some(function (p) { return p.indexOf(1) >= 0; }), 'no orientation uses the terrain side');
  st.terrainEdges[E.sideKey('1,-1', 4)] = 'M'; // the NEIGHBOR's side of that border
  assert.ok(E.trenchOrientations(st, '0,0').length === 4, "neighbor-owned terrain across the border doesn't block");
  var thrown = false;
  st.hands.red = ['deploy_inf_trench'];
  E.playCard(st, 'deploy_inf_trench');
  E.applyStep(st, { skip: true }); // skip the deploy
  try { E.applyStep(st, { hex: '0,0', dirs: [1, 2] }); } catch (e) { thrown = true; }
  assert.ok(thrown, 'engine rejects trench over a terrain edge');
})();
});

test('multiple trenches per hex', () => {
(function () {
  var st = testSkirmish(60);
  st.units['-1,1'] = { type: 'infantry', owner: 'red' };
  st.trenches['-1,1'] = [{ dirs: [3, 4], owner: 'red' }];
  assert.ok(E.trenchTargets(st, 'red').indexOf('-1,1') >= 0, 'an already-entrenched hex can take a second trench on different edges');
  var ors = E.trenchOrientations(st, '-1,1');
  assert.ok(ors.some(function (pr) { return pr[0] === 1 && pr[1] === 2; }), 'orientation toward C3/C4 (dirs 1-2) offered');
  assert.ok(!ors.some(function (pr) { return pr.indexOf(3) >= 0 || pr.indexOf(4) >= 0; }), 'already-covered edges excluded');
  st.hands.red = ['deploy_inf_trench'];
  E.playCard(st, 'deploy_inf_trench');
  E.applyStep(st, { skip: true }); // skip the deploy
  E.applyStep(st, { hex: '-1,1', dirs: [1, 2] });
  assert.ok(st.trenches['-1,1'].length === 2, 'second trench dug on the same hex');
  st.units['0,0'] = { type: 'infantry', owner: 'blue' };
  var r = E.computeAttack(st, { from: '0,0', to: '-1,1' });
  assert.ok(r.defenderPower === 1, 'trenches add no defense under the V0 rules (got ' + r.defenderPower + ')');
  st.units['-1,0'] = { type: 'infantry', owner: 'blue' }; // its border into the hex is trenched (dir 2)
  var r2 = E.computeAttack(st, { from: '0,0', to: '-1,1' });
  assert.ok(r2.attackerPower === 1, 'second trench denies attacker support across its edges (got ' + r2.attackerPower + ')');
  st.units['0,1'] = { type: 'infantry', owner: 'blue' }; // untrenched border into the hex
  var r3 = E.computeAttack(st, { from: '0,0', to: '-1,1' });
  assert.ok(r3.attackerPower === 2, 'support across an untrenched border still counts (got ' + r3.attackerPower + ')');
  // overlap stays illegal
  var st2 = testSkirmish(61);
  st2.units['0,0'] = { type: 'infantry', owner: 'red' };
  st2.trenches['0,0'] = [{ dirs: [1, 2], owner: 'red' }];
  var thrown = false;
  st2.hands.red = ['deploy_inf_trench'];
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
  var A = '0,0', B = '-1,1', C = '0,1';
  function fresh() {
    var st = testSkirmish(77);
    st.terrainEdges[E.sideKey(A, 4)] = 'F'; // A -> B
    st.terrainEdges[E.sideKey(A, 5)] = 'F'; // A -> C
    st.terrainEdges[E.sideKey(B, 1)] = 'M'; // B -> A
    st.terrainEdges[E.sideKey(B, 0)] = 'M'; // B -> C
    return st;
  }
  var cases = [
    [A, C, 2, 1, 'A->C: a+1 c+0'],
    [A, B, 2, 2, 'A->B: a+1 b+1'],
    [B, A, 1, 1, 'B->A: b+0 a+0'],
    [B, C, 1, 1, 'B->C: b+0 c+0'],
    [C, A, 1, 1, 'C->A: c+0 a+0'],
    [C, B, 1, 2, 'C->B: c+0 b+1']
  ];
  cases.forEach(function (cs) {
    var st = fresh();
    st.units[cs[0]] = { type: 'infantry', owner: 'red' };
    st.units[cs[1]] = { type: 'infantry', owner: 'blue' };
    var r = E.computeAttack(st, { from: cs[0], to: cs[1] });
    assert.ok(r.attackerPower === cs[2] && r.defenderPower === cs[3],
      cs[4] + ' (got ' + r.attackerPower + 'v' + r.defenderPower + ')');
  });
})();
});

test('combat math', () => {
(function () {
  var st = testSkirmish(42);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.units['0,1'] = { type: 'infantry', owner: 'blue' };
  var res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 1 && res.defenderPower === 1 && res.outcome === 'tie', 'inf vs inf bare = 1v1 tie (got ' + res.attackerPower + 'v' + res.defenderPower + ')');
  // attacker support: red artillery adjacent to skirmish hex
  st.units['-1,1'] = { type: 'artillery', owner: 'red' };
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 3 && res.outcome === 'attacker', 'artillery support +2 (got ' + res.attackerPower + ')');
  // defender support: blue infantry adjacent to skirmish hex
  st.units['1,1'] = { type: 'infantry', owner: 'blue' };
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.defenderPower === 2, 'defender inf support +1 (got ' + res.defenderPower + ')');
  // trench across the artillery's support border: that support is denied (V0 rules)
  st.trenches['0,1'] = [{ dirs: [2, 3], owner: 'blue' }]; // covers borders toward 0,0 and -1,1
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 1 && res.defenderPower === 2,
    'trench denies attacker support and adds no defense (got ' + res.attackerPower + 'v' + res.defenderPower + ')');
  st.trenches['0,1'] = [{ dirs: [0, 1], owner: 'blue' }]; // clear of the support borders; covers blue supporter's border
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 3, 'trench clear of the attacker-support border denies nothing (got ' + res.attackerPower + ')');
  assert.ok(res.defenderPower === 2, 'defender support is never trench-blocked (got ' + res.defenderPower + ')');
  // terrain is hex-owned and directional (HexClarificationDiagram)
  st.terrainEdges[E.sideKey('0,0', 5)] = 'F'; // forest in the attacker's hex facing 0,1
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 4, 'forest +1 attacking out of its hex (got ' + res.attackerPower + ')');
  delete st.terrainEdges[E.sideKey('0,0', 5)];
  st.terrainEdges[E.sideKey('0,1', 2)] = 'F'; // forest in DEFENDER hex: no effect
  st.terrainEdges[E.sideKey('0,0', 5)] = 'M'; // mountain in ATTACKER hex: no effect
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 3 && res.defenderPower === 2, 'reversed sides give no bonus (got ' + res.attackerPower + 'v' + res.defenderPower + ')');
  delete st.terrainEdges[E.sideKey('0,1', 2)];
  delete st.terrainEdges[E.sideKey('0,0', 5)];
  st.terrainEdges[E.sideKey('0,1', 2)] = 'M'; // mountain in the defender's hex facing 0,0
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 3 && res.defenderPower === 3, 'mountain +1 defending its hex (got ' + res.defenderPower + ')');
  // card mod
  res = E.computeAttack(st, { from: '0,0', to: '0,1', mod: 1 });
  assert.ok(res.attackerPower === 4, 'card +1 mod applied');
  // HQ support: blue HQ adjacent to skirmish hex
  st.hq.blue = '1,0';
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.defenderPower === 4, 'HQ gives +1 support to adjacent skirmish hex (got ' + res.defenderPower + ')');
  // attack the HQ itself
  st.units['2,0'] = { type: 'cavalry', owner: 'red' };
  var hqAtk = E.computeAttack(st, { from: '2,0', to: '1,0' });
  assert.ok(hqAtk.defenderIsHQ, 'HQ recognized as target');
})();
});

test('V0 terrain-crossing rules: trench support denial + rivers', () => {
(function () {
  // Trench on the SUPPORTER's hex blocks just the same (ownership of the
  // border piece is irrelevant): red attacks 0,1 from 0,0; red support at 1,1.
  var st = testSkirmish(130);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.units['1,1'] = { type: 'infantry', owner: 'red' };
  st.units['0,1'] = { type: 'infantry', owner: 'blue' };
  var res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 2, 'baseline: supporter counts (got ' + res.attackerPower + ')');
  st.trenches['1,1'] = [{ dirs: [3, 4], owner: 'red' }]; // covers the 1,1 -> 0,1 border
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 1, "trench in the supporter's hex blocks its support out across it (got " + res.attackerPower + ')');
  assert.ok(res.attackerParts.some(function (p) { return p.indexOf('blocked by trench') >= 0; }),
    'breakdown names the blocked support');
  // ...but a trench NOT on that border never locks a unit in:
  st.trenches['1,1'] = [{ dirs: [0, 1], owner: 'red' }];
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  assert.ok(res.attackerPower === 2, 'a unit in a trenched hex still supports out across a free border');
  // The attack itself may always cross a trenched border:
  st.trenches['0,1'] = [{ dirs: [2, 3], owner: 'blue' }]; // covers the attack border from 0,0
  var atks = E.listAttacks(st, 'red').filter(function (a) { return a.from === '0,0' && a.to === '0,1'; });
  assert.ok(atks.length === 1, 'attacks still cross trenched borders');

  // Rivers no longer block support: it crosses freely for both sides. Fixture:
  // red holds B3 and C2, blue holds C3, river on the C2|C3 border — B3's attack
  // on C3 still gets C2's support across the water. The river's job is now
  // deploy-control (see the deploy section).
  var B3 = '0,-1', C2 = '-2,0', C3 = '-1,0';
  var st2 = testSkirmish(131);
  st2.units[B3] = { type: 'infantry', owner: 'red' };
  st2.units[C2] = { type: 'infantry', owner: 'red' };
  st2.units[C3] = { type: 'infantry', owner: 'blue' };
  st2.terrainEdges[E.sideKey(C2, 0)] = 'R'; // river on C2's side toward C3
  var rB = E.computeAttack(st2, { from: B3, to: C3 });
  assert.ok(rB.attackerPower === 2, 'B3->C3: support crosses the river now (got ' + rB.attackerPower + ')');
  assert.ok(!rB.attackerParts.some(function (p) { return p.indexOf('blocked by river') >= 0; }), 'river no longer blocks support');
  // Defender support crosses the river too (neither hex's side blocks):
  var D3 = '-1,1';
  st2.units[D3] = { type: 'infantry', owner: 'blue' };
  st2.terrainEdges[E.sideKey(C3, 5)] = 'R'; // river owned by the SKIRMISH hex side toward D3
  var rD = E.computeAttack(st2, { from: B3, to: C3 });
  assert.ok(rD.defenderPower === 2, "D3's defender support crosses the river (got " + rD.defenderPower + ')');

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
  assert.ok(bt.forestPieces.length === 0, 'rivers are not barrage targets (they act like mountains)');
  // rivers occupy the border: no trench may share it
  st3.units['0,0'] = { type: 'infantry', owner: 'red' };
  assert.ok(!E.trenchOrientations(st3, '0,0').some(function (pr) { return pr.indexOf(1) >= 0 || pr.indexOf(4) >= 0; }),
    'trenches may not overlap river sides');
})();
});

test('through-HQ movement & attacks', () => {
(function () {
  var st = testSkirmish(7);
  st.hq.red = '0,0';
  st.units['-1,0'] = { type: 'infantry', owner: 'red' };
  st.units['1,0'] = { type: 'infantry', owner: 'blue' };
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
  var hq = st.hq.red, target = t[0];
  st.terrainEdges[E.sideKey(hq, E.dirBetween(hq, target))] = 'R';
  var t2 = E.deployTargets(st, 'red', false);
  assert.ok(t2.indexOf(target) < 0, 'cannot deploy across a river (control does not extend over water)');
  assert.ok(t2.length === 2, 'river removes exactly the one across-water target (got ' + t2.length + ')');
  // reading the far hex's side of the same border blocks it just as well:
  var st4 = testSkirmish(9), target4 = E.deployTargets(st4, 'red', false)[0];
  st4.terrainEdges[E.sideKey(target4, E.dirBetween(target4, st4.hq.red))] = 'R';
  assert.ok(E.deployTargets(st4, 'red', false).indexOf(target4) < 0, 'river read from the target hex side also blocks deploy');
})();
});

test('rules 1.1: a trench lets the defender survive a combat tie', () => {
(function () {
  fixtureCard('ordered_withdraw'); // fixture, not the active deck (used in (b) below)
  // dirs of a trench covering the attacked border of `defHex` (the side facing
  // `fromHex`), plus its clockwise neighbour so it's a legal 2-edge orientation.
  function coverDir(defHex, fromHex) { var d = E.dirBetween(defHex, fromHex); return [d, (d + 1) % 6]; }

  // (a) tie vs a trenched defender: defender HOLDS, attacker is destroyed.
  var st = testSkirmish(201);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st.trenches['1,0'] = [{ dirs: coverDir('1,0', '0,0'), owner: 'blue' }];
  assert.ok(E.computeAttack(st, { from: '0,0', to: '1,0' }).outcome === 'tie', 'setup: 1v1 is still a tie across the trench');
  st.hands.red = ['mass_assault'];
  E.playCard(st, 'mass_assault', 'attack'); // basic attack: plain, no mod/tieSpare
  E.applyStep(st, { from: '0,0', to: '1,0' });
  assert.ok(st.units['1,0'] && st.units['1,0'].owner === 'blue', 'tie vs trenched defender: the defender survives');
  assert.ok(!st.units['0,0'], 'tie vs trenched defender: the attacker is destroyed');

  // (b) tieSpare attacker (Ordered Withdraw) vs a trenched defender = a WHIFF:
  //     the card spares the attacker, the trench spares the defender — nobody dies.
  var st2 = testSkirmish(202);
  st2.units['0,0'] = { type: 'infantry', owner: 'red' };
  st2.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st2.trenches['1,0'] = [{ dirs: coverDir('1,0', '0,0'), owner: 'blue' }];
  st2.hands.red = ['ordered_withdraw'];
  E.playCard(st2, 'ordered_withdraw');
  E.applyStep(st2, { from: '0,0', to: '1,0' });
  assert.ok(st2.units['1,0'] && st2.units['0,0'], 'tieSpare tie vs trenched defender: nobody dies (whiff)');

  // (e) REGRESSION — a plain tie on an UNtrenched border still kills both units.
  var st3 = testSkirmish(203);
  st3.units['0,0'] = { type: 'infantry', owner: 'red' };
  st3.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st3.hands.red = ['mass_assault'];
  E.playCard(st3, 'mass_assault', 'attack');
  E.applyStep(st3, { from: '0,0', to: '1,0' });
  assert.ok(!st3.units['0,0'] && !st3.units['1,0'], 'untrenched plain tie: both units destroyed (unchanged)');

  // (c) tie vs a trenched HQ border: the HQ is NOT captured (trench your HQ and a
  //     tie can't take it). Power-0 attacker (infantry 1 with a -1 card) vs HQ def 0.
  var st4 = testSkirmish(204);
  st4.units['-2,2'] = { type: 'infantry', owner: 'red' }; // adjacent to blue HQ at -3,2
  st4.trenches['-3,2'] = [{ dirs: coverDir('-3,2', '-2,2'), owner: 'blue' }];
  assert.ok(E.computeAttack(st4, { from: '-2,2', to: '-3,2', mod: -1 }).outcome === 'tie', 'setup: infantry(-1) vs HQ is a 0v0 tie');
  st4.hands.red = ['careful_maneuvers']; // [reposition, attack mod -1]
  E.playCard(st4, 'careful_maneuvers');
  if (E.currentStep(st4).type === 'reposition') E.applyStep(st4, { skip: true });
  E.applyStep(st4, { from: '-2,2', to: '-3,2' });
  assert.ok(st4.hqAlive.blue && st4.phase !== 'skirmish-over', 'tie at a trenched HQ does NOT capture it');
  assert.ok(!st4.units['-2,2'], 'the attacker still dies on that tie (no tieSpare)');

  // (d) REGRESSION — a tie at an UNtrenched HQ still captures it exactly as before.
  var st5 = testSkirmish(205);
  st5.units['-2,2'] = { type: 'infantry', owner: 'red' };
  st5.hands.red = ['careful_maneuvers'];
  E.playCard(st5, 'careful_maneuvers');
  if (E.currentStep(st5).type === 'reposition') E.applyStep(st5, { skip: true });
  E.applyStep(st5, { from: '-2,2', to: '-3,2' });
  assert.ok(st5.phase === 'skirmish-over' && st5.skirmishWinner === 'red' && st5.winType === 'hq',
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
