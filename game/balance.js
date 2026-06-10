/* War of Attrition — balance lab.
   Runs AI-vs-AI battles on every built-in map and reports what the numbers say.

     node balance.js              24 battles per map, normal AI
     node balance.js 60           60 battles per map
     node balance.js 60 easy      ...with the easy AI

   Reading the report:
   - Red%/Blue% far from 50  -> the map itself favours a side (positions/terrain)
   - 1st%/2nd% far from 50   -> mover advantage on that map
   - HQ% near 0              -> nobody can crack the HQ; battles always grind to attrition
   - Turns                   -> pacing; the deck caps a battle at 32 plays
   - Card report             -> how often each card was in the WINNER's spent pile
                                when it got played at all (55%+ = strong, 45%- = weak)
*/
var E = require('./engine.js');

var N = Math.max(2, +(process.argv[2] || 24));
var DIFF = process.argv[3] === 'easy' ? 'easy' : 'normal';

function playBattle(map, seed, firstPlayer) {
  var match = E.newMatch({ seed: seed, maps: [map], firstPlayer: firstPlayer });
  var st = E.newBattle(match);
  var guard = 0;
  while (st.phase !== 'battle-over' && guard++ < 400) {
    var plan = E.aiPlanTurn(st, DIFF);
    if (!plan) break;
    E.playCard(st, plan.cardId, plan.mode || 'normal');
    var g2 = 0;
    while (st.phase === 'step' && g2++ < 12) {
      var c = plan.choices.shift() || { skip: true };
      try { E.applyStep(st, c); }
      catch (e) { try { E.applyStep(st, { skip: true }); } catch (e2) { break; } }
    }
  }
  return st;
}

function pct(a, b) { return b ? Math.round(100 * a / b) : 0; }
function pad(s, w, right) {
  s = String(s);
  while (s.length < w) s = right ? s + ' ' : ' ' + s;
  return s;
}

console.log('Simulating ' + N + ' battles per map (' + E.MAPS.length + ' maps, ' + DIFF + ' AI)...\n');

var cardPlays = {}, cardWins = {};
E.CARDS.forEach(function (c) { cardPlays[c.id] = 0; cardWins[c.id] = 0; });

var header = pad('Map', 16, true) + pad('Shape', 11, true) +
  pad('Red%', 6) + pad('Blue%', 7) + pad('1st%', 6) + pad('2nd%', 6) +
  pad('HQ%', 6) + pad('Turns', 7) + pad('VPdiff', 8) + '  notes';
console.log(header);
console.log(new Array(header.length + 1).join('-'));

var G = { red: 0, first: 0, hq: 0, games: 0, turns: 0 };

E.MAPS.forEach(function (map, mi) {
  var red = 0, first = 0, hq = 0, turns = 0, vpDiff = 0;
  for (var g = 0; g < N; g++) {
    var fp = g % 2 === 0 ? 'red' : 'blue';
    var st = playBattle(map, (mi + 1) * 7919 + g * 104729 + 13, fp);
    var w = st.battleWinner;
    if (w === 'red') red++;
    if (w === fp) first++;
    if (st.winType === 'hq') hq++;
    turns += st.turnNumber;
    vpDiff += Math.abs(st.vp.red - st.vp.blue);
    ['red', 'blue'].forEach(function (p) {
      st.removed[p].forEach(function (cid) {
        cardPlays[cid]++;
        if (p === w) cardWins[cid]++;
      });
    });
  }
  G.red += red; G.first += first; G.hq += hq; G.games += N; G.turns += turns;

  var notes = [];
  if (pct(red, N) >= 62 || pct(red, N) <= 38) notes.push('SIDE-BIASED');
  if (pct(first, N) >= 62) notes.push('1st-mover strong');
  if (pct(first, N) <= 38) notes.push('2nd-mover strong');
  if (pct(hq, N) <= 8) notes.push('attrition-only');
  if (pct(hq, N) >= 55) notes.push('HQ-rushable');
  console.log(
    pad(map.name, 16, true) + pad(map.shape, 11, true) +
    pad(pct(red, N), 6) + pad(pct(N - red, N), 7) +
    pad(pct(first, N), 6) + pad(pct(N - first, N), 6) +
    pad(pct(hq, N), 6) + pad((turns / N).toFixed(1), 7) +
    pad((vpDiff / N).toFixed(1), 8) + '  ' + notes.join(', ')
  );
});

console.log('\nOverall: red ' + pct(G.red, G.games) + '% | first mover ' + pct(G.first, G.games) +
  '% | HQ captures ' + pct(G.hq, G.games) + '% | avg battle ' + (G.turns / G.games).toFixed(1) + ' turns');

console.log('\nCard report (share of plays that were by the eventual winner):');
var rows = E.CARDS.map(function (c) {
  return { name: c.name, plays: cardPlays[c.id], winPct: pct(cardWins[c.id], cardPlays[c.id]) };
}).sort(function (a, b) { return b.winPct - a.winPct; });
rows.forEach(function (r) {
  var bar = new Array(Math.max(1, Math.round(r.winPct / 4))).join('#');
  console.log(pad(r.name, 20, true) + pad(r.winPct + '%', 5) + pad('(' + r.plays + ' plays)', 13) + '  ' + bar);
});
console.log('\n(50% = neutral. The starting Deploy Infantry is played in nearly every game, so it sits at ~50% by definition.)');
