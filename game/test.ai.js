/* Auto-split from game/test.js (ADR-0003: node:test). Subsystem: ai.
   Frozen-API entry game/test.js delegates here; run this file directly with
   `node game/test.ai.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, testSkirmish } = require('./test.helpers.js');

test('Field Marshal AI & skirmish sim', () => {
(function () {
  var t0 = Date.now();
  var st = E.simSkirmish(E.MAPS[0], 4242, 'red', 'hard', 'normal');
  assert.ok(st.phase === 'skirmish-over', 'hard-vs-normal skirmish finishes (winner ' + st.skirmishWinner + ', ' + st.turnNumber + ' turns)');
  console.log('  (hard-AI skirmish took ' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
  var r = E.balanceMap(E.MAPS[4], 4, { seedBase: 11 });
  assert.ok(r.redWins <= 4 && r.turns > 0 && r.unfinished === 0, 'balanceMap aggregates: ' + JSON.stringify({ red: r.redWins, first: r.firstWins, hq: r.hqWins }));
  var a = E.simSkirmish(E.MAPS[2], 777, 'red', 'normal', 'normal');
  var b = E.simSkirmish(E.MAPS[2], 777, 'red', 'normal', 'normal');
  assert.ok(a.skirmishWinner === b.skirmishWinner && a.turnNumber === b.turnNumber, 'simulation is deterministic per seed');
})();
});

test('attrition victory (surviving units on the board)', () => {
(function () {
  // Drain blue's card pool so red's next completed turn triggers attrition.
  function drainBlue(st) {
    st.decks.blue = []; st.discards.blue = []; st.hands.blue = [];
    st.firstTurnDone.blue = true; // or drawHand would gift the starting card
  }
  // Kills don't score: blue killed 5 VP worth, but red has more ON the board.
  var st = testSkirmish(111);
  st.units['2,-1'] = { type: 'artillery', owner: 'red' };  // red fields 3 VP
  st.units['-3,1'] = { type: 'infantry', owner: 'blue' };  // blue fields 1 VP
  st.vp.blue = 5;
  drainBlue(st);
  st.hands.red = ['attack_plus1']; // no legal attack: resolves to nothing, ends the turn
  E.playCard(st, 'attack_plus1');
  assert.ok(st.phase === 'skirmish-over' && st.skirmishWinner === 'red' && st.winType === 'attrition',
    'attrition counts surviving units, not kills (red wins 3-1 despite 0-5 in kills)');
  assert.ok(st.log.some(function (l) { return l.msg.indexOf('3 VP vs 1 VP of surviving units') >= 0; }),
    'journal reports the surviving-unit scores');
  assert.ok(E.fieldScore(st, 'red') === 3 && E.fieldScore(st, 'blue') === 1, 'fieldScore reads the board');

  // Undeployed reserves count for nothing: blue's full reserve loses to one fielded infantry.
  var st2 = testSkirmish(112);
  st2.units['2,-1'] = { type: 'infantry', owner: 'red' };
  drainBlue(st2);
  st2.hands.red = ['attack_plus1'];
  E.playCard(st2, 'attack_plus1');
  assert.ok(st2.skirmishWinner === 'red', 'undeployed reserves count for nothing');

  // Bare-board tie still goes to the second player.
  var st3 = testSkirmish(113);
  drainBlue(st3);
  st3.hands.red = ['attack_plus1'];
  E.playCard(st3, 'attack_plus1');
  assert.ok(st3.skirmishWinner === st3.second && st3.skirmishWinner === 'blue', '0-0 tie goes to the second player');
})();
});

test('behaviour counters (balance-lab metrics)', () => {
(function () {
  var st = testSkirmish(120);
  E.playCard(st, 'deploy_inf_start');
  E.applyStep(st, { hex: E.stepOptions(st).targets[0] });
  assert.ok(st.stats.deploys === 1, 'deploy increments stats.deploys');
  var r = E.balanceMap(E.MAPS[0], 2, { seedBase: 5 });
  // deploys (Attack/Swap share), the attrition slice (attritionEndings/
  // attritionKillTail for Tie%/Drag) and the HQ slice (hqEndings/reserveEndRedHQ/
  // reserveEndBlueHQ for Reserves) join the agg.
  ['attacks', 'swaps', 'marches', 'deploys', 'zeroKill', 'tiebreak', 'firstBloodGames', 'controlGames', 'deployedShare',
   'reserveEndRed', 'reserveEndBlue', 'killTail', 'leadChanges',
   'attritionEndings', 'attritionKillTail', 'hqEndings', 'reserveEndRedHQ', 'reserveEndBlueHQ']
    .forEach(function (k) { assert.ok(k in r, 'balanceMap reports ' + k); });
  assert.ok(r.killTail >= 0 && r.killTail <= r.turns, 'kill-less tail within [0, turns] (got ' + r.killTail + '/' + r.turns + ')');
  // the attrition slice is a subset of finished skirmishes: its count + kill-tail
  // sum never exceed the pooled reads (attritionKillTail is pooled killTail
  // minus the HQ-ending tails).
  assert.ok(r.attritionEndings >= 0 && r.attritionEndings <= (r.n - r.unfinished), 'attritionEndings within [0, done]');
  assert.ok(r.attritionKillTail >= 0 && r.attritionKillTail <= r.killTail, 'attritionKillTail ≤ pooled killTail (HQ tails excluded)');
  assert.ok(r.hqEndings + r.attritionEndings <= (r.n - r.unfinished), 'HQ + attrition endings never exceed finished skirmishes');
  assert.ok(r.leadChanges >= 0, 'lead changes non-negative (got ' + r.leadChanges + ')');
  // reserveEndRed/Blue are the per-side split of the SAME reserves-at-end read
  // deployedShare folds (both accumulate only over finished skirmishes) — they
  // must reconcile: deployedShare = done - 0.5*(reserveEndRed + reserveEndBlue).
  var done = r.n - r.unfinished;
  assert.ok(r.reserveEndRed >= 0 && r.reserveEndBlue >= 0, 'reserveEndRed/Blue are non-negative');
  assert.ok(Math.abs(r.deployedShare - (done - 0.5 * (r.reserveEndRed + r.reserveEndBlue))) < 1e-9,
    'reserveEndRed/Blue reconcile with deployedShare (same reserves-at-end read, split by side)');
})();
});

test('metrics-v2 trace capture (per-play trace + units fold)', () => {
(function () {
  var VALID_A = { deploy: 1, attack: 1, swap: 1, march: 1 };
  var seeds = [4242, 5150, 8181, 9091, 1212];
  var totalAtkEntries = 0, totalDeployEntries = 0, totalKillSum = 0, totalDieSum = 0, totalDieTSum = 0, totalLd = 0, totalPlays = 0;
  seeds.forEach(function (seed) {
    var st = E.simSkirmish(E.MAPS[seed % E.MAPS.length], seed, 'red', 'hard', 'hard');
    assert.ok(st.phase === 'skirmish-over', 'seed ' + seed + ': skirmish finishes (' + st.turnNumber + ' turns)');
    var killSum = 0, dieSum = 0, dieTSum = 0;
    st.playLog.forEach(function (e) {
      totalPlays++;
      assert.ok(!e.a || VALID_A[e.a], 'trace entry a is deploy|attack|swap|march or absent (got ' + e.a + ')');
      if (e.a === 'attack') { totalAtkEntries++; killSum += e.k || 0; assert.ok(!!e.h, 'attack entry carries h (target hex)'); }
      if (e.a === 'deploy') { totalDeployEntries++; assert.ok(!!e.u, 'deploy entry carries u (unit type)'); assert.ok(!!e.h, 'deploy entry carries h'); }
      if (e.a === 'swap' || e.a === 'march') assert.ok(!!e.h, e.a + ' entry carries h');
      if (e.ld) totalLd++;
      // untouched pre-existing fields still present (capture-only, no field removed)
      assert.ok(e.p === 'red' || e.p === 'blue', 'entry keeps its original p field');
      assert.ok(typeof e.turn === 'number', 'entry keeps its original turn field');
    });
    Object.keys(E.UNITS).forEach(function (t) {
      var u = st.unitMetrics[t];
      assert.ok(u && Array.isArray(u.dep) && typeof u.atk === 'number' && typeof u.abs === 'number' &&
        typeof u.kill === 'number' && typeof u.die === 'number',
        'seed ' + seed + ': unitMetrics.' + t + ' has {dep,atk,abs,kill,die} (' + JSON.stringify(u) + ')');
      dieSum += u.die;
      u.dep.forEach(function (turn) { assert.ok(turn >= 1 && turn <= st.turnNumber, t + ' dep turn within skirmish range'); });
      // dieT is a death-TURN list, symmetric to dep and equal-length to die.
      assert.ok(Array.isArray(u.dieT) && u.dieT.length === u.die,
        'seed ' + seed + ': unitMetrics.' + t + '.dieT is an array with one entry per death (' + (u.dieT || []).length + ' == ' + u.die + ')');
      u.dieT.forEach(function (turn) { assert.ok(turn >= 1 && turn <= st.turnNumber, t + ' dieT turn within skirmish range'); });
      dieTSum += u.dieT.length;
    });
    totalKillSum += killSum; totalDieSum += dieSum; totalDieTSum += dieTSum;
    assert.ok(killSum === dieSum, 'seed ' + seed + ': sum of k across attack entries == sum of units[*].die (' +
      killSum + ' == ' + dieSum + ')');
    assert.ok(dieTSum === dieSum, 'seed ' + seed + ': sum of units[*].dieT.length == sum of units[*].die (' +
      dieTSum + ' == ' + dieSum + ')');
    var totalAtkByType = 0;
    Object.keys(E.UNITS).forEach(function (t) { totalAtkByType += st.unitMetrics[t].atk; });
    assert.ok(totalAtkByType === st.stats.attacks, 'seed ' + seed + ': sum of unitMetrics[*].atk == stats.attacks (' +
      totalAtkByType + ' == ' + st.stats.attacks + ')');
  });
  assert.ok(totalAtkEntries > 0 && totalDeployEntries > 0, 'trace produced attack and deploy entries across seeds (' +
    totalAtkEntries + ' atk / ' + totalDeployEntries + ' deploy of ' + totalPlays + ' plays)');
  assert.ok(totalLd > 0, 'some plays record ld (leader after turn) once a lead is established (' + totalLd + '/' + totalPlays + ')');
  assert.ok(totalKillSum === totalDieSum, 'fleet-wide: sum of k across attack entries == total kills == sum of units[*].die (' +
    totalKillSum + ' == ' + totalDieSum + ')');
  assert.ok(totalDieTSum === totalDieSum && totalDieTSum > 0, 'fleet-wide: dieT capture produced ' + totalDieTSum + ' death-turn entries, matching total deaths');
})();
});

test('AI personalities are data', () => {
(function () {
  assert.ok(E.AI_PRESETS.easy && E.AI_PRESETS.normal && E.AI_PRESETS.hard, 'built-in presets exist');
  assert.ok(E.AI_PRESETS.brawler && E.AI_PRESETS.turtle, 'maps.js "ai" personalities registered');
  var cfg = E.aiConfig('hard');
  assert.ok(cfg.breadth === 3 && cfg.replySamples === 2 && cfg.w.noopPenalty === 80,
    'hard preset = breadth 3, 2 reply samples, guards intact');
  var custom = E.aiConfig({ noise: 0, breadth: 2, weights: { advance: 9 } });
  assert.ok(custom.w.advance === 9 && custom.w.attrWin === 500, 'config weights overlay the defaults');
  // a raw config object plans a legal turn
  var st = testSkirmish(140);
  var plan = E.aiPlanTurn(st, { noise: 0, breadth: 2, replySamples: 1, replyWeight: 0.5, weights: { advance: 9 } });
  assert.ok(plan && st.hands.red.indexOf(plan.cardId) >= 0, 'raw config object produces a plan from the real hand');
  // personality skirmishes run to completion and stay deterministic
  var a = E.simSkirmish(E.MAPS[4], 4242, 'red', 'brawler', 'turtle');
  var b = E.simSkirmish(E.MAPS[4], 4242, 'red', 'brawler', 'turtle');
  assert.ok(a.phase === 'skirmish-over', 'brawler-vs-turtle skirmish finishes (winner ' + a.skirmishWinner + ', ' + a.turnNumber + ' turns)');
  assert.ok(a.skirmishWinner === b.skirmishWinner && a.turnNumber === b.turnNumber, 'personality skirmishes are deterministic per seed');
  // guardrail: a config that zeroes the anti-degeneracy terms is still legal
  // (Bill may experiment) but the defaults must not lose them
  assert.ok(E.AI_WEIGHTS.noopPenalty === 80 && E.AI_WEIGHTS.antiShuffle === 10, 'anti-degeneracy weights present in defaults');
})();
});

test('AI dead-turn regression (hard AI must not skip turn 1)', () => {
(function () {
  ['normal', 'hard'].forEach(function (diff) {
    var noops = 0;
    for (var seed = 1; seed <= 6; seed++) {
      var st = testSkirmish(seed * 17);
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
    assert.ok(noops === 0, diff + ' AI: 0 turn-1 dead turns across 6 seeds (got ' + noops + ')');
  });
})();
});

test('concession', () => {
(function () {
  var st = testSkirmish(88);
  E.concede(st, 'red');
  assert.ok(st.phase === 'skirmish-over' && st.skirmishWinner === 'blue' && st.winType === 'concession',
    'conceding hands the skirmish to the enemy');
  assert.ok(st.match.wins.blue === 1 && st.match.lastLoser === 'red', 'match bookkeeping matches a normal loss');
  assert.ok(st.log.some(function (l) { return l.msg.indexOf('concedes the field') >= 0; }), 'concession reaches the journal');
})();
});

test('concede advisory (foregone-conclusion heuristic)', () => {
(function () {
  var st = testSkirmish(99);
  assert.ok(E.concedeAdvised(st, 'red') === null, 'fresh skirmish: no advisory (Airdrop HQ snipe still possible)');
  // hopeless for red: 1 turn left, blue has 5 VP of units on the field vs red's
  // none (need 6 incl. the tie that goes to blue), best-case swing is 3/turn,
  // airdrop already spent, nothing within marching range of the blue HQ
  st.decks.red = []; st.discards.red = []; st.hands.red = ['attack_plus1'];
  st.removed.red.push('airdrop');
  st.units['-3,1'] = { type: 'artillery', owner: 'blue' };
  st.units['-2,1'] = { type: 'cavalry', owner: 'blue' };
  var adv = E.concedeAdvised(st, 'red');
  assert.ok(adv && adv.need === 6 && adv.turnsLeft === 1, 'hopeless position advised: ' + JSON.stringify(adv));
  assert.ok(E.concedeAdvised(st, 'blue') === null, 'the winning side is never advised to concede');
  st.units['2,-1'] = { type: 'artillery', owner: 'red' };
  st.units['1,-1'] = { type: 'artillery', owner: 'red' };
  assert.ok(E.concedeAdvised(st, 'red') === null, 'a leading player is never advised to concede');
})();
});

test('AI vs AI full matches', () => {
var seeds = [1, 2, 3, 4, 5, 6, 7, 8];
var hqWins = 0, attrWins = 0, maxTurns = 0;
seeds.forEach(function (seed) {
  var match = E.newMatch({ seed: seed });
  var skirmishes = 0;
  while (!match.winner && skirmishes < 12) {
    var st = E.newSkirmish(match);
    E.playToEnd(st, { decide: function (s) { return E.aiPlanTurn(s, 'normal'); } });
    if (st.phase !== 'skirmish-over') assert.fail('skirmish did not finish (seed ' + seed + ')');
    if (st.winType === 'hq') hqWins++; else attrWins++;
    maxTurns = Math.max(maxTurns, st.turnNumber);
    skirmishes++;
  }
  assert.ok(match.winner === 'red' || match.winner === 'blue', 'seed ' + seed + ': match finished, winner=' + match.winner + ' (' + match.wins.red + '-' + match.wins.blue + ', ' + skirmishes + ' skirmishes)');
});
console.log('  skirmish endings: ' + hqWins + ' HQ captures, ' + attrWins + ' attrition; longest skirmish ' + maxTurns + ' turns');
});

test('fsTimeline: one [fsRed,fsBlue] pair per completed turn', () => {
(function () {
  // A REAL (non-sim) skirmish, played the same way the AI-vs-AI loop above
  // does — st here is never cloneForSim'd (that's the AI search's hot-loop
  // clone, engine/05-ai.js), so st.fsTimeline is the live capture engine/
  // 04-skirmish.js pushes to every completed turn (endTurn), not the stripped
  // copy a search clone carries.
  var st = E.newSkirmish(E.newMatch({ seed: 42 }));
  E.playToEnd(st, { decide: function (s) { return E.aiPlanTurn(s, 'normal'); } });
  assert.ok(st.phase === 'skirmish-over', 'fsTimeline fixture skirmish finished (seed 42)');
  assert.ok(Array.isArray(st.fsTimeline) && st.fsTimeline.length === st.turnNumber - 1,
    'fsTimeline has one [fsRed,fsBlue] pair per completed turn (' + st.fsTimeline.length +
    ' entries == turnNumber-1 = ' + (st.turnNumber - 1) + ')');
  assert.ok(st.fsTimeline.every(function (p) { return Array.isArray(p) && p.length === 2 && typeof p[0] === 'number' && typeof p[1] === 'number'; }),
    'every fsTimeline entry is a [number, number] pair');
})();
});

test('V1 AI search', () => {
(function () {
  var cmap = E.MAPS.filter(function (m) { return m.shape === 'classic'; })[0];
  assert.ok(!!cmap, 'a classic-shape map exists for the fixture');
  var match = E.newMatch({ seed: 99, maps: [cmap], firstPlayer: 'red' });
  var st = E.newSkirmish(match);
  // Orientation term: same trench hex, enemy approaching from the east — the
  // east-facing trench must evaluate higher than the west-facing one.
  st.units = { '0,0': { type: 'infantry', owner: 'red' }, '2,0': { type: 'infantry', owner: 'blue' } };
  st.trenches = { '0,0': [{ dirs: [0, 1], owner: 'red' }] };   // faces E+NE (toward 2,0)
  var facing = E.evalState(st, 'red');
  st.trenches = { '0,0': [{ dirs: [3, 4], owner: 'red' }] };   // faces W+SW (away)
  var away = E.evalState(st, 'red');
  assert.ok(facing > away, 'trench facing the live enemy lane outscores facing away (' +
    Math.round(facing) + ' > ' + Math.round(away) + ')');
  assert.ok(typeof E.AI_WEIGHTS.trenchFacing === 'number' && typeof E.AI_WEIGHTS.shortlist === 'number',
    'trenchFacing + shortlist live in AI_WEIGHTS (tunable, personality-overridable)');

  // rankChoices: honest top-K of N for the LLM harness
  var m2 = E.newMatch({ seed: 7, maps: [cmap], firstPlayer: 'red' });
  var st2 = E.newSkirmish(m2);
  E.playCard(st2, st2.hands.red[0], 'normal'); // starting card -> a step
  var all = E.enumerateChoices(st2);
  var r = E.rankChoices(st2, { k: 4 });
  assert.ok(r.total === all.length, 'rankChoices.total = full legal count (' + r.total + ')');
  assert.ok(r.shown.length <= 4 + 6 + 1, 'top-k plus HQ-relevant forced entries only (' + r.shown.length + ')');
  var sc = r.shown.map(function (x) { return x.score; }).filter(function (x) { return x !== null; });
  var sorted = sc.slice(0, 4).every(function (x, i, a) { return i === 0 || a[i - 1] >= x; });
  assert.ok(sorted, 'shown choices come best-first by heuristic score');
  assert.ok(r.shown.every(function (x) {
    return all.some(function (c) { return JSON.stringify(c) === JSON.stringify(x.choice); });
  }), 'every shown choice is a real legal option');
  var big = E.rankChoices(st2, { k: 99 });
  assert.ok(big.shown.length === all.length, 'k >= N shows the whole list (' + big.shown.length + ')');

  // same-type swaps are a hidden skip — illegal.
  var st3 = E.newSkirmish(E.newMatch({ seed: 5, maps: [cmap], firstPlayer: 'red' }));
  st3.units = {
    '0,0': { type: 'infantry', owner: 'red' }, '1,0': { type: 'infantry', owner: 'red' },
    '0,1': { type: 'cavalry', owner: 'red' }
  };
  // V1 map-sets: the active set IS the pool, one roster for every consumer
  assert.ok(E.MAPSETS.length >= 1 && E.activeMapset() && E.activeMapset().id === 'core7',
    'core7 map-set loaded and active');
  assert.ok(E.mapPool().length === E.activeMapset().maps.length && E.mapPool().length <= E.MAPS.length,
    'mapPool = the active set (' + E.mapPool().length + ' maps)');

  var reps = E.listRepositions(st3, 'red');
  assert.ok(!reps.swaps.some(function (sw) { return st3.units[sw.a].type === st3.units[sw.b].type; }),
    'same-type swaps are not offered (' + reps.swaps.length + ' legal swaps, all cross-type)');
  assert.ok(reps.swaps.length >= 2, 'cross-type swaps still legal (infantry<->cavalry both pairs)');
})();
});

test('unit composition & values as content data', () => {
(function () {
  var cp = require('child_process'), path = require('path');
  // The child loads the real content dirs, then either injects+activates a
  // variant (WOA_TEST_UNITS = its JSON) or flips an existing one active
  // (WOA_TEST_ACTIVATE = its id), then prints E.UNITS / E.PIECE_TOTALS — or the
  // load-time error string if the total-10 guardrail fired.
  var CHILD = 'var fs=require("fs"),path=require("path"),base=process.cwd();' +
    'global.WOA_CONTENT={maps:[],cards:[],decks:[],mapsets:[],units:[]};' +
    '["cards","decks","maps","mapsets","units"].forEach(function(k){var d=path.join(base,"content",k);' +
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
  assert.ok(!base.error, 'default units load with no active variant (no error)');
  assert.ok(base.units.infantry.count === 7 && base.units.cavalry.count === 2 && base.units.artillery.count === 1,
    'default composition is 7/2/1 (got ' + [base.units.infantry.count, base.units.cavalry.count, base.units.artillery.count].join('/') + ')');
  assert.ok(base.units.infantry.atk === 1 && base.units.artillery.vp === 3, 'default values intact (inf atk 1, art vp 3)');
  assert.ok(base.totals.infantry === 7 && base.totals.cavalry === 2 && base.totals.artillery === 1,
    'PIECE_TOTALS track the default composition');

  // 2) An active variant fully overrides composition + atk/def/sup + vp.
  var variant = { id: '__test_units', name: 'Test', active: true, units: {
    infantry:  { name: 'Infantry',  atk: 2, def: 1, sup: 1, vp: 1, count: 8 },
    cavalry:   { name: 'Cavalry',   atk: 3, def: 0, sup: 0, vp: 2, count: 1 },
    artillery: { name: 'Artillery', atk: 0, def: 2, sup: 2, vp: 5, count: 1 } } };
  var v = runUnits({ WOA_TEST_UNITS: JSON.stringify(variant) });
  assert.ok(!v.error, 'a valid units variant loads (no error)');
  assert.ok(v.units.infantry.count === 8 && v.units.cavalry.count === 1 && total(v.units) === 10,
    'variant composition overrides the default and still totals 10 (8/1/1)');
  assert.ok(v.units.infantry.atk === 2 && v.units.artillery.def === 2 && v.units.artillery.vp === 5,
    'variant atk/def/vp values override the default');
  assert.ok(v.totals.infantry === 8 && v.totals.cavalry === 1, 'PIECE_TOTALS follow the variant composition');

  // 3) Total-10 is enforced at load: a variant summing to 11 throws loudly.
  var bad = { id: '__bad', active: true, units: {
    infantry:  { name: 'Infantry',  atk: 1, def: 1, sup: 1, vp: 1, count: 8 },
    cavalry:   { name: 'Cavalry',   atk: 3, def: 0, sup: 0, vp: 2, count: 2 },
    artillery: { name: 'Artillery', atk: 0, def: 0, sup: 2, vp: 3, count: 1 } } };
  var b = runUnits({ WOA_TEST_UNITS: JSON.stringify(bad) });
  assert.ok(b.error && /10 pieces/.test(b.error), 'a variant that does not total 10 is rejected at load (' + (b.error || 'NO ERROR') + ')');

  // 4) The shipped experimental example (content/units/shock-army.js) resolves
  //    end-to-end when activated, and honours the total-10 guardrail (6/3/1).
  var ex = runUnits({ WOA_TEST_ACTIVATE: 'shock-army' });
  assert.ok(!ex.error, 'shipped shock-army variant loads when activated (no error)');
  assert.ok(ex.units.infantry.count === 6 && ex.units.cavalry.count === 3 && ex.units.artillery.count === 1 && total(ex.units) === 10,
    'shock-army composition is 6/3/1 and totals 10');
})();
});
