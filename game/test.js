/* Engine tests: map validation, rules spot-checks, AI-vs-AI full matches */
var E = require('./engine.js');
var fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  ok - ' + msg);
  else { console.log('  FAIL - ' + msg); fails++; }
}

console.log('== map validation ==');
var probs = E.validateMaps();
ok(probs.length === 0, 'all built-in maps valid' + (probs.length ? ': ' + probs.join('; ') : ''));
ok(E.MAPS.length === 18, '18 maps defined');
ok(E.boardHexes('grand').length === 37, '37 hexes on grand board');

console.log('== classic board (physical prototype, rows 4-5-6-5-4) ==');
(function () {
  var hexes = E.boardHexes('classic');
  ok(hexes.length === 24, '24 hexes (got ' + hexes.length + ')');
  var rows = {};
  hexes.forEach(function (k) { var r = E.parseKey(k)[1]; rows[r] = (rows[r] || 0) + 1; });
  ok(rows[-2] === 4 && rows[-1] === 5 && rows[0] === 6 && rows[1] === 5 && rows[2] === 4,
    'row counts are 4,5,6,5,4 (got ' + JSON.stringify(rows) + ')');
  var set = {};
  hexes.forEach(function (k) { set[k] = true; });
  var symOk = hexes.every(function (k) {
    var qr = E.parseKey(k);
    var rr = E.rot180('classic', qr[0], qr[1]);
    return set[E.key(rr[0], rr[1])];
  });
  ok(symOk, '180-degree rotation maps the classic board onto itself');
})();

console.log('== wide board & new small-board maps ==');
(function () {
  ok(E.boardHexes('wide').length === 29, 'wide board has 29 hexes');
  var small = E.MAPS.filter(function (m) { return m.shape === 'classic' || m.shape === 'wide'; });
  ok(small.length === 6, '6 new small-board maps (got ' + small.length + ')');
  small.forEach(function (m) {
    var n = E.boardHexes(m.shape).length;
    ok(n >= 22 && n <= 30, m.name + ': board has ' + n + ' hexes (22-30)');
  });
})();

console.log('== trench/terrain edge exclusivity ==');
(function () {
  var m = E.newMatch({ seed: 55, firstPlayer: 'red' });
  var st = E.newBattle(m);
  st.units = {}; st.trenches = {}; st.terrainEdges = {}; st.terrainPieces = [];
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

console.log('== HexClarificationDiagram A/B/C table ==');
(function () {
  // A top, B = A's SW neighbor, C = A's SE neighbor. Forest in A on edges A|B and A|C.
  // Mountain in B on edges B|A and B|C.
  var A = '0,0', B = '-1,1', C = '0,1';
  function fresh() {
    var m = E.newMatch({ seed: 77, firstPlayer: 'red' });
    var st = E.newBattle(m);
    st.units = {}; st.trenches = {}; st.terrainEdges = {}; st.terrainPieces = [];
    st.hq = { red: '3,-3', blue: '-3,3' }; // far away
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
  var m = E.newMatch({ seed: 21, firstPlayer: 'red' });
  var st = E.newBattle(m);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.units['0,1'] = { type: 'cavalry', owner: 'blue' };
  var cid = st.hands.red.filter(function (c) { return c !== 'attack_plus1'; })[0];
  E.playCard(st, cid, 'attack');
  var o = E.stepOptions(st);
  ok(o.type === 'attack' && (o.mod || 0) === 0, 'card resolves as plain attack step');
  E.applyStep(st, { from: '0,0', to: '0,1' });
  ok(st.removed.red.indexOf(cid) >= 0, 'card still removed from game');
  // reposition mode
  var m2 = E.newMatch({ seed: 22, firstPlayer: 'red' });
  var st2 = E.newBattle(m2);
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

console.log('== deck composition ==');
var total = E.CARDS.reduce(function (a, c) { return a + c.count; }, 0);
ok(total === 16, '16 cards per deck (got ' + total + ')');

console.log('== combat math ==');
(function () {
  var m = E.newMatch({ seed: 42, firstPlayer: 'red' });
  var st = E.newBattle(m);
  // clear board state for a controlled test
  st.units = {};
  st.terrainEdges = {}; st.terrainPieces = [];
  st.trenches = {};
  st.hq = { red: '0,-3', blue: '0,3' };
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
  st.trenches['0,1'] = { dirs: [2, 3] };
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.defenderPower === 3, 'trench +1 when attacked across covered edge (got ' + res.defenderPower + ')');
  st.trenches['0,1'] = { dirs: [0, 1] };
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
  var m = E.newMatch({ seed: 7, firstPlayer: 'red' });
  var st = E.newBattle(m);
  st.units = {}; st.trenches = {};
  st.hq = { red: '0,0', blue: '0,3' };
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
  var m = E.newMatch({ seed: 9, firstPlayer: 'red' });
  var st = E.newBattle(m);
  st.units = {}; st.trenches = {};
  st.hq = { red: '0,-3', blue: '0,3' };
  var t = E.deployTargets(st, 'red', false);
  ok(t.length === 3, 'deploy targets adjacent to HQ only at battle start (got ' + t.length + ')');
  ok(t.indexOf('0,3') < 0, 'cannot deploy onto enemy HQ');
})();

console.log('== turn flow / first hand ==');
(function () {
  var m = E.newMatch({ seed: 11, firstPlayer: 'red' });
  var st = E.newBattle(m);
  ok(st.hands.red.length === 4, 'first hand has 4 cards');
  ok(st.hands.red.indexOf('deploy_inf_start') >= 0, 'starting card guaranteed in first hand');
  E.playCard(st, 'deploy_inf_start');
  var o = E.stepOptions(st);
  ok(o.type === 'deploy' && o.targets.length === 3, 'starting deploy offers 3 hexes');
  E.applyStep(st, { hex: o.targets[0] });
  ok(st.current === 'blue' && st.hands.blue.length === 4, 'turn passed to blue with 4 cards');
  ok(st.removed.red.length === 1 && st.discards.red.length === 3, 'played card removed, rest discarded');
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
