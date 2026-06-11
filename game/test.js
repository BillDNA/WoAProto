/* Engine tests: map validation, rules spot-checks, AI-vs-AI full matches */
var E = require('./engine.js');
var fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  ok - ' + msg);
  else { console.log('  FAIL - ' + msg); fails++; }
}

// A bare classic-board map so rules tests are deterministic regardless of the
// built-in roster. HQs in opposite corners, no terrain.
var TESTMAP = { name: 'Test Range', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2], pieces: [] };
function testBattle(seed) {
  var m = E.newMatch({ seed: seed, firstPlayer: 'red', maps: [TESTMAP] });
  return E.newBattle(m);
}

console.log('== shapes (data-driven from maps.js) ==');
(function () {
  var names = Object.keys(E.SHAPES);
  ok(names.length >= 4, names.length + ' board shapes defined');
  ok(!E.SHAPES.grand && !E.SHAPES.wide, 'grand and wide boards are gone');
  names.forEach(function (n) {
    var hexes = E.boardHexes(n);
    ok(hexes.length >= 16 && hexes.length <= 24,
      n + ': ' + hexes.length + ' hexes (laser-cutter ceiling is 24)');
    ok(E.SHAPES[n].centre !== null, n + ': point-symmetric (Mirror & fair HQs work)');
    var set = {};
    hexes.forEach(function (k) { set[k] = true; });
    var symOk = hexes.every(function (k) {
      var qr = E.parseKey(k);
      var rr = E.rot180(n, qr[0], qr[1]);
      return set[E.key(rr[0], rr[1])];
    });
    ok(symOk, n + ': 180-degree rotation maps the board onto itself');
  });
})();

console.log('== classic board (physical prototype, rows 4-5-6-5-4) ==');
(function () {
  var hexes = E.boardHexes('classic');
  ok(hexes.length === 24, '24 hexes (got ' + hexes.length + ')');
  var rows = {};
  hexes.forEach(function (k) { var r = E.parseKey(k)[1]; rows[r] = (rows[r] || 0) + 1; });
  ok(rows[-2] === 4 && rows[-1] === 5 && rows[0] === 6 && rows[1] === 5 && rows[2] === 4,
    'row counts are 4,5,6,5,4 (got ' + JSON.stringify(rows) + ')');
})();

console.log('== human-readable grid labels ==');
(function () {
  E.setBoard('classic');
  ok(E.hexLabel('-1,-2') === 'A1', 'top-left of classic is A1 (got ' + E.hexLabel('-1,-2') + ')');
  ok(E.hexLabel('0,0') === 'C4', 'centre-ish hex is C4 (got ' + E.hexLabel('0,0') + ')');
  ok(E.hexLabel('0,2') === 'E4', 'bottom-right of classic is E4 (got ' + E.hexLabel('0,2') + ')');
  ok(E.hexLabel('9,9') === '9,9', 'off-board key falls back to raw coords');
})();

console.log('== terrain pieces live inside ONE hex (the yellow-line bug) ==');
(function () {
  ok(E.pieceProblem({ t: 'F', edges: [[0, 0, 4], [0, 0, 5], [0, 0, 0]] }) === null, 'contiguous single-hex piece accepted (wraps 4-5-0)');
  ok(E.pieceProblem({ t: 'M', edges: [[0, 0, 2], [0, 0, 1], [1, -1, 3]] }) !== null, 'hex-spanning piece rejected (old High Pass mountain)');
  ok(E.pieceProblem({ t: 'M', edges: [[0, 0, 1], [0, 0, 4]] }) !== null, 'non-contiguous sides rejected');
  ok(E.pieceProblem({ t: 'F', edges: [[0, 0, 2], [0, 0, 2]] }) !== null, 'duplicate side rejected');
  var bad = { name: 'Bad Map', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'F', edges: [[0, 0, 2], [-1, 0, 1]] }] };
  ok(E.validateMaps([bad]).length === 1, 'validateMaps flags a spanning piece');
})();

console.log('== map validation ==');
var probs = E.validateMaps();
ok(probs.length === 0, 'all built-in maps valid' + (probs.length ? ': ' + probs.join('; ') : ''));
ok(E.MAPS.length === 12, '12 maps defined, like the physical map deck (got ' + E.MAPS.length + ')');
(function () {
  E.MAPS.forEach(function (m) {
    var d = E.dist(E.key(m.redHQ[0], m.redHQ[1]), E.key(m.blueHQ[0], m.blueHQ[1]));
    ok(d >= 4, m.name + ': HQs ' + d + ' apart (4+ so there is no turn-2 rush)');
  });
})();

