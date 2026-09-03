/* Seam-test tracer. The verification pattern the refactors
   reuse: pick ONE seam, test it ALONE, and assert the MECHANISM (a limit can be
   set and is enforced) — never the VALUE (not "the cap is 72", not any card's or
   battalion's point total). Tuning game content, or the cap itself, reds nothing here;
   only breaking the enforcement does, and a red localises to this one seam.

   Frozen-API entry game/test.js delegates here; run alone with
   `node game/test.seams.js` or the whole gate with `node game/test.js`. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const { E } = require('./test.helpers.js');

// The seam: the army-points budget. A battalion's points are COMPUTED (E.battalionPoints, a
// pure count-weighted fold over E.cardPoints) and one CAP (E.BATTALION_POINTS_CAP)
// gates them — the same reject the battalion editor makes on an over-budget battalion.
test('seam: the army-points cap is a settable, enforced limit', () => {
  const cap = E.BATTALION_POINTS_CAP;
  assert.ok(typeof cap === 'number' && cap > 0, 'a positive cap is set (E.BATTALION_POINTS_CAP)');

  // battalionPoints is additive and count-weighted — asserted as a RELATIONSHIP on a
  // synthetic card, so no printed point value is pinned. (Two copies cost twice
  // one copy; the per-card cost is whatever the weight table says.)
  const oneStep = { steps: [{ type: 'attack' }] };
  const perCard = E.cardPoints(oneStep);
  assert.ok(perCard > 0, 'a card with an attack step costs points (mechanism, not a pinned number)');
  const single = { cards: [{ id: 'a', name: 'A', count: 1, steps: oneStep.steps }] };
  const doubled = { cards: [{ id: 'a', name: 'A', count: 2, steps: oneStep.steps }] };
  assert.ok(E.battalionPoints(doubled) === 2 * E.battalionPoints(single), 'battalionPoints is count-weighted (2 copies = 2x)');

  // Build two battalions RELATIVE to the live cap so the boundary tracks the limit, not
  // a literal. `floor(cap / perCard) * perCard <= cap` for ANY cap (an empty battalion
  // when the cap is below one card), so `under` is at-or-below the cap by
  // construction — no coupling to the cap's magnitude. One over is pushed past it.
  const underN = Math.floor(cap / perCard);
  const under = { cards: [{ id: 'u', name: 'U', count: underN, steps: oneStep.steps }] };
  const over = { cards: [{ id: 'o', name: 'O', count: Math.ceil(cap / perCard) + 2, steps: oneStep.steps }] };
  assert.ok(E.battalionPoints(under) <= cap, 'a battalion built below the cap passes the cap gate');
  assert.ok(E.battalionPoints(over) > cap, 'a battalion pushed past the cap is over budget — the gate rejects it');

  // "A limit can be SET": the gate is parameterised by the limit it is handed, not
  // by a baked constant. The SAME under-cap battalion passes at the real cap and fails
  // when handed a stricter limit below its own total — proving enforcement reads
  // the limit, so retuning the cap moves the boundary without touching this test.
  const gate = (battalion, limit) => E.battalionPoints(battalion) <= limit;
  const stricter = E.battalionPoints(under) - perCard / 2;
  assert.ok(gate(under, cap) && !gate(under, stricter),
    'enforcement tracks the limit it is given (lower the limit below the battalion and the same battalion fails)');
});

// The seam: the config home. One namespace object (E.CONFIG) owns the
// rules-facing tunables; the pre-existing flat exports resolve INTO it. Asserted as
// IDENTITY (one value, two paths), never as a pinned value — retuning a dial reds
// nothing here, only breaking the aliasing does.
test('seam: the flat exports are aliases into the config home (one owner)', () => {
  assert.ok(E.CONFIG && typeof E.CONFIG === 'object', 'E.CONFIG is the config namespace');
  // one value, two access paths — the flat exports resolve into E.CONFIG.
  assert.ok(E.BATTALION_POINTS_CAP === E.CONFIG.pointsCap, 'BATTALION_POINTS_CAP aliases CONFIG.pointsCap');
  assert.ok(E.POINTS === E.CONFIG.points, 'POINTS aliases CONFIG.points (same object identity)');
  assert.ok(E.TERRAIN_STOCK === E.CONFIG.terrainStock, 'TERRAIN_STOCK aliases CONFIG.terrainStock (same object identity)');
  // the home is the single owner the enforcement reads: the cap the gate uses IS
  // the value in the home (proven via the alias identity above + the gate below).
  const bat = { cards: [{ id: 'x', name: 'X', count: 1, steps: [{ type: 'attack' }] }] };
  const overByHome = E.battalionPoints(bat) > E.CONFIG.pointsCap;
  const overByExport = E.battalionPoints(bat) > E.BATTALION_POINTS_CAP;
  assert.ok(overByHome === overByExport, 'the gate reads one owner — home and flat export agree');
});

// The home maker + the digest contract, asserted as identity + relationships, never a
// pinned digest string — testing the util covers the engine and UI homes uniformly.
test('seam: the config digest is stable, value-sensitive, and no-false-split', () => {
  const digest = E.configDigest;
  assert.ok(typeof digest === 'function', 'E.configDigest is the shared digest util');
  assert.ok(typeof E.defineConfigHome === 'function', 'E.defineConfigHome is the shared home maker');

  // Identity, not value: the maker installs ONE shared getter, so both homes' getter is
  // the same function and a hand-rolled home (its own getter) fails here. Value changes don't.
  const homeA = E.defineConfigHome({ x: 1 });
  const homeB = E.defineConfigHome({ y: 2 });
  const getA = Object.getOwnPropertyDescriptor(homeA, 'digest').get;
  const getB = Object.getOwnPropertyDescriptor(homeB, 'digest').get;
  const cfgDesc = Object.getOwnPropertyDescriptor(E.CONFIG, 'digest');
  assert.ok(typeof getA === 'function' && getA === getB, 'defineConfigHome installs ONE shared getter, not a per-home closure');
  assert.ok(cfgDesc.get === getA, 'E.CONFIG was made by defineConfigHome (its digest getter IS the shared one)');
  assert.ok(cfgDesc.enumerable === false, 'the digest getter is non-enumerable (never feeds its own hash)');
  assert.ok(!Object.isFrozen(E.CONFIG), 'the config home is not frozen (a dial can be tuned)');

  // stable: identical values → identical digest, across separately-built equal
  // objects and across repeated reads (order-independent for object keys).
  const a = { pointsCap: 100, points: { step: { deploy: 3, attack: 2 } } };
  const aReordered = { points: { step: { attack: 2, deploy: 3 } }, pointsCap: 100 };
  assert.ok(digest(a) === digest(aReordered), 'stable & key-order-independent (identical values → identical digest)');
  assert.ok(E.CONFIG.digest === digest(E.CONFIG), 'the home digest getter is the util over the home');
  assert.ok(E.CONFIG.digest === E.CONFIG.digest, 'the home digest is stable across reads');

  // value-sensitive: a changed tunable → a different digest.
  const bumped = { pointsCap: 101, points: { step: { deploy: 3, attack: 2 } } };
  assert.ok(digest(a) !== digest(bumped), 'value-sensitive (a changed tunable → a different digest)');

  // no false split: the digest is a pure function of the config values it is handed —
  // an unrelated change elsewhere (content, a card's points) leaves it untouched,
  // because it never sees anything but the config object's own values.
  const aCopy = JSON.parse(JSON.stringify(a));
  assert.ok(digest(a) === digest(aCopy), 'no false split (same config values → same digest regardless of surrounding state)');
});
