#!/usr/bin/env node
/* dev/loop.js — the content-iteration loop ENGINE the #108 workbench drives (#138).
 *
 * Runs the deck loop (the one content kind with a drafter, #116) for N iterations.
 * One iteration:
 *   1. draft/mutate a candidate deck        (dev/deckbuild.js draftSide — LLM or mock)
 *   2. sweep it vs the incumbent            (E.balanceMap over the map roster × a
 *                                            personality panel, folded with R.addAgg)
 *   3. score it against a Temperature       (#109 profile: R.foldPanel gate + balanceScore)
 *   4. adopt or reject vs the incumbent      (soft velocity + direction; deckPoints>72 = the
 *                                            ONE hard reject; Red%/1st% fairness hard-gated)
 *   5. write each skirmish row with its real parent_id = the incumbent it was measured
 *      against (#110), so a trajectory chain exists in logs/woa.db.
 *
 * Seam: over the exported Engine surface + dev/deckbuild.js + dev/db.js + report-model's
 * panel fold. NO game/ engine change. Emits `LOOP_STEP <json>` per iteration (the Run
 * phase's live signal) and one `LOOP_RESULT <json>` at the end (the Results phase's
 * final candidate set) — the same stdout-line contract balance-report uses.
 *
 * Usage: node dev/loop.js [--iters K] [--n S] [--ai P[,P2]] [--profile card] [--mapset id]
 *   node dev/loop.js --iters 6 --n 20 --ai hard --profile card
 * The red-test (node dev/loop.test.js) drives runDeckLoop directly with a mock drafter.
 */
'use strict';

var path = require('path');
var E = require(path.join(__dirname, '..', 'game', 'engine.js'));
var R = require(path.join(__dirname, '..', 'game', 'report-model.js'));
var TEMPS = require(path.join(__dirname, '..', 'game', 'content', 'temperatures.js'));
var deckbuild = require(path.join(__dirname, 'deckbuild.js'));
var db = require(path.join(__dirname, 'db.js'));

// The per-map seed base — the SAME (mi+1)*7919 schedule balance.js/tune-weights sweep
// with, so every loop replays byte-identical skirmishes across the roster.
function mapSeedBase(mi) { return (mi + 1) * 7919; }

// Mean ideal-range balance score across the panel rows (LOWER = healthier games;
// the shared R.balanceScore, temperature-independent by design — the velocity signal).
function panelScore(rows) {
  var s = 0;
  rows.forEach(function (r) { s += R.balanceScore(r.agg, r.done); });
  return rows.length ? s / rows.length : Infinity;
}

/* Sweep one deck (as red) vs an opponent (as blue) across the personality panel and
   the map roster. Returns { rows:[{name,agg,done}], score }. onSkirmish(g1, seedBase,
   st) fires per finished skirmish so the caller writes the DB row with a parent_id. */
function sweep(deck, opponent, panel, maps, n, onSkirmish) {
  var rows = panel.map(function (name) {
    var agg = {}, unfinished = 0;
    maps.forEach(function (map, mi) {
      var seedBase = mapSeedBase(mi);
      var r = E.balanceMap(map, n, {
        diffRed: name, diffBlue: name, seedBase: seedBase,
        decks: { red: deck, blue: opponent },
        onGame: onSkirmish && function (g1, nn, st) { onSkirmish(g1, seedBase, st); }
      });
      R.addAgg(agg, r); unfinished += r.unfinished;
    });
    return { name: name, agg: agg, done: n * maps.length - unfinished };
  });
  return { rows: rows, score: panelScore(rows) };
}

/* Default mock-draft specs — deterministic, DIFFERENT per iteration (a real search
   needs distinct candidates). Cycles pool card ids into (opening, filler) pairs. */
function defaultSpecs(pool, iters) {
  var L = pool.length, out = [];
  for (var i = 0; i < iters; i++) out.push({ opening: pool[i % L].id, filler: pool[(i * 7 + 3) % L].id });
  return out;
}

/* Run the deck loop. opts:
     iters    number of candidates to draft (default 6)
     n        skirmishes per map per personality (default 20)
     panel    AI personality names to sweep across (default ['hard'])
     profile  a Temperature (object) or a profiles key (default 'card')
     maps     map roster (default E.mapPool())
     dbh      an open db handle (default: db.open() — writes to logs/woa.db)
     ask      LLM transport (prompt)->Promise<string>; null => deterministic mock drafts
     specs    per-iteration mock specs (default: cycled from the pool)
     onStep   fn(step) called per iteration (default: prints `LOOP_STEP <json>`)
   Returns { runId, incumbent:{id,deck,score}, history:[step,...] }.
   The starting incumbent is the active deck; candidate i is measured against whatever
   deck currently reigns, and its parent_id in the DB is that incumbent's id. */