console.log('== trench/terrain edge exclusivity ==');
(function () {
  var st = testBattle(55);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  ok(E.trenchOrientations(st, '0,0').length === 6, 'all 6 orientations on a clean hex');
  st.terrainEdges[E.sideKey('0,0', 1)] = 'F'; // this hex's own dir-1 side
  var ors = E.trenchOrientations(st, '0,0');
  ok(ors.length === 4, 'terrain on one side blocks 2 orientations (got ' + ors.length + ')');
  ok(!ors.some(function (p) { return p.indexOf(1) >= 0; }), 'no orientation uses the terrain side');
  st.terrainEdges[E.sideKey('1,-1', 4)] = 'M'; // the NEIGHBOR's side of that border
  ok(E.trenchOrientations(st, '0,0').length === 4, "neighbor-owned terrain across the border doesn't block");
  var thrown = false;
  st.hands.red = ['deploy_inf_trench'];
  E.playCard(st, 'deploy_inf_trench');
  E.applyStep(st, { skip: true }); // skip the deploy
  try { E.applyStep(st, { hex: '0,0', dirs: [1, 2] }); } catch (e) { thrown = true; }
  ok(thrown, 'engine rejects trench over a terrain edge');
})();

console.log('== multiple trenches per hex (DoubleTrenchNotAllowed report) ==');
(function () {
  // Bill's repro: infantry on D3 (classic '-1,1'), already entrenched on its
  // west/southwest edges; a second trench along the C3/C4 edges must be legal.
  var st = testBattle(60);
  st.units['-1,1'] = { type: 'infantry', owner: 'red' };
  st.trenches['-1,1'] = [{ dirs: [3, 4], owner: 'red' }];
  ok(E.trenchTargets(st, 'red').indexOf('-1,1') >= 0, 'a hex with a trench can be entrenched again');
  var ors = E.trenchOrientations(st, '-1,1');
  ok(ors.some(function (pr) { return pr[0] === 1 && pr[1] === 2; }), 'orientation toward C3/C4 (dirs 1-2) offered');
  ok(!ors.some(function (pr) { return pr.indexOf(3) >= 0 || pr.indexOf(4) >= 0; }), 'already-covered edges excluded');
  st.hands.red = ['deploy_inf_trench'];
  E.playCard(st, 'deploy_inf_trench');
  E.applyStep(st, { skip: true }); // skip the deploy
  E.applyStep(st, { hex: '-1,1', dirs: [1, 2] });
  ok(st.trenches['-1,1'].length === 2, 'second trench dug on the same hex');
  st.units['0,0'] = { type: 'infantry', owner: 'blue' };
  var r = E.computeAttack(st, { from: '0,0', to: '-1,1' });
  ok(r.defenderPower === 2, 'second trench defends its edges (got ' + r.defenderPower + ')');
  st.units['-2,1'] = { type: 'infantry', owner: 'blue' };
  var r2 = E.computeAttack(st, { from: '-2,1', to: '-1,1' });
  ok(r2.defenderPower >= 2, 'first trench still defends its edges');
  // overlap stays illegal
  var st2 = testBattle(61);
  st2.units['0,0'] = { type: 'infantry', owner: 'red' };
  st2.trenches['0,0'] = [{ dirs: [1, 2], owner: 'red' }];
  var thrown = false;
  st2.hands.red = ['deploy_inf_trench'];
  E.playCard(st2, 'deploy_inf_trench');
  E.applyStep(st2, { skip: true });
  try { E.applyStep(st2, { hex: '0,0', dirs: [2, 3] }); } catch (e) { thrown = true; }
  ok(thrown, 'overlapping trench edges rejected');
})();

console.log('== HexClarificationDiagram A/B/C table ==');
(function () {
  // A top, B = A's SW neighbor, C = A's SE neighbor. Forest in A on edges A|B and A|C.
  // Mountain in B on edges B|A and B|C.
  var A = '0,0', B = '-1,1', C = '0,1';
  function fresh() {
    var st = testBattle(77);
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
    ok(r.attackerPower === cs[2] && r.defenderPower === cs[3],
      cs[4] + ' (got ' + r.attackerPower + 'v' + r.defenderPower + ')');
  });
})();

