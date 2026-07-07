#!/usr/bin/env node
/* dev/tune-weights.js — offline AI_WEIGHTS sweeper (V1 ai-search-and-tuning).

   Coordinate-descent over selected weight keys: for each key, try a few
   multipliers of the current value (both AIs get the candidate weights),
   measure fitness over a map subset, keep the best, repeat. Fitness is the
   mean of dev/balance-report.js's balance score (lower = fairer + more
   back-and-forth) plus guardrail checks against the anti-degeneracy bands.

   SUGGESTIONS ONLY — this tool never writes engine files. Bill decides.
   (Engine guardrail: E.AI_WEIGHTS is exported by reference — we only ever
   pass candidate weights through raw {weights:{...}} configs, never mutate.)

   Usage: node dev/tune-weights.js [options]
     --keys a,b,c   weights to sweep (default: advance,enemyDist,trenchHome,
                    trenchFacing,fsDiff,unitReserve,myThreatKill,threatTie)
     --maps f1,f2   name filters for the map subset (default: 6 spread maps)
     --n <k>        battles per map per candidate (default 16)
     --ai <preset>  base personality both sides play (default normal — fast;
                    use hard for the real thing, ~8x slower)
     --scales s,... multipliers per key (default 0.5,0.75,1.5,2)
     --iters <k>    coordinate-descent passes over the key list (default 1)

   Every candidate replays the SAME seed schedule (common random numbers), so
   fitness differences are the weights' doing, not the draw's. */
'use strict';

var path = require('path');
var E = require(path.join(__dirname, '..', 'game', 'engine.js'));
// Fitness = the shared balance score (game/report-model.js) — the SAME
// implementation dev/balance-report.js ranks maps with, not a drifting copy.
var R = require(path.join(__dirname, '..', 'game', 'report-model.js'));
var pct = R.pct, balanceScore = R.balanceScore;

function parseArgs(argv) {
  var a = {
    keys: ['advance', 'enemyDist', 'trenchHome', 'trenchFacing', 'fsDiff', 'unitReserve', 'myThreatKill', 'threatTie'],
    maps: null, n: 16, ai: 'normal', scales: [0.5, 0.75, 1.5, 2], iters: 1
  };
  for (var i = 2; i < argv.length; i++) {
    var k = argv[i];
    if (k === '--keys') a.keys = argv[++i].split(',');
    else if (k === '--maps') a.maps = argv[++i].split(',');
    else if (k === '--n') a.n = Math.max(2, +argv[++i] | 0);
    else if (k === '--ai') a.ai = argv[++i];
    else if (k === '--scales') a.scales = argv[++i].split(',').map(Number);
    else if (k === '--iters') a.iters = Math.max(1, +argv[++i] | 0);
    else { console.error('unknown option ' + k); process.exit(1); }
  }
  a.keys.forEach(function (key) {
    if (typeof E.AI_WEIGHTS[key] !== 'number') { console.error('unknown weight "' + key + '" — known: ' + Object.keys(E.AI_WEIGHTS).join(', ')); process.exit(1); }
  });
  if (!E.AI_PRESETS[a.ai]) { console.error('unknown AI "' + a.ai + '"'); process.exit(1); }
  return a;
}

// default subset: a spread of shapes/terrain so tuning doesn't overfit one map
var DEFAULT_MAPS = ['saber', 'frontier', 'cockpit', 'riverbend', 'narrows', 'marshes'];

function pickMaps(filters) {
  var out = [];
  (filters || DEFAULT_MAPS).forEach(function (f) {
    var m = E.MAPS.filter(function (mm) { return mm.name.toLowerCase().indexOf(f.toLowerCase()) >= 0; })[0];
    if (m && out.indexOf(m) < 0) out.push(m);
  });
  return out.length ? out : E.MAPS.slice(0, 6);
}

