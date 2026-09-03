/* War of Attrition — balance lab.
   Runs AI-vs-AI skirmishes and reports what the numbers say.

     node dev/balance.js                 24 skirmishes per map, normal AI, all maps
     node dev/balance.js 60              60 skirmishes per map
     node dev/balance.js 60 hard         ...with the Field Marshal AI
     node dev/balance.js 40 narrows      only maps whose name matches "narrows"
                                         (all content/maps/*.js are included)
     node dev/balance.js matchup         skill-vs-luck report: better AIs fight
     node dev/balance.js matchup 16      worse ones; the stronger side's win rate
                                         is the skill premium. ~50% = card-draw
                                         luck decides; 65%+ = skill decides.
     node dev/balance.js matchup 16 brawler turtle
                                         pit any two AI personalities (built-in
                                         easy/normal/hard or a maps.js "ai" row)
     node dev/balance.js 40 brawler      per-map report with a personality
     node dev/balance.js 40 --battalion-red cavsplit-16 --battalion-blue iter3
                                         seat a different battalion per side;
                                         id/name from content/battalions/. Omit either
                                         flag to leave that side on the active battalion.

   Sweeps run PARALLEL BY DEFAULT (k = cores-1) via the shared dev/sweep.js pool —
   both the per-map report and matchup — so a tournament saturates every core,
   byte-identical to serial on the same seeds. --serial forces the in-process loop
   (throwaway refactor diff / debugging); --parallel [k] sets the worker count. A per-side
   --battalion-red/blue run always falls back to serial (the pool seats one active
   battalion).

   Reading the map report:
   - Red%/Blue% far from 50  -> the map itself favours a side (positions/terrain)
   - 1st%/2nd% far from 50   -> mover advantage on that map
   - HQ% near 0              -> nobody can crack the HQ; skirmishes always grind to attrition
   - Turns                   -> pacing; the battalion caps a skirmish at 32 plays
   - Atk%/Swp%               -> attacks / swaps as a SHARE of all actions taken
                                (attacks+swaps+marches+deploys): AI behaviour health,
                                battalion-size-proof. Low Atk% + high Swp% = swap-dancing.
   - 0kill%                  -> skirmishes where no unit ever died (degenerate stalemates)
   - Drag                    -> avg trailing turns with NO kill before the game ended,
                                over ATTRITION endings only (HQ endings have Drag 0 by
                                definition). ~32 = a no-kill grind; high = circling.
   - Swings                  -> avg times the field-score lead flipped to the OTHER
                                side per skirmish. High = real back-and-forth (you can
                                feel you'll come back); 0 = one side led wire-to-wire.
   - Card report             -> Simple%/1stSight%/AvgSeen per card (per-card Win% is
                                computed but not printed; see docs/reference/report-model.md)

   Attrition victory: the player with the higher field score of SURVIVING
   units on the board wins when the cards run out; reserves count for nothing.
*/
var E = require('../game/engine.js');
// The batch/measurement layer: skirmish sweeps + balance folds. It lives in
// game/sim.js, not on E — balanceMap/balanceFP/balanceSeed are here.
var SIM = require('../game/sim.js');
// Shared report model: thresholds, folds, card-row derivation (report-model.js
// is the ONE copy — this file keeps only its terminal formatting).
var R = require('../game/report-model.js');
// The one parallel-sweep pool: the balance lab and run-tournament fan their map
// sweeps across cores through it, byte-identical to the serial loop.
var sweep = require('./sweep.js');
var LAB = require('./lab-config.js'); // dev-lab run defaults (sample count, opponent, matchup n)
var fs = require('fs');
var path = require('path');
// Skirmish persistence: dev/ may carry deps (node:sqlite); game/ stays
// dependency-free. Guarded so the tool still runs and prints without the DB.
var db = null;
try { db = require(path.join(__dirname, 'db.js')); } catch (e) { /* persistence off */ }

var pct = R.pct;
function pad(s, w, right) {
  s = String(s);
  while (s.length < w) s = right ? s + ' ' : ' ' + s;
  return s;
}