console.log('== airdrop never in the opening hand ==');
(function () {
  var bad = 0;
  for (var seed = 200; seed < 240; seed++) {
    var m = E.newMatch({ seed: seed, firstPlayer: 'red' });
    var st = E.newBattle(m);
    if (st.hands.red.indexOf('airdrop') >= 0) bad++;
    if (st.decks.red.indexOf('airdrop') < 0) bad++;            // returned to the deck
    if (st.decks.red.length + st.hands.red.length !== 16) bad++; // nothing lost
  }
  ok(bad === 0, 'airdrop excluded from 40 opening hands and returned to the deck (' + bad + ' problems)');
})();

console.log('== house rule: play any card as basic attack/reposition ==');
(function () {
  var st = testBattle(21);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.units['0,1'] = { type: 'cavalry', owner: 'blue' };
  var cid = st.hands.red.filter(function (c) { return c !== 'attack_plus1'; })[0];
  E.playCard(st, cid, 'attack');
  var o = E.stepOptions(st);
  ok(o.type === 'attack' && (o.mod || 0) === 0, 'card resolves as plain attack step');
  E.applyStep(st, { from: '0,0', to: '0,1' });
  ok(st.removed.red.indexOf(cid) >= 0, 'card still removed from game');
  // reposition mode
  var st2 = testBattle(22);
  st2.units['0,0'] = { type: 'infantry', owner: 'red' };
  var cid2 = st2.hands.red[0];
  E.playCard(st2, cid2, 'reposition');
  ok(E.stepOptions(st2).type === 'reposition', 'card resolves as plain reposition step');
})();

console.log('== map pool ==');
(function () {
  var one = [E.MAPS[0]];
  var m = E.newMatch({ seed: 33, maps: one });
  ok(m.maps.length === 1 && m.mapOrder.length === 1, 'match carries its own 1-map pool');
  var st = E.newBattle(m);
  ok(st.mapName === E.MAPS[0].name, 'battle 1 uses the pooled map');
  m.battleIndex = 3; m.lastLoser = "red";
  var st2 = E.newBattle(m);
  ok(st2.mapName === E.MAPS[0].name, 'pool cycles when battles outnumber maps');
})();

console.log('== deck composition (data-driven from maps.js) ==');
(function () {
  var total = E.CARDS.reduce(function (a, c) { return a + c.count; }, 0);
  var st = testBattle(99);
  ok(E.cardsRemaining(st, 'red') === total, 'battle starts with every card in deck+hand (' + total + ' per maps.js)');
  ok(E.CARDS.some(function (c) { return c.starting; }), 'a starting card is defined');
  ok(Object.keys(E.PIECE_TOTALS).length >= 2 && E.PIECE_TOTALS.trench >= 0, 'piece totals derive from maps.js: ' + JSON.stringify(E.PIECE_TOTALS));
})();

console.log('== combat math ==');
(function () {
  var st = testBattle(42);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.units['0,1'] = { type: 'infantry', owner: 'blue' };
  var res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 1 && res.defenderPower === 1 && res.outcome === 'tie', 'inf vs inf bare = 1v1 tie (got ' + res.attackerPower + 'v' + res.defenderPower + ')');
  // attacker support: red artillery adjacent to battle hex
  st.units['-1,1'] = { type: 'artillery', owner: 'red' };
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 3 && res.outcome === 'attacker', 'artillery support +2 (got ' + res.attackerPower + ')');
  // defender support: blue infantry adjacent to battle hex
  st.units['1,1'] = { type: 'infantry', owner: 'blue' };
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.defenderPower === 2, 'defender inf support +1 (got ' + res.defenderPower + ')');
  // trench across attack edge: attack comes from 0,0 which is NW (dir 2) of 0,1
  st.trenches['0,1'] = [{ dirs: [2, 3], owner: 'blue' }];
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.defenderPower === 3, 'trench +1 when attacked across covered edge (got ' + res.defenderPower + ')');
  st.trenches['0,1'] = [{ dirs: [0, 1], owner: 'blue' }];
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.defenderPower === 2, 'trench no bonus on uncovered edge (got ' + res.defenderPower + ')');
  // terrain is hex-owned and directional (HexClarificationDiagram)
  st.terrainEdges[E.sideKey('0,0', 5)] = 'F'; // forest in the attacker's hex facing 0,1
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 4, 'forest +1 attacking out of its hex (got ' + res.attackerPower + ')');
  delete st.terrainEdges[E.sideKey('0,0', 5)];
  st.terrainEdges[E.sideKey('0,1', 2)] = 'F'; // forest in DEFENDER hex: no effect
  st.terrainEdges[E.sideKey('0,0', 5)] = 'M'; // mountain in ATTACKER hex: no effect
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 3 && res.defenderPower === 2, 'reversed sides give no bonus (got ' + res.attackerPower + 'v' + res.defenderPower + ')');
  delete st.terrainEdges[E.sideKey('0,1', 2)];
  delete st.terrainEdges[E.sideKey('0,0', 5)];
  st.terrainEdges[E.sideKey('0,1', 2)] = 'M'; // mountain in the defender's hex facing 0,0
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 3 && res.defenderPower === 3, 'mountain +1 defending its hex (got ' + res.defenderPower + ')');
  // card mod
  res = E.computeAttack(st, { from: '0,0', to: '0,1', mod: 1 });
  ok(res.attackerPower === 4, 'card +1 mod applied');
  // HQ support: blue HQ adjacent to battle hex
  st.hq.blue = '1,0';
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.defenderPower === 4, 'HQ gives +1 support to adjacent battle hex (got ' + res.defenderPower + ')');
  // attack the HQ itself
  st.units['2,0'] = { type: 'cavalry', owner: 'red' };
  var hqAtk = E.computeAttack(st, { from: '2,0', to: '1,0' });
  ok(hqAtk.defenderIsHQ, 'HQ recognized as target');
})();

