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

   It also ranks maps by a balance-quality score and prints `BEST_MAP: <name>`
   (closest to fair + most back-and-forth) so generate-reports knows which map
   to hand to claude-plays.js. */
'use strict';

var E = require(require('path').join(__dirname, '..', 'game', 'engine.js'));
var fs = require('fs');
var path = require('path');

function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
function f1(x) { return (Math.round(x * 10) / 10).toFixed(1); }

/* Balance-quality score (LOWER = better / more playable). Rewards fairness
   (red% & first-mover% near 50) and tension (lead swings), penalises degenerate
   play (zero-kill stalemates, tie-goes-to-2nd deciding it, long kill-less drag).
   Per Bill's Round-4 note, an attrition-only map is NOT penalised — a map where
   the lead changed hands right up to the end is a good map. */
function balanceScore(agg, done) {
  var red = pct(agg.redWins, done), first = pct(agg.firstWins, done), zk = pct(agg.zeroKill, done),
    tie = pct(agg.tiebreak, done), swings = agg.leadChanges / Math.max(1, done), drag = agg.killTail / Math.max(1, done);
  return Math.abs(red - 50) + Math.abs(first - 50) + zk * 0.6 + tie * 0.3 + drag * 0.4 - swings * 3;
}

// Fold a balanceMap aggregate (all sum/count fields, incl. the cards sub-object)
// into a running total — pure field-wise addition, since balanceAdd only ever
// accumulates sums. done = n - unfinished at read time.
function addAgg(dst, src) {
  Object.keys(src).forEach(function (k) {
    if (k === 'cards') {
      dst.cards = dst.cards || {};
      Object.keys(src.cards).forEach(function (cid) {
        var a = dst.cards[cid] || (dst.cards[cid] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0 });
        var c = src.cards[cid];
        ['plays', 'wins', 'simple', 'firstSight', 'seenSum', 'noop'].forEach(function (f) { a[f] = (a[f] || 0) + (c[f] || 0); });
      });
    } else if (typeof src[k] === 'number') {
      dst[k] = (dst[k] || 0) + src[k];
    }
  });
  return dst;
}
function accFilePath(ver) { return path.join(__dirname, '..', 'logs', 'reports', 'balance', ver, 'accumulated.json'); }
function readAcc(ver) {
  try { return JSON.parse(fs.readFileSync(accFilePath(ver), 'utf8')); } catch (e) { return null; }
}