// Mapset selection: default = the ACTIVE mapset's pool (one
// shared mapset across play modes + tools); `--mapset <id>` picks a specific
// set; `--mapset all` = every map on disk.
function mapsForSet(setArg) {
  if (!setArg) return E.activeMaps();
  if (setArg === 'all') return E.MAPS;
  var set = E.MAPSETS.filter(function (s) { return s.id === setArg; })[0];
  if (!set) {
    console.log('Unknown mapset "' + setArg + '". Known: ' + (E.MAPSETS.map(function (s) { return s.id; }).join(', ') || 'none') + ', all');
    process.exit(1);
  }
  return E.MAPS.filter(function (m) { return set.maps.indexOf(m.id) >= 0 || set.maps.indexOf(m.name) >= 0; });
}

/* ---------------- one parallel/serial choice for every balance-lab sweep ----------------
   Fans a map sweep across the shared dev/sweep.js pool so the lab and
   run-tournament saturate every core, byte-identical to the serial loop on the
   same seeds. Parallel needs a single active battalion — the pool's worker seats
   the content-active battalion — so a per-side --battalion-red/blue run (matchup's
   battalion swap included) can't be expressed and runs serial. Returns aggs[]
   indexed by mapIndex (a zero-game map -> balanceNew(0)); ALWAYS a Promise.
   opts: { battalions?, workers?, onSkirmish?(mi,g1,st), onProgress?() }. */
function sweepMaps(maps, n, diffRed, diffBlue, seedBaseFor, opts) {
  opts = opts || {};
  var canParallel = opts.workers > 1 && !opts.battalions;
  if (canParallel) {
    return sweep.runParallelSweep({
      enginePath: path.join(__dirname, '..', 'game', 'engine.js'),
      maps: maps, n: n, diffRed: diffRed, diffBlue: diffBlue, battalion: '', units: '',
      workers: opts.workers, seedBaseFor: seedBaseFor,
      onProgress: opts.onProgress, onSkirmish: opts.onSkirmish
    });
  }
  // serial: the in-process balanceMap loop (unchanged path; also the per-side
  // battalion case). Wrapped in a Promise so callers await one shape.
  return Promise.resolve(maps.map(function (map, mi) {
    var r = SIM.balanceMap(map, n, { diffRed: diffRed, diffBlue: diffBlue, seedBase: seedBaseFor(mi), battalions: opts.battalions,
      onGame: opts.onSkirmish && function (g1, nn, st) { opts.onSkirmish(mi, g1, st); } });
    if (opts.onProgress) opts.onProgress();
    return r;
  }));
}

// Workers to actually run for a parallel map sweep (0 = serial): capped at the
// (map, game-batch) count, so a single big map still fans across every core.
function sweepWorkers(mapCount, n, workers, battalions) {
  if (!(workers > 1) || battalions) return 0;
  return Math.min(workers, sweep.planBatches(mapCount, n, workers).length);
}