console.log('== through-HQ movement & attacks ==');
(function () {
  var st = testBattle(7);
  st.hq.red = '0,0';
  st.units['-1,0'] = { type: 'infantry', owner: 'red' };
  st.units['1,0'] = { type: 'infantry', owner: 'blue' };
  var atks = E.listAttacks(st, 'red');
  var thr = atks.filter(function (a) { return a.via === '0,0'; });
  ok(thr.length >= 1 && thr[0].to === '1,0', 'attack through HQ available');
  var rep = E.listRepositions(st, 'red');
  var thrMove = rep.moves.filter(function (mv) { return mv.via === '0,0'; });
  ok(thrMove.length > 0, 'reposition through HQ available');
})();

console.log('== deploy / control rules ==');
(function () {
  var st = testBattle(9);
  var t = E.deployTargets(st, 'red', false);
  ok(t.length === 3, 'deploy targets adjacent to corner HQ only at battle start (got ' + t.length + ')');
  ok(t.indexOf('-3,2') < 0, 'cannot deploy onto enemy HQ');
})();

console.log('== turn flow / first hand ==');
(function () {
  var st = testBattle(11);
  ok(st.hands.red.length === 4, 'first hand has 4 cards');
  ok(st.hands.red.indexOf('deploy_inf_start') >= 0, 'starting card guaranteed in first hand');
  E.playCard(st, 'deploy_inf_start');
  var o = E.stepOptions(st);
  ok(o.type === 'deploy' && o.targets.length === 3, 'starting deploy offers 3 hexes');
  E.applyStep(st, { hex: o.targets[0] });
  ok(st.current === 'blue' && st.hands.blue.length === 4, 'turn passed to blue with 4 cards');
  ok(st.removed.red.length === 1 && st.discards.red.length === 3, 'played card removed, rest discarded');
})();

console.log('== play metrics (seen / playLog for the card report) ==');
(function () {
  var st = testBattle(101);
  ok(Object.keys(st.seen.red).length >= 3, 'opening hand counted as seen (' + Object.keys(st.seen.red).length + ' distinct cards)');
  E.playCard(st, 'deploy_inf_start', 'normal');
  var e = st.playLog[st.playLog.length - 1];
  ok(e.id === 'deploy_inf_start' && e.p === 'red' && e.mode === 'normal' && e.seen === 1,
    'playLog records id/mode/first-sight: ' + JSON.stringify(e));
  var r = E.balanceMap(E.MAPS[4], 2, { seedBase: 5 });
  var anyCard = Object.keys(r.cards).filter(function (id) { return r.cards[id].plays > 0; })[0];
  ok(anyCard && 'simple' in r.cards[anyCard] && 'firstSight' in r.cards[anyCard] && 'seenSum' in r.cards[anyCard],
    'balanceMap aggregates simple/firstSight/seenSum per card');
})();

