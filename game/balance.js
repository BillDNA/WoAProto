/* War of Attrition — balance lab.
   Runs AI-vs-AI battles and reports what the numbers say.

     node balance.js                     24 battles per map, normal AI, all maps
     node balance.js 60                  60 battles per map
     node balance.js 60 hard             ...with the Field Marshal AI
     node balance.js 40 narrows          only maps whose name matches "narrows"
                                         (all content/maps/*.js are included)
     node balance.js matchup             skill-vs-luck report: better AIs fight
     node balance.js matchup 16          worse ones; the stronger side's win rate
                                         is the skill premium. ~50% = card-draw
                                         luck decides; 65%+ = skill decides.
     node balance.js matchup 16 brawler turtle
                                         pit any two AI personalities (built-in
                                         easy/normal/hard or a maps.js "ai" row)
     node balance.js 40 brawler          per-map report with a personality

   Reading the map report:
   - Red%/Blue% far from 50  -> the map itself favours a side (positions/terrain)
   - 1st%/2nd% far from 50   -> mover advantage on that map
   - HQ% near 0              -> nobody can crack the HQ; battles always grind to attrition
   - Turns                   -> pacing; the deck caps a battle at 32 plays
   - Atk/Swp                 -> attacks and swaps per battle: AI behaviour health.
                                Low Atk + high Swp = swap-dancing instead of fighting
   - 0kill%                  -> battles where no unit ever died (degenerate stalemates)
   - Drag                    -> avg trailing turns with NO kill before the game ended
                                (0 = ended on a kill/HQ capture; ~32 = a no-kill grind).
                                High = the AIs marched in circles before it was over.
   - Swings                  -> avg times the field-score lead flipped to the OTHER
                                side per battle. High = real back-and-forth (you can
                                feel you'll come back); 0 = one side led wire-to-wire.
   - Card report             -> Simple%/1stSight%/AvgSeen per card (per-card Win% was
                                dropped from print, WOA-019: dead at n=700, still in logs/woa.db)

   Attrition victory (June 2026 rules): the player with more VP of SURVIVING
   units on the board wins when the cards run out; reserves count for nothing.
*/
var E = require('./engine.js');
// Shared report model: thresholds, folds, card-row derivation (report-model.js
// is the ONE copy — this file keeps only its terminal formatting).
var R = require('./report-model.js');
var fs = require('fs');
var path = require('path');

var pct = R.pct;
function pad(s, w, right) {
  s = String(s);
  while (s.length < w) s = right ? s + ' ' : ' ' + s;
  return s;
}

// Roster selection (V1 map-sets): default = the ACTIVE map-set's pool (one
// shared roster across play modes + tools); `--mapset <id>` picks a specific
// set; `--mapset all` = every map on disk.
function rosterFor(setArg) {
  if (!setArg) return E.mapPool();
  if (setArg === 'all') return E.MAPS;
  var set = E.MAPSETS.filter(function (s) { return s.id === setArg; })[0];
  if (!set) {
    console.log('Unknown map-set "' + setArg + '". Known: ' + (E.MAPSETS.map(function (s) { return s.id; }).join(', ') || 'none') + ', all');
    process.exit(1);
  }
  return E.MAPS.filter(function (m) { return set.maps.indexOf(m.id) >= 0 || set.maps.indexOf(m.name) >= 0; });
}

/* ---------------- matchup mode: how much does skill matter? ---------------- */
function matchup(n, a, b, maps) {
  var pairs = (a && b) ? [[a, b]] : [
    ['normal', 'easy'],
    ['hard', 'normal'],
    ['hard', 'easy'],
    ['normal', 'normal'] // sanity baseline, should be ~50
  ];
  console.log('Skill-vs-luck report: ' + n + ' battles per map per pairing, ' + maps.length + ' maps.');
  console.log('Each pairing also swaps sides so colour bias cancels out.\n');
  var results = [];
  pairs.forEach(function (pr) {
    var strong = pr[0], weak = pr[1];
    var sWins = 0, games = 0;
    maps.forEach(function (map, mi) {
      var h1 = Math.ceil(n / 2), h2 = Math.floor(n / 2);
      var r1 = E.balanceMap(map, h1, { diffRed: strong, diffBlue: weak, seedBase: (mi + 1) * 7919 });
      var r2 = E.balanceMap(map, h2, { diffRed: weak, diffBlue: strong, seedBase: (mi + 1) * 7919 + 31 });
      sWins += r1.redWins + ((h2 - r2.unfinished) - r2.redWins);
      games += (h1 - r1.unfinished) + (h2 - r2.unfinished);
      process.stdout.write('.');
    });
    var p = pct(sWins, games);
    results.push({ label: strong + ' vs ' + weak, p: p, games: games });
    console.log('  ' + pad(strong + ' vs ' + weak, 18, true) + ' stronger AI wins ' + p + '% of ' + games);
  });
  console.log('\nHow to read it: a clearly better player winning only ~50-55% means the');
  console.log('card draw decides most battles (luck-heavy). 55-65% = luck and skill both');
  console.log('matter. 65%+ = skill dominates. The normal-vs-normal line is the ~50% sanity check.');
}

