#!/usr/bin/env node
/* dev/balance-report.js — run a balance report and SAVE it as markdown under
   logs/reports/balance/<rules-version>/ (Feedback Round 4). balance.js only
   prints to the terminal; this mirrors the in-browser Balance Dashboard's saved
   format so review-reports reads one shape for CLI and GUI runs alike.

   PERSISTENT DATA (Round 4): by default each run FOLDS into a per-version
   accumulator (logs/reports/balance/<version>/accumulated.json) so more runs =
   more data, and the saved report reflects every battle to date on this rules
   version. The accumulator persists until the version bumps or you reset it.

   Usage: node dev/balance-report.js [n] [diffRed] [diffBlue] [name-filter...]
     n         battles per map THIS run (default 60)
     diffRed   AI for red  (default hard) — easy|normal|hard or a maps.js "ai" row
     diffBlue  AI for blue (default = diffRed)
     filter    only maps whose name contains this (custom maps included)
     --fresh   reset the accumulator to just this run (manual data reset)
     --once    report this run only; do not read or write the accumulator
     --stdout  print the markdown instead of writing a file
     --quiet   suppress the progress dots
     --mapset <id>  run a specific map-set (default: the ACTIVE set's pool;
               'all' = every map on disk)
     --deck <id>    report on content/decks/<id>.js instead of the ACTIVE deck
     --units <id>   report with content/units/<id>.js unit stats (composition +
               atk/def/sup/vp) instead of the maps.js default
     --parallel [k]  simulate maps in k parallel worker processes (default:
               cores-1). The engine's board state is process-global, so
               parallelism is process-per-map — each worker require()s its own
               engine. NOTE: per-battle DB rows are skipped in parallel mode
               (the report + accumulator are identical either way).

   It also ranks maps by a balance-quality score and prints `BEST_MAP: <name>`
   (closest to fair + most back-and-forth) so generate-reports knows which map
   to hand to claude-plays.js. */
'use strict';

var fs = require('fs');
var path = require('path');

// --deck <id> / --units <id>: report on a different content deck or unit-stat
// variant. The engine snapshots the active deck AND unit block at require()
// time, so pre-populate WOA_CONTENT with the flipped content FIRST (same trick,
// same file order as dev/claude-plays.js preloadContent — node's require cache
// makes the engine's own loader a no-op afterwards).
var DECK = '', UNITSET = '';
(function () {
  function take(flag) {
    var i = process.argv.indexOf(flag);
    if (i < 0) return '';
    var id = process.argv[i + 1] || '';
    if (!id) { console.error(flag + ' needs an id'); process.exit(1); }
    process.argv.splice(i, 2);
    return id;
  }
  DECK = take('--deck');
  UNITSET = take('--units');
  if (!DECK && !UNITSET) return;
  global.WOA_CONTENT = { maps: [], cards: [], decks: [], mapsets: [], units: [] };
  ['decks', 'maps', 'mapsets', 'units'].forEach(function (kind) {
    var dir = path.join(__dirname, '..', 'game', 'content', kind);
    var files = [];
    try { files = fs.readdirSync(dir).filter(function (f) { return /\.js$/.test(f); }).sort(); } catch (e) { return; }
    files.forEach(function (f) { require(path.join(dir, f)); });
  });
  if (DECK) {
    var decks = global.WOA_CONTENT.decks;
    if (!decks.some(function (d) { return d.id === DECK; })) {
      console.error('--deck "' + DECK + '" not found. Available: ' + decks.map(function (d) { return d.id; }).join(', '));
      process.exit(1);
    }
    decks.forEach(function (d) { d.active = (d.id === DECK); });
  }
  if (UNITSET) {
    var us = global.WOA_CONTENT.units || [];
    if (!us.some(function (u) { return u.id === UNITSET; })) {
      console.error('--units "' + UNITSET + '" not found. Available: ' + (us.map(function (u) { return u.id; }).join(', ') || 'none'));
      process.exit(1);
    }
    us.forEach(function (u) { u.active = (u.id === UNITSET); });
  }
})();