console.log('== Field Marshal AI & battle sim ==');
(function () {
  var t0 = Date.now();
  var st = E.simBattle(E.MAPS[0], 4242, 'red', 'hard', 'normal');
  ok(st.phase === 'battle-over', 'hard-vs-normal battle finishes (winner ' + st.battleWinner + ', ' + st.turnNumber + ' turns)');
  console.log('  (hard-AI battle took ' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
  var r = E.balanceMap(E.MAPS[4], 4, { seedBase: 11 });
  ok(r.redWins <= 4 && r.turns > 0 && r.unfinished === 0, 'balanceMap aggregates: ' + JSON.stringify({ red: r.redWins, first: r.firstWins, hq: r.hqWins }));
  var a = E.simBattle(E.MAPS[2], 777, 'red', 'normal', 'normal');
  var b = E.simBattle(E.MAPS[2], 777, 'red', 'normal', 'normal');
  ok(a.battleWinner === b.battleWinner && a.turnNumber === b.turnNumber, 'simulation is deterministic per seed');
})();

console.log('== noAdvance attacks (Ordered Withdraw holds its ground) ==');
(function () {
  var card = E.CARD_BY_ID.ordered_withdraw;
  ok(card.steps[0].tieSpare === true && card.steps[0].noAdvance === true,
    'Ordered Withdraw carries tieSpare + noAdvance');
  // outright victory: cavalry (atk 3) vs lone infantry (def 1) — defender dies, attacker stays put
  var st = testBattle(70);
  st.units['0,0'] = { type: 'cavalry', owner: 'red' };
  st.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st.hands.red = ['ordered_withdraw'];
  E.playCard(st, 'ordered_withdraw');
  E.applyStep(st, { from: '0,0', to: '1,0' });
  ok(!st.units['1,0'], 'defender destroyed on a clear win');
  ok(st.units['0,0'] && st.units['0,0'].type === 'cavalry', 'attacker did NOT take the hex');
  ok(st.vp.red === 1, 'VP scored for the kill');
  // tie: infantry vs infantry (1 vs 1) — defender dies, attacker survives in place
  var st2 = testBattle(71);
  st2.units['0,0'] = { type: 'infantry', owner: 'red' };
  st2.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st2.hands.red = ['ordered_withdraw'];
  E.playCard(st2, 'ordered_withdraw');
  E.applyStep(st2, { from: '0,0', to: '1,0' });
  ok(!st2.units['1,0'] && st2.units['0,0'], 'tie: defender destroyed, attacker survives in place');
  // HQ still falls to a noAdvance attack (capture does not require entering)
  var st3 = testBattle(72);
  st3.units['-2,2'] = { type: 'cavalry', owner: 'red' }; // adjacent to blue HQ at -3,2
  st3.hands.red = ['ordered_withdraw'];
  E.playCard(st3, 'ordered_withdraw');
  E.applyStep(st3, { from: '-2,2', to: '-3,2' });
  ok(st3.phase === 'battle-over' && st3.battleWinner === 'red' && st3.winType === 'hq',
    'noAdvance attack still captures the HQ');
})();

console.log('== Barrage targets ANY trench or forest (Feedback Round 5 ruling) ==');
(function () {
  // forest + trench deep in blue territory, far from anything red controls
  var BARMAP = { name: 'Barrage Range', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'F', edges: [[-2, 2, 0], [-2, 2, 1]] }] };
  var m = E.newMatch({ seed: 31, firstPlayer: 'red', maps: [BARMAP] });
  var st = E.newBattle(m);
  st.trenches['-3,1'] = [{ dirs: [0, 1], owner: 'blue' }];
  var b = E.listBarrageTargets(st, 'red');
  ok(b.forestPieces.length === 1, 'forest far outside red lines is targetable (got ' + b.forestPieces.length + ')');
  ok(b.trenches.length === 1 && b.trenches[0].hex === '-3,1', 'trench far outside red lines is targetable');
  st.hands.red = ['naval_barrage'];
  E.playCard(st, 'naval_barrage');
  E.applyStep(st, { trenchHex: '-3,1', trenchIdx: 0 });
  ok(!st.trenches['-3,1'], 'barrage destroys the distant trench');
})();

