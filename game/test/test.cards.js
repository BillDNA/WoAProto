/* Auto-split from game/test.js (ADR-0003: node:test). Subsystem: cards.
   Frozen-API entry game/test.js delegates here; run this file directly with
   `node game/test.cards.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E, SIM, testSkirmish, fixtureCard } = require('./test.helpers.js');

test('noOpener cards never in the opening hand (e.g. Airdrop)', () => {
(function () {
  // Derive from the ACTIVE deck rather than hardcoding a card id/deck size, so a
  // deck that cuts every noOpener card still exercises the "nothing lost" bookkeeping.
  var noOpenerIds = E.CARDS.filter(function (c) { return c.noOpener; }).map(function (c) { return c.id; });
  var deckTotal = E.CARDS.reduce(function (s, c) { return s + c.count; }, 0);
  var bad = 0;
  for (var seed = 200; seed < 240; seed++) {
    var m = E.newBattle({ seed: seed, firstPlayer: 'red' });
    var st = E.newSkirmish(m);
    noOpenerIds.forEach(function (id) {
      if (st.cards.hands.red.indexOf(id) >= 0) bad++;
      if (st.cards.decks.red.indexOf(id) < 0) bad++;                  // returned to the deck
    });
    if (st.cards.decks.red.length + st.cards.hands.red.length !== deckTotal) bad++; // nothing lost
  }
  assert.ok(bad === 0, noOpenerIds.length + ' noOpener card(s) (' + noOpenerIds.join(', ') +
    ') excluded from 40 opening hands and returned to the deck (' + bad + ' problems)');
})();
});

test('house rule: play any card as basic attack/reposition', () => {
(function () {
  var st = testSkirmish(21);
  st.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.pieces.units['0,1'] = { type: 'cavalry', owner: 'blue' };
  var cid = st.cards.hands.red.filter(function (c) { return c !== 'attack_plus1'; })[0];
  E.playCard(st, cid, 'attack');
  var o = E.stepOptions(st);
  assert.ok(o.type === 'attack' && (o.mod || 0) === 0, 'card resolves as plain attack step');
  E.applyStep(st, { from: '0,0', to: '0,1' });
  assert.ok(st.cards.removed.red.indexOf(cid) >= 0, 'card still removed from game');
  // reposition mode
  var st2 = testSkirmish(22);
  st2.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  var cid2 = st2.cards.hands.red[0];
  E.playCard(st2, cid2, 'reposition');
  assert.ok(E.stepOptions(st2).type === 'reposition', 'card resolves as plain reposition step');
  // reposition is refused while a basic attack is possible
  var st3 = testSkirmish(23);
  st3.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  st3.pieces.units['0,1'] = { type: 'infantry', owner: 'blue' }; // a basic attack IS available
  var cid3 = st3.cards.hands.red[0];
  var threw = false;
  try { E.playCard(st3, cid3, 'reposition'); } catch (e) { threw = true; }
  assert.ok(threw, 'reposition refused while a basic attack is available');
  assert.ok(st3.flow.phase === 'choose-card' && st3.cards.hands.red.indexOf(cid3) >= 0, 'the refused card stays in hand');
})();
});

test('at least one step of a card must be played', () => {
(function () {
  // Red inf at 0,0 can only strike blue inf at 0,1 (both far from either HQ).
  var st = testSkirmish(31);
  st.pieces.units = { '0,0': { type: 'infantry', owner: 'red' }, '0,1': { type: 'infantry', owner: 'blue' } };
  st.cards.hands.red = ['mass_assault']; // two attack steps
  E.playCard(st, 'mass_assault');
  assert.ok(!E.mustPlayStep(st), 'step 1 is skippable — a later step can still act');
  E.applyStep(st, { skip: true }); // allowed: the second attack remains
  assert.ok(E.mustPlayStep(st), 'the last playable step cannot be skipped while the card has done nothing');
  var threw = false;
  try { E.applyStep(st, { skip: true }); } catch (e) { threw = true; }
  assert.ok(threw, 'engine refuses to skip the whole card');
  E.applyStep(st, { from: '0,0', to: '0,1' }); // playing an action satisfies the rule
  assert.ok(st.flow.phase !== 'step', 'once an action is played the card resolves');

  // Once one action is done, remaining steps ARE skippable.
  var st2 = testSkirmish(32);
  st2.pieces.units = { '0,0': { type: 'infantry', owner: 'red' } }; // lone unit, room to march, no enemies
  st2.cards.hands.red = ['forced_march']; // three reposition steps
  E.playCard(st2, 'forced_march');
  E.applyStep(st2, { from: '0,0', to: E.listRepositions(st2, 'red').moves[0].to });
  assert.ok(st2.flow.phase !== 'step' || !E.mustPlayStep(st2), 'after acting, later steps are skippable');

  // A card that genuinely cannot act anywhere still spends the turn (no-op).
  var st3 = testSkirmish(33);
  st3.pieces.units = {}; // no units -> no barrage targets, no attacks
  st3.cards.hands.red = ['naval_barrage']; // [barrage, attack]
  E.playCard(st3, 'naval_barrage');
  assert.ok(st3.flow.phase === 'choose-card' && st3.flow.current === 'blue', 'a truly dead card still ends the turn');
  var le = st3.journal.playLog[st3.journal.playLog.length - 1];
  assert.ok(le && le.noop, 'the dead card is logged as a no-op');
})();
});

test('deck composition (data-driven from maps.js)', () => {
(function () {
  var total = E.CARDS.reduce(function (a, c) { return a + c.count; }, 0);
  var st = testSkirmish(99);
  assert.ok(E.cardsRemaining(st, 'red') === total, 'skirmish starts with every card in deck+hand (' + total + ' per maps.js)');
  assert.ok(E.CARDS.some(function (c) { return c.starting; }), 'a starting card is defined');
  assert.ok(Object.keys(E.PIECE_TOTALS).length >= 2 && E.PIECE_TOTALS.trench >= 0, 'piece totals derive from maps.js: ' + JSON.stringify(E.PIECE_TOTALS));
})();
});

test('army-points (computed from steps, weight table pinned)', () => {
(function () {
  // Seeding intent: deploy > attack > reposition. Guard the ordering so a weight
  // edit that inverts it is a loud, deliberate diff.
  assert.ok(E.cardPoints({ steps: [{ type: 'deploy', unit: 'infantry' }] }) >
     E.cardPoints({ steps: [{ type: 'attack' }] }) &&
     E.cardPoints({ steps: [{ type: 'attack' }] }) >
     E.cardPoints({ steps: [{ type: 'reposition' }] }),
    'deploy > attack > reposition base costs');
  // Weight-table guardrail via a SYNTHETIC card (steps fixed here, NOT read from a
  // content file), so a POINTS-table edit is reviewed while editing any actual card
  // or the active deck reds nothing (assert the mechanism, never a content value).
  // Base: deploy-inf 3, attack (base 2, tieSpare +1, noAdvance +0.5) = 3.5. The 2nd
  // action escalates at combo[1]=2, so 3x1 + 3.5x2 = 10.
  var pointsProbe = { steps: [{ type: 'deploy', unit: 'infantry' }, { type: 'attack', tieSpare: true, noAdvance: true }] };
  assert.ok(E.cardPoints(pointsProbe) === 10, 'weight table + escalation: deploy-inf(x1) + tieSpare/noAdvance attack(x2) = 10 pts');
  // Action-stacking escalates superlinearly: N identical base-1 actions cost the running
  // Fibonacci sum (1, 1+2, 1+2+3, 1+2+3+5 = 1,3,6,11), never a flat N. A curve edit is a loud diff.
  var rep = function (n) { return E.cardPoints({ steps: Array.from({ length: n }, function () { return { type: 'reposition' }; }) }); };
  assert.ok(rep(1) === 1 && rep(2) === 3 && rep(3) === 6 && rep(4) === 11, 'combo escalation: 1/2/3/4 reposition = 1/3/6/11 pts (Fibonacci-weighted)');
  assert.ok(E.cardPoints({ steps: [] }) === 0 && E.battalionPoints({ cards: [] }) === 0, 'empty card / empty deck = 0');
  assert.ok(E.cardPoints({ steps: 'oops' }) === 0, 'malformed (non-array) steps score 0, not a throw — battalionProblems can still report the friendly error');
  // deck-value cap gate: every shipped deck sits under the budget (the
  // gate lets the deck editor call two asymmetric decks "matched"), and a deck
  // pushed over it is rejected — the same reject-on-validate as an oversized deck.
  var allDecks = (typeof global !== 'undefined' && global.WOA_CONTENT && global.WOA_CONTENT.battalions) || [];
  assert.ok(allDecks.length > 0 && allDecks.every(function (d) { return E.battalionPoints(d) <= E.BATTALION_POINTS_CAP; }),
    'all ' + allDecks.length + ' shipped decks are within the army-points cap (' + E.BATTALION_POINTS_CAP + ')');
  var overBudget = { cards: E.ACTIVE_BATTALION.cards.concat([{ id: 'gild', name: 'Gild', count: 1, steps: [{ type: 'deploy', unit: 'artillery' }, { type: 'attack', mod: 3 }] }]) };
  assert.ok(E.battalionPoints(overBudget) > E.BATTALION_POINTS_CAP, 'a deck pushed over the cap is over budget (gate rejects it)');
})();
});

test('mispricing residual (cardRows points + residual, soft flag)', () => {
(function () {
  var R = require('../report-model.js');
  var cards = [{ id: 'x', name: 'X' }, { id: 'y', name: 'Y' }, { id: 'z', name: 'Z' }, { id: 'w', name: 'W' }];
  var pts = { x: 4, y: 6, z: 2, w: 3 };
  var pointsOf = function (c) { return pts[c.id]; };
  // hand-computed: sumPts over PLAYED cards = 4+6+3 = 13 (z unplayed, excluded);
  // sumHqWins = 8+2+0 = 10. residX = (8/10 - 4/13)*13 = +10.4-4 = +6.4; residY = (2/10 - 6/13)*13 = 2.6-6 = -3.4.
  // w has hqPlays 3 < MIN_HQPLAYS(10) -> too thin, no residual despite plays+points.
  var agg = {
    x: { plays: 5, wins: 3, simple: 0, firstSight: 0, seenSum: 5, noop: 0, hqPlays: 12, hqWins: 8 },
    y: { plays: 5, wins: 2, simple: 0, firstSight: 0, seenSum: 5, noop: 0, hqPlays: 12, hqWins: 2 },
    z: { plays: 0, wins: 0, simple: 0, firstSight: 0, seenSum: 0, noop: 0, hqPlays: 0, hqWins: 0 },
    w: { plays: 5, wins: 1, simple: 0, firstSight: 0, seenSum: 5, noop: 0, hqPlays: 3, hqWins: 0 }
  };
  var byId = {};
  R.cardRows(agg, cards, pointsOf).forEach(function (r) { byId[r.id] = r; });
  assert.ok(byId.x.points === 4 && byId.y.points === 6, 'points column = cardPoints(card)');
  assert.ok(byId.x.resid === 6.4 && byId.y.resid === -3.4, 'residual = (winShare − priceShare)·ΣpricePlayed, hand-checked (+6.4 / -3.4)');
  assert.ok(byId.x.mispriced && byId.y.mispriced, '|resid| ≥ threshold flags both as mispriced');
  assert.ok(byId.z.resid === null && byId.z.mispriced === false, 'unplayed card gets no residual (null, unflagged)');
  assert.ok(byId.w.resid === null && byId.w.mispriced === false, 'thin HQ exposure (hqPlays < MISPRICE_MIN_HQPLAYS) -> no residual');
  // no HQ-slice wins to share out -> residual null (advisory, never a fabricated 0)
  var noHq = { x: { plays: 5, hqWins: 0 }, y: { plays: 5, hqWins: 0 } };
  var flatById = {};
  R.cardRows(noHq, cards, pointsOf).forEach(function (r) { flatById[r.id] = r; });
  assert.ok(flatById.x.resid === null && flatById.y.resid === null, 'Σ hqWins = 0 -> residual null for all');
  // no cardPoints supplied -> back-compat: points/resid absent, never flagged
  var plain = R.cardRows(agg, cards)[0];
  assert.ok(plain.points === null && plain.resid === null && plain.mispriced === false, 'cardPoints omitted -> points/resid null (unchanged table)');
})();
});

test('deploy step budget vs stock (no deploy fallback, oversubscription = broken content)', () => {
(function () {
  // Printed deploy steps per unit type, weighted by each card's deck count. A
  // single card can print more than one deploy step for the same type (e.g.
  // Conscription: two infantry steps on one card) and/or the same step can be
  // spread across several copies (e.g. Entrench x3, one infantry step each) --
  // both must count toward the total.
  function deploySumsByType(cards) {
    var sums = {};
    cards.forEach(function (c) {
      (c.steps || []).forEach(function (s) {
        if (s.type === 'deploy' && s.unit) sums[s.unit] = (sums[s.unit] || 0) + (c.count || 0);
      });
    });
    return sums;
  }
  // E.CARDS IS the active deck's resolved card list and E.PIECE_TOTALS the active
  // stock, so this checks exactly the live deck. There is NO deploy fallback:
  // printing more deploy steps for a type than its stock strands a unit / burns a
  // dead turn once the stock runs out.
  var deploySums = deploySumsByType(E.CARDS);
  Object.keys(E.PIECE_TOTALS).forEach(function (t) {
    if (t === 'trench') return; // trenches aren't a deploy-step unit type
    var printed = deploySums[t] || 0;
    assert.ok(printed <= E.PIECE_TOTALS[t],
      'active deck: ' + printed + ' printed ' + t + ' deploy steps <= stock ' + E.PIECE_TOTALS[t] +
      ' (got ' + printed + '/' + E.PIECE_TOTALS[t] + ')');
  });
})();
});

test('turn flow / first hand', () => {
(function () {
  var st = testSkirmish(11);
  assert.ok(st.cards.hands.red.length === 4, 'first hand has 4 cards');
  assert.ok(st.cards.hands.red.indexOf('deploy_inf_start') >= 0, 'starting card guaranteed in first hand');
  E.playCard(st, 'deploy_inf_start');
  var o = E.stepOptions(st);
  assert.ok(o.type === 'deploy' && o.targets.length === 3, 'starting deploy offers 3 hexes');
  E.applyStep(st, { hex: o.targets[0] });
  assert.ok(st.flow.current === 'blue' && st.cards.hands.blue.length === 4, 'turn passed to blue with 4 cards');
  assert.ok(st.cards.removed.red.length === 1 && st.cards.discards.red.length === 3, 'played card removed, rest discarded');
})();
});

test('play metrics (seen / playLog for the card report)', () => {
(function () {
  var st = testSkirmish(101);
  assert.ok(Object.keys(st.cards.seen.red).length >= 3, 'opening hand counted as seen (' + Object.keys(st.cards.seen.red).length + ' distinct cards)');
  E.playCard(st, 'deploy_inf_start', 'normal');
  var e = st.journal.playLog[st.journal.playLog.length - 1];
  assert.ok(e.id === 'deploy_inf_start' && e.p === 'red' && e.mode === 'normal' && e.seen === 1,
    'playLog records id/mode/first-sight: ' + JSON.stringify(e));
  var r = SIM.balanceMap(E.MAPS[4], 2, { seedBase: 5 });
  var anyCard = Object.keys(r.cards).filter(function (id) { return r.cards[id].plays > 0; })[0];
  assert.ok(anyCard && 'simple' in r.cards[anyCard] && 'firstSight' in r.cards[anyCard] && 'seenSum' in r.cards[anyCard],
    'balanceMap aggregates simple/firstSight/seenSum per card');
})();
});

test('decision journal (per-decision stream: played + declined at st.journal)', () => {
(function () {
  var st = testSkirmish(101);
  var p = st.flow.current;
  var hand = st.cards.hands[p].slice();           // full hand at the decision point
  var chosen = 'deploy_inf_start';
  assert.ok(hand.indexOf(chosen) >= 0, 'chosen card is in the opening hand');
  E.playCard(st, chosen, 'normal');

  // one event per held card this turn, all tagged turn/side and well-formed
  var events = st.journal.decisionLog.filter(function (e) { return e.turn === st.flow.turnNumber && e.side === p; });
  assert.ok(events.length === hand.length,
    'one event per card held at the decision (' + events.length + ' = ' + hand.length + ')');
  events.forEach(function (e) {
    assert.ok(typeof e.turn === 'number' && (e.side === 'red' || e.side === 'blue') &&
      typeof e.card === 'string' && 'mode' in e && 'outcome' in e,
      'event carries turn/side/card/mode/outcome: ' + JSON.stringify(e));
  });

  // exactly one played, the rest declined; played carries the play mode
  var played = events.filter(function (e) { return e.outcome === 'played'; });
  var declined = events.filter(function (e) { return e.outcome === 'declined'; });
  assert.ok(played.length === 1 && played[0].card === chosen && played[0].mode === 'normal',
    'exactly one played event, the chosen card, with its mode: ' + JSON.stringify(played));
  assert.ok(declined.length === hand.length - 1, 'every other held card is declined');
  var declinedIds = declined.map(function (e) { return e.card; }).sort();
  var expectDeclined = hand.filter(function (id) { return id !== chosen; }).sort();
  assert.ok(JSON.stringify(declinedIds) === JSON.stringify(expectDeclined),
    'declined events name exactly the un-played hand cards');
})();
});

test('decision journal (a never-played card is no longer invisible)', () => {
(function () {
  // Structural invariant, seed-independent: over a full game every play is also a
  // 'played' decision event (plays ⊆ the decision stream), and declines are
  // recorded on top — so "was (side, card) passed?" is answerable from the
  // journal alone, where the play-only log left passes and never-played cards
  // invisible.
  function decisions(st) {
    var played = {}, declined = {};
    (st.journal.decisionLog || []).forEach(function (e) {
      (e.outcome === 'played' ? played : declined)[e.side + ':' + e.card] = true;
    });
    return { played: played, declined: declined };
  }
  var st = SIM.simSkirmish(E.MAPS[0], 4242, 'red', 'normal', 'normal');
  assert.ok(st.journal.decisionLog && st.journal.decisionLog.length > (st.journal.playLog || []).length,
    'decision stream carries more than the play-only log (declines recorded)');
  var d = decisions(st);
  (st.journal.playLog || []).forEach(function (e) {
    assert.ok(d.played[e.p + ':' + e.id], 'every play (' + e.p + ':' + e.id + ') is also a played decision event');
  });
  assert.ok(Object.keys(d.declined).length > 0, 'passes are recorded (declined events exist)');

  // The never-played case is real, not just possible: across a fixed spread of
  // deterministic games at least one (side, card) is held every turn it's in hand
  // and never played — invisible in the play-only log, now traceable.
  var everHeldOnly = false;
  [4242, 101, 7, 55, 999].forEach(function (seed) {
    var s = decisions(SIM.simSkirmish(E.MAPS[0], seed, 'red', 'normal', 'normal'));
    if (Object.keys(s.declined).some(function (k) { return !s.played[k]; })) everHeldOnly = true;
  });
  assert.ok(everHeldOnly, 'a card passed every turn it was in hand still leaves a trace (held-only across the seed spread)');
})();
});

test('asymmetric deck binding', () => {
(function () {
  // Deck composition as a sorted "id:count" signature — the fingerprint a side's
  // built deck should match.
  function sig(cards) {
    return cards.filter(function (c) { return !c.starting; })
      .map(function (c) { return c.id + ':' + c.count; }).sort().join('|');
  }
  function deckSigFromState(st, p) {
    var counts = {};
    st.cards.decks[p].forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    return Object.keys(counts).map(function (id) { return id + ':' + counts[id]; }).sort().join('|');
  }

  var active = E.ACTIVE_BATTALION && E.ACTIVE_BATTALION.id;
  // (a) default (no per-side selection) is byte-identical to naming the active
  //     battalion on both sides — the content-safe equivalence.
  var base = SIM.balanceMap(E.MAPS[4], 4, { seedBase: 5 });
  var named = SIM.balanceMap(E.MAPS[4], 4, { seedBase: 5, battalions: { red: active, blue: active } });
  assert.ok(JSON.stringify(base) === JSON.stringify(named),
    'balanceMap with decks={active,active} is identical to no decks (default unchanged)');

  // (b) find two decks with DIFFERENT non-starting composition, seat one per side.
  //     Battalions reference the pool by id — resolve each to its hydrated full-card
  //     list (E.resolveBattalion(id).cards) before fingerprinting.
  var decks = (E.BATTALIONS || []).map(function (d) { return { id: d.id, cards: E.resolveBattalion(d.id).cards }; });
  var two = null;
  for (var i = 0; i < decks.length && !two; i++)
    for (var j = 0; j < decks.length; j++)
      if (i !== j && decks[i].cards && decks[j].cards && sig(decks[i].cards) !== sig(decks[j].cards)) {
        two = [decks[i], decks[j]]; break;
      }
  if (!two) { assert.ok(true, '(skipped: need two decks with distinct composition; have ' + decks.length + ')'); return; }

  var st = SIM.simSkirmish(E.MAPS[0], 4242, 'red', 'normal', 'normal', { red: two[0].id, blue: two[1].id });
  assert.ok(st.flow.phase === 'skirmish-over', 'asymmetric skirmish (' + two[0].id + ' vs ' + two[1].id + ') finishes');
  // The deck each side was DEALT (built + hand + discards) must match its own deck.
  function fullSideSig(st, p) {
    var counts = {};
    [].concat(st.cards.decks[p], st.cards.hands[p], st.cards.discards[p]).forEach(function (id) {
      var c = st.cards.sideDecks[p].byId[id];
      if (c && c.starting) return;                 // the seeded starting card isn't in the shuffled deck
      counts[id] = (counts[id] || 0) + 1;
    });
    return Object.keys(counts).map(function (id) { return id + ':' + counts[id]; }).sort().join('|');
  }
  // Fresh skirmish (no cards drawn yet) so the built deck is the full composition.
  var m = E.newBattle({ seed: 7, firstPlayer: 'red', maps: [E.MAPS[0]], battalions: { red: two[0].id, blue: two[1].id } });
  var fresh = E.newSkirmish(m);
  assert.ok(deckSigFromState(fresh, 'blue') === sig(two[1].cards),
    'blue is dealt its OWN deck (' + two[1].id + '), not red\'s (blue hasn\'t drawn yet)');
  // red drew its opening hand, so reconstruct from deck+hand+discards (minus the starting card).
  assert.ok(fullSideSig(fresh, 'red') === sig(two[0].cards),
    'red is dealt its OWN deck (' + two[0].id + ')');
  assert.ok(fresh.cards.sideDecks.red.starting === E.resolveBattalion(two[0].id).starting &&
     fresh.cards.sideDecks.blue.starting === E.resolveBattalion(two[1].id).starting,
    'each side gets its own deck\'s starting card');

  // Bad deck name fails loud.
  var threw = false;
  try { E.resolveBattalion('no-such-deck-xyz'); } catch (e) { threw = true; }
  assert.ok(threw, 'resolveBattalion throws on an unknown deck name');
})();
});

test('noAdvance attacks (Ordered Withdraw holds its ground)', () => {
(function () {
  var card = fixtureCard('ordered_withdraw'); // fixture, not the active deck
  assert.ok(card.steps[0].tieSpare === true && card.steps[0].noAdvance === true,
    'Ordered Withdraw carries tieSpare + noAdvance');
  // outright victory: cavalry (atk 3) vs lone infantry (def 1) — defender dies, attacker stays put
  var st = testSkirmish(70);
  st.pieces.units['0,0'] = { type: 'cavalry', owner: 'red' };
  st.pieces.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st.cards.hands.red = ['ordered_withdraw'];
  E.playCard(st, 'ordered_withdraw');
  E.applyStep(st, { from: '0,0', to: '1,0' });
  assert.ok(!st.pieces.units['1,0'], 'defender destroyed on a clear win');
  assert.ok(st.pieces.units['0,0'] && st.pieces.units['0,0'].type === 'cavalry', 'attacker did NOT take the hex');
  assert.ok(st.result.kills.red === 1, 'kill scored');
  // tie: infantry vs infantry (1 vs 1) — defender dies, attacker survives in place
  var st2 = testSkirmish(71);
  st2.pieces.units['0,0'] = { type: 'infantry', owner: 'red' };
  st2.pieces.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st2.cards.hands.red = ['ordered_withdraw'];
  E.playCard(st2, 'ordered_withdraw');
  E.applyStep(st2, { from: '0,0', to: '1,0' });
  assert.ok(!st2.pieces.units['1,0'] && st2.pieces.units['0,0'], 'tie: defender destroyed, attacker survives in place');
  // HQ still falls to a noAdvance attack (capture does not require entering)
  var st3 = testSkirmish(72);
  st3.pieces.units['-2,2'] = { type: 'cavalry', owner: 'red' }; // adjacent to blue HQ at -3,2
  st3.cards.hands.red = ['ordered_withdraw'];
  E.playCard(st3, 'ordered_withdraw');
  E.applyStep(st3, { from: '-2,2', to: '-3,2' });
  assert.ok(st3.flow.phase === 'skirmish-over' && st3.result.skirmishWinner === 'red' && st3.result.winType === 'hq',
    'noAdvance attack still captures the HQ');
})();
});

test('Barrage targets ANY trench or forest', () => {
(function () {
  // forest + trench deep in blue territory, far from anything red controls
  var BARMAP = { name: 'Barrage Range', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'F', edges: [[-2, 2, 0], [-2, 2, 1]] }] };
  var m = E.newBattle({ seed: 31, firstPlayer: 'red', maps: [BARMAP] });
  var st = E.newSkirmish(m);
  st.pieces.trenches['-3,1'] = [{ dirs: [0, 1], owner: 'blue' }];
  var b = E.listBarrageTargets(st, 'red');
  assert.ok(b.forestPieces.length === 1, 'forest far outside red lines is targetable (got ' + b.forestPieces.length + ')');
  assert.ok(b.trenches.length === 1 && b.trenches[0].hex === '-3,1', 'trench far outside red lines is targetable');
  st.cards.hands.red = ['naval_barrage'];
  E.playCard(st, 'naval_barrage');
  E.applyStep(st, { trenchHex: '-3,1', trenchIdx: 0 });
  assert.ok(!st.pieces.trenches['-3,1'], 'barrage destroys the distant trench');
})();
});

test('no-op plays are logged and marked (skipped-turn report)', () => {
(function () {
  var st = testSkirmish(77);
  st.cards.hands.red = ['attack_plus1']; // no units on the board: the attack cannot resolve
  E.playCard(st, 'attack_plus1');
  assert.ok(st.flow.current === 'blue', 'impossible card ends the turn immediately');
  var e = st.journal.playLog[st.journal.playLog.length - 1];
  assert.ok(e.id === 'attack_plus1' && e.noop === true, 'playLog entry marked noop: ' + JSON.stringify(e));
  assert.ok(st.journal.log.some(function (l) { return l.msg.indexOf('no opening') >= 0; }), 'journal says the card was spent to no effect');
  var st2 = testSkirmish(78);
  E.playCard(st2, 'deploy_inf_start');
  E.applyStep(st2, { hex: E.stepOptions(st2).targets ? E.stepOptions(st2).targets[0] : null });
  assert.ok(!st2.journal.playLog[st2.journal.playLog.length - 1].noop, 'a play that acted is NOT marked noop');
  var r = SIM.balanceMap(E.MAPS[4], 2, { seedBase: 5 });
  var anyCard = Object.keys(r.cards)[0];
  assert.ok('noop' in r.cards[anyCard], 'balanceMap aggregates noop per card');
})();
});
