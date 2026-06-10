/* War of Attrition — balance lab.
   Runs AI-vs-AI battles and reports what the numbers say.

     node balance.js                     24 battles per map, normal AI, all maps
     node balance.js 60                  60 battles per map
     node balance.js 60 hard             ...with the Field Marshal AI
     node balance.js 40 narrows          only maps whose name matches "narrows"
                                         (custom maps from custom-maps.js included)
     node balance.js matchup             skill-vs-luck report: better AIs fight
     node balance.js matchup 16          worse ones; the stronger side's win rate
                                         is the skill premium. ~50% = card-draw
                                         luck decides; 65%+ = skill decides.

   Reading the map report:
   - Red%/Blue% far from 50  -> the map itself favours a side (positions/terrain)
   - 1st%/2nd% far from 50   -> mover advantage on that map
   - HQ% near 0              -> nobody can crack the HQ; battles always grind to attrition
   - Turns                   -> pacing; the deck caps a battle at 32 plays
   - Card report             -> how often each card was in the WINNER's spent pile
                                when it got played at all (55%+ = strong, 45%- = weak)
*/
var E = require('./engine.js');
var fs = require('fs');
var path = require('path');

function loadCustomMaps() {
  try {
    var txt = fs.readFileSync(path.join(__dirname, 'custom-maps.js'), 'utf8');
    var eq = txt.indexOf('=');
    if (eq >= 0 && txt.trim().charAt(0) !== '[') txt = txt.slice(eq + 1);
    var arr = JSON.parse(txt.trim().replace(/;\s*$/, ''));
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
function pad(s, w, right) {
  s = String(s);
  while (s.length < w) s = right ? s + ' ' : ' ' + s;
  return s;
}

/* ---------------- matchup mode: how much does skill matter? ---------------- */
function matchup(n) {
  var maps = E.MAPS;
  var pairs = [
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
function mapReport(n, diff, filter) {
  var maps = E.MAPS.concat(loadCustomMaps());
  if (filter) {
    maps = maps.filter(function (m) { return m.name.toLowerCase().indexOf(filter.toLowerCase()) >= 0; });
    if (!maps.length) { console.log('No map matches "' + filter + '".'); return; }
  }
  var probs = E.validateMaps(maps);
  if (probs.length) { console.log('Fix these first:\n  ' + probs.join('\n  ')); return; }

  console.log('Simulating ' + n + ' battles per map (' + maps.length + ' maps, ' + diff + ' AI)...\n');
  var header = pad('Map', 16, true) + pad('Shape', 11, true) +
    pad('Red%', 6) + pad('Blue%', 7) + pad('1st%', 6) + pad('2nd%', 6) +
    pad('HQ%', 6) + pad('Turns', 7) + pad('VPdiff', 8) + '  notes';
  console.log(header);
  console.log(new Array(header.length + 1).join('-'));

  var G = { red: 0, first: 0, hq: 0, games: 0, turns: 0 };
  var cardPlays = {}, cardWins = {};

  maps.forEach(function (map, mi) {
    var r = E.balanceMap(map, n, { diffRed: diff, diffBlue: diff, seedBase: (mi + 1) * 7919 });
    var done = n - r.unfinished;
    G.red += r.redWins; G.first += r.firstWins; G.hq += r.hqWins; G.games += done; G.turns += r.turns;
    Object.keys(r.cards).forEach(function (cid) {
      cardPlays[cid] = (cardPlays[cid] || 0) + r.cards[cid].plays;
      cardWins[cid] = (cardWins[cid] || 0) + r.cards[cid].wins;
    });
    var notes = [];
    if (pct(r.redWins, done) >= 62 || pct(r.redWins, done) <= 38) notes.push('SIDE-BIASED');
    if (pct(r.firstWins, done) >= 62) notes.push('1st-mover strong');
    if (pct(r.firstWins, done) <= 38) notes.push('2nd-mover strong');
    if (pct(r.hqWins, done) <= 8) notes.push('attrition-only');
    if (pct(r.hqWins, done) >= 55) notes.push('HQ-rushable');
    console.log(
      pad(map.name.slice(0, 15), 16, true) + pad(map.shape || '?', 11, true) +
      pad(pct(r.redWins, done), 6) + pad(pct(done - r.redWins, done), 7) +
      pad(pct(r.firstWins, done), 6) + pad(pct(done - r.firstWins, done), 6) +
      pad(pct(r.hqWins, done), 6) + pad((r.turns / Math.max(1, done)).toFixed(1), 7) +
      pad((r.vpDiff / Math.max(1, done)).toFixed(1), 8) + '  ' + notes.join(', ')
    );
  });

  console.log('\nOverall: red ' + pct(G.red, G.games) + '% | first mover ' + pct(G.first, G.games) +
    '% | HQ captures ' + pct(G.hq, G.games) + '% | avg battle ' + (G.turns / Math.max(1, G.games)).toFixed(1) + ' turns');

  console.log('\nCard report (share of plays that were by the eventual winner):');
  var rows = E.CARDS.map(function (c) {
    return { name: c.name, plays: cardPlays[c.id] || 0, winPct: pct(cardWins[c.id] || 0, cardPlays[c.id] || 0) };
  }).sort(function (a, b) { return b.winPct - a.winPct; });
  rows.forEach(function (r) {
    var bar = new Array(Math.max(1, Math.round(r.winPct / 4))).join('#');
    console.log(pad(r.name, 20, true) + pad(r.winPct + '%', 5) + pad('(' + r.plays + ' plays)', 14) + '  ' + bar);
  });
  console.log('\n(50% = neutral; the guaranteed starting card sits at ~50% by definition.)');
}

/* ---------------- args ---------------- */
var args = process.argv.slice(2);
if (args[0] === 'matchup') {
  matchup(Math.max(2, +(args[1]) || 12));
} else {
  var n = 24, diff = 'normal', filter = null;
  args.forEach(function (a) {
    if (/^\d+$/.test(a)) n = Math.max(2, +a);
    else if (a === 'easy' || a === 'normal' || a === 'hard') diff = a;
    else filter = filter ? filter + ' ' + a : a;
  });
  mapReport(n, diff, filter);
}
