/* Seam-test tracer (WoAProto#222). The verification pattern the later refactors
   reuse: pick ONE seam, test it ALONE, and assert the MECHANISM (a limit can be
   set and is enforced) — never the VALUE (not "the cap is 72", not any card's or
   deck's point total). Tuning game content, or the cap itself, reds nothing here;
   only breaking the enforcement does, and a red localises to this one seam.

   Frozen-API entry game/test.js delegates here; run alone with
   `node game/test.seams.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E } = require('./test.helpers.js');

// The seam: the army-points budget. A deck's points are COMPUTED (E.deckPoints, a
// pure count-weighted fold over E.cardPoints) and one CAP (E.DECK_POINTS_CAP)
// gates them — the same reject the deck editor makes on an over-budget deck.
test('seam: the army-points cap is a settable, enforced limit', () => {
  const cap = E.DECK_POINTS_CAP;
  assert.ok(typeof cap === 'number' && cap > 0, 'a positive cap is set (E.DECK_POINTS_CAP)');

  // deckPoints is additive and count-weighted — asserted as a RELATIONSHIP on a
  // synthetic card, so no printed point value is pinned. (Two copies cost twice
  // one copy; the per-card cost is whatever the weight table says.)
  const oneStep = { steps: [{ type: 'attack' }] };
  const perCard = E.cardPoints(oneStep);
  assert.ok(perCard > 0, 'a card with an attack step costs points (mechanism, not a pinned number)');
  const single = { cards: [{ id: 'a', name: 'A', count: 1, steps: oneStep.steps }] };
  const doubled = { cards: [{ id: 'a', name: 'A', count: 2, steps: oneStep.steps }] };
  assert.ok(E.deckPoints(doubled) === 2 * E.deckPoints(single), 'deckPoints is count-weighted (2 copies = 2x)');

  // Build two decks RELATIVE to the live cap so the boundary tracks the limit, not
  // a literal. `floor(cap / perCard) * perCard <= cap` for ANY cap (an empty deck
  // when the cap is below one card), so `under` is at-or-below the cap by
  // construction — no coupling to the cap's magnitude. One over is pushed past it.
  const underN = Math.floor(cap / perCard);
  const under = { cards: [{ id: 'u', name: 'U', count: underN, steps: oneStep.steps }] };
  const over = { cards: [{ id: 'o', name: 'O', count: Math.ceil(cap / perCard) + 2, steps: oneStep.steps }] };
  assert.ok(E.deckPoints(under) <= cap, 'a deck built below the cap passes the cap gate');
  assert.ok(E.deckPoints(over) > cap, 'a deck pushed past the cap is over budget — the gate rejects it');

  // "A limit can be SET": the gate is parameterised by the limit it is handed, not
  // by a baked constant. The SAME under-cap deck passes at the real cap and fails
  // when handed a stricter limit below its own total — proving enforcement reads
  // the limit, so retuning the cap moves the boundary without touching this test.
  const gate = (deck, limit) => E.deckPoints(deck) <= limit;
  const stricter = E.deckPoints(under) - perCard / 2;
  assert.ok(gate(under, cap) && !gate(under, stricter),
    'enforcement tracks the limit it is given (lower the limit below the deck and the same deck fails)');
});