/* ---------------- per-map report ---------------- */
function mapReport(n, diff, filter, maps) {
  if (filter) {
    maps = maps.filter(function (m) { return m.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0; });
    if (!maps.length) { console.log('No map matches "' + filter + '".'); return; }
  }
  var probs = E.validateMaps(maps);
  if (probs.length) { console.log('Fix these first:\n  ' + probs.join('\n  ')); return; }

  console.log('Simulating ' + n + ' battles per map (' + maps.length + ' maps, ' + diff + ' AI)...\n');
  var header = pad('Map', 16, true) + pad('Shape', 11, true) +
    pad('Red%', 6) + pad('Blue%', 7) + pad('1st%', 6) + pad('2nd%', 6) +
    pad('HQ%', 6) + pad('Turns', 7) + pad('VPdiff', 8) +
    pad('Atk', 6) + pad('Swp', 6) + pad('0kill%', 8) +
    pad('Drag', 7) + pad('Swings', 8) + '  notes';
  console.log(header);
  console.log(new Array(header.length + 1).join('-'));

  var mapRows = []; // [{agg, done}] for the shared foldGlobal

  maps.forEach(function (map, mi) {
    var r = E.balanceMap(map, n, { diffRed: diff, diffBlue: diff, seedBase: (mi + 1) * 7919 });
    var done = n - r.unfinished;
    mapRows.push({ agg: r, done: done });
    var notes = R.mapNotes(r, done);
    console.log(
      pad(map.name.slice(0, 15), 16, true) + pad(map.shape || '?', 11, true) +
      pad(pct(r.redWins, done), 6) + pad(pct(done - r.redWins, done), 7) +
      pad(pct(r.firstWins, done), 6) + pad(pct(done - r.firstWins, done), 6) +
      pad(pct(r.hqWins, done), 6) + pad((r.turns / Math.max(1, done)).toFixed(1), 7) +
      pad((r.vpDiff / Math.max(1, done)).toFixed(1), 8) +
      pad((r.attacks / Math.max(1, done)).toFixed(1), 6) +
      pad((r.swaps / Math.max(1, done)).toFixed(1), 6) +
      pad(pct(r.zeroKill, done), 8) +
      pad((r.killTail / Math.max(1, done)).toFixed(1), 7) +
      pad((r.leadChanges / Math.max(1, done)).toFixed(1), 8) + '  ' + notes.join(', ')
    );
  });

  var G = R.foldGlobal(mapRows);
  console.log('\nOverall: red ' + pct(G.red, G.games) + '% | first mover ' + pct(G.first, G.games) +
    '% | HQ captures ' + pct(G.hq, G.games) + '% | avg battle ' + (G.turns / Math.max(1, G.games)).toFixed(1) + ' turns');
  console.log('Behaviour: ' + (G.attacks / Math.max(1, G.games)).toFixed(1) + ' attacks & ' +
    (G.swaps / Math.max(1, G.games)).toFixed(1) + ' swaps per battle | zero-kill battles ' + pct(G.zeroKill, G.games) +
    '% | ' + Math.round(100 * G.depShare / Math.max(1, G.games)) + '% of units ever fielded');
  console.log('Reserves at end: red holds ' + Math.round(100 * G.resEndRed / Math.max(1, G.games)) +
    '% of its pieces undeployed | blue holds ' + Math.round(100 * G.resEndBlue / Math.max(1, G.games)) + '%');
  console.log('Decisiveness: tie-goes-to-2nd decided ' + pct(G.tiebreak, G.games) +
    '% of battles | first blood won ' + pct(G.fbWins, G.fbGames) + '% of the ' + pct(G.fbGames, G.games) +
    '% of battles that had a kill | side holding more hexes won ' + pct(G.ctlWins, G.ctlGames) + '%');
  console.log('Pacing: ' + (G.killTail / Math.max(1, G.games)).toFixed(1) + ' kill-less turns before game end (0=decisive, ~32=circling) | ' +
    (G.leadChanges / Math.max(1, G.games)).toFixed(1) + ' lead swings per battle (higher = more back-and-forth)');

  console.log('\nCard report (' + G.games + ' battles of AI play — biases noted below):');
  // Win% dropped from print July 2026 (WOA-019): dead at n=700, all cards read
  // 49-52 against the +/-8 rubric threshold — still computed in cardRows()
  // and recorded per-battle in logs/woa.db, just not shown here.
  var ch = pad('Card', 20, true) + pad('Simple%', 9) + pad('1stSight%', 11) + pad('AvgSeen', 9) + pad('plays', 8);
  console.log(ch);
  console.log(new Array(ch.length + 1).join('-'));
  R.cardRows(G.cards, E.CARDS).forEach(function (r) {
    console.log(pad(r.name, 20, true) + pad(r.simple + '%', 9) +
      pad(r.sight + '%', 11) + pad(r.seen, 9) + pad(r.plays, 8));
  });
  console.log('\nHow to read it:');
  console.log('  Simple%   resolved as a basic attack/reposition instead of the printed action.');
  console.log('            High = the printed action often was not worth it. (Bias: when the AI');
  console.log('            burns a card it prefers its least precious one, per CARD_KEEP.)');
  console.log('  1stSight% played the first time it ever appeared in hand. High + low AvgSeen =');
  console.log('            always-good on sight (overpowered watchlist).');
  console.log('  AvgSeen   hand-appearances before it got played. High = situational/hoarded.');
  console.log('\nBehaviour & decisiveness lines:');
  console.log('  attacks/swaps per battle  AI play health. Low attacks + high swaps = the AIs');
  console.log('            shuffle units instead of fighting (the round-6 stalemate bug).');
  console.log('  zero-kill battles  nobody died all battle: degenerate, should be ~0%.');
  console.log('  units fielded  share of all reserves that ever deployed. Low = turtling at home.');
  console.log('  reserves at end  share of a side\'s pieces still undeployed when the battle ended');
  console.log('            (per side, unlike "units fielded" above). High = that side hoarded pieces');
  console.log('            instead of committing them — the instrument for the "saving reserves wins"');
  console.log('            felt-note; cross-reference against Red%/1st% to see if it correlates with winning.');
  console.log('  tie-goes-to-2nd  attrition wins with EQUAL field scores. High = that one rule');
  console.log('            is deciding battles, not play.');
  console.log('  first blood won  how often the first kill decided the battle. Very high = one');
  console.log('            early trade decides everything (snowbally).');
  console.log('  more hexes won  does board control track winning? Near 50% = holding ground');
  console.log('            is decorative under the current victory rules.');
  console.log('  kill-less turns before end  how long the AIs shuffled with nobody dying before');
  console.log('            the game ended. 0 = a decisive finish; high = marching in circles.');
  console.log('  lead swings  times the field-score lead flipped sides per battle. High = a real');
  console.log('            back-and-forth (a losing player can feel a comeback); 0 = wire-to-wire.');
}