function run() {
  var argv = process.argv.slice(2);
  var flags = {};
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

  var maps = E.MAPS; // content/maps/*.js — custom maps are first-class here now
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
  var priorRuns = (prior && prior.runs) || 0;

  // V1: every battle also lands as a per-battle row in logs/woa.db (guarded —
  // the markdown report works fine without it).
  var dbm = null, dbh = null, runId = null;
  try {
    dbm = require(path.join(__dirname, 'db.js'));
    dbh = dbm.open();
    runId = dbm.insertRun(dbh, { version: ver, kind: 'balance', redAi: dr, blueAi: db, n: n, tool: 'balance-report' });
  } catch (e) { dbm = null; console.error('(db off: ' + e.message + ')'); }

  if (!flags.quiet) process.stderr.write('Simulating ' + n + ' battles/map, ' + diffLabel + ', ' + maps.length + ' maps ');
  var thisRun = {}; // name -> {shape, agg}
  maps.forEach(function (map, mi) {
    // per-run stride (~21.5M) dwarfs the in-run seed span (g*104729, n<=204),
    // so accumulated runs can never replay a prior run's seeds
    var seedBase = (mi + 1) * 7919 + priorRuns * 7919 * 2711;
    var r = E.balanceMap(map, n, { diffRed: dr, diffBlue: db, seedBase: seedBase,
      onGame: dbm && function (g1, nn, st) {
        try { dbm.insertBattle(dbh, runId, st, E.balanceFP(g1 - 1), { seed: E.balanceSeed(seedBase, g1 - 1), version: ver }); }
        catch (e) { /* a bad row never kills the report */ }
      } });
    thisRun[map.name] = { shape: map.shape && map.shape.charAt(0) === '@' ? 'custom' : (map.shape || '?'), agg: r };
    if (!flags.quiet) process.stderr.write('.');
  });
  if (!flags.quiet) process.stderr.write('\n');
  if (dbm) try { dbm.close(dbh); } catch (e) {}

  // ---- accumulation (persistent per-version data) ----
  var acc = null, runs = 1, accumulated = false;
  if (!flags.once) {
    {
      acc = prior || { version: ver, diff: diffLabel, runs: 0, maps: {} };
      acc.diff = diffLabel; acc.version = ver;
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

  var G = { red: 0, first: 0, hq: 0, games: 0, turns: 0, attacks: 0, swaps: 0, zeroKill: 0, tiebreak: 0,
    fbWins: 0, fbGames: 0, ctlWins: 0, ctlGames: 0, depShare: 0, killTail: 0, leadChanges: 0 }, cardAgg = {};
  rows.forEach(function (x) {
    var a = x.agg;
    G.red += a.redWins; G.first += a.firstWins; G.hq += a.hqWins; G.games += x.done; G.turns += a.turns;
    G.attacks += a.attacks; G.swaps += a.swaps; G.zeroKill += a.zeroKill; G.tiebreak += a.tiebreak;
    G.fbWins += a.firstBloodWins; G.fbGames += a.firstBloodGames;
    G.ctlWins += a.controlWins; G.ctlGames += a.controlGames; G.depShare += a.deployedShare;
    G.killTail += a.killTail; G.leadChanges += a.leadChanges;
    Object.keys(a.cards || {}).forEach(function (cid) {
      var c = cardAgg[cid] || (cardAgg[cid] = { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0 });
      var s = a.cards[cid];
      c.plays += s.plays; c.wins += s.wins; c.simple += s.simple; c.firstSight += s.firstSight; c.seenSum += s.seenSum; c.noop += s.noop || 0;
    });
  });

  var noise = Math.round(100 / Math.sqrt(Math.max(1, Math.round(totalBattles / rows.length))));
  var L = [];
  L.push('# Balance report — ' + diffLabel + ' AI');
  L.push('');
  L.push('_Rules version ' + ver + ' · ' + rows.length + ' map(s) · ' + totalBattles + ' battles' +
    (accumulated ? ' accumulated across ' + runs + ' run(s) (this run added ' + (n) + '/map)' : ' (this run only, not accumulated)') +
    ' · ±' + noise + ' pts/map · dev/balance-report.js_');
  L.push('');
  L.push('## Maps');
  L.push('');
  L.push('| Map | Shape | Red% | 1st% | HQ% | Turns | VPdiff | Atk | Swp | 0kill% | Tie% | Drag | Swings | Balance | Notes |');
  L.push('|---|---|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|--:|---|');
  rows.forEach(function (x) {
    var a = x.agg, done = x.done, notes = [];
    if (pct(a.redWins, done) >= 62 || pct(a.redWins, done) <= 38) notes.push('SIDE-BIASED');
    if (pct(a.firstWins, done) >= 62) notes.push('1st-mover strong');
    if (pct(a.firstWins, done) <= 38) notes.push('2nd-mover strong');
    if (pct(a.hqWins, done) <= 8) notes.push('attrition-only');
    if (pct(a.hqWins, done) >= 55) notes.push('HQ-rushable');
    if (pct(a.zeroKill, done) >= 20) notes.push('STALEMATES');
    if (x.name === best) notes.unshift('**best balance**');
    L.push('| ' + x.name + ' | ' + x.shape + ' | ' + pct(a.redWins, done) + ' | ' + pct(a.firstWins, done) +
      ' | ' + pct(a.hqWins, done) + ' | ' + f1(a.turns / done) + ' | ' + f1(a.vpDiff / done) + ' | ' + f1(a.attacks / done) +
      ' | ' + f1(a.swaps / done) + ' | ' + pct(a.zeroKill, done) + ' | ' + pct(a.tiebreak, done) +
      ' | ' + f1(a.killTail / done) + ' | ' + f1(a.leadChanges / done) + ' | ' + f1(x.score) + ' | ' + notes.join(', ') + ' |');
  });
  L.push('');
  L.push('_Balance column: lower = fairer + more back-and-forth (|red−50| + |1st−50| + penalties for zero-kill/tie-decided/drag, minus a reward for lead swings). Heuristic — Bill decides._');
  L.push('');
  L.push('## Overall');
  L.push('');
  L.push('- red ' + pct(G.red, G.games) + '% · first mover ' + pct(G.first, G.games) + '% · HQ captures ' +
    pct(G.hq, G.games) + '% · avg battle ' + f1(G.turns / G.games) + ' turns');
  L.push('- Behaviour: ' + f1(G.attacks / G.games) + ' attacks & ' + f1(G.swaps / G.games) + ' swaps/battle · zero-kill ' +
    pct(G.zeroKill, G.games) + '% · ' + Math.round(100 * G.depShare / G.games) + '% of units ever fielded');
  L.push('- Decisiveness: tie-goes-to-2nd decided ' + pct(G.tiebreak, G.games) + '% · first blood won ' +
    pct(G.fbWins, G.fbGames) + '% of the ' + pct(G.fbGames, G.games) + '% of battles with a kill · more-hexes side won ' + pct(G.ctlWins, G.ctlGames) + '%');
  L.push('- Pacing: ' + f1(G.killTail / G.games) + ' kill-less turns before end (0=decisive, ~32=circling) · ' +
    f1(G.leadChanges / G.games) + ' lead swings/battle (higher = more back-and-forth)');
  L.push('');
  L.push('## Cards (' + G.games + ' battles)');
  L.push('');
  L.push('| Card | Win% | Simple% | 1stSight% | AvgSeen | Plays |');
  L.push('|---|--:|--:|--:|--:|--:|');
  E.CARDS.map(function (c) {
    var a = cardAgg[c.id] || { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0 };
    return { name: c.name, plays: a.plays, win: pct(a.wins, a.plays), simple: pct(a.simple, a.plays),
      sight: pct(a.firstSight, a.plays), seen: a.plays ? (a.seenSum / a.plays).toFixed(2) : '-' };
  }).sort(function (a, b) { return b.sight - a.sight; }).forEach(function (r) {
    L.push('| ' + r.name + ' | ' + r.win + ' | ' + r.simple + ' | ' + r.sight + ' | ' + r.seen + ' | ' + r.plays + ' |');
  });
  L.push('');
  var md = L.join('\n') + '\n';

  if (flags.stdout) { process.stdout.write(md); console.error('BEST_MAP: ' + best); return; }

  var rel = path.join('logs', 'reports', 'balance', ver);
  var dir = path.join(__dirname, '..', rel);
  fs.mkdirSync(dir, { recursive: true });
  var d = new Date(), p2 = function (x) { return (x < 10 ? '0' : '') + x; };
  var stamp = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()) + '-' + p2(d.getHours()) + p2(d.getMinutes());
  var fname = stamp + '-' + dr + '-vs-' + db + '-n' + n + (accumulated ? '-r' + runs : '') + '.md';
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
run();