console.log('== no-op plays are logged and marked (skipped-turn report) ==');
(function () {
  var st = testBattle(77);
  st.hands.red = ['attack_plus1']; // no units on the board: the attack cannot resolve
  E.playCard(st, 'attack_plus1');
  ok(st.current === 'blue', 'impossible card ends the turn immediately');
  var e = st.playLog[st.playLog.length - 1];
  ok(e.id === 'attack_plus1' && e.noop === true, 'playLog entry marked noop: ' + JSON.stringify(e));
  ok(st.log.some(function (l) { return l.msg.indexOf('no opening') >= 0; }), 'journal says the order was spent to no effect');
  var st2 = testBattle(78);
  E.playCard(st2, 'deploy_inf_start');
  E.applyStep(st2, { hex: E.stepOptions(st2).targets ? E.stepOptions(st2).targets[0] : null });
  ok(!st2.playLog[st2.playLog.length - 1].noop, 'a play that acted is NOT marked noop');
  var r = E.balanceMap(E.MAPS[4], 2, { seedBase: 5 });
  var anyCard = Object.keys(r.cards)[0];
  ok('noop' in r.cards[anyCard], 'balanceMap aggregates noop per card');
})();

console.log('== concession ==');
(function () {
  var st = testBattle(88);
  E.concede(st, 'red');
  ok(st.phase === 'battle-over' && st.battleWinner === 'blue' && st.winType === 'concession',
    'conceding hands the battle to the enemy');
  ok(st.match.wins.blue === 1 && st.match.lastLoser === 'red', 'match bookkeeping matches a normal loss');
  ok(st.log.some(function (l) { return l.msg.indexOf('concedes the field') >= 0; }), 'concession reaches the journal');
})();

console.log('== concede advisory (foregone-conclusion heuristic) ==');
(function () {
  var st = testBattle(99);
  ok(E.concedeAdvised(st, 'red') === null, 'fresh battle: no advisory (Airdrop HQ snipe still possible)');
  // hopeless for red: 1 turn left, 6 VP behind, only 1 enemy VP on the field,
  // airdrop already spent, nothing within marching range of the blue HQ
  st.vp.blue = 6;
  st.decks.red = []; st.discards.red = []; st.hands.red = ['attack_plus1'];
  st.removed.red.push('airdrop');
  st.units['-3,1'] = { type: 'infantry', owner: 'blue' };
  var adv = E.concedeAdvised(st, 'red');
  ok(adv && adv.need === 7 && adv.turnsLeft === 1, 'hopeless position advised: ' + JSON.stringify(adv));
  ok(E.concedeAdvised(st, 'blue') === null, 'the winning side is never advised to concede');
  st.vp.red = 9;
  ok(E.concedeAdvised(st, 'red') === null, 'a leading player is never advised to concede');
})();

console.log('== AI vs AI full matches ==');
var seeds = [1, 2, 3, 4, 5, 6, 7, 8];
var hqWins = 0, attrWins = 0, maxTurns = 0;
seeds.forEach(function (seed) {
  var match = E.newMatch({ seed: seed });
  var battles = 0;
  while (!match.winner && battles < 12) {
    var st = E.newBattle(match);
    var guard = 0;
    while (st.phase !== 'battle-over' && guard++ < 400) {
      var plan = E.aiPlanTurn(st, 'normal');
      if (!plan) { console.log('  no plan! hand=' + JSON.stringify(st.hands[st.current])); break; }
      E.playCard(st, plan.cardId, plan.mode || 'normal');
      var g2 = 0;
      while (st.phase === 'step' && g2++ < 12) {
        var opts = E.stepOptions(st);
        var c = plan.choices.shift();
        if (!c) c = { skip: true };
        try { E.applyStep(st, c); }
        catch (e) { E.applyStep(st, { skip: true }); }
      }
    }
    if (st.phase !== 'battle-over') { console.log('  FAIL battle did not finish (seed ' + seed + ')'); fails++; break; }
    if (st.winType === 'hq') hqWins++; else attrWins++;
    maxTurns = Math.max(maxTurns, st.turnNumber);
    battles++;
  }
  ok(match.winner === 'red' || match.winner === 'blue', 'seed ' + seed + ': match finished, winner=' + match.winner + ' (' + match.wins.red + '-' + match.wins.blue + ', ' + battles + ' battles)');
});
console.log('  battle endings: ' + hqWins + ' HQ captures, ' + attrWins + ' attrition; longest battle ' + maxTurns + ' turns');

console.log(fails === 0 ? '\nALL TESTS PASSED' : '\n' + fails + ' FAILURES');
process.exit(fails === 0 ? 0 : 1);
/* end */
