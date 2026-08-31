/* Auto-split from game/test.js (ADR-0003: node:test). Subsystem: cards.
   Frozen-API entry game/test.js delegates here; run this file directly with
   `node game/test.cards.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('./test.helpers.js');
const assert = require('node:assert');
const { E, testSkirmish } = require('./test.helpers.js');
const { fakeCard } = require('./test.fixtures.js'); // fake fixtures, never live content (no-live-content, #193)

test('noOpener cards never in the opening hand (e.g. Airdrop)', () => {
(function () {
  // Derive from the ACTIVE deck rather than hardcoding a card id/deck size, so a
  // deck that cuts every noOpener card still exercises the "nothing lost" bookkeeping.
  var noOpenerIds = E.CARDS.filter(function (c) { return c.noOpener; }).map(function (c) { return c.id; });
  var deckTotal = E.CARDS.reduce(function (s, c) { return s + c.count; }, 0);
  var bad = 0;
  for (var seed = 200; seed < 240; seed++) {
    var m = E.newMatch({ seed: seed, firstPlayer: 'red' });
    var st = E.newSkirmish(m);
    noOpenerIds.forEach(function (id) {
      if (st.hands.red.indexOf(id) >= 0) bad++;
      if (st.decks.red.indexOf(id) < 0) bad++;                  // returned to the deck
    });
    if (st.decks.red.length + st.hands.red.length !== deckTotal) bad++; // nothing lost
  }
  assert.ok(bad === 0, noOpenerIds.length + ' noOpener card(s) (' + noOpenerIds.join(', ') +
    ') excluded from 40 opening hands and returned to the deck (' + bad + ' problems)');
})();
});

test('house rule: play any card as basic attack/reposition', () => {
(function () {
  var st = testSkirmish(21);
  st.units['0,0'] = { type: 'infantry', owner: 'red' };
  st.units['0,1'] = { type: 'cavalry', owner: 'blue' };
  // A deploy fixture (no attack step of its own) proves ANY card replays as a basic attack.
  fakeCard('fx_deploy_inf'); st.hands.red = ['fx_deploy_inf'];
  var cid = st.hands.red[0];
  E.playCard(st, cid, 'attack');
  var o = E.stepOptions(st);
  assert.ok(o.type === 'attack' && (o.mod || 0) === 0, 'card resolves as plain attack step');
  E.applyStep(st, { from: '0,0', to: '0,1' });
  assert.ok(st.removed.red.indexOf(cid) >= 0, 'card still removed from game');
  // reposition mode
  var st2 = testSkirmish(22);
  st2.units['0,0'] = { type: 'infantry', owner: 'red' };
  var cid2 = st2.hands.red[0];
  E.playCard(st2, cid2, 'reposition');
  assert.ok(E.stepOptions(st2).type === 'reposition', 'card resolves as plain reposition step');
  // reposition is refused while a basic attack is possible
  var st3 = testSkirmish(23);
  st3.units['0,0'] = { type: 'infantry', owner: 'red' };
  st3.units['0,1'] = { type: 'infantry', owner: 'blue' }; // a basic attack IS available
  var cid3 = st3.hands.red[0];
  var threw = false;
  try { E.playCard(st3, cid3, 'reposition'); } catch (e) { threw = true; }
  assert.ok(threw, 'reposition refused while a basic attack is available');
  assert.ok(st3.phase === 'choose-card' && st3.hands.red.indexOf(cid3) >= 0, 'the refused card stays in hand');
})();
});

test('at least one step of a card must be played', () => {
(function () {
  // Red inf at 0,0 can only strike blue inf at 0,1 (both far from either HQ).
  var st = testSkirmish(31);
  st.units = { '0,0': { type: 'infantry', owner: 'red' }, '0,1': { type: 'infantry', owner: 'blue' } };
  fakeCard('fx_two_attacks'); st.hands.red = ['fx_two_attacks']; // two attack steps
  E.playCard(st, 'fx_two_attacks');
  assert.ok(!E.mustPlayStep(st), 'step 1 is skippable — a later step can still act');
  E.applyStep(st, { skip: true }); // allowed: attack #2 remains
  assert.ok(E.mustPlayStep(st), 'the last playable step cannot be skipped while the card has done nothing');
  var threw = false;
  try { E.applyStep(st, { skip: true }); } catch (e) { threw = true; }
  assert.ok(threw, 'engine refuses to skip the whole card');
  E.applyStep(st, { from: '0,0', to: '0,1' }); // playing an action satisfies the rule
  assert.ok(st.phase !== 'step', 'once an action is played the card resolves');

  // Once one action is done, remaining steps ARE skippable.
  var st2 = testSkirmish(32);
  st2.units = { '0,0': { type: 'infantry', owner: 'red' } }; // lone unit, room to march, no enemies
  fakeCard('fx_three_reposition'); st2.hands.red = ['fx_three_reposition']; // three reposition steps
  E.playCard(st2, 'fx_three_reposition');
  E.applyStep(st2, { from: '0,0', to: E.listRepositions(st2, 'red').moves[0].to });
  assert.ok(st2.phase !== 'step' || !E.mustPlayStep(st2), 'after acting, later steps are skippable');

  // A card that genuinely cannot act anywhere still spends the turn (no-op).
  var st3 = testSkirmish(33);
  st3.units = {}; // no units -> no barrage targets, no attacks
  fakeCard('fx_barrage_attack'); st3.hands.red = ['fx_barrage_attack']; // [barrage, attack]
  E.playCard(st3, 'fx_barrage_attack');
  assert.ok(st3.phase === 'choose-card' && st3.current === 'blue', 'a truly dead card still ends the turn');
  var le = st3.playLog[st3.playLog.length - 1];
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

test('army-points (WOA #54: computed from steps, weight table pinned)', () => {
(function () {
  // Seeding intent: deploy > attack > reposition. Guard the ordering so a weight
  // edit that inverts it is a loud, deliberate diff.
  assert.ok(E.cardPoints({ steps: [{ type: 'deploy', unit: 'infantry' }] }) >
     E.cardPoints({ steps: [{ type: 'attack' }] }) &&
     E.cardPoints({ steps: [{ type: 'attack' }] }) >
     E.cardPoints({ steps: [{ type: 'reposition' }] }),
    'deploy > attack > reposition base costs');
  // Representative card: Raiding Party exercises deploy + attack flags (tieSpare,
  // noAdvance). Pin it and the active deck's total so any weight change is reviewed.
  // LIVE_CONTENT_PIN: a deliberately-kept named-card-number pin on the shipped
  // raiding_party card — exempt from the no-live-content gate because a weight change
  // here MUST surface, not be hidden behind a fake fixture (spec #185; #193).
  assert.ok(E.cardPoints(E.CARD_BY_ID['raiding_party']) === 6.5, 'Raiding Party = 6.5 pts (deploy inf 3 + attack tieSpare/noAdvance 3.5)'); // LIVE_CONTENT_PIN
  assert.ok(E.deckPoints(E.ACTIVE_DECK) === 67.5, 'active deck "' + E.ACTIVE_DECK.id + '" totals 67.5 army-points'); // named-deck-number pin (no id literal)
  assert.ok(E.cardPoints({ steps: [] }) === 0 && E.deckPoints({ cards: [] }) === 0, 'empty card / empty deck = 0');
  assert.ok(E.cardPoints({ steps: 'oops' }) === 0, 'malformed (non-array) steps score 0, not a throw — deckProblems can still report the friendly error');
  // WOA #56 deck-value cap gate: every shipped deck sits under the budget (the
  // gate lets the deck editor call two asymmetric decks "matched"), and a deck
  // pushed over it is rejected — the same reject-on-validate as an oversized deck.
  var allDecks = (typeof global !== 'undefined' && global.WOA_CONTENT && global.WOA_CONTENT.decks) || [];
  assert.ok(allDecks.length > 0 && allDecks.every(function (d) { return E.deckPoints(d) <= E.DECK_POINTS_CAP; }),
    'all ' + allDecks.length + ' shipped decks are within the army-points cap (' + E.DECK_POINTS_CAP + ')');
  var overBudget = { cards: E.ACTIVE_DECK.cards.concat([{ id: 'gild', name: 'Gild', count: 1, steps: [{ type: 'deploy', unit: 'artillery' }, { type: 'attack', mod: 3 }] }]) };
  assert.ok(E.deckPoints(overBudget) > E.DECK_POINTS_CAP, 'a deck pushed over the cap is over budget (gate rejects it)');
  // WOA-110 (#95): Step = pure signed Δ of (parent, candidate) deckPoints — the deck-loop
  // distance the woa.db parent-id column is measured against. Null parent (iteration 0) = 0.
  assert.ok(E.deckStep(E.ACTIVE_DECK, overBudget) === E.deckPoints(overBudget) - E.deckPoints(E.ACTIVE_DECK),
    'deckStep is the signed deckPoints delta (candidate - parent)');
  assert.ok(E.deckStep(E.ACTIVE_DECK, E.ACTIVE_DECK) === 0, 'deckStep of a deck against itself is 0 (no move)');
  assert.ok(E.deckStep(null, E.ACTIVE_DECK) === 0, 'deckStep with no parent (iteration-0 fixture) is 0');
})();
});

test('mispricing residual (WOA #57: cardRows points + residual, soft flag)', () => {
(function () {
  var R = require('./report-model.js');
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

test('army-points calibration pass (#82/#114: classify → class signal → cap-safe shared moves)', () => {
(function () {
  var R = require('./report-model.js');

  // ---- classifyCard: resid + phase-conditioned decline ----
  // Dominant: out-wins its price, rarely declined.
  assert.ok(R.classifyCard({ resid: 3 }, 0.1, null) === 'Dominant', 'resid ≥ +2 & low decline → Dominant');
  // Strictly-Dominated: heavily declined EVEN in a late octile (the #89 "E" card: never played, decline-rate 1.0).
  assert.ok(R.classifyCard({ resid: null }, 1.0, [1, 0, 0, 0, 1, 0, 0, 0]) === 'Strictly-Dominated',
    'shunned across phases (late octile too) → Strictly-Dominated, even unpriced-thin');
  // Weakly-Dominated: declined only EARLY = held-value / timing (ADR-0002 blind spot), not a redesign.
  assert.ok(R.classifyCard({ resid: -3 }, 0.8, [2, 1, 0, 0, 0, 0, 0, 0]) === 'Weakly-Dominated',
    'shunned only early (never late) → Weakly-Dominated (held-value, correctly priced)');
  assert.ok(R.classifyCard({ resid: -3 }, 0, null) === 'Weakly-Dominated', 'resid-negative, not shunned → Weakly (advisory, no flag)');
  assert.ok(R.classifyCard({ resid: 1 }, 0.1, null) === null && R.classifyCard({ resid: null }, 0.1, null) === null,
    'sub-threshold / no-signal card → unclassified (null)');

  // ---- calibratePoints: a shared class signal MOVES the weight; single-card domination FLAGS ----
  var cardsById = {
    A: { steps: [{ type: 'attack' }, { type: 'attack', tieSpare: true }] }, // step.attack×2, flag.tieSpare
    B: { steps: [{ type: 'attack' }, { type: 'attack' }] },                  // step.attack×2 (shares with A)
    C: { steps: [{ type: 'deploy', unit: 'artillery' }] },                   // step.deploy, tier.artillery (C's own)
    D: { steps: [{ type: 'reposition', tieSpare: true }] }                   // step.reposition, flag.tieSpare
  };
  var rows = [
    { id: 'A', name: 'A', resid: 3, hqWins: 10, plays: 20 },   // Dominant, shares step.attack with B
    { id: 'B', name: 'B', resid: 4, hqWins: 8, plays: 20 },    // Dominant, shares step.attack with A
    { id: 'C', name: 'C', resid: 6, hqWins: 12, plays: 20 },   // Dominant, tier.artillery is C's alone
    { id: 'D', name: 'D', resid: -3, hqWins: 1, plays: 20 }    // Weakly (resid<0, not shunned) — held-value
  ];
  var aggById = { A: { declines: 0, appears: 20 }, B: { declines: 0, appears: 20 },
    C: { declines: 0, appears: 20 }, D: { declines: 0, appears: 20 } };
  var res = R.calibratePoints({ rows: rows, aggById: aggById, cardsById: cardsById });

  var moved = {}; res.moves.forEach(function (m) { moved[m.lever] = m; });
  assert.ok(moved['step.attack'] && moved['step.attack'].direction === 'raise',
    'step.attack: 2 under-priced Dominant cards, no single-card domination → shared weight moves UP');
  assert.ok(!moved['tier.artillery'], 'tier.artillery: only card C → single-card domination, NO shared weight move');
  assert.ok(res.signal['step.reposition'] === undefined && res.signal['flag.tieSpare'].cards === 1,
    'Weakly-Dominated D is EXCLUDED from the class signal (held-value resid is a timing artifact, ADR-0002)');
  var flagged = {}; res.redesignFlags.forEach(function (f) { flagged[f.id] = f; });
  assert.ok(flagged.C, 'C (Dominant, single-card, no covering move) raises a redesign flag');
  assert.ok(!flagged.A && !flagged.B, 'A/B are covered by the shared step.attack move → NOT redesign-flagged (the move handles them)');
  assert.ok(!flagged.D, 'Weakly-Dominated D (held-value) does NOT raise a redesign flag');

  // ---- single-card domination is measured on the SIGNAL (Σ|w·resid|), not hqWins head-count ----
  var domRows = [
    { id: 'P', name: 'P', resid: 2, hqWins: 10, plays: 20 },     // shares step.barrage, modest resid
    { id: 'Q', name: 'Q', resid: 100, hqWins: 11, plays: 20 }    // shares step.barrage, huge resid, ~half the hqWins
  ];
  var domRes = R.calibratePoints({ rows: domRows, aggById: { P: { declines: 0, appears: 20 }, Q: { declines: 0, appears: 20 } },
    cardsById: { P: { steps: [{ type: 'barrage' }] }, Q: { steps: [{ type: 'barrage' }] } } });
  assert.ok(!domRes.moves.some(function (m) { return m.lever === 'step.barrage'; }),
    'Q drives ~98% of the w·resid signal (though only ~half the hqWins) → single-card domination, NO move (guard reads the signal, not head-count)');

  // ---- accept move: SOFT velocity + direction within the Tolerance (#109) ----
  var TEMP = require('./content/tolerances.js');
  assert.ok(R.acceptMove(1, null) === 0.5 && R.acceptMove(-1, null) === -0.5,
    'null tolerance → one nudge (±0.5); sign = direction');
  // Profiles are SPARSE (holds omitted): heat = loosened / 8 loosenable axes, so velocity really varies.
  assert.ok(R.acceptMove(1, TEMP.profiles.card) === 0.75, 'Card profile (4/8 axes loosened → heat 0.5) → 0.75');
  assert.ok(R.acceptMove(1, TEMP.profiles.map) === 0.8125, 'Map profile (5/8 loosened → heat 0.625) → 0.8125 (a broader tolerance steps bigger)');
  assert.ok(R.acceptMove(1, { name: 'Hold', tolerances: {} }) === 0.5, 'a hold-only profile → base nudge (0.5), no scale-up');

  // ---- lower moves floor at weight 0 (a negative POINTS weight is nonsensical) ----
  // A lower move comes from Strictly-Dominated cards (negative resid AND shunned across phases).
  var lowRows = [
    { id: 'L1', name: 'L1', resid: -5, hqWins: 10, plays: 20 },
    { id: 'L2', name: 'L2', resid: -6, hqWins: 8, plays: 20 }
  ];
  var shunned = { declines: 9, appears: 10 };                 // decline-rate 0.9
  var lateOctile = [1, 0, 0, 0, 1, 0, 0, 0];                  // declined in a LATE octile → Strictly, not held-value
  var lowRes = R.calibratePoints({ rows: lowRows,
    aggById: { L1: shunned, L2: shunned }, octilesById: { L1: lateOctile, L2: lateOctile },
    cardsById: { L1: { steps: [{ type: 'reposition' }] }, L2: { steps: [{ type: 'reposition' }] } },
    tolerance: TEMP.profiles.map, weightOf: function () { return 0.3; } });  // reposition-like weight 0.3
  var lower = lowRes.moves.filter(function (m) { return m.lever === 'step.reposition'; })[0];
  assert.ok(lower && lower.delta === -0.3, 'a lower move clamps to −weight (0.3) so the weight floors at 0, never negative');

  // ---- deckPoints ≤ cap is the ONE hard gate: positive moves clamp to headroom ----
  var capHeadroom = function (lever) { return R.pointsHeadroom(E.DECKS, lever, E.deckPoints, E.DECK_POINTS_CAP); };
  var capped = R.calibratePoints({ rows: rows, aggById: aggById, cardsById: cardsById,
    tolerance: TEMP.profiles.card, capHeadroom: capHeadroom });
  capped.moves.forEach(function (m) {
    if (m.delta <= 0) return;
    E.DECKS.forEach(function (d) {
      var after = E.deckPoints(d) + m.delta * R.leverExposure(d, m.lever);
      assert.ok(after <= E.DECK_POINTS_CAP + 1e-9,
        'calibrated ' + m.lever + ' (+' + m.delta + ') keeps deck "' + d.id + '" ≤ cap (' + after.toFixed(1) + ')');
    });
  });
  // headroom is exact: nudging a lever by its headroom lands the tightest deck AT the cap, never over.
  var attackRoom = R.pointsHeadroom(E.DECKS, 'step.attack', E.deckPoints, E.DECK_POINTS_CAP);
  assert.ok(attackRoom >= 0 && E.DECKS.every(function (d) {
    return E.deckPoints(d) + attackRoom * R.leverExposure(d, 'step.attack') <= E.DECK_POINTS_CAP + 1e-9;
  }), 'pointsHeadroom(step.attack) is the exact ± before the tightest shipped deck hits the cap');

  // ---- LLM feels-pass VETO: drops a move but never feeds the math ----
  var vetoed = R.calibratePoints({ rows: rows, aggById: aggById, cardsById: cardsById,
    veto: function (lever) { return lever === 'step.attack'; } });
  assert.ok(!vetoed.moves.some(function (m) { return m.lever === 'step.attack'; }),
    'feels-pass veto drops the step.attack move');
  assert.deepStrictEqual(vetoed.signal['step.attack'], res.signal['step.attack'],
    'veto is applied AFTER the math — the class signal is byte-identical with or without it');
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
  // Derive the active deck's starting card (a legitimate read of active content,
  // NOT a borrowed fixture id): the mechanic is "the flagged starting card, whatever
  // it is, is guaranteed in the opening hand."
  var starters = E.CARDS.filter(function (c) { return c.starting; });
  assert.ok(starters.length > 0, 'the active deck defines a starting card'); // clean failure, not a TypeError
  var startId = starters[0].id;
  assert.ok(st.hands.red.length === 4, 'first hand has 4 cards');
  assert.ok(st.hands.red.indexOf(startId) >= 0, 'starting card guaranteed in first hand');
  E.playCard(st, startId);
  var o = E.stepOptions(st);
  assert.ok(o.type === 'deploy' && o.targets.length === 3, 'starting deploy offers 3 hexes');
  E.applyStep(st, { hex: o.targets[0] });
  assert.ok(st.current === 'blue' && st.hands.blue.length === 4, 'turn passed to blue with 4 cards');
  assert.ok(st.removed.red.length === 1 && st.discards.red.length === 3, 'played card removed, rest discarded');
})();
});

test('play metrics (seen / playLog for the card report)', () => {
(function () {
  var st = testSkirmish(101);
  assert.ok(Object.keys(st.seen.red).length >= 3, 'opening hand counted as seen (' + Object.keys(st.seen.red).length + ' distinct cards)');
  // The playLog records whatever card was played — take one from the dealt hand
  // (seen once on the deal) rather than borrow a live id.
  var played = st.hands.red[0];
  E.playCard(st, played, 'normal');
  var e = st.playLog[st.playLog.length - 1];
  assert.ok(e.id === played && e.p === 'red' && e.mode === 'normal' && e.seen === 1,
    'playLog records id/mode/first-sight: ' + JSON.stringify(e));
  var r = E.balanceMap(E.MAPS[4], 2, { seedBase: 5 });
  var anyCard = Object.keys(r.cards).filter(function (id) { return r.cards[id].plays > 0; })[0];
  assert.ok(anyCard && 'simple' in r.cards[anyCard] && 'firstSight' in r.cards[anyCard] && 'seenSum' in r.cards[anyCard],
    'balanceMap aggregates simple/firstSight/seenSum per card');
})();
});

test('WOA-055 asymmetric deck binding', () => {
(function () {
  // Deck composition as a sorted "id:count" signature — the fingerprint a side's
  // built deck should match.
  function sig(cards) {
    return cards.filter(function (c) { return !c.starting; })
      .map(function (c) { return c.id + ':' + c.count; }).sort().join('|');
  }
  function deckSigFromState(st, p) {
    var counts = {};
    st.decks[p].forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    return Object.keys(counts).map(function (id) { return id + ':' + counts[id]; }).sort().join('|');
  }

  var active = E.ACTIVE_DECK && E.ACTIVE_DECK.id;
  // (a) default (no per-side selection) is byte-identical to naming the active
  //     deck on both sides — the golden-safe path.
  var base = E.balanceMap(E.MAPS[4], 4, { seedBase: 5 });
  var named = E.balanceMap(E.MAPS[4], 4, { seedBase: 5, decks: { red: active, blue: active } });
  assert.ok(JSON.stringify(base) === JSON.stringify(named),
    'balanceMap with decks={active,active} is identical to no decks (default unchanged)');

  // (b) find two decks with DIFFERENT non-starting composition, seat one per side.
  var decks = E.DECKS || [];
  var two = null;
  for (var i = 0; i < decks.length && !two; i++)
    for (var j = 0; j < decks.length; j++)
      if (i !== j && decks[i].cards && decks[j].cards && sig(decks[i].cards) !== sig(decks[j].cards)) {
        two = [decks[i], decks[j]]; break;
      }
  if (!two) { assert.ok(true, '(skipped: need two decks with distinct composition; have ' + decks.length + ')'); return; }

  var st = E.simSkirmish(E.MAPS[0], 4242, 'red', 'normal', 'normal', { red: two[0].id, blue: two[1].id });
  assert.ok(st.phase === 'skirmish-over', 'asymmetric skirmish (' + two[0].id + ' vs ' + two[1].id + ') finishes');
  // The deck each side was DEALT (built + hand + discards) must match its own deck.
  function fullSideSig(st, p) {
    var counts = {};
    [].concat(st.decks[p], st.hands[p], st.discards[p]).forEach(function (id) {
      var c = st.sideDecks[p].byId[id];
      if (c && c.starting) return;                 // the seeded starting card isn't in the shuffled deck
      counts[id] = (counts[id] || 0) + 1;
    });
    return Object.keys(counts).map(function (id) { return id + ':' + counts[id]; }).sort().join('|');
  }
  // Fresh skirmish (no cards drawn yet) so the built deck is the full composition.
  var m = E.newMatch({ seed: 7, firstPlayer: 'red', maps: [E.MAPS[0]], decks: { red: two[0].id, blue: two[1].id } });
  var fresh = E.newSkirmish(m);
  assert.ok(deckSigFromState(fresh, 'blue') === sig(two[1].cards),
    'blue is dealt its OWN deck (' + two[1].id + '), not red\'s (blue hasn\'t drawn yet)');
  // red drew its opening hand, so reconstruct from deck+hand+discards (minus the starting card).
  assert.ok(fullSideSig(fresh, 'red') === sig(two[0].cards),
    'red is dealt its OWN deck (' + two[0].id + ')');
  assert.ok(fresh.sideDecks.red.starting === E.resolveDeck(two[0].id).starting &&
     fresh.sideDecks.blue.starting === E.resolveDeck(two[1].id).starting,
    'each side gets its own deck\'s starting card');

  // Bad deck name fails loud.
  var threw = false;
  try { E.resolveDeck('no-such-deck-xyz'); } catch (e) { threw = true; }
  assert.ok(threw, 'resolveDeck throws on an unknown deck name');
})();
});

test('noAdvance attacks (Ordered Withdraw holds its ground)', () => {
(function () {
  // A fake fixture owns the tieSpare + noAdvance shape (the mechanic Ordered Withdraw
  // embodies), so retuning the shipped card can never break this rules test.
  var card = fakeCard('fx_noadvance_attack');
  assert.ok(card.steps[0].tieSpare === true && card.steps[0].noAdvance === true,
    'the noAdvance fixture carries tieSpare + noAdvance');
  // outright victory: cavalry (atk 3) vs lone infantry (def 1) — defender dies, attacker stays put
  var st = testSkirmish(70);
  st.units['0,0'] = { type: 'cavalry', owner: 'red' };
  st.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st.hands.red = ['fx_noadvance_attack'];
  E.playCard(st, 'fx_noadvance_attack');
  E.applyStep(st, { from: '0,0', to: '1,0' });
  assert.ok(!st.units['1,0'], 'defender destroyed on a clear win');
  assert.ok(st.units['0,0'] && st.units['0,0'].type === 'cavalry', 'attacker did NOT take the hex');
  assert.ok(st.vp.red === 1, 'VP scored for the kill');
  // tie: infantry vs infantry (1 vs 1) — defender dies, attacker survives in place
  var st2 = testSkirmish(71);
  st2.units['0,0'] = { type: 'infantry', owner: 'red' };
  st2.units['1,0'] = { type: 'infantry', owner: 'blue' };
  st2.hands.red = ['fx_noadvance_attack'];
  E.playCard(st2, 'fx_noadvance_attack');
  E.applyStep(st2, { from: '0,0', to: '1,0' });
  assert.ok(!st2.units['1,0'] && st2.units['0,0'], 'tie: defender destroyed, attacker survives in place');
  // HQ still falls to a noAdvance attack (capture does not require entering)
  var st3 = testSkirmish(72);
  st3.units['-2,2'] = { type: 'cavalry', owner: 'red' }; // adjacent to blue HQ at -3,2
  st3.hands.red = ['fx_noadvance_attack'];
  E.playCard(st3, 'fx_noadvance_attack');
  E.applyStep(st3, { from: '-2,2', to: '-3,2' });
  assert.ok(st3.phase === 'skirmish-over' && st3.skirmishWinner === 'red' && st3.winType === 'hq',
    'noAdvance attack still captures the HQ');
})();
});

test('Barrage targets ANY trench or forest', () => {
(function () {
  // forest + trench deep in blue territory, far from anything red controls
  var BARMAP = { name: 'Barrage Range', shape: 'classic', redHQ: [2, -2], blueHQ: [-3, 2],
    pieces: [{ t: 'F', edges: [[-2, 2, 0], [-2, 2, 1]] }] };
  var m = E.newMatch({ seed: 31, firstPlayer: 'red', maps: [BARMAP] });
  var st = E.newSkirmish(m);
  st.trenches['-3,1'] = [{ dirs: [0, 1], owner: 'blue' }];
  var b = E.listBarrageTargets(st, 'red');
  assert.ok(b.forestPieces.length === 1, 'forest far outside red lines is targetable (got ' + b.forestPieces.length + ')');
  assert.ok(b.trenches.length === 1 && b.trenches[0].hex === '-3,1', 'trench far outside red lines is targetable');
  fakeCard('fx_barrage_attack'); st.hands.red = ['fx_barrage_attack'];
  E.playCard(st, 'fx_barrage_attack');
  E.applyStep(st, { trenchHex: '-3,1', trenchIdx: 0 });
  assert.ok(!st.trenches['-3,1'], 'barrage destroys the distant trench');
})();
});

test('no-op plays are logged and marked (skipped-turn report)', () => {
(function () {
  var st = testSkirmish(77);
  fakeCard('fx_plain_attack'); st.hands.red = ['fx_plain_attack']; // no units on the board: the attack cannot resolve
  E.playCard(st, 'fx_plain_attack');
  assert.ok(st.current === 'blue', 'impossible card ends the turn immediately');
  var e = st.playLog[st.playLog.length - 1];
  assert.ok(e.id === 'fx_plain_attack' && e.noop === true, 'playLog entry marked noop: ' + JSON.stringify(e));
  assert.ok(st.log.some(function (l) { return l.msg.indexOf('no opening') >= 0; }), 'journal says the order was spent to no effect');
  var st2 = testSkirmish(78);
  fakeCard('fx_deploy_inf'); st2.hands.red = ['fx_deploy_inf'];
  E.playCard(st2, 'fx_deploy_inf');
  E.applyStep(st2, { hex: E.stepOptions(st2).targets ? E.stepOptions(st2).targets[0] : null });
  assert.ok(!st2.playLog[st2.playLog.length - 1].noop, 'a play that acted is NOT marked noop');
  var r = E.balanceMap(E.MAPS[4], 2, { seedBase: 5 });
  var anyCard = Object.keys(r.cards)[0];
  assert.ok('noop' in r.cards[anyCard], 'balanceMap aggregates noop per card');
})();
});

test('deck legality lifted into the engine (#116): E.deckProblems shared by editor + drafter', () => {
(function () {
  // Parity with the deck editor's old local deckProblems (dev/smoke.js pins the same
  // strings against the browser global, which now aliases E.deckProblems).
  assert.ok(E.deckProblems(E.CARDS).length === 0, 'the active deck validates clean');
  var dbl = E.CARDS.map(function (c) { return Object.assign({}, c, { starting: true, count: 1 }); });
  assert.ok(E.deckProblems(dbl).some(function (p) { return /exactly ONE/.test(p); }), 'two starting cards refused');
  var badStep = [{ id: 'x', name: 'X', count: 16, starting: true, steps: [{ type: 'teleport' }] }];
  assert.ok(E.deckProblems(badStep).some(function (p) { return /unknown type/.test(p); }), 'unknown step type refused');
  var over = E.ACTIVE_DECK.cards.concat([{ id: 'gild', name: 'Gild', count: 1, steps: [{ type: 'deploy', unit: 'artillery' }, { type: 'attack', mod: 3 }] }]);
  assert.ok(E.deckProblems(over).some(function (p) { return /over the army-points budget/.test(p); }), 'over-cap deck refused by the points gate');
})();
});

test('phase-0 LLM deckbuild (#116/#84, Track F): legal draft on the sideDecks path', async () => {
  var db = require('../dev/deckbuild.js');
  var pool = db.buildPool();
  // Pool = deduped union of every content/decks/*.js (dedupe by id).
  var seen = {}; pool.forEach(function (c) { seen[c.id] = (seen[c.id] || 0) + 1; });
  assert.ok(pool.length > 0 && Object.keys(seen).every(function (k) { return seen[k] === 1; }), 'pool is a deduped union of the deck files');

  // Only the 72 cap gates: size/starting are advisory, an over-cap deck is rejected.
  var over = db.assemble(pool.map(function (c) { return { id: c.id, count: 3 }; }), pool);
  assert.ok(!db.legality(over).ok && E.deckPoints(over) > E.DECK_POINTS_CAP, 'over-cap draft fails the one hard gate');

  // A mock draft produces a legal deck that seats sideDecks per side (WOA-055 path).
  // opening/filler are just pool ids the mock upgrades toward — derive them from the
  // live pool rather than borrow specific card ids (the assertion only gates the cap).
  var poolIds = pool.map(function (c) { return c.id; });
  assert.ok(poolIds.length >= 2, 'the pool has at least two cards to draft opening + filler from');
  var red = await db.draftSide(pool, null, { opening: poolIds[0], filler: poolIds[1] || poolIds[0] });
  var blue = await db.draftSide(pool, null, { opening: poolIds[2] || poolIds[0], filler: poolIds[3] || poolIds[1] || poolIds[0] });
  assert.ok(red.legality.ok && blue.legality.ok, 'both mock drafts are under the cap');
  var st = E.newSkirmish(E.newMatch({ seed: 7, firstPlayer: 'red', decks: { red: red.deck, blue: blue.deck } }));
  assert.ok(st.sideDecks && st.sideDecks.red && st.sideDecks.blue, 'drafted decks seat sideDecks');
  var sym = E.newSkirmish(E.newMatch({ seed: 7, firstPlayer: 'red' }));
  assert.strictEqual(sym.sideDecks, undefined, 'symmetric path stays golden (no sideDecks)');

  // The construction questionnaire rides #111's machinery (ordered id+text rows).
  assert.ok(db.CONSTRUCTION_QUESTIONS.length && db.CONSTRUCTION_QUESTIONS.every(function (q) { return q.id && q.text; }),
    'deck-construction questionnaire is an id+text table');
});

test('card catalog (#159): decks are refs, catalog is the one definition site', () => {
(function () {
  var fs = require('fs'), path = require('path');
  var decksDir = path.join(__dirname, 'content', 'decks');
  // A deck FILE carries only refs {id, count, starting?} — never an inlined card
  // def. steps/text are card-def-exclusive (a deck's own id/name are fine), so
  // their presence is the bespoke card-data path this refactor removed: red if
  // any survive.
  fs.readdirSync(decksDir).filter(function (f) { return /\.js$/.test(f); }).forEach(function (f) {
    var src = fs.readFileSync(path.join(decksDir, f), 'utf8');
    ['"steps"', '"text"'].forEach(function (defKey) {
      assert.ok(src.indexOf(defKey) < 0,
        'deck file ' + f + ' inlines a card def (' + defKey + ') — decks must be refs only');
    });
  });

  // The catalog resolves every deck ref: after content-load hydration, every
  // deck card is a full def (has steps) and its id lives in the catalog.
  var content = (typeof global !== 'undefined' && global.WOA_CONTENT) || {};
  var catalogIds = {};
  (content.cards || []).forEach(function (c) { catalogIds[c.id] = true; });
  assert.ok((content.cards || []).length > 0, 'the catalog (WOA_CONTENT.cards) is populated');
  var refIds = {};
  (content.decks || []).forEach(function (d) {
    (d.cards || []).forEach(function (c) {
      refIds[c.id] = true;
      assert.ok(Array.isArray(c.steps), 'deck ' + d.id + ' card ' + c.id + ' did not hydrate (no steps)');
      assert.ok(catalogIds[c.id], 'deck ' + d.id + ' card ' + c.id + ' has no catalog def');
    });
  });

  // The pool is genuinely wider than the shipped decks: at least one catalog card
  // is in NO deck (AC #4 — proves a card can exist to be drafted before it ships
  // in a playable deck). buildPool() reads the catalog, so it carries it.
  var catalogOnly = Object.keys(catalogIds).filter(function (id) { return !refIds[id]; });
  assert.ok(catalogOnly.length > 0, 'at least one catalog-only card exists (in no shipped deck)');
  var pool = require('../dev/deckbuild.js').buildPool();
  var poolIds = {}; pool.forEach(function (c) { poolIds[c.id] = true; });
  assert.ok(catalogOnly.every(function (id) { return poolIds[id]; }),
    'every catalog-only card appears in buildPool()');
})();
});

// Card-face markup is single-source: only cardFace() (game/ui/app.js, #165) may build
// it; every other browser file wraps cardFace. This source-scan reds on a fork.
// (#190; spec #185; ADR-0004 "route-through-base".) The anchor is the brass corner
// divs — emitted in every cardFace branch, and card-specific unlike banner/body/art.
// Static-only: a fork whose classes are computed at runtime is not caught.
var routeThroughBase = (function () {
  var FACE_MARKUP = /class=["']corner c[1-4][\s"']/;  // a corner div, any quote, extra classes ok
  var DEFINES_RENDERER = /function\s+cardFace\s*\(/;  // the renderer's home, exempt

  // Pure scanner over { relPath: sourceText }: the files that build face markup outside
  // the renderer's home. Pure so the gate can run it on the tree and on a fixture alike.
  function bespokeCardFaces(sources) {
    var homes = Object.keys(sources).filter(function (rel) { return DEFINES_RENDERER.test(sources[rel]); });
    var offenders = Object.keys(sources).filter(function (rel) {
      return homes.indexOf(rel) < 0 && FACE_MARKUP.test(sources[rel]);
    });
    return { homes: homes, offenders: offenders };
  }

  // Browser source that could forge a face: index.html + game/ui/**.js (recursive).
  function browserSources() {
    var fs = require('fs'), path = require('path');
    var gameDir = __dirname, out = {};
    (function walk(dir) {
      fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
        var abs = path.join(dir, e.name);
        if (e.isDirectory()) walk(abs);
        else if (/\.js$/.test(e.name)) out['game/ui/' + path.relative(path.join(gameDir, 'ui'), abs)] = fs.readFileSync(abs, 'utf8');
      });
    })(path.join(gameDir, 'ui'));
    out['game/index.html'] = fs.readFileSync(path.join(gameDir, 'index.html'), 'utf8');
    return out;
  }

  return { FACE_MARKUP: FACE_MARKUP, bespokeCardFaces: bespokeCardFaces, browserSources: browserSources };
})();

test('route-through-base: card markup only via the shared cardFace (#190)', () => {
(function () {
  // 1. The scanner flags a face built outside the renderer and leaves a wrapper alone.
  var renderer = 'function cardFace(card, opts){ return \'<div class="corner c1"></div>\' + card.name; }';
  var forged = '<div class="card"><div class="corner c1 hot"></div><div class="banner">Airdrop</div></div>';
  var wrapper = 'el.className = "card"; el.innerHTML = cardFace(c, {});'; // wraps, does not forge

  var dirty = routeThroughBase.bespokeCardFaces({ 'game/ui/app.js': renderer, 'game/ui/evil.js': forged });
  assert.deepStrictEqual(dirty.offenders, ['game/ui/evil.js'],
    'scanner reds on a card face built outside cardFace() (extra classes and all)');
  var clean = routeThroughBase.bespokeCardFaces({ 'game/ui/app.js': renderer, 'game/ui/hand.js': wrapper });
  assert.deepStrictEqual(clean.offenders, [],
    'scanner leaves a file that WRAPS cardFace() alone');

  // 2. The live browser layer is clean.
  var scan = routeThroughBase.bespokeCardFaces(routeThroughBase.browserSources());
  assert.strictEqual(scan.homes.length, 1,
    'exactly one file defines cardFace() — the single shared renderer (found: ' + scan.homes.join(', ') + ')');
  assert.deepStrictEqual(scan.offenders, [],
    'no browser file builds card-face markup outside cardFace(): ' + scan.offenders.join(', ') +
    ' — route it through the shared renderer (game/ui/app.js)');
})();
});

// A rules test must take its numbers from a dedicated fake fixture, never from a
// live game-content id (ADR-0004 "no-live-content"; spec #185; #193). This source-
// scan reds when a rules-test file quotes a live catalog id, EXCEPT on a line
// carrying the explicit LIVE_CONTENT_PIN label — a kept, surfaced named-card pin or
// an engine-constant mirror. It must NOT red a test that legitimately DERIVES an
// expectation from active content (E.CARDS.filter(...), st.hands.red[0]); the suite
// does that deliberately and it must survive. The self-tests below build their
// fixtures from a live id read at RUNTIME (F.liveCardIds()[0]) so this guard file
// plants no static live literal of its own for the live-tree scan to trip on.
test('no-live-content: rules tests use fake fixtures, not live content ids (#193)', () => {
(function () {
  var F = require('./test.fixtures.js');
  var live = F.liveCardIds();
  var liveId = live[0];        // runtime-computed — never a static literal in this file
  var fakeId = F.FAKE_IDS[0];  // an fx_ id, deliberately outside the live catalog

  // 1. RED-AT-BASE: the scanner flags a rules test that borrows a live content id.
  var borrows = { 'game/test.fake.js': "st.hands.red = ['" + liveId + "']; E.playCard(st, '" + liveId + "');" };
  var dirty = F.scanForLiveContent(borrows, live);
  assert.ok(dirty.length === 2 && dirty.every(function (o) { return o.id === liveId && o.file === 'game/test.fake.js'; }),
    'scanner reds on a rules test that quotes a live content id as a fixture (' + liveId + ')');

  // 2. It leaves a fake-fixture (fx_) reference alone — the migrated shape.
  var clean = { 'game/test.fake.js': "fakeCard('" + fakeId + "'); st.hands.red = ['" + fakeId + "'];" };
  assert.deepStrictEqual(F.scanForLiveContent(clean, live), [],
    'scanner leaves a fake-fixture (fx_) reference alone');

  // 3. A LIVE_CONTENT_PIN-labelled line is exempt (kept named-card pin / engine mirror).
  var pinned = { 'game/test.fake.js': "assert.ok(cardPoints(byId['" + liveId + "']) === 6.5); // " + F.LIVE_CONTENT_PIN };
  assert.deepStrictEqual(F.scanForLiveContent(pinned, live), [],
    'scanner exempts a LIVE_CONTENT_PIN-labelled live-content reference');

  // 4. It does NOT red a test that DERIVES from active content (no literal id at all).
  var derived = { 'game/test.fake.js': "var s = E.CARDS.filter(function (c) { return c.starting; })[0].id; E.playCard(st, s);" };
  assert.deepStrictEqual(F.scanForLiveContent(derived, live), [],
    'scanner does NOT red a legitimate derivation from active content');

  // 5. GREEN ON THE MIGRATED TREE: no rules test borrows a live content id as a fixture.
  var offenders = F.scanForLiveContent(F.rulesTestSources(), live);
  assert.deepStrictEqual(offenders, [],
    'no rules test borrows a live content id: ' +
    offenders.map(function (o) { return o.file + ':' + o.line + ' ' + o.id; }).join(', '));
})();
});