/* ---------------- args ---------------- */
var args = process.argv.slice(2);
var setArg = null, si = args.indexOf('--mapset');
if (si >= 0) { setArg = args[si + 1]; args.splice(si, 2); }
if (args[0] === 'matchup') {
  // node balance.js matchup [n] [aiA aiB]  — aiA/aiB may be any AI_PRESETS
  // name (easy/normal/hard or a maps.js "ai" personality)
  var rest = args.slice(1).filter(function (a) { return !/^\d+$/.test(a); });
  rest.forEach(function (a) {
    if (!E.AI_PRESETS[a]) { console.log('Unknown AI "' + a + '". Known: ' + Object.keys(E.AI_PRESETS).join(', ')); process.exit(1); }
  });
  matchup(Math.max(2, +(args.filter(function (a) { return /^\d+$/.test(a); })[0]) || 12), rest[0], rest[1], rosterFor(setArg));
} else {
  var n = 24, diff = 'normal', filter = null;
  args.forEach(function (a) {
    if (/^\d+$/.test(a)) n = Math.max(2, +a);
    else if (E.AI_PRESETS[a]) diff = a; // easy/normal/hard or a maps.js personality
    else filter = filter ? filter + ' ' + a : a;
  });
  mapReport(n, diff, filter, rosterFor(setArg));
}
