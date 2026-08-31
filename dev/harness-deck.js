#!/usr/bin/env node
/* dev/harness-deck.js — the harness-deck BUILDER for the content loop's BALANCE
   pass (#167, spec §2 "Balance measures the card, not a lucky draft").
 *
 * The engine plays DECKS, but the loop is measuring one authored CARD. So the
 * balance pass PINS the card into a legal harness deck — a rotating instrument to
 * seat one card in a measured game (spec §10.1) — and sweeps THAT. This is the
 * create-card manual recipe ("swap the card into a deck, watch its Simple% /
 * 1stSight%") automated into a named builder, so nothing about the pin is stubbed
 * (#167 AC "Harness-deck builder").
 *
 * A harness is the minimal legal deck that isolates the card: a cheap deploy
 * OPENER (count 1, starting) + the pinned card (count 1) + cheap FILLER to the
 * 16-card band. Count 1 on the pin is deliberate — we measure the card as drawn,
 * not hoarded. Legality is the ONE shared implementation, E.deckProblems (the same
 * primitive the deck editor, the drafter and author-card use); a card that fails it
 * comes back as `problems`, never thrown and never handed to the engine as a broken
 * deck (#167 AC "Only legal cards reach the balance sweep").
 *
 * dev/balance-report.js --pin-card <id> and dev/content-loop.js both build their pin
 * through this one builder.
 */
'use strict';

const path = require('path');
const E = require(path.join(__dirname, '..', 'game', 'engine.js'));

const HARNESS_TOTAL = 16;           // the low end of the 16-17 legality band

function pts(c) { try { return E.cardPoints(c); } catch (e) { return Infinity; } }
function isDeploy(c) { return Array.isArray(c.steps) && c.steps.some(function (s) { return s && s.type === 'deploy'; }); }
function openable(c) { return !c.noOpener && c.id !== 'airdrop'; }   // airdrop is engine-special (kept out of opening hands)

/* Seat one card into a legal harness deck. `card` is a catalog-shaped object
   ({id,name,text,steps}); opts.catalog is the pool to draw the opener + filler from
   (default: the engine's loaded catalog). Returns:
     { deck, problems, opener, filler, pinned }
   `problems` is E.deckProblems on the assembled harness (empty = legal to sweep).
   Never throws — a bad card or a too-thin catalog is reported, so the caller records
   a finding and skips the sweep instead of feeding the engine a broken deck. */
function seatCard(card, opts) {
  opts = opts || {};
  if (!card || !card.id) return { deck: null, problems: ['harness: card needs an id'], opener: null, filler: null, pinned: null };

  var catalog = (opts.catalog || E.CARDS || []).filter(function (c) { return c && c.id && c.id !== card.id; });

  // Opener: the cheapest openable DEPLOY (a real turn-1 move), else the cheapest
  // openable card — so the harness actually plays, not just validates.
  var byCost = catalog.slice().sort(function (a, b) { return pts(a) - pts(b); });
  var opener = byCost.filter(function (c) { return openable(c) && isDeploy(c); })[0]
            || byCost.filter(openable)[0];
  // Filler: the cheapest card that is neither the pin nor the opener — one card at
  // count 14 keeps the harness minimal and the pin's exposure clean.
  var filler = byCost.filter(function (c) { return c.id !== (opener && opener.id); })[0];

  if (!opener || !filler) {
    return { deck: null, problems: ['harness: catalog too thin to build an opener + filler for "' + card.id + '"'],
      opener: opener ? opener.id : null, filler: filler ? filler.id : null, pinned: card.id };
  }

  var cards = [
    Object.assign(ref(opener), { count: 1, starting: true }),
    Object.assign(ref(card), { count: 1 }),
    Object.assign(ref(filler), { count: HARNESS_TOTAL - 2 })
  ];
  var deck = { id: 'harness-' + card.id, name: 'Harness · ' + (card.name || card.id), cards: cards };
  return { deck: deck, problems: E.deckProblems(cards), opener: opener.id, filler: filler.id, pinned: card.id };
}

// A clean deck-ref copy of a card: keep the engine fields, drop any stray deck-ref
// props the source might carry (a harness never inherits count/starting/out).
function ref(c) {
  var out = Object.assign({}, c);
  delete out.count; delete out.starting; delete out.out;
  return out;
}

module.exports = { seatCard, HARNESS_TOTAL };