// One measurement: both sides play `base` personality with `weights` overrides.
function measure(maps, n, base, weights) {
  var preset = E.AI_PRESETS[base];
  var cfg = Object.assign({}, preset, { weights: Object.assign({}, preset.weights || {}, weights) });
  var scores = [], G = { attacks: 0, swaps: 0, zeroKill: 0, tiebreak: 0, games: 0 };
  maps.forEach(function (map, mi) {
    var r = E.balanceMap(map, n, { diffRed: cfg, diffBlue: cfg, seedBase: (mi + 1) * 7919 });
    var done = Math.max(1, n - r.unfinished);
    scores.push(balanceScore(r, done));
    G.attacks += r.attacks; G.swaps += r.swaps; G.zeroKill += r.zeroKill; G.tiebreak += r.tiebreak; G.games += done;
  });
  return {
    fitness: scores.reduce(function (s, x) { return s + x; }, 0) / scores.length,
    atk: G.attacks / G.games, swp: G.swaps / G.games,
    zk: pct(G.zeroKill, G.games), tie: pct(G.tiebreak, G.games)
  };
}

// Guardrails: the round-5/6 anti-degeneracy bands. A candidate that "wins" on
// fitness while breaking these is a regression wearing a good score.
function guardrails(m, base) {
  var flags = [];
  if (m.atk < base.atk * 0.7) flags.push('attacks collapsed (' + m.atk.toFixed(1) + ' vs ' + base.atk.toFixed(1) + ')');
  if (m.swp > base.swp * 1.5) flags.push('swap-dancing up (' + m.swp.toFixed(1) + ' vs ' + base.swp.toFixed(1) + ')');
  if (m.zk > Math.max(5, base.zk * 2)) flags.push('zero-kill battles up (' + m.zk.toFixed(0) + '%)');
  return flags;
}

function run() {
  var a = parseArgs(process.argv);
  var maps = pickMaps(a.maps);
  console.log('tune-weights: ' + a.ai + ' AI, ' + maps.length + ' maps (' + maps.map(function (m) { return m.name; }).join(', ') + '), n=' + a.n + '/map/candidate');
  console.log('sweeping: ' + a.keys.join(', ') + '  scales: ' + a.scales.join(','));

  var t0 = Date.now();
  var current = {}; // the working override set (starts empty = engine defaults)
  var base = measure(maps, a.n, a.ai, current);
  console.log('baseline fitness ' + base.fitness.toFixed(1) +
    '  (atk ' + base.atk.toFixed(1) + ' swp ' + base.swp.toFixed(1) + ' 0kill ' + base.zk.toFixed(0) + '% tie ' + base.tie.toFixed(0) + '%)');

  var suggestions = [];
  for (var pass = 0; pass < a.iters; pass++) {
    a.keys.forEach(function (key) {
      var cur = current[key] !== undefined ? current[key] : E.AI_WEIGHTS[key];
      var best = null;
      a.scales.forEach(function (sc) {
        var val = Math.round(cur * sc * 100) / 100;
        if (val === cur) return;
        var cand = Object.assign({}, current); cand[key] = val;
        var m = measure(maps, a.n, a.ai, cand);
        var flags = guardrails(m, base);
        process.stdout.write('  ' + key + '=' + val + ' -> ' + m.fitness.toFixed(1) + (flags.length ? '  [' + flags.join('; ') + ']' : '') + '\n');
        if (!flags.length && (!best || m.fitness < best.fitness)) best = { val: val, fitness: m.fitness, m: m };
      });
      var incumbent = measure(maps, a.n, a.ai, current).fitness;
      if (best && best.fitness < incumbent - 0.5) { // require a real margin, not noise
        current[key] = best.val;
        suggestions.push({ key: key, from: E.AI_WEIGHTS[key], to: best.val, fitness: best.fitness });
        console.log('  * keeping ' + key + '=' + best.val + ' (fitness ' + incumbent.toFixed(1) + ' -> ' + best.fitness.toFixed(1) + ')');
      }
    });
  }

  console.log('\n==== SUGGESTIONS (' + ((Date.now() - t0) / 1000 / 60).toFixed(1) + ' min) ====');
  if (!suggestions.length) {
    console.log('No change beat the current weights by a real margin on this subset — the defaults hold.');
  } else {
    console.log('| weight | current | suggested | fitness after |');
    console.log('|---|--:|--:|--:|');
    suggestions.forEach(function (s) {
      console.log('| ' + s.key + ' | ' + s.from + ' | ' + s.to + ' | ' + s.fitness.toFixed(1) + ' |');
    });
    console.log('\nVerify on the full roster before adopting: node game/balance.js 60 ' + a.ai);
    console.log('Adopt by editing AI_WEIGHTS in game/engine/05-ai.js (and bump the rules version —');
    console.log('weight changes shift the data baseline). Suggestions only — Bill decides.');
  }
}
run();
