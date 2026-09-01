/* The dedicated FAKE-FIXTURE module for the rules tests (ADR-0004 "no-live-content";
   spec #185; #193). A mechanic test must take its numbers from a fixture whose
   shape THIS FILE owns, never from a live game-content card id — so authoring or
   retuning content can never break a rules test spuriously. (test.reports.js
   already feeds synthetic fixtures; this generalizes that pattern to the ~dozen
   fixture-coupled rules tests.)

   It carries three things:
     1. FAKE_CARDS — synthetic card defs whose ids are deliberately OUTSIDE the live
        catalog (the `fx_` namespace). `fakeCard(id)` registers one into
        E.CARD_BY_ID on demand — exactly like test.helpers.fixtureCard did for a
        live card, but the def is ours, so no content edit moves these numbers. It
        never touches E.CARDS, so a fixture can never leak into a shuffled deck.
     2. liveCardIds() — the current live catalog id set (WOA_CONTENT.cards), the
        thing a rules test must NOT borrow as a fixture.
     3. scanForLiveContent() — the pure source-scanner behind the no-live-content
        gate in test.cards.js. It reds when a rules-test file quotes a live content
        id, UNLESS the line carries the explicit LIVE_CONTENT_PIN label (a kept,
        surfaced named-card pin, or an engine-constant mirror). It does NOT red a
        test that DERIVES an expectation from active content (E.CARDS.filter(...),
        E.STARTING_CARD.id, st.hands.red[0]) — that writes no literal id, and the
        suite does it deliberately, so it must survive. */
'use strict';
var E = require('./engine.js');

// The label that exempts a deliberate, reviewed live-content reference from the
// no-live-content gate. Two legitimate uses, both surfaced in the diff:
//   - a NAMED-CARD PIN: a mechanic test that intentionally pins a shipped card's
//     number (e.g. Raiding Party = 6.5 army-points), kept and labelled, not deleted.
//   - an ENGINE-CONSTANT MIRROR: the engine itself keys off a card id (e.g.
//     concedeAdvised reads 'airdrop'), so the test must name it to exercise that.
var LIVE_CONTENT_PIN = 'LIVE_CONTENT_PIN';

// Synthetic card defs. Ids live in the `fx_` namespace so they can never collide
// with a live catalog id, and each mirrors ONLY the step shape a rules test needs
// — the numbers are ours to keep stable, independent of content.
var FAKE_CARDS = {
  // one plain attack — a card whose only order is a basic attack (no mod/flags).
  fx_plain_attack: { id: 'fx_plain_attack', name: 'Fixture Plain Attack', count: 1,
    steps: [{ type: 'attack' }] },
  // two attack steps in sequence (the "order an attack, then another" shape).
  fx_two_attacks: { id: 'fx_two_attacks', name: 'Fixture Two Attacks', count: 1,
    steps: [{ type: 'attack' }, { type: 'attack' }] },
  // three reposition steps (the "march up to three times" shape).
  fx_three_reposition: { id: 'fx_three_reposition', name: 'Fixture Three Reposition', count: 1,
    steps: [{ type: 'reposition' }, { type: 'reposition' }, { type: 'reposition' }] },
  // barrage then attack (an optional barrage that can fully whiff into a no-op).
  fx_barrage_attack: { id: 'fx_barrage_attack', name: 'Fixture Barrage + Attack', count: 1,
    steps: [{ type: 'barrage' }, { type: 'attack' }] },
  // a single tieSpare + noAdvance attack (the "hold your ground" shape).
  fx_noadvance_attack: { id: 'fx_noadvance_attack', name: 'Fixture NoAdvance Attack', count: 1,
    steps: [{ type: 'attack', tieSpare: true, noAdvance: true }] },
  // deploy one infantry adjacent to a controlled hex.
  fx_deploy_inf: { id: 'fx_deploy_inf', name: 'Fixture Deploy Infantry', count: 1,
    steps: [{ type: 'deploy', unit: 'infantry' }] },
  // deploy one infantry, then build a trench (the entrench shape).
  fx_deploy_inf_trench: { id: 'fx_deploy_inf_trench', name: 'Fixture Deploy + Trench', count: 1,
    steps: [{ type: 'deploy', unit: 'infantry' }, { type: 'trench' }] },
  // reposition then a -1 attack (the "careful maneuvers" shape used at a trenched HQ).
  fx_reposition_attack_m1: { id: 'fx_reposition_attack_m1', name: 'Fixture Reposition + Attack(-1)', count: 1,
    steps: [{ type: 'reposition' }, { type: 'attack', mod: -1 }] },
};