/* ---------------- matchup mode: how much does skill matter? ---------------- */
async function matchup(n, a, b, maps, battalions, workers) {
  var pairs = (a && b) ? [[a, b]] : [
    ['normal', 'easy'],
    ['hard', 'normal'],
    ['hard', 'easy'],
    ['normal', 'normal'] // sanity baseline, should be ~50
  ];
  var h1 = Math.ceil(n / 2), h2 = Math.floor(n / 2);
  var nw = sweepWorkers(maps.length, Math.max(h1, h2), workers, battalions);
  console.log('Skill-vs-luck report: ' + n + ' skirmishes per map per pairing, ' + maps.length + ' maps' +
    (nw ? ' (' + nw + ' workers)' : '') + '.');
  console.log('Each pairing also swaps sides so colour bias cancels out.' +
    (battalions ? ' Battalions swap WITH the AI so each keeps a fixed battalion (skill, not battalion, is measured).' : '') + '\n');
  // The strong AI sits red in r1, blue in r2. If battalions stayed seat-bound
  // the strong AI would swap battalions between orientations and the premium would fold
  // in battalion strength — so swap the battalions alongside the sides, pinning each AI to
  // one battalion across both halves. Seed bases match the old serial schedule exactly
  // ((mi+1)*7919 for r1, +31 for r2), so the premium is byte-identical.
  var battalions2 = battalions ? { red: battalions.blue, blue: battalions.red } : null;
  var seed1 = function (mi) { return (mi + 1) * 7919; };
  var seed2 = function (mi) { return (mi + 1) * 7919 + 31; };
  var dot = function () { process.stdout.write('.'); };
  var results = [];
  for (var pi = 0; pi < pairs.length; pi++) {
    var strong = pairs[pi][0], weak = pairs[pi][1];
    var r1s = await sweepMaps(maps, h1, strong, weak, seed1, { battalions: battalions, workers: workers, onProgress: dot });
    var r2s = await sweepMaps(maps, h2, weak, strong, seed2, { battalions: battalions2, workers: workers, onProgress: dot });
    var sWins = 0, games = 0;
    maps.forEach(function (map, mi) {
      var r1 = r1s[mi], r2 = r2s[mi];
      sWins += r1.redWins + ((h2 - r2.unfinished) - r2.redWins);
      games += (h1 - r1.unfinished) + (h2 - r2.unfinished);
    });
    var p = pct(sWins, games);
    results.push({ label: strong + ' vs ' + weak, p: p, games: games });
    console.log('  ' + pad(strong + ' vs ' + weak, 18, true) + ' stronger AI wins ' + p + '% of ' + games);
  }
  console.log('\nHow to read it: a clearly better player winning only ~50-55% means the');
  console.log('card draw decides most skirmishes (luck-heavy). 55-65% = luck and skill both');
  console.log('matter. 65%+ = skill dominates. The normal-vs-normal line is the ~50% sanity check.');
}

