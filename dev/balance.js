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
     node dev/balance.js 40 --deck-red cavsplit-16 --deck-blue iter3
                                         seat a different deck per side;
                                         id/name from content/decks/. Omit either
                                         flag to leave that side on the active deck.

   Reading the map report:
   - Red%/Blue% far from 50  -> the map itself favours a side (positions/terrain)
   - 1st%/2nd% far from 50   -> mover advantage on that map
   - HQ% near 0              -> nobody can crack the HQ; skirmishes always grind to attrition
   - Turns                   -> pacing; the deck caps a skirmish at 32 plays
   - Atk%/Swp%               -> attacks / swaps as a SHARE of all actions taken
                                (attacks+swaps+marches+deploys): AI behaviour health,
                                deck-size-proof. Low Atk% + high Swp% = swap-dancing.
   - 0kill%                  -> skirmishes where no unit ever died (degenerate stalemates)
   - Drag                    -> avg trailing turns with NO kill before the game ended,
                                over ATTRITION endings only (HQ endings have Drag 0 by
                                definition). ~32 = a no-kill grind; high = circling.
   - Swings                  -> avg times the field-score lead flipped to the OTHER
                                side per skirmish. High = real back-and-forth (you can
                                feel you'll come back); 0 = one side led wire-to-wire.
   - Card report             -> Simple%/1stSight%/AvgSeen per card (per-card Win% is
                                computed but not printed; see docs/report-model.md)

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

/* ---------------- matchup mode: how much does skill matter? ---------------- */
function matchup(n, a, b, maps, decks) {
  var pairs = (a && b) ? [[a, b]] : [
    ['normal', 'easy'],
    ['hard', 'normal'],
    ['hard', 'easy'],
    ['normal', 'normal'] // sanity baseline, should be ~50
  ];
  console.log('Skill-vs-luck report: ' + n + ' skirmishes per map per pairing, ' + maps.length + ' maps.');
  console.log('Each pairing also swaps sides so colour bias cancels out.' +
    (decks ? ' Decks swap WITH the AI so each keeps a fixed deck (skill, not deck, is measured).' : '') + '\n');
  // The strong AI sits red in r1, blue in r2. If decks stayed seat-bound
  // the strong AI would swap decks between orientations and the premium would fold
  // in deck strength — so swap the decks alongside the sides, pinning each AI to
  // one deck across both halves.
  var decks2 = decks ? { red: decks.blue, blue: decks.red } : null;
  var results = [];
  pairs.forEach(function (pr) {
    var strong = pr[0], weak = pr[1];
    var sWins = 0, games = 0;
    maps.forEach(function (map, mi) {
      var h1 = Math.ceil(n / 2), h2 = Math.floor(n / 2);
      var r1 = SIM.balanceMap(map, h1, { diffRed: strong, diffBlue: weak, seedBase: (mi + 1) * 7919, decks: decks });
      var r2 = SIM.balanceMap(map, h2, { diffRed: weak, diffBlue: strong, seedBase: (mi + 1) * 7919 + 31, decks: decks2 });
      sWins += r1.redWins + ((h2 - r2.unfinished) - r2.redWins);
      games += (h1 - r1.unfinished) + (h2 - r2.unfinished);
      process.stdout.write('.');
    });
    var p = pct(sWins, games);
    results.push({ label: strong + ' vs ' + weak, p: p, games: games });
    console.log('  ' + pad(strong + ' vs ' + weak, 18, true) + ' stronger AI wins ' + p + '% of ' + games);
  });
  console.log('\nHow to read it: a clearly better player winning only ~50-55% means the');
  console.log('card draw decides most skirmishes (luck-heavy). 55-65% = luck and skill both');
  console.log('matter. 65%+ = skill dominates. The normal-vs-normal line is the ~50% sanity check.');
}

/* ---------------- per-map report ---------------- */
// mapsetArg: the --mapset value `maps` was resolved from (null = active pool) —
// a run-identity stamp only, doesn't affect which maps run.
function mapReport(n, diff, filter, maps, mapsetArg, decks) {
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
        deck: deckLabel,
        mapset: mapsetArg || (E.activeMapset() && E.activeMapset().id) || 'all',
        seedBase: 7919 // the SAME base the per-map (mi+1)*7919 schedule below multiplies
      });
    } catch (e) { dbh = null; runId = null; }
  }

  console.log('Simulating ' + n + ' skirmishes per map (' + maps.length + ' maps, ' + diff + ' AI)...' +
    (dbh ? '  [persisting to logs/woa.db]' : '') + '\n');
  var header = pad('Map', 16, true) + pad('Shape', 11, true) +
    pad('Red%', 6) + pad('Blue%', 7) + pad('1st%', 6) + pad('2nd%', 6) +
    pad('HQ%', 6) + pad('Turns', 7) + pad('FSdiff', 8) +
    pad('Atk%', 6) + pad('Swp%', 6) + pad('0kill%', 8) +
    pad('Drag', 7) + pad('Swings', 8) + '  notes';
  console.log(header);
  console.log(new Array(header.length + 1).join('-'));

  var mapRows = []; // [{agg, done}] for the shared foldGlobal

  maps.forEach(function (map, mi) {
    var seedBase = (mi + 1) * 7919;
    var r = SIM.balanceMap(map, n, { diffRed: diff, diffBlue: diff, seedBase: seedBase, decks: decks,
      onGame: dbh && function (g1, nn, st) {
        try {
          db.insertSkirmish(dbh, runId, st, SIM.balanceFP(g1 - 1), { seed: SIM.balanceSeed(seedBase, g1 - 1), version: E.VERSION });
        } catch (e) { /* persistence is best-effort */ }
      } });
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
  // docs/report-model.md#reporting-doctrine.
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
  console.log('            (deck-size-proof). Low attack% + high swap% = the AIs shuffle units');
  console.log('            instead of fighting (the stalemate failure mode).');
  console.log('  zero-kill skirmishes  nobody died all skirmish: degenerate, should be ~0%.');
  console.log('  units fielded  share of all reserves that ever deployed. Low = turtling at home.');
  console.log('  reserves at end (HQ endings only)  share of a side\'s pieces still undeployed at an');
  console.log('            HQ capture — an HQ rush ends before a side commits its reserves, so this');
  console.log('            reads meaningfully only on that slice (attrition endings run to deck-out).');
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
// Seat a different deck per side. --deck-red/--deck-blue take a deck
// id or name from content/decks/; omit either to leave that side on the active
// deck. No flags = both sides share the active deck (default).
var deckRed = null, dri = args.indexOf('--deck-red');
if (dri >= 0) { deckRed = args[dri + 1]; args.splice(dri, 2); }
var deckBlue = null, dbi = args.indexOf('--deck-blue');
if (dbi >= 0) { deckBlue = args[dbi + 1]; args.splice(dbi, 2); }
var decks = (deckRed || deckBlue) ? { red: deckRed, blue: deckBlue } : null;
var activeId = (E.ACTIVE_DECK && E.ACTIVE_DECK.id) || null;
// runs.deck stays a single id in the common case (other writers store one id);
// only genuinely-different decks get the "X vs Y" composite.
var deckLabel = activeId;
if (decks) {
  try { E.resolveDeck(decks.red); E.resolveDeck(decks.blue); }   // fail fast on a bad name
  catch (e) { console.log(e.message); process.exit(1); }
  var redId = decks.red || activeId, blueId = decks.blue || activeId;
  deckLabel = redId === blueId ? redId : redId + ' vs ' + blueId;
  console.log('Decks: red = ' + (redId || 'active') + ', blue = ' + (blueId || 'active') + '\n');
}
if (args[0] === 'matchup') {
  // node dev/balance.js matchup [n] [aiA aiB]  — aiA/aiB may be any AI_PRESETS
  // name (easy/normal/hard or a maps.js "ai" personality)
  var rest = args.slice(1).filter(function (a) { return !/^\d+$/.test(a); });
  rest.forEach(function (a) {
    if (!E.AI_PRESETS[a]) { console.log('Unknown AI "' + a + '". Known: ' + Object.keys(E.AI_PRESETS).join(', ')); process.exit(1); }
  });
  matchup(Math.max(2, +(args.filter(function (a) { return /^\d+$/.test(a); })[0]) || 12), rest[0], rest[1], mapsForSet(setArg), decks);
} else {
  var n = 24, diff = 'normal', filter = null;
  args.forEach(function (a) {
    if (/^\d+$/.test(a)) n = Math.max(2, +a);
    else if (E.AI_PRESETS[a]) diff = a; // easy/normal/hard or a maps.js personality
    else filter = filter ? filter + ' ' + a : a;
  });
  mapReport(n, diff, filter, mapsForSet(setArg), setArg, decks);
}