async function runDeckLoop(opts) {
  opts = opts || {};
  var iters = opts.iters || 6;
  var n = opts.n || 20;
  var panel = opts.panel || ['hard'];
  var maps = opts.maps || E.mapPool();
  var pool = opts.pool || deckbuild.buildPool();
  var ask = opts.ask || null;
  var specs = opts.specs || defaultSpecs(pool, iters);
  var onStep = opts.onStep || function (s) { process.stdout.write('LOOP_STEP ' + JSON.stringify(s) + '\n'); };
  // Resolve + validate the Temperature (throws on a fairness-loosening profile).
  var profile = (typeof opts.profile === 'object' && opts.profile) || TEMPS.profiles[opts.profile || 'card'];
  if (!profile) throw new Error('loop: unknown profile "' + opts.profile + '" — known: ' + Object.keys(TEMPS.profiles).join(', '));
  TEMPS.validate(profile, profile.name);

  var dbh = opts.dbh || db.open();
  var ownsDb = !opts.dbh;
  var runId = db.insertRun(dbh, {
    version: E.VERSION, kind: 'balance', redAi: panel.join('+'), blueAi: panel.join('+'),
    n: n, tool: 'loop.js', deck: 'loop',
    mapset: (E.activeMapset() && E.activeMapset().id) || 'all', seedBase: 7919,
    notes: 'deck loop, profile ' + profile.name
  });

  // Incumbent 0 = the active deck; give it a stable id for the chain's root.
  var incumbent = Object.assign({}, E.ACTIVE_DECK, { id: E.ACTIVE_DECK.id || 'seed' });
  // Baseline: the reigning deck's own (symmetric) health — the first velocity anchor.
  var incumbentScore = sweep(incumbent, incumbent, panel, maps, n).score;

  var history = [], warnedDb = false;
  for (var i = 1; i <= iters; i++) {
    var parentId = incumbent.id;
    var drafted = await deckbuild.draftSide(pool, ask, specs[i - 1] || specs[specs.length - 1]);
    var candidate = Object.assign({}, drafted.deck, { id: 'cand' + i });
    var deckPoints = E.deckPoints(candidate);
    var overCap = deckPoints > E.DECK_POINTS_CAP;   // the ONE hard reject

    // Sweep candidate vs the reigning incumbent; every skirmish row chains to it.
    var swept = sweep(candidate, incumbent, panel, maps, n, function (g1, seedBase, st) {
      try {
        db.insertSkirmish(dbh, runId, st, E.balanceFP(g1 - 1),
          { seed: E.balanceSeed(seedBase, g1 - 1), version: E.VERSION, parentId: parentId });
      } catch (e) {
        // Persistence is best-effort — never break the loop — but the chain IS the
        // deliverable here, so warn ONCE (not per skirmish): a silent all-NULL DB
        // would look like success, the exact failure the red-test guards against.
        if (!warnedDb) { warnedDb = true; process.stderr.write('loop: skirmish persistence failed — parent_id chain will be incomplete: ' + e.message + '\n'); }
      }
    });
    var fold = R.foldPanel(swept.rows, profile);
    var velocity = incumbentScore - swept.score;    // >0 = candidate makes games healthier

    // Adopt/reject: 72-pt cap is the one hard reject; fairness (Red%/1st%) hard-gated;
    // otherwise SOFT — adopt on positive velocity in the right direction.
    var verdict, reason;
    if (overCap) { verdict = 'reject'; reason = 'over the ' + E.DECK_POINTS_CAP + '-pt cap (' + deckPoints + ')'; }
    else if (!fold.gate.pass) { verdict = 'reject'; reason = 'fairness gate (' + fold.gate.failures.map(function (f) { return f.label; }).join(', ') + ')'; }
    else if (velocity > 0) { verdict = 'adopt'; reason = 'healthier by ' + velocity.toFixed(2); }
    else { verdict = 'reject'; reason = 'no improvement (' + velocity.toFixed(2) + ')'; }

    var step = {
      iter: i, candidate: candidate.id, parent: parentId, fromMock: drafted.fromMock,
      deckPoints: deckPoints, score: Math.round(swept.score * 100) / 100,
      velocity: Math.round(velocity * 100) / 100,
      gatePass: fold.gate.pass, overfit: fold.overfit.map(function (o) { return o.key; }),
      verdict: verdict, reason: reason
    };
    onStep(step);
    history.push(step);

    if (verdict === 'adopt') { incumbent = candidate; incumbentScore = swept.score; }
  }

  var result = { runId: runId, incumbent: { id: incumbent.id, deck: incumbent, score: incumbentScore }, history: history };
  if (ownsDb) db.close(dbh);
  return result;
}

module.exports = { runDeckLoop: runDeckLoop, sweep: sweep, panelScore: panelScore, mapSeedBase: mapSeedBase };

/* ---------------- CLI ---------------- */
if (require.main === module) {
  var args = process.argv.slice(2);
  function opt(name, def) { var i = args.indexOf(name); return i >= 0 ? args[i + 1] : def; }
  var setArg = opt('--mapset', null);
  var maps = !setArg ? E.mapPool()
    : setArg === 'all' ? E.MAPS
    : E.MAPS.filter(function (m) { var s = E.MAPSETS.filter(function (x) { return x.id === setArg; })[0]; return s && (s.maps.indexOf(m.id) >= 0 || s.maps.indexOf(m.name) >= 0); });
  var o = {
    iters: Math.max(1, +opt('--iters', 6) | 0),
    n: Math.max(2, +opt('--n', 20) | 0),
    panel: opt('--ai', 'hard').split(','),
    profile: opt('--profile', 'card'),
    maps: maps
  };
  console.log('loop: ' + o.iters + ' deck iterations, ' + o.n + ' skirmishes/map/personality, panel [' +
    o.panel.join(', ') + '], ' + maps.length + ' maps, "' + o.profile + '" profile\n');
  runDeckLoop(o).then(function (res) {
    var adopted = res.history.filter(function (s) { return s.verdict === 'adopt'; }).length;
    console.log('\nLOOP_RESULT ' + JSON.stringify({
      runId: res.runId, incumbent: res.incumbent.id, score: Math.round(res.incumbent.score * 100) / 100,
      adopted: adopted, iterations: res.history.length,
      candidates: res.history.map(function (s) { return { id: s.candidate, verdict: s.verdict, score: s.score }; })
    }));
    console.log('\n' + adopted + ' of ' + res.history.length + ' candidates adopted. Chain persisted to logs/woa.db (run ' + res.runId + ').');
  }).catch(function (e) { console.error(e); process.exit(1); });
}
