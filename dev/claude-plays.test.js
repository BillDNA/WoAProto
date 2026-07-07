#!/usr/bin/env node
/* dev/claude-plays.test.js — the honest-info invariant + prompt-surface tests.
   Run: node dev/claude-plays.test.js   (offline; no claude spawns)

   THE test the V1 spec demands: plant a sentinel card in the ENEMY's hidden
   hand and prove it cannot leak into any prompt surface the LLM sees. The
   sentinel is a card id/name that exists nowhere else, so a single string
   match is a proof, not a heuristic. */
'use strict';

const path = require('path');
const E = require(path.join(__dirname, '..', 'game', 'engine.js'));
const cp = require(path.join(__dirname, 'claude-plays.js'));

let fails = 0;
function ok(cond, msg) {
  if (cond) console.log('  ok - ' + msg);
  else { console.log('  FAIL - ' + msg); fails++; }
}

console.log('== honest-info sentinel ==');
// A card the real deck can never contain — if its id or name shows up in a
// red-side prompt, hidden information leaked.
const SENTINEL = { id: 'zz_hidden_sentinel', name: 'ZZHIDDENSENTINEL', text: 'you should never see this', steps: [{ type: 'attack' }], count: 1 };

// Build the battle FIRST (so the ordinary decks can't deal the sentinel to
// red), then register the card and plant it in blue's HIDDEN zones only.
const match = E.newMatch({ maps: [E.MAPS[0]], seed: 424242, firstPlayer: 'red' });
const st = E.newBattle(match);
E.CARDS.push(SENTINEL);
E.CARD_BY_ID[SENTINEL.id] = SENTINEL;
st.hands.blue.push(SENTINEL.id);
st.decks.blue.push(SENTINEL.id);

function leaks(text) { return text.indexOf('zz_hidden_sentinel') >= 0 || text.indexOf('ZZHIDDENSENTINEL') >= 0; }

const surfaces = [];
surfaces.push(['stateView with hand', cp.stateView(st, 'red', true, { targetWins: 3, wins: match.wins, battlesPlayed: 0 })]);
surfaces.push(['stateView without hand', cp.stateView(st, 'red', false, null)]);
surfaces.push(['card options', cp.cardOptions(st, 'red').map(function (o) { return o.desc; }).join('\n')]);
E.playCard(st, st.hands.red[0], 'normal'); // into a step
if (st.phase === 'step') {
  const so = E.stepOptions(st);
  const list = cp.stepChoiceList(st, 15, false);
  surfaces.push(['step header', cp.stepHeader(so)]);
  surfaces.push(['step choices', list.choices.map(function (c) { return cp.describeChoice(st, so, c); }).join('\n')]);
}
surfaces.push(['rules text', cp.RULES]);
surfaces.push(['system prompt', cp.sysPrompt('red', 3)]);
surfaces.forEach(function (s) {
  ok(!leaks(s[1]), s[0] + ' never shows the enemy hidden card');
});
ok(cp.stateView(st, 'blue', true, null).indexOf('ZZHIDDENSENTINEL') >= 0,
  "control: BLUE's own view DOES show its card (the sentinel is really there)");

console.log('== enemy hand shown as count only ==');
const view = cp.stateView(st, 'red', true, null);
ok(/holds \d+ hidden cards/.test(view), 'enemy hand appears as a count');

console.log('== rules text matches the live rules version ==');
ok(cp.RULES.indexOf('v' + E.VERSION) >= 0, 'RULES header carries v' + E.VERSION);
ok(/denies attacker support|attacker support cannot cross a TRENCHED border/i.test(cp.RULES),
  'RULES teach 1.0 trench semantics (support denial, not +1 defense)');
ok(!/trench covers the attacked edge|\+ 1 if a trench/i.test(cp.RULES), 'no stale trench +1-defense wording');
ok(/RIVERS block nothing in combat/i.test(cp.RULES), 'RULES teach 1.0 river semantics');
ok(/DIFFERENT types/.test(cp.RULES), 'RULES teach the same-type swap ban');

console.log('== ranked option diet ==');
const m2 = E.newMatch({ maps: [E.MAPS[0]], seed: 77, firstPlayer: 'red' });
const st2 = E.newBattle(m2);
E.playCard(st2, st2.hands.red[0], 'normal');
if (st2.phase === 'step') {
  const all = E.enumerateChoices(st2);
  const l1 = cp.stepChoiceList(st2, 15, false);
  ok(l1.total === all.length, 'total reports the full legal count');
  ok(l1.choices.length <= all.length, 'diet never exceeds the legal list');
  ok(l1.choices.some(function (c) { return c.skip; }), 'skip stays listed');
  const l2 = cp.stepChoiceList(st2, 15, true);
  ok(l2.choices.length === all.length && !l2.pruned, '--full-options shows everything');
  const l3 = cp.stepChoiceList(st2, 3, false);
  ok(l3.choices.every(function (c) {
    return all.some(function (a) { return JSON.stringify(a) === JSON.stringify(c); });
  }), 'every dieted choice is a real legal option');
}

console.log(fails === 0 ? '\nCLAUDE-PLAYS TESTS PASSED' : '\n' + fails + ' FAILURES');
process.exit(fails === 0 ? 0 : 1);