// The ids the fixtures own — the `fx_` namespace, never live content.
var FAKE_IDS = Object.keys(FAKE_CARDS);

// Register a fake fixture into E.CARD_BY_ID (=== DEFAULT_REG.byId, the registry
// playCard resolves against when a skirmish has no per-side deck) so
// E.playCard(st, 'fx_...') works. Idempotent; never touches E.CARDS.
function fakeCard(id) {
  var def = FAKE_CARDS[id];
  if (!def) throw new Error('fakeCard: unknown fake fixture "' + id + '" (known: ' + FAKE_IDS.join(', ') + ')');
  if (!E.CARD_BY_ID[id]) E.CARD_BY_ID[id] = def;
  return def;
}

// The live catalog card-id set — what a rules test must not borrow as a fixture.
function liveCardIds() {
  var content = (typeof global !== 'undefined' && global.WOA_CONTENT) || {};
  return (content.cards || []).map(function (c) { return c.id; });
}

/* The pure scanner. `sources` = { relPath: sourceText }; `liveIds` = the live
   catalog id set. Returns [{ file, id, line }] for every quoted live-content id in
   a rules-test source that is NOT on a LIVE_CONTENT_PIN-labelled line. Pure, so the
   gate can run it on the real tree and on a synthetic fixture alike. Static-only:
   an id assembled at runtime (E.CARDS[0].id) is invisible to it — which is exactly
   how a legitimate derivation stays clean, and how the guard's own self-test builds
   a synthetic offender without planting a real live literal in this file. */
function scanForLiveContent(sources, liveIds) {
  var live = {};
  liveIds.forEach(function (id) { live[id] = true; });
  // A quoted token 'id' | "id" | `id`. Charset is wide (not just snake_case) so a
  // non-snake_case future id still gets captured and membership-checked, not missed.
  var TOKEN = /(["'`])([A-Za-z0-9_-]+)\1/g;
  var offenders = [];
  Object.keys(sources).forEach(function (rel) {
    sources[rel].split('\n').forEach(function (lineText, i) {
      if (lineText.indexOf(LIVE_CONTENT_PIN) >= 0) return; // a surfaced, reviewed pin/mirror
      var m; TOKEN.lastIndex = 0;
      while ((m = TOKEN.exec(lineText))) {
        if (live[m[2]]) offenders.push({ file: rel, id: m[2], line: i + 1 });
      }
    });
  });
  return offenders;
}

// The rules-test files the gate scans: the single-sourced subsystem list
// (test-files.js), minus this fixtures module and test.reports.js (which owns
// synthetic report fixtures, not rules mechanics). Reads them off disk so the gate
// scans exactly what the runner runs.
function rulesTestSources() {
  var fs = require('fs'), path = require('path');
  var out = {};
  require('./test-files.js').forEach(function (rel) {
    var base = rel.replace(/^\.\//, '');
    if (base === 'test.reports.js') return; // synthetic-fixture home, not a rules-mechanic file
    out['game/' + base] = fs.readFileSync(path.join(__dirname, base), 'utf8');
  });
  return out;
}

module.exports = {
  LIVE_CONTENT_PIN: LIVE_CONTENT_PIN,
  FAKE_CARDS: FAKE_CARDS, FAKE_IDS: FAKE_IDS, fakeCard: fakeCard,
  liveCardIds: liveCardIds, scanForLiveContent: scanForLiveContent, rulesTestSources: rulesTestSources,
};