/* ---------------- per-map report ---------------- */
// mapsetArg: the --mapset value `maps` was resolved from (null = active pool) —
// a run-identity stamp only, doesn't affect which maps run.
async function mapReport(n, diff, filter, maps, mapsetArg, battalions, workers) {
  if (filter) {
    maps = maps.filter(function (m) { return m.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0; });
    if (!maps.length) { console.log('No map matches "' + filter + '".'); return; }
  }
  var probs = E.validateMaps(maps);
  if (probs.length) { console.log('Fix these first:\n  ' + probs.join('\n  ')); return; }

  // One runs row per invocation; skirmishes reference it. Best-effort — a
  // persistence hiccup must never break the report itself.
  var dbh = null, runId = null;
  if (db) {
    try {
      dbh = db.open();
      runId = db.insertRun(dbh, {
        version: E.VERSION, kind: 'balance', redAi: diff, blueAi: diff, n: n, tool: 'balance.js',
        battalionRed: (battalions && battalions.red) || activeId,   // both battalions fielded (per side)
        battalionBlue: (battalions && battalions.blue) || activeId,
        mapset: mapsetArg || (E.activeMapset() && E.activeMapset().id) || 'all',
        seedBase: 7919 // the SAME base the per-map (mi+1)*7919 schedule below multiplies
      });
    } catch (e) { dbh = null; runId = null; }
  }

  var nw = sweepWorkers(maps.length, n, workers, battalions);
  console.log('Simulating ' + n + ' skirmishes per map (' + maps.length + ' maps, ' + diff + ' AI' +
    (nw ? ', ' + nw + ' workers' : '') + ')...' +
    (dbh ? '  [persisting to logs/woa.db]' : '') + '\n');
  var header = pad('Map', 16, true) + pad('Shape', 11, true) +
    pad('Red%', 6) + pad('Blue%', 7) + pad('1st%', 6) + pad('2nd%', 6) +
    pad('HQ%', 6) + pad('Turns', 7) + pad('FSdiff', 8) +
    pad('Atk%', 6) + pad('Swp%', 6) + pad('0kill%', 8) +
    pad('Drag', 7) + pad('Swings', 8) + '  notes';
  console.log(header);
  console.log(new Array(header.length + 1).join('-'));

  var mapRows = []; // [{agg, done}] for the shared foldGlobal
  function seedBaseFor(mi) { return (mi + 1) * 7919; }
  // Sweep (parallel by default) — the parent stays the sole woa.db writer via
  // onSkirmish, in serial (map, g) order, so rows match a serial run byte-for-byte.
  var aggs = await sweepMaps(maps, n, diff, diff, seedBaseFor, {
    battalions: battalions, workers: workers,
    onSkirmish: dbh && function (mi, g1, st) {
      try {
        db.insertSkirmish(dbh, runId, st, SIM.balanceFP(g1 - 1), { seed: SIM.balanceSeed(seedBaseFor(mi), g1 - 1), version: E.VERSION });
      } catch (e) { /* persistence is best-effort */ }
    }
  });

  maps.forEach(function (map, mi) {
    var r = aggs[mi];
    var done = n - r.unfinished;
    mapRows.push({ agg: r, done: done });
    var notes = R.mapNotes(r, done);
    // Atk%/Swp% are shares of all actions; Drag is over attrition endings only
    // (HQ endings have Drag 0 by definition).
    var act = R.actionTotal(r), att = r.attritionEndings || 0;
    console.log(
      pad(map.name.slice(0, 15), 16, true) + pad(map.shape || '?', 11, true) +
      pad(pct(r.redWins, done), 6) + pad(pct(done - r.redWins, done), 7) +
      pad(pct(r.firstWins, done), 6) + pad(pct(done - r.firstWins, done), 6) +
      pad(pct(r.hqWins, done), 6) + pad((r.turns / Math.max(1, done)).toFixed(1), 7) +
      pad((r.fsDiff / Math.max(1, done)).toFixed(1), 8) +
      pad(pct(r.attacks, act), 6) +
      pad(pct(r.swaps, act), 6) +
      pad(pct(r.zeroKill, done), 8) +
      pad(((r.attritionKillTail || 0) / Math.max(1, att)).toFixed(1), 7) +
      pad((r.leadChanges / Math.max(1, done)).toFixed(1), 8) + '  ' + notes.join(', ')
    );
  });

  var G = R.foldGlobal(mapRows);
  // Behaviour is action shares; Reserves conditions to HQ endings (with a small-n
  // note); tie-goes-to-2nd + Drag condition to attrition endings.
  var gAct = R.actionTotal(G), gAtt = Math.max(1, G.attritionEndings);
  function nNote(k) { return ' (n=' + k + (k < R.SMALL_N.fleet ? ', small-n' : '') + ')'; }
  function hqRes(sum, k) { return k ? Math.round(100 * sum / k) + '%' : '—'; }
  console.log('\nOverall: red ' + pct(G.red, G.games) + '% | first mover ' + pct(G.first, G.games) +
    '% | HQ captures ' + pct(G.hq, G.games) + '% | avg skirmish ' + (G.turns / Math.max(1, G.games)).toFixed(1) + ' turns');
  console.log('Behaviour: ' + pct(G.attacks, gAct) + '% attacks & ' +
    pct(G.swaps, gAct) + '% swaps of all actions | zero-kill skirmishes ' + pct(G.zeroKill, G.games) +
    '% | ' + Math.round(100 * G.depShare / Math.max(1, G.games)) + '% of units ever fielded');
  console.log('Reserves at end (HQ endings only' + nNote(G.hqEndings) + '): red holds ' + hqRes(G.resEndRedHQ, G.hqEndings) +
    ' of its pieces undeployed | blue holds ' + hqRes(G.resEndBlueHQ, G.hqEndings) + ' (a rush before commit)');
  console.log('Decisiveness: tie-goes-to-2nd decided ' + pct(G.tiebreak, G.attritionEndings) +
    '% of attrition endings | first blood won ' + pct(G.fbWins, G.fbGames) + '% of the ' + pct(G.fbGames, G.games) +
    '% of skirmishes that had a kill | side holding more hexes won ' + pct(G.ctlWins, G.ctlGames) + '%');
  console.log('Pacing: ' + (G.attritionKillTail / gAtt).toFixed(1) + ' kill-less turns before end, attrition endings (0=decisive, ~32=circling) | ' +
    (G.leadChanges / Math.max(1, G.games)).toFixed(1) + ' lead swings per skirmish (higher = more back-and-forth)');

  console.log('\nCard report (' + G.games + ' skirmishes of AI play — biases noted below):');
  // Win% deliberately not printed (still computed in cardRows() + logged) —
  // docs/reference/report-model.md#reporting-doctrine.
  var ch = pad('Card', 20, true) + pad('Simple%', 9) + pad('1stSight%', 11) + pad('AvgSeen', 9) + pad('plays', 8) +
    pad('Pts', 7) + pad('Resid', 8);
  console.log(ch);
  console.log(new Array(ch.length + 1).join('-'));
  R.cardRows(G.cards, E.CARDS, E.cardPoints).forEach(function (r) {
    var resid = r.resid == null ? '-' : (r.resid > 0 ? '+' : '') + r.resid.toFixed(1) + (r.mispriced ? ' !' : '');
    console.log(pad(r.name, 20, true) + pad(r.simple + '%', 9) +
      pad(r.sight + '%', 11) + pad(r.seen, 9) + pad(r.plays, 8) + pad(r.points.toFixed(1), 7) + pad(resid, 8));
  });
  console.log('\nHow to read it:');
  console.log('  Simple%   resolved as a basic attack/reposition instead of the printed action.');
  console.log('            High = the printed action often was not worth it. (Bias: when the AI');
  console.log('            burns a card it prefers its least precious one, per CARD_KEEP.)');
  console.log('  1stSight% played the first time it ever appeared in hand. High + low AvgSeen =');
  console.log('            always-good on sight (overpowered watchlist).');
  console.log('  AvgSeen   hand-appearances before it got played. High = situational/hoarded.');
  console.log('  Pts       army-points cost (ADR-0002). Resid = share of decisive wins − share of the');
  console.log('            points budget, in points (+ out-wins its cost, − costs more). "!" = a SOFT');
  console.log('            mispricing flag (|Resid| ≥ ' + R.MISPRICE_RESID_PTS.toFixed(1) + '), never a gate. Confounds: a held-value card can read');
  console.log('            − without being weak, and Resid is exposure-weighted (draw-frequency creeps in).');
  console.log('            Thin HQ slice — cards under ' + R.MISPRICE_MIN_HQPLAYS + ' such plays show \'-\'; read at scale.');
  console.log('\nBehaviour & decisiveness lines:');
  console.log('  attacks/swaps % of actions  AI play health, as a share of all actions taken');
  console.log('            (battalion-size-proof). Low attack% + high swap% = the AIs shuffle units');
  console.log('            instead of fighting (the stalemate failure mode).');
  console.log('  zero-kill skirmishes  nobody died all skirmish: degenerate, should be ~0%.');
  console.log('  units fielded  share of all reserves that ever deployed. Low = turtling at home.');
  console.log('  reserves at end (HQ endings only)  share of a side\'s pieces still undeployed at an');
  console.log('            HQ capture — an HQ rush ends before a side commits its reserves, so this');
  console.log('            reads meaningfully only on that slice (attrition endings run the draw pile dry).');
  console.log('            Typically small-n (HQ endings are a minority); the (n=N) note flags it.');
  console.log('  tie-goes-to-2nd  attrition wins with EQUAL field scores, as a share of ATTRITION');
  console.log('            endings. High = that one rule is deciding skirmishes, not play.');
  console.log('  first blood won  how often the first kill decided the skirmish. Very high = one');
  console.log('            early trade decides everything (snowbally).');
  console.log('  more hexes won  does board control track winning? Near 50% = holding ground');
  console.log('            is decorative under the current victory rules.');
  console.log('  kill-less turns before end (attrition)  how long the AIs shuffled with nobody dying');
  console.log('            before an attrition finish. 0 = decisive; high = marching in circles.');
  console.log('  lead swings  times the field-score lead flipped sides per skirmish. High = a real');
  console.log('            back-and-forth (a losing player can feel a comeback); 0 = wire-to-wire.');
  if (dbh) { console.log('\nPersisted ' + G.games + ' skirmishes to logs/woa.db (run ' + runId + ').'); db.close(dbh); }
}

