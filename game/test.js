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

// Card-behaviour fixtures (WOA-030): pin a card's DEF from the full content
// catalog -- every deck loaded from content/decks/ (node's require() loop in
// engine/01-core.js pushes them all into the global WOA_CONTENT regardless of
// which one is flagged active) -- not just the active deck's resolved card
// list (E.CARDS / E.CARD_BY_ID). A deck that cuts the card (e.g. the 17-card
// adopt cuts Ordered Withdraw + Airdrop) must never crash a test that only
// wants to exercise the card's STEP MECHANICS. Registers into E.CARD_BY_ID
// (same object I.playCard/I.stepOptions read) without touching E.CARDS, so
// the fixture never leaks into an actual shuffled deck.
var ALL_DECK_CARDS = [].concat.apply([], ((typeof global !== 'undefined' && global.WOA_CONTENT && global.WOA_CONTENT.decks) || [])
  .map(function (d) { return d.cards || []; }));
function fixtureCard(id) {
  if (!E.CARD_BY_ID[id]) {
    var def = ALL_DECK_CARDS.filter(function (c) { return c.id === id; })[0];
    if (!def) throw new Error('fixtureCard: "' + id + '" not found in any loaded deck');
    E.CARD_BY_ID[id] = def;
  }
  return E.CARD_BY_ID[id];
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

console.log('== custom board shapes (explicit hex sets, V0 map-roster-and-shapes) ==');
(function () {
  // explicit hex set builds like a rows shape
  var s = E.buildShape('tst', { hexes: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1]] });
  ok(s.list.length === 5, 'hex-set shape builds (5 hexes)');
  // a hole in a row leaves a GAP in the labels: hexes keep their columns
  var holed = E.buildShape('holed', { hexes: [[0, 0], [2, 0]] });
  ok(holed.rowQFrom[0] === 0, 'row starts at its leftmost hex');
  // label check needs the shape current: run it through a map + newBattle
  var IRR = { name: 'Irregular', id: 'irr1', redHQ: [0, -1], blueHQ: [0, 1],
    shapeDef: { hexes: [[0, -1], [1, -1], [-1, 0], [0, 0], [1, 0], [-1, 1], [0, 1]] }, pieces: [] };
  ok(E.validateMaps([IRR]).length === 0, 'irregular map validates: ' + E.validateMaps([IRR]).join('; '));
  var m = E.newMatch({ seed: 5, firstPlayer: 'red', maps: [IRR] });
  var st = E.newBattle(m);
  ok(st.boardShape === '@irr1', 'inline shapeDef registered under @<map id> (got ' + st.boardShape + ')');
  ok(E.hexes().length === 7, 'battle runs on the 7-hex board');
  ok(E.hexLabel('-1,0') === 'B1' && E.hexLabel('0,0') === 'B2', 'labels count from the leftmost hex');
  // point-symmetry from a hex set (this outline is symmetric about 0,0 -> Mirror works)
  ok(E.SHAPES['@irr1'].centre !== null, 'symmetric hex set gets a rot180 centre');
  // a hole in a row leaves a GAP in the labels (hexes keep their columns)
  var HOLED = { name: 'Holed', id: 'hole1', redHQ: [0, -1], blueHQ: [0, 1],
    shapeDef: { hexes: [[0, -1], [1, -1], [-1, 0], [0, 0], [2, 0], [-1, 1], [0, 1]] }, pieces: [] };
  var m2 = E.newMatch({ seed: 6, firstPlayer: 'red', maps: [HOLED] });
  E.newBattle(m2);
  ok(E.hexLabel('2,0') === 'B4', 'a hole leaves a gap in the numbering (2,0 stays B4, got ' + E.hexLabel('2,0') + ')');
  ok(E.neighbor('0,0', 0) === null, 'the missing hex is truly off-board');
  E.setBoard('@irr1');
  var asym = E.buildShape('asym', { hexes: [[0, 0], [1, 0], [0, 1]] });
  ok(asym.centre === null, 'asymmetric hex set has no centre (Mirror disabled)');
  // the 24-hex ceiling is enforced for edited shapes
  var big = [];
  for (var q = 0; q < 5; q++) for (var r = 0; r < 5; r++) big.push([q, r]);
  var BIGMAP = { name: 'Too Big', id: 'big1', redHQ: [0, 0], blueHQ: [4, 4],
    shapeDef: { hexes: big }, pieces: [] };
  ok(E.validateMaps([BIGMAP]).some(function (p) { return p.indexOf('24-hex ceiling') >= 0; }),
    '25-hex edited shape rejected by validateMaps');
  // an edited shape can play a full AI battle
  var sim = E.simBattle(IRR, 99, 'red', 'normal', 'normal');
  ok(sim.phase === 'battle-over', 'AI battle completes on an irregular board (winner ' + sim.battleWinner + ')');
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
// Content roster (Feedback Round 4 Pass 2): maps are per-item files under
// game/content/maps/. `custom:true` marks Bill's experiments; the shipped
// roster is the non-custom maps (V1 trim to 12 total: −Black Forest −Open
// Mountain Pass −The Bulge −Twin Woods −Highwater; see
// logs/reports/analysis/2026-07-06-v1-map-trim.md).
var builtinMaps = E.MAPS.filter(function (m) { return !m.custom; });
ok(builtinMaps.length === 10, '10 shipped (non-custom) maps in the content roster (got ' + builtinMaps.length + ' of ' + E.MAPS.length + ' total)');
(function () {
  // HQ-distance guardrail applies to the SHIPPED roster; custom maps are Bill's
  // experiments (a turn-2 rush map can be intentional) and are exempt.
  builtinMaps.forEach(function (m) {
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
  ok(r.defenderPower === 1, 'trenches add no defense under the V0 rules (got ' + r.defenderPower + ')');
  st.units['-1,0'] = { type: 'infantry', owner: 'blue' }; // its border into the hex is trenched (dir 2)
  var r2 = E.computeAttack(st, { from: '0,0', to: '-1,1' });
  ok(r2.attackerPower === 1, 'second trench denies attacker support across its edges (got ' + r2.attackerPower + ')');
  st.units['0,1'] = { type: 'infantry', owner: 'blue' }; // untrenched border into the hex
  var r3 = E.computeAttack(st, { from: '0,0', to: '-1,1' });
  ok(r3.attackerPower === 2, 'support across an untrenched border still counts (got ' + r3.attackerPower + ')');
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

console.log('== noOpener cards never in the opening hand (e.g. Airdrop) ==');
(function () {
  // WOA-030: derive from the ACTIVE deck rather than hardcoding a card id/deck
  // size -- a deck that cuts every noOpener card (the 17-card adopt cuts
  // Airdrop) still exercises the "nothing lost" bookkeeping and passes clean.
  var noOpenerIds = E.CARDS.filter(function (c) { return c.noOpener; }).map(function (c) { return c.id; });
  var deckTotal = E.CARDS.reduce(function (s, c) { return s + c.count; }, 0);
  var bad = 0;
  for (var seed = 200; seed < 240; seed++) {
    var m = E.newMatch({ seed: seed, firstPlayer: 'red' });
    var st = E.newBattle(m);
    noOpenerIds.forEach(function (id) {
      if (st.hands.red.indexOf(id) >= 0) bad++;
      if (st.decks.red.indexOf(id) < 0) bad++;                  // returned to the deck
    });
    if (st.decks.red.length + st.hands.red.length !== deckTotal) bad++; // nothing lost
  }
  ok(bad === 0, noOpenerIds.length + ' noOpener card(s) (' + noOpenerIds.join(', ') +
    ') excluded from 40 opening hands and returned to the deck (' + bad + ' problems)');
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
  // Feedback Round 1: reposition is refused while a basic attack is possible
  var st3 = testBattle(23);
  st3.units['0,0'] = { type: 'infantry', owner: 'red' };
  st3.units['0,1'] = { type: 'infantry', owner: 'blue' }; // a basic attack IS available
  var cid3 = st3.hands.red[0];
  var threw = false;
  try { E.playCard(st3, cid3, 'reposition'); } catch (e) { threw = true; }
  ok(threw, 'reposition refused while a basic attack is available');
  ok(st3.phase === 'choose-card' && st3.hands.red.indexOf(cid3) >= 0, 'the refused card stays in hand');
})();

console.log('== Feedback Round 2: at least one step of a card must be played ==');
(function () {
  // Red inf at 0,0 can only strike blue inf at 0,1 (both far from either HQ).
  var st = testBattle(31);
  st.units = { '0,0': { type: 'infantry', owner: 'red' }, '0,1': { type: 'infantry', owner: 'blue' } };
  st.hands.red = ['mass_assault']; // two attack steps
  E.playCard(st, 'mass_assault');
  ok(!E.mustPlayStep(st), 'step 1 is skippable — a later step can still act');
  E.applyStep(st, { skip: true }); // allowed: attack #2 remains
  ok(E.mustPlayStep(st), 'the last playable step cannot be skipped while the card has done nothing');
  var threw = false;
  try { E.applyStep(st, { skip: true }); } catch (e) { threw = true; }
  ok(threw, 'engine refuses to skip the whole card');
  E.applyStep(st, { from: '0,0', to: '0,1' }); // playing an action satisfies the rule
  ok(st.phase !== 'step', 'once an action is played the card resolves');

  // Once one action is done, remaining steps ARE skippable.
  var st2 = testBattle(32);
  st2.units = { '0,0': { type: 'infantry', owner: 'red' } }; // lone unit, room to march, no enemies
  st2.hands.red = ['forced_march']; // three reposition steps
  E.playCard(st2, 'forced_march');
  E.applyStep(st2, { from: '0,0', to: E.listRepositions(st2, 'red').moves[0].to });
  ok(st2.phase !== 'step' || !E.mustPlayStep(st2), 'after acting, later steps are skippable');

  // A card that genuinely cannot act anywhere still spends the turn (no-op).
  var st3 = testBattle(33);
  st3.units = {}; // no units -> no barrage targets, no attacks
  st3.hands.red = ['naval_barrage']; // [barrage, attack]
  E.playCard(st3, 'naval_barrage');
  ok(st3.phase === 'choose-card' && st3.current === 'blue', 'a truly dead card still ends the turn');
  var le = st3.playLog[st3.playLog.length - 1];
  ok(le && le.noop, 'the dead card is logged as a no-op');
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

console.log('== deploy step budget vs stock (WOA-017: no deploy fallback, oversubscription = broken content) ==');
(function () {
  // Printed deploy steps per unit type, weighted by each card's deck count. A
  // single card can print more than one deploy step for the same type (e.g.
  // Conscription: two infantry steps on one card) and/or the same step can be
  // spread across several copies (e.g. Entrench x3, one infantry step each) --
  // both must count toward the total.
  function deploySumsByType(cards) {
    var sums = {};
    cards.forEach(function (c) {
      (c.steps || []).forEach(function (s) {
        if (s.type === 'deploy' && s.unit) sums[s.unit] = (sums[s.unit] || 0) + (c.count || 0);
      });
    });
    return sums;
  }
  // E.CARDS IS the active deck's resolved card list (engine/01-core.js:
  // ACTIVE_DECK -> CARD_LIST), so this checks exactly the deck that's live --
  // no separate "which deck is active" lookup needed. Stock comes from
  // E.PIECE_TOTALS, which itself resolves from the active units variant (or
  // the maps.js default), never a hardcoded 7/2/1. There is NO deploy
  // fallback in the house rules: printing more deploy steps for a type than
  // its stock guarantees a stranded unit / a dead turn once the stock runs
  // out (measured: Raiding Party's 8th infantry step vs a 7-stock cavsplit17
  // variant -> Deploy Infantry Noop 26%, balance-loop-v2 final report S5c.3).
  var deploySums = deploySumsByType(E.CARDS);
  Object.keys(E.PIECE_TOTALS).forEach(function (t) {
    if (t === 'trench') return; // trenches aren't a deploy-step unit type
    var printed = deploySums[t] || 0;
    ok(printed <= E.PIECE_TOTALS[t],
      'active deck: ' + printed + ' printed ' + t + ' deploy steps <= stock ' + E.PIECE_TOTALS[t] +
      ' (got ' + printed + '/' + E.PIECE_TOTALS[t] + ')');
  });
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
  // trench across the artillery's support border: that support is denied (V0 rules)
  st.trenches['0,1'] = [{ dirs: [2, 3], owner: 'blue' }]; // covers borders toward 0,0 and -1,1
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 1 && res.defenderPower === 2,
    'trench denies attacker support and adds no defense (got ' + res.attackerPower + 'v' + res.defenderPower + ')');
  st.trenches['0,1'] = [{ dirs: [0, 1], owner: 'blue' }]; // clear of the support borders; covers blue supporter's border
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 3, 'trench clear of the attacker-support border denies nothing (got ' + res.attackerPower + ')');
  ok(res.defenderPower === 2, 'defender support is never trench-blocked (got ' + res.defenderPower + ')');
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

console.log('== V0 terrain-crossing rules: trench support denial + rivers ==');
(function () {
  // Trench on the SUPPORTER's hex blocks just the same (ownership of the
  // border piece is irrelevant): red attacks 0,1 from 0,0; red support at 1,1.
  var st = testBattle(130);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.units['1,1'] = { type: 'infantry', owner: 'red' };
  st.units['0,1'] = { type: 'infantry', owner: 'blue' };
  var res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 2, 'baseline: supporter counts (got ' + res.attackerPower + ')');
  st.trenches['1,1'] = [{ dirs: [3, 4], owner: 'red' }]; // covers the 1,1 -> 0,1 border
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 1, "trench in the supporter's hex blocks its support out across it (got " + res.attackerPower + ')');
  ok(res.attackerParts.some(function (p) { return p.indexOf('blocked by trench') >= 0; }),
    'breakdown names the blocked support');
  // ...but a trench NOT on that border never locks a unit in:
  st.trenches['1,1'] = [{ dirs: [0, 1], owner: 'red' }];
  res = E.computeAttack(st, { from: '0,0', to: '0,1' });
  ok(res.attackerPower === 2, 'a unit in a trenched hex still supports out across a free border');
  // The attack itself may always cross a trenched border:
  st.trenches['0,1'] = [{ dirs: [2, 3], owner: 'blue' }]; // covers the attack border from 0,0
  var atks = E.listAttacks(st, 'red').filter(function (a) { return a.from === '0,0' && a.to === '0,1'; });
  ok(atks.length === 1, 'attacks still cross trenched borders');

  // Rivers no longer block support (Feedback Round 3): support crosses freely
  // for both sides. Bill's board example — red holds B3 and C2, blue holds C3,
  // river on the C2|C3 border. B3's attack on C3 STILL gets C2's support across
  // the water; the river's job is now deploy-control (see the deploy section).
  var B3 = '0,-1', C2 = '-2,0', C3 = '-1,0';
  var st2 = testBattle(131);
  st2.units[B3] = { type: 'infantry', owner: 'red' };
  st2.units[C2] = { type: 'infantry', owner: 'red' };
  st2.units[C3] = { type: 'infantry', owner: 'blue' };
  st2.terrainEdges[E.sideKey(C2, 0)] = 'R'; // river on C2's side toward C3
  var rB = E.computeAttack(st2, { from: B3, to: C3 });
  ok(rB.attackerPower === 2, 'B3->C3: support crosses the river now (got ' + rB.attackerPower + ')');
  ok(!rB.attackerParts.some(function (p) { return p.indexOf('blocked by river') >= 0; }), 'river no longer blocks support');
  // Defender support crosses the river too (the check used to read either hex's
  // side; now neither blocks):
  var D3 = '-1,1';
  st2.units[D3] = { type: 'infantry', owner: 'blue' };
  st2.terrainEdges[E.sideKey(C3, 5)] = 'R'; // river owned by the BATTLE hex side toward D3
  var rD = E.computeAttack(st2, { from: B3, to: C3 });
  ok(rD.defenderPower === 2, "D3's defender support crosses the river (got " + rD.defenderPower + ')');

  // River pieces now come in the same lengths as forest/mountain (2- and 3-side,
  // Feedback Round 1), validated against the R3/R2 stock; still not barrageable.
  ok(E.pieceProblem({ t: 'R', edges: [[0, 0, 0], [0, 0, 1]] }) === null, 'two-side river piece accepted');
  var riverMap = { name: 'River Test', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'R', edges: [[0, 0, 0], [0, 0, 1]] }, { t: 'R', edges: [[0, 0, 3], [0, 0, 4]] }] };
  ok(E.validateMaps([riverMap]).length === 0, 'two 2-side rivers fit the R2 stock');
  var tooMany = { name: 'Flooded', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'R', edges: [[0, 0, 0], [0, 0, 1], [0, 0, 2]] },
             { t: 'R', edges: [[1, 0, 0], [1, 0, 1], [1, 0, 2]] },
             { t: 'R', edges: [[-1, 0, 0], [-1, 0, 1], [-1, 0, 2]] }] };
  ok(E.validateMaps([tooMany]).length === 1, 'a third 3-side river exceeds the R3 stock');
  var single = { name: 'Trickle', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'R', edges: [[0, 0, 1]] }] };
  ok(E.validateMaps([single]).length === 1, 'a single-side river has no physical counterpart (R1 removed)');
  var m3 = E.newMatch({ seed: 99, firstPlayer: 'red', maps: [riverMap] });
  var st3 = E.newBattle(m3);
  var bt = E.listBarrageTargets(st3, 'red');
  ok(bt.forestPieces.length === 0, 'rivers are not barrage targets (they act like mountains)');
  // rivers occupy the border: no trench may share it
  st3.units['0,0'] = { type: 'infantry', owner: 'red' };
  ok(!E.trenchOrientations(st3, '0,0').some(function (pr) { return pr.indexOf(1) >= 0 || pr.indexOf(4) >= 0; }),
    'trenches may not overlap river sides');
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
  // Feedback Round 4 bug: a river on the border to a would-be deploy hex must
  // stop control from extending across it (D2 was wrongly deployable). Put a
  // river on the HQ|target border and that target drops out of the list.
  var hq = st.hq.red, target = t[0];
  st.terrainEdges[E.sideKey(hq, E.dirBetween(hq, target))] = 'R';
  var t2 = E.deployTargets(st, 'red', false);
  ok(t2.indexOf(target) < 0, 'cannot deploy across a river (control does not extend over water)');
  ok(t2.length === 2, 'river removes exactly the one across-water target (got ' + t2.length + ')');
  // reading the far hex's side of the same border blocks it just as well:
  var st4 = testBattle(9), target4 = E.deployTargets(st4, 'red', false)[0];
  st4.terrainEdges[E.sideKey(target4, E.dirBetween(target4, st4.hq.red))] = 'R';
  ok(E.deployTargets(st4, 'red', false).indexOf(target4) < 0, 'river read from the target hex side also blocks deploy');
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
  var card = fixtureCard('ordered_withdraw'); // WOA-030: fixture, not the active deck
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

console.log('== rules 1.1 (S1): a trench lets the defender survive a combat tie ==');
(function () {
  fixtureCard('ordered_withdraw'); // WOA-030: fixture, not the active deck (used in (b) below)
  // dirs of a trench covering the attacked border of `defHex` (the side facing
  // `fromHex`), plus its clockwise neighbour so it's a legal 2-edge orientation.
  function coverDir(defHex, fromHex) { var d = E.dirBetween(defHex, fromHex); return [d, (d + 1) % 6]; }

  // (a) tie vs a trenched defender: defender HOLDS, attacker is destroyed.
  var st = testBattle(201);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st.trenches['1,0'] = [{ dirs: coverDir('1,0', '0,0'), owner: 'blue' }];
  ok(E.computeAttack(st, { from: '0,0', to: '1,0' }).outcome === 'tie', 'setup: 1v1 is still a tie across the trench');
  st.hands.red = ['mass_assault'];
  E.playCard(st, 'mass_assault', 'attack'); // basic attack: plain, no mod/tieSpare
  E.applyStep(st, { from: '0,0', to: '1,0' });
  ok(st.units['1,0'] && st.units['1,0'].owner === 'blue', 'tie vs trenched defender: the defender survives');
  ok(!st.units['0,0'], 'tie vs trenched defender: the attacker is destroyed');

  // (b) tieSpare attacker (Ordered Withdraw) vs a trenched defender = a WHIFF:
  //     the card spares the attacker, the trench spares the defender — nobody dies.
  var st2 = testBattle(202);
  st2.units['0,0'] = { type: 'infantry', owner: 'red' };
  st2.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st2.trenches['1,0'] = [{ dirs: coverDir('1,0', '0,0'), owner: 'blue' }];
  st2.hands.red = ['ordered_withdraw'];
  E.playCard(st2, 'ordered_withdraw');
  E.applyStep(st2, { from: '0,0', to: '1,0' });
  ok(st2.units['1,0'] && st2.units['0,0'], 'tieSpare tie vs trenched defender: nobody dies (whiff, A1)');

  // (e) REGRESSION — a plain tie on an UNtrenched border still kills both units.
  var st3 = testBattle(203);
  st3.units['0,0'] = { type: 'infantry', owner: 'red' };
  st3.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st3.hands.red = ['mass_assault'];
  E.playCard(st3, 'mass_assault', 'attack');
  E.applyStep(st3, { from: '0,0', to: '1,0' });
  ok(!st3.units['0,0'] && !st3.units['1,0'], 'untrenched plain tie: both units destroyed (unchanged)');

  // (c) tie vs a trenched HQ border: the HQ is NOT captured (trench your HQ and a
  //     tie can't take it). Power-0 attacker (infantry 1 with a -1 card) vs HQ def 0.
  var st4 = testBattle(204);
  st4.units['-2,2'] = { type: 'infantry', owner: 'red' }; // adjacent to blue HQ at -3,2
  st4.trenches['-3,2'] = [{ dirs: coverDir('-3,2', '-2,2'), owner: 'blue' }];
  ok(E.computeAttack(st4, { from: '-2,2', to: '-3,2', mod: -1 }).outcome === 'tie', 'setup: infantry(-1) vs HQ is a 0v0 tie');
  st4.hands.red = ['careful_maneuvers']; // [reposition, attack mod -1]
  E.playCard(st4, 'careful_maneuvers');
  if (E.currentStep(st4).type === 'reposition') E.applyStep(st4, { skip: true });
  E.applyStep(st4, { from: '-2,2', to: '-3,2' });
  ok(st4.hqAlive.blue && st4.phase !== 'battle-over', 'tie at a trenched HQ does NOT capture it');
  ok(!st4.units['-2,2'], 'the attacker still dies on that tie (no tieSpare)');

  // (d) REGRESSION — a tie at an UNtrenched HQ still captures it exactly as before.
  var st5 = testBattle(205);
  st5.units['-2,2'] = { type: 'infantry', owner: 'red' };
  st5.hands.red = ['careful_maneuvers'];
  E.playCard(st5, 'careful_maneuvers');
  if (E.currentStep(st5).type === 'reposition') E.applyStep(st5, { skip: true });
  E.applyStep(st5, { from: '-2,2', to: '-3,2' });
  ok(st5.phase === 'battle-over' && st5.battleWinner === 'red' && st5.winType === 'hq',
    'tie at an untrenched HQ still captures it (unchanged)');
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

console.log('== attrition victory (surviving units on the board, June 2026) ==');
(function () {
  // Drain blue's card pool so red's next completed turn triggers attrition.
  function drainBlue(st) {
    st.decks.blue = []; st.discards.blue = []; st.hands.blue = [];
    st.firstTurnDone.blue = true; // or drawHand would gift the starting card
  }
  // Kills don't score: blue killed 5 VP worth, but red has more ON the board.
  var st = testBattle(111);
  st.units['2,-1'] = { type: 'artillery', owner: 'red' };  // red fields 3 VP
  st.units['-3,1'] = { type: 'infantry', owner: 'blue' };  // blue fields 1 VP
  st.vp.blue = 5;
  drainBlue(st);
  st.hands.red = ['attack_plus1']; // no legal attack: resolves to nothing, ends the turn
  E.playCard(st, 'attack_plus1');
  ok(st.phase === 'battle-over' && st.battleWinner === 'red' && st.winType === 'attrition',
    'attrition counts surviving units, not kills (red wins 3-1 despite 0-5 in kills)');
  ok(st.log.some(function (l) { return l.msg.indexOf('3 VP vs 1 VP of surviving units') >= 0; }),
    'journal reports the surviving-unit scores');
  ok(E.fieldScore(st, 'red') === 3 && E.fieldScore(st, 'blue') === 1, 'fieldScore reads the board');

  // Undeployed reserves count for nothing: blue's full reserve loses to one fielded infantry.
  var st2 = testBattle(112);
  st2.units['2,-1'] = { type: 'infantry', owner: 'red' };
  drainBlue(st2);
  st2.hands.red = ['attack_plus1'];
  E.playCard(st2, 'attack_plus1');
  ok(st2.battleWinner === 'red', 'undeployed reserves count for nothing');

  // Bare-board tie still goes to the second player.
  var st3 = testBattle(113);
  drainBlue(st3);
  st3.hands.red = ['attack_plus1'];
  E.playCard(st3, 'attack_plus1');
  ok(st3.battleWinner === st3.second && st3.battleWinner === 'blue', '0-0 tie goes to the second player');
})();

console.log('== behaviour counters (balance-lab metrics) ==');
(function () {
  var st = testBattle(120);
  E.playCard(st, 'deploy_inf_start');
  E.applyStep(st, { hex: E.stepOptions(st).targets[0] });
  ok(st.stats.deploys === 1, 'deploy increments stats.deploys');
  var r = E.balanceMap(E.MAPS[0], 2, { seedBase: 5 });
  ['attacks', 'swaps', 'marches', 'zeroKill', 'tiebreak', 'firstBloodGames', 'controlGames', 'deployedShare',
   'reserveEndRed', 'reserveEndBlue', 'killTail', 'leadChanges']
    .forEach(function (k) { ok(k in r, 'balanceMap reports ' + k); });
  ok(r.killTail >= 0 && r.killTail <= r.turns, 'kill-less tail within [0, turns] (got ' + r.killTail + '/' + r.turns + ')');
  ok(r.leadChanges >= 0, 'lead changes non-negative (got ' + r.leadChanges + ')');
  // WOA-016: reserveEndRed/Blue are the per-side split of the SAME reserves-at-end
  // read deployedShare folds (both only accumulate over finished battles) — they
  // must reconcile: deployedShare = done - 0.5*(reserveEndRed + reserveEndBlue).
  var done = r.n - r.unfinished;
  ok(r.reserveEndRed >= 0 && r.reserveEndBlue >= 0, 'reserveEndRed/Blue are non-negative');
  ok(Math.abs(r.deployedShare - (done - 0.5 * (r.reserveEndRed + r.reserveEndBlue))) < 1e-9,
    'reserveEndRed/Blue reconcile with deployedShare (same reserves-at-end read, split by side)');
})();

console.log('== metrics-v2 trace capture (WOA-031: per-play trace + units fold, SPEC §4) ==');
(function () {
  var VALID_A = { deploy: 1, attack: 1, swap: 1, march: 1 };
  var seeds = [4242, 5150, 8181, 9091, 1212];
  var totalAtkEntries = 0, totalDeployEntries = 0, totalKillSum = 0, totalDieSum = 0, totalLd = 0, totalPlays = 0;
  seeds.forEach(function (seed) {
    var st = E.simBattle(E.MAPS[seed % E.MAPS.length], seed, 'red', 'hard', 'hard');
    ok(st.phase === 'battle-over', 'seed ' + seed + ': battle finishes (' + st.turnNumber + ' turns)');
    var killSum = 0, dieSum = 0;
    st.playLog.forEach(function (e) {
      totalPlays++;
      ok(!e.a || VALID_A[e.a], 'trace entry a is deploy|attack|swap|march or absent (got ' + e.a + ')');
      if (e.a === 'attack') { totalAtkEntries++; killSum += e.k || 0; ok(!!e.h, 'attack entry carries h (target hex)'); }
      if (e.a === 'deploy') { totalDeployEntries++; ok(!!e.u, 'deploy entry carries u (unit type)'); ok(!!e.h, 'deploy entry carries h'); }
      if (e.a === 'swap' || e.a === 'march') ok(!!e.h, e.a + ' entry carries h');
      if (e.ld) totalLd++;
      // untouched pre-existing fields still present (capture-only, no field removed)
      ok(e.p === 'red' || e.p === 'blue', 'entry keeps its original p field');
      ok(typeof e.turn === 'number', 'entry keeps its original turn field');
    });
    Object.keys(E.UNITS).forEach(function (t) {
      var u = st.unitMetrics[t];
      ok(u && Array.isArray(u.dep) && typeof u.atk === 'number' && typeof u.abs === 'number' &&
        typeof u.kill === 'number' && typeof u.die === 'number',
        'seed ' + seed + ': unitMetrics.' + t + ' has {dep,atk,abs,kill,die} (' + JSON.stringify(u) + ')');
      dieSum += u.die;
      u.dep.forEach(function (turn) { ok(turn >= 1 && turn <= st.turnNumber, t + ' dep turn within battle range'); });
    });
    totalKillSum += killSum; totalDieSum += dieSum;
    ok(killSum === dieSum, 'seed ' + seed + ': sum of k across attack entries == sum of units[*].die (' +
      killSum + ' == ' + dieSum + ')');
    var totalAtkByType = 0;
    Object.keys(E.UNITS).forEach(function (t) { totalAtkByType += st.unitMetrics[t].atk; });
    ok(totalAtkByType === st.stats.attacks, 'seed ' + seed + ': sum of unitMetrics[*].atk == stats.attacks (' +
      totalAtkByType + ' == ' + st.stats.attacks + ')');
  });
  ok(totalAtkEntries > 0 && totalDeployEntries > 0, 'trace produced attack and deploy entries across seeds (' +
    totalAtkEntries + ' atk / ' + totalDeployEntries + ' deploy of ' + totalPlays + ' plays)');
  ok(totalLd > 0, 'some plays record ld (leader after turn) once a lead is established (' + totalLd + '/' + totalPlays + ')');
  ok(totalKillSum === totalDieSum, 'fleet-wide: sum of k across attack entries == total kills == sum of units[*].die (' +
    totalKillSum + ' == ' + totalDieSum + ')');
})();

console.log('== trench orientations are never fully off-board (Feedback Round 2) ==');
(function () {
  var st = testBattle(77);
  var offBoard = 0, total = 0;
  E.hexes().forEach(function (h) {
    E.trenchOrientations(st, h).forEach(function (pr) {
      total++;
      if (!E.neighbor(h, pr[0]) && !E.neighbor(h, pr[1])) offBoard++;
    });
  });
  ok(total > 0 && offBoard === 0, 'no offered trench faces fully off-board (' + offBoard + '/' + total + ' bad)');
})();

console.log('== AI personalities are data (V0 ai-variety) ==');
(function () {
  ok(E.AI_PRESETS.easy && E.AI_PRESETS.normal && E.AI_PRESETS.hard, 'built-in presets exist');
  ok(E.AI_PRESETS.brawler && E.AI_PRESETS.turtle, 'maps.js "ai" personalities registered');
  var cfg = E.aiConfig('hard');
  ok(cfg.breadth === 3 && cfg.replySamples === 2 && cfg.w.noopPenalty === 80,
    'hard preset = breadth 3, 2 reply samples, guards intact');
  var custom = E.aiConfig({ noise: 0, breadth: 2, weights: { advance: 9 } });
  ok(custom.w.advance === 9 && custom.w.attrWin === 500, 'config weights overlay the defaults');
  // a raw config object plans a legal turn
  var st = testBattle(140);
  var plan = E.aiPlanTurn(st, { noise: 0, breadth: 2, replySamples: 1, replyWeight: 0.5, weights: { advance: 9 } });
  ok(plan && st.hands.red.indexOf(plan.cardId) >= 0, 'raw config object produces a plan from the real hand');
  // personality battles run to completion and stay deterministic
  var a = E.simBattle(E.MAPS[4], 4242, 'red', 'brawler', 'turtle');
  var b = E.simBattle(E.MAPS[4], 4242, 'red', 'brawler', 'turtle');
  ok(a.phase === 'battle-over', 'brawler-vs-turtle battle finishes (winner ' + a.battleWinner + ', ' + a.turnNumber + ' turns)');
  ok(a.battleWinner === b.battleWinner && a.turnNumber === b.turnNumber, 'personality battles are deterministic per seed');
  // guardrail: a config that zeroes the anti-degeneracy terms is still legal
  // (Bill may experiment) but the defaults must not lose them
  ok(E.AI_WEIGHTS.noopPenalty === 80 && E.AI_WEIGHTS.antiShuffle === 10, 'anti-degeneracy weights present in defaults');
})();

console.log('== AI dead-turn regression (round 6: hard AI must not skip turn 1) ==');
(function () {
  ['normal', 'hard'].forEach(function (diff) {
    var noops = 0;
    for (var seed = 1; seed <= 6; seed++) {
      var st = testBattle(seed * 17);
      var plan = E.aiPlanTurn(st, diff);
      E.playCard(st, plan.cardId, plan.mode || 'normal');
      var g = 0;
      while (st.phase === 'step' && g++ < 12) {
        var c = plan.choices.shift() || { skip: true };
        try { E.applyStep(st, c); } catch (e) { E.applyStep(st, { skip: true }); }
      }
      var le = st.playLog[st.playLog.length - 1];
      if (le && le.noop) noops++;
    }
    ok(noops === 0, diff + ' AI: 0 turn-1 dead turns across 6 seeds (got ' + noops + ')');
  });
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
  // hopeless for red: 1 turn left, blue has 5 VP of units on the field vs red's
  // none (need 6 incl. the tie that goes to blue), best-case swing is 3/turn,
  // airdrop already spent, nothing within marching range of the blue HQ
  st.decks.red = []; st.discards.red = []; st.hands.red = ['attack_plus1'];
  st.removed.red.push('airdrop');
  st.units['-3,1'] = { type: 'artillery', owner: 'blue' };
  st.units['-2,1'] = { type: 'cavalry', owner: 'blue' };
  var adv = E.concedeAdvised(st, 'red');
  ok(adv && adv.need === 6 && adv.turnsLeft === 1, 'hopeless position advised: ' + JSON.stringify(adv));
  ok(E.concedeAdvised(st, 'blue') === null, 'the winning side is never advised to concede');
  st.units['2,-1'] = { type: 'artillery', owner: 'red' };
  st.units['1,-1'] = { type: 'artillery', owner: 'red' };
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

/* ---------- V1 AI search: orientation-aware trenches + ranked choice APIs ---------- */
(function () {
  console.log('== V1 AI search ==');
  var cmap = E.MAPS.filter(function (m) { return m.shape === 'classic'; })[0];
  ok(!!cmap, 'a classic-shape map exists for the fixture');
  var match = E.newMatch({ seed: 99, maps: [cmap], firstPlayer: 'red' });
  var st = E.newBattle(match);
  // Orientation term: same trench hex, enemy approaching from the east — the
  // east-facing trench must evaluate higher than the west-facing one.
  st.units = { '0,0': { type: 'infantry', owner: 'red' }, '2,0': { type: 'infantry', owner: 'blue' } };
  st.trenches = { '0,0': [{ dirs: [0, 1], owner: 'red' }] };   // faces E+NE (toward 2,0)
  var facing = E.evalState(st, 'red');
  st.trenches = { '0,0': [{ dirs: [3, 4], owner: 'red' }] };   // faces W+SW (away)
  var away = E.evalState(st, 'red');
  ok(facing > away, 'trench facing the live enemy lane outscores facing away (' +
    Math.round(facing) + ' > ' + Math.round(away) + ')');
  ok(typeof E.AI_WEIGHTS.trenchFacing === 'number' && typeof E.AI_WEIGHTS.shortlist === 'number',
    'trenchFacing + shortlist live in AI_WEIGHTS (tunable, personality-overridable)');

  // rankChoices: honest top-K of N for the LLM harness
  var m2 = E.newMatch({ seed: 7, maps: [cmap], firstPlayer: 'red' });
  var st2 = E.newBattle(m2);
  E.playCard(st2, st2.hands.red[0], 'normal'); // starting card -> a step
  var all = E.enumerateChoices(st2);
  var r = E.rankChoices(st2, { k: 4 });
  ok(r.total === all.length, 'rankChoices.total = full legal count (' + r.total + ')');
  ok(r.shown.length <= 4 + 6 + 1, 'top-k plus HQ-relevant forced entries only (' + r.shown.length + ')');
  var sc = r.shown.map(function (x) { return x.score; }).filter(function (x) { return x !== null; });
  var sorted = sc.slice(0, 4).every(function (x, i, a) { return i === 0 || a[i - 1] >= x; });
  ok(sorted, 'shown choices come best-first by heuristic score');
  ok(r.shown.every(function (x) {
    return all.some(function (c) { return JSON.stringify(c) === JSON.stringify(x.choice); });
  }), 'every shown choice is a real legal option');
  var big = E.rankChoices(st2, { k: 99 });
  ok(big.shown.length === all.length, 'k >= N shows the whole list (' + big.shown.length + ')');

  // Round-3 ruling enforced in 1.0: same-type swaps are a hidden skip — illegal.
  var st3 = E.newBattle(E.newMatch({ seed: 5, maps: [cmap], firstPlayer: 'red' }));
  st3.units = {
    '0,0': { type: 'infantry', owner: 'red' }, '1,0': { type: 'infantry', owner: 'red' },
    '0,1': { type: 'cavalry', owner: 'red' }
  };
  // V1 map-sets: the active set IS the pool, one roster for every consumer
  ok(E.MAPSETS.length >= 1 && E.activeMapset() && E.activeMapset().id === 'core7',
    'core7 map-set loaded and active');
  ok(E.mapPool().length === E.activeMapset().maps.length && E.mapPool().length <= E.MAPS.length,
    'mapPool = the active set (' + E.mapPool().length + ' maps)');

  var reps = E.listRepositions(st3, 'red');
  ok(!reps.swaps.some(function (sw) { return st3.units[sw.a].type === st3.units[sw.b].type; }),
    'same-type swaps are not offered (' + reps.swaps.length + ' legal swaps, all cross-type)');
  ok(reps.swaps.length >= 2, 'cross-type swaps still legal (infantry<->cavalry both pairs)');
})();

/* ---------- unit composition & values as content data (WOA-011) ----------
   A units variant in content/units/*.js (exactly one active, the deck/map-set
   pattern) fully replaces the default unit block, so composition (counts), VP,
   and atk/def/sup are all data. The engine snapshots unit stats at require time
   and keeps module-global board state, so each case runs a FRESH engine in a
   child process with the chosen config preloaded. */
(function () {
  console.log('== unit composition & values as content data (WOA-011) ==');
  var cp = require('child_process'), path = require('path');
  // The child loads the real content dirs, then either injects+activates a
  // variant (WOA_TEST_UNITS = its JSON) or flips an existing one active
  // (WOA_TEST_ACTIVATE = its id), then prints E.UNITS / E.PIECE_TOTALS — or the
  // load-time error string if the total-10 guardrail fired.
  var CHILD = 'var fs=require("fs"),path=require("path"),base=process.cwd();' +
    'global.WOA_CONTENT={maps:[],cards:[],decks:[],mapsets:[],units:[]};' +
    '["decks","maps","mapsets","units"].forEach(function(k){var d=path.join(base,"content",k);' +
    'try{fs.readdirSync(d).filter(function(f){return /\\.js$/.test(f)}).sort().forEach(function(f){require(path.join(d,f))})}catch(e){}});' +
    'var vj=process.env.WOA_TEST_UNITS||"",act=process.env.WOA_TEST_ACTIVATE||"";' +
    'if(vj){var v=JSON.parse(vj);global.WOA_CONTENT.units.forEach(function(u){u.active=false});global.WOA_CONTENT.units.push(v);}' +
    'else if(act){global.WOA_CONTENT.units.forEach(function(u){u.active=(u.id===act)});}' +
    'try{var E=require(path.join(base,"engine.js"));process.stdout.write(JSON.stringify({units:E.UNITS,totals:E.PIECE_TOTALS}));}' +
    'catch(e){process.stdout.write(JSON.stringify({error:e.message}));}';
  function runUnits(env) {
    var e = Object.assign({}, process.env, { WOA_TEST_UNITS: '', WOA_TEST_ACTIVATE: '' }, env || {});
    var out = cp.execFileSync(process.execPath, ['-e', CHILD], { cwd: __dirname, env: e }).toString();
    return JSON.parse(out);
  }
  function total(u) { return Object.keys(u).reduce(function (s, t) { return s + (u[t].count || 0); }, 0); }

  // 1) No variant active: the shipped default (maps.js 7/2/1) still resolves, so
  //    the example units file on disk is genuinely inert (golden-diff safety).
  var base = runUnits({});
  ok(!base.error, 'default units load with no active variant (no error)');
  ok(base.units.infantry.count === 7 && base.units.cavalry.count === 2 && base.units.artillery.count === 1,
    'default composition is 7/2/1 (got ' + [base.units.infantry.count, base.units.cavalry.count, base.units.artillery.count].join('/') + ')');
  ok(base.units.infantry.atk === 1 && base.units.artillery.vp === 3, 'default values intact (inf atk 1, art vp 3)');
  ok(base.totals.infantry === 7 && base.totals.cavalry === 2 && base.totals.artillery === 1,
    'PIECE_TOTALS track the default composition');

  // 2) An active variant fully overrides composition + atk/def/sup + vp.
  var variant = { id: '__test_units', name: 'Test', active: true, units: {
    infantry:  { name: 'Infantry',  atk: 2, def: 1, sup: 1, vp: 1, count: 8 },
    cavalry:   { name: 'Cavalry',   atk: 3, def: 0, sup: 0, vp: 2, count: 1 },
    artillery: { name: 'Artillery', atk: 0, def: 2, sup: 2, vp: 5, count: 1 } } };
  var v = runUnits({ WOA_TEST_UNITS: JSON.stringify(variant) });
  ok(!v.error, 'a valid units variant loads (no error)');
  ok(v.units.infantry.count === 8 && v.units.cavalry.count === 1 && total(v.units) === 10,
    'variant composition overrides the default and still totals 10 (8/1/1)');
  ok(v.units.infantry.atk === 2 && v.units.artillery.def === 2 && v.units.artillery.vp === 5,
    'variant atk/def/vp values override the default');
  ok(v.totals.infantry === 8 && v.totals.cavalry === 1, 'PIECE_TOTALS follow the variant composition');

  // 3) Total-10 is enforced at load: a variant summing to 11 throws loudly.
  var bad = { id: '__bad', active: true, units: {
    infantry:  { name: 'Infantry',  atk: 1, def: 1, sup: 1, vp: 1, count: 8 },
    cavalry:   { name: 'Cavalry',   atk: 3, def: 0, sup: 0, vp: 2, count: 2 },
    artillery: { name: 'Artillery', atk: 0, def: 0, sup: 2, vp: 3, count: 1 } } };
  var b = runUnits({ WOA_TEST_UNITS: JSON.stringify(bad) });
  ok(b.error && /10 pieces/.test(b.error), 'a variant that does not total 10 is rejected at load (' + (b.error || 'NO ERROR') + ')');

  // 4) The shipped experimental example (content/units/shock-army.js) resolves
  //    end-to-end when activated, and honours the total-10 guardrail (6/3/1).
  var ex = runUnits({ WOA_TEST_ACTIVATE: 'shock-army' });
  ok(!ex.error, 'shipped shock-army variant loads when activated (no error)');
  ok(ex.units.infantry.count === 6 && ex.units.cavalry.count === 3 && ex.units.artillery.count === 1 && total(ex.units) === 10,
    'shock-army composition is 6/3/1 and totals 10');
})();

/* ---------- index.html script-tag chain matches the on-disk parts ----------
   The browser loads engine/ + ui/ via hand-ordered <script src> tags while
   node loads them by filename sort — this assert is what keeps the two
   orderings from drifting (V1 Seam-Split guard). */
(function () {
  console.log('== index.html script-tag chain ==');
  var fs = require('fs'), path = require('path');
  var html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
  var tags = [];
  html.replace(/<script src="([^"]+)"><\/script>/g, function (m, src) { tags.push(src); return m; });
  function diskSorted(sub) {
    try {
      return fs.readdirSync(path.join(__dirname, sub)).filter(function (f) { return /\.js$/.test(f); })
        .sort().map(function (f) { return sub + '/' + f; });
    } catch (e) { return null; }
  }
  var manIdx = tags.indexOf('content/manifest.js');
  ok(manIdx >= 0, 'content/manifest.js tag present');
  var engineParts = diskSorted('engine');
  var engineTags = tags.filter(function (t) { return /^engine\//.test(t); });
  ok(JSON.stringify(engineTags) === JSON.stringify(engineParts),
    'engine tags = engine/ dir in sorted order (' + engineTags.length + ' parts)');
  ok(engineParts.every(function (t) { return tags.indexOf(t) > manIdx; }),
    'every engine part loads after content/manifest.js');
  var uiParts = diskSorted('ui');
  if (uiParts) {
    var uiTags = tags.filter(function (t) { return /^ui\//.test(t); });
    ok(uiParts.every(function (t) { return uiTags.indexOf(t) >= 0; }) && uiTags.length === uiParts.length,
      'every ui/ file has a tag (' + uiTags.length + ')');
    ok(uiTags[uiTags.length - 1] === 'ui/boot.js', 'ui/boot.js is the last ui tag');
    var lastEngine = tags.indexOf(engineTags[engineTags.length - 1]);
    ok(uiTags.every(function (t) { return tags.indexOf(t) > lastEngine; }), 'ui loads after the engine');
  }
})();

console.log(fails === 0 ? '\nALL TESTS PASSED' : '\n' + fails + ' FAILURES');
process.exit(fails === 0 ? 0 : 1);
/* end */