var E = require(path.join(__dirname, '..', 'game', 'engine.js'));
// Scoring / thresholds / folds / markdown all live in the shared report model
// (game/report-model.js) — one implementation per fact; this file keeps only
// the run/accumulate/save plumbing.
var R = require(path.join(__dirname, '..', 'game', 'report-model.js'));

var balanceScore = R.balanceScore, addAgg = R.addAgg;
function accFilePath(ver) { return path.join(__dirname, '..', 'logs', 'reports', 'balance', ver, 'accumulated.json'); }
function readAcc(ver) {
  try { return JSON.parse(fs.readFileSync(accFilePath(ver), 'utf8')); } catch (e) { return null; }
}

async function run() {
  var argv = process.argv.slice(2);
  var flags = {};
  var mi = argv.indexOf('--mapset');
  if (mi >= 0) { flags.mapset = argv[mi + 1]; argv.splice(mi, 2); }
  var pi = argv.indexOf('--parallel');
  if (pi >= 0) {
    flags.parallel = /^\d+$/.test(argv[pi + 1] || '') ? +argv.splice(pi + 1, 1)[0]
      : Math.max(1, (require('os').availableParallelism ? require('os').availableParallelism() : 4) - 1);
    argv.splice(pi, 1);
  }
  ['--stdout', '--quiet', '--fresh', '--once'].forEach(function (f) {
    if (argv.indexOf(f) >= 0) { flags[f.slice(2)] = true; argv = argv.filter(function (a) { return a !== f; }); }
  });
  var n = 60, diffs = [], filter = null;
  argv.forEach(function (a) {
    if (/^\d+$/.test(a)) n = Math.max(2, +a);
    else if (E.AI_PRESETS[a]) diffs.push(a);
    else filter = filter ? filter + ' ' + a : a;
  });
  var dr = diffs[0] || 'hard', db = diffs[1] || dr, diffLabel = dr === db ? dr + ' vs ' + dr : dr + ' vs ' + db;
  var ver = E.VERSION;

  var maps = E.mapPool(); // the ACTIVE map-set's roster (V1)
  if (flags.mapset === 'all') maps = E.MAPS;
  else if (flags.mapset) {
    var mset = E.MAPSETS.filter(function (s) { return s.id === flags.mapset; })[0];
    if (!mset) { console.error('Unknown map-set "' + flags.mapset + '". Known: ' + (E.MAPSETS.map(function (s) { return s.id; }).join(', ') || 'none') + ', all'); process.exit(1); }
    maps = E.MAPS.filter(function (m) { return mset.maps.indexOf(m.id) >= 0 || mset.maps.indexOf(m.name) >= 0; });
  }
  if (filter) maps = maps.filter(function (m) { return m.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0; });
  if (!maps.length) { console.error('No map matches "' + filter + '".'); process.exit(1); }
  var probs = E.validateMaps(maps);
  if (probs.length) { console.error('Fix these maps first:\n  ' + probs.join('\n  ')); process.exit(1); }

  // Read the accumulator BEFORE simulating: the per-map seed base is offset by
  // how many runs are already folded in, so accumulating genuinely adds NEW
  // battles (the old fixed seeds replayed byte-identical battles and just
  // doubled every count). --fresh/--once use offset 0 = the original schedule.
  var prior = (flags.once || flags.fresh) ? null : readAcc(ver);
  if (prior && prior.diff && prior.diff !== diffLabel) {
    console.error('NOTE: accumulator holds "' + prior.diff + '" data but this run is "' + diffLabel +
      '" — reporting this run only (use --fresh to reset the accumulator to this run).');
    prior = null; flags.once = true;
  }
  if (prior && (prior.deck || '') !== DECK) {
    console.error('NOTE: accumulator holds deck "' + (prior.deck || 'active') + '" data but this run is deck "' +
      (DECK || 'active') + '" — reporting this run only (use --fresh to reset the accumulator to this run).');
    prior = null; flags.once = true;
  }
  if (prior && (prior.units || '') !== UNITSET) {
    console.error('NOTE: accumulator holds units "' + (prior.units || 'default') + '" data but this run is units "' +
      (UNITSET || 'default') + '" — reporting this run only (use --fresh to reset the accumulator to this run).');
    prior = null; flags.once = true;
  }
  var priorRuns = (prior && prior.runs) || 0;

  // V1: every battle also lands as a per-battle row in logs/woa.db (guarded —
  // the markdown report works fine without it).
  var dbm = null, dbh = null, runId = null;
  try {
    dbm = require(path.join(__dirname, 'db.js'));
    dbh = dbm.open();
    runId = dbm.insertRun(dbh, { version: ver, kind: 'balance', redAi: dr, blueAi: db, n: n, tool: 'balance-report' });
  } catch (e) { dbm = null; console.error('(db off: ' + e.message + ')'); }

  if (!flags.quiet) process.stderr.write('Simulating ' + n + ' battles/map, ' + diffLabel + ', ' + maps.length + ' maps' +
    (flags.parallel ? ' (' + flags.parallel + ' workers)' : '') + ' ');
  var thisRun = {}; // name -> {shape, agg}
  function shapeOf(map) { return map.shape && map.shape.charAt(0) === '@' ? 'custom' : (map.shape || '?'); }
  // per-run stride (~21.5M) dwarfs the in-run seed span (g*104729, n<=204),
  // so accumulated runs can never replay a prior run's seeds
  function seedBaseFor(mi) { return (mi + 1) * 7919 + priorRuns * 7919 * 2711; }
  if (flags.parallel) {
    // process-per-map: the engine's current-board state is module-global, so
    // in-process interleaving is unsafe — each worker require()s a fresh engine.
    if (dbm) { try { dbm.close(dbh); } catch (e) {} dbm = null; console.error('(per-battle DB rows skipped in --parallel)'); }
    var cp = require('child_process');
    // each worker require()s a fresh engine, so --deck / --units must preload there too
    var WORKER = 'var deckId=process.argv[7]||"",unitsId=process.argv[8]||"";' +
      'if(deckId||unitsId){var fs=require("fs"),path=require("path");' +
      'global.WOA_CONTENT={maps:[],cards:[],decks:[],mapsets:[],units:[]};' +
      '["decks","maps","mapsets","units"].forEach(function(kind){var dir=path.join(path.dirname(process.argv[1]),"content",kind);' +
      'try{fs.readdirSync(dir).filter(function(f){return /\\.js$/.test(f)}).sort().forEach(function(f){require(path.join(dir,f))})}catch(e){}});' +
      'if(deckId)global.WOA_CONTENT.decks.forEach(function(d){d.active=(d.id===deckId)});' +
      'if(unitsId)global.WOA_CONTENT.units.forEach(function(u){u.active=(u.id===unitsId)});}' +
      'var E=require(process.argv[1]);var m=E.MAPS.filter(function(x){return x.name===process.argv[2]})[0];' +
      'process.stdout.write(JSON.stringify(E.balanceMap(m,+process.argv[3],{diffRed:process.argv[4],diffBlue:process.argv[5],seedBase:+process.argv[6]})));';
    var enginePath = path.join(__dirname, '..', 'game', 'engine.js');
    await new Promise(function (resolve, reject) {
      var pending = maps.length, launched = 0;
      var launchNext = function () {
        if (launched >= maps.length) return;
        var mi = launched++, map = maps[mi];
        cp.execFile(process.execPath, ['-e', WORKER, enginePath, map.name, String(n), dr, db, String(seedBaseFor(mi)), DECK, UNITSET],
          { maxBuffer: 64e6 }, function (err, stdout) {
            if (err) return reject(err);
            try { thisRun[map.name] = { shape: shapeOf(map), agg: JSON.parse(stdout) }; }
            catch (e) { return reject(e); }
            if (!flags.quiet) process.stderr.write('.');
            if (--pending === 0) return resolve();
            launchNext();
          });
      };
      for (var wk = 0; wk < Math.min(flags.parallel, maps.length); wk++) launchNext();
    }).catch(function (e) { console.error('worker failed: ' + e.message); process.exit(1); });
  } else {
    maps.forEach(function (map, mi) {
      var seedBase = seedBaseFor(mi);
      var r = E.balanceMap(map, n, { diffRed: dr, diffBlue: db, seedBase: seedBase,
        onGame: dbm && function (g1, nn, st) {
          try { dbm.insertBattle(dbh, runId, st, E.balanceFP(g1 - 1), { seed: E.balanceSeed(seedBase, g1 - 1), version: ver }); }
          catch (e) { /* a bad row never kills the report */ }
        } });
      thisRun[map.name] = { shape: shapeOf(map), agg: r };
      if (!flags.quiet) process.stderr.write('.');
    });
    if (dbm) try { dbm.close(dbh); } catch (e) {}
  }
  if (!flags.quiet) process.stderr.write('\n');

  // ---- accumulation (persistent per-version data) ----
  var acc = null, runs = 1, accumulated = false;
  if (!flags.once) {
    {
      acc = prior || { version: ver, diff: diffLabel, deck: DECK, units: UNITSET, runs: 0, maps: {} };
      acc.diff = diffLabel; acc.version = ver; acc.deck = DECK; acc.units = UNITSET;
      Object.keys(thisRun).forEach(function (name) {
        var e = acc.maps[name] || (acc.maps[name] = { shape: thisRun[name].shape, agg: {} });
        e.shape = thisRun[name].shape;
        addAgg(e.agg, thisRun[name].agg);
      });
      acc.runs = (acc.runs || 0) + 1;
      runs = acc.runs; accumulated = true;
    }
  }

  // rows to render: accumulated totals if accumulating, else this run only
  var source = accumulated ? acc.maps : thisRun;
  var rows = maps.map(function (map) {
    var e = source[map.name] || thisRun[map.name];
    var agg = e.agg, done = Math.max(1, (agg.n || n) - (agg.unfinished || 0));
    return { name: map.name, shape: e.shape, agg: agg, done: done, score: balanceScore(agg, done) };
  });

  var ranked = rows.slice().sort(function (a, b) { return a.score - b.score; });
  var best = (ranked[0] || rows[0]).name;
  var totalBattles = rows.reduce(function (s, x) { return s + x.done; }, 0);

  var G = R.foldGlobal(rows);

  rows.forEach(function (x) {
    x.notes = R.mapNotes(x.agg, x.done);
    if (x.name === best) x.notes.unshift('**best balance**');
  });
  var noise = Math.round(100 / Math.sqrt(Math.max(1, Math.round(totalBattles / rows.length))));
  var md = R.reportMarkdown({
    style: 'report',
    title: diffLabel + ' AI',
    version: ver,
    metaTail: totalBattles + ' battles' +
      (accumulated ? ' accumulated across ' + runs + ' run(s) (this run added ' + (n) + '/map)' : ' (this run only, not accumulated)') +
      (DECK ? ' · deck ' + DECK : '') + (UNITSET ? ' · units ' + UNITSET : '') + (flags.mapset ? ' · mapset ' + flags.mapset : '') +
      ' · ±' + noise + ' pts/map · dev/balance-report.js',
    rows: rows, G: G, cards: E.CARDS
  }) + '\n';

  if (flags.stdout) { process.stdout.write(md); console.error('BEST_MAP: ' + best); return; }

  var rel = path.join('logs', 'reports', 'balance', ver);
  var dir = path.join(__dirname, '..', rel);
  fs.mkdirSync(dir, { recursive: true });
  var d = new Date(), p2 = function (x) { return (x < 10 ? '0' : '') + x; };
  var stamp = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes());
  var fname = stamp + '-' + dr + '-vs-' + db + '-n' + n + (DECK ? '-deck-' + DECK : '') + (UNITSET ? '-units-' + UNITSET : '') + (accumulated ? '-r' + runs : '') + '.md';
  fs.writeFileSync(path.join(dir, fname), md);
  if (accumulated) {
    acc.updatedAt = d.toISOString();
    acc.totalBattles = totalBattles;
    fs.writeFileSync(accFilePath(ver), JSON.stringify(acc, null, 1));
  }
  console.log('SAVED: ' + rel + '/' + fname);
  if (accumulated) console.log('ACCUMULATED: ' + rel + '/accumulated.json (' + totalBattles + ' battles across ' + runs + ' runs)');
  console.log('BEST_MAP: ' + best);
}
run().catch(function (e) { console.error(e); process.exit(1); });