/* ---------------- args ---------------- */
var args = process.argv.slice(2);
var setArg = null, si = args.indexOf('--mapset');
if (si >= 0) { setArg = args[si + 1]; args.splice(si, 2); }
// Seat a different battalion per side. --battalion-red/--battalion-blue take a battalion
// id or name from content/battalions/; omit either to leave that side on the active
// battalion. No flags = both sides share the active battalion (default).
var battalionRed = null, dri = args.indexOf('--battalion-red');
if (dri >= 0) { battalionRed = args[dri + 1]; args.splice(dri, 2); }
var battalionBlue = null, dbi = args.indexOf('--battalion-blue');
if (dbi >= 0) { battalionBlue = args[dbi + 1]; args.splice(dbi, 2); }
// Parallel by default (k = cores-1) via the shared sweep pool; --serial forces the
// in-process loop (throwaway refactor diff / debugging), --parallel [k] sets the count. A
// per-side --battalion-red/blue run always falls back to serial (see sweepMaps).
var workers = null, wpi = args.indexOf('--parallel');
if (wpi >= 0) { workers = /^\d+$/.test(args[wpi + 1] || '') ? +args.splice(wpi + 1, 1)[0] : sweep.defaultWorkers(); args.splice(wpi, 1); }
var wsi = args.indexOf('--serial');
if (wsi >= 0) { workers = 1; args.splice(wsi, 1); }
if (workers == null) workers = sweep.defaultWorkers();
var battalions = (battalionRed || battalionBlue) ? { red: battalionRed, blue: battalionBlue } : null;
var activeId = (E.ACTIVE_BATTALION && E.ACTIVE_BATTALION.id) || null;
if (battalions) {
  try { E.resolveBattalion(battalions.red); E.resolveBattalion(battalions.blue); }   // fail fast on a bad name
  catch (e) { console.log(e.message); process.exit(1); }
  var redId = battalions.red || activeId, blueId = battalions.blue || activeId;
  console.log('Battalions: red = ' + (redId || 'active') + ', blue = ' + (blueId || 'active') + '\n');
}
(async function main() {
  if (args[0] === 'matchup') {
    // node dev/balance.js matchup [n] [aiA aiB]  — aiA/aiB may be any AI_PRESETS
    // name (easy/normal/hard or a maps.js "ai" personality)
    var rest = args.slice(1).filter(function (a) { return !/^\d+$/.test(a); });
    rest.forEach(function (a) {
      if (!E.AI_PRESETS[a]) { console.log('Unknown AI "' + a + '". Known: ' + Object.keys(E.AI_PRESETS).join(', ')); process.exit(1); }
    });
    await matchup(Math.max(2, +(args.filter(function (a) { return /^\d+$/.test(a); })[0]) || LAB.balance.matchupSamples), rest[0], rest[1], mapsForSet(setArg), battalions, workers);
  } else {
    var n = LAB.balance.samplesPerMap, diff = LAB.balance.ai, filter = null;
    args.forEach(function (a) {
      if (/^\d+$/.test(a)) n = Math.max(2, +a);
      else if (E.AI_PRESETS[a]) diff = a; // easy/normal/hard or a maps.js personality
      else filter = filter ? filter + ' ' + a : a;
    });
    await mapReport(n, diff, filter, mapsForSet(setArg), setArg, battalions, workers);
  }
})().catch(function (e) {
  console.error('worker failed: ' + e.message + '\n(retry with --serial for the in-process path)');
  process.exit(1);
});
