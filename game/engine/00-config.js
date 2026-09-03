/* War of Attrition — engine part 00: the game-config home (issue #250).

   THE config standard, engine tier. A config home is three things:
     1. one namespace object that owns its tunables as named data,
     2. any pre-existing flat exports kept as thin aliases INTO it, and
     3. a deterministic digest over its values.
   Copy this shape verbatim for any new config tier. Its peer is the UI tier's
   game/ui/ui-config.js — same shape, minus the I.* layer (the UI has no internal
   namespace). One object, three names: defined here as GAME_CONFIG, published on
   the engine's shared namespace as I.CONFIG, exported to consumers as Engine.CONFIG.

   Loads FIRST among the engine parts (sorts before 01-core), so 01-core can alias
   its flat exports (POINTS, TERRAIN_STOCK, TRENCH_COUNT, BATTALION_POINTS_CAP) into
   it. Classic script (browser + node), sharing the g.WOA_E namespace (alias I). */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // The piece stocks stay hand-editable in maps.js (WOA_BUILTIN / CORE); the config
  // home reads them from there, so maps.js remains their editable source and the
  // config home is their single owner every other layer reads.
  var CORE = global.WOA_BUILTIN ||
    (typeof require === 'function' ? require('../maps.js') : null) || {};

  // The one namespace object. Every rules-facing game-setting dial lives here as
  // named data. Membership is non-exhaustive by design — the object is the home,
  // not a fixed list; adding a dial is a one-place edit and the digest picks it up.
  // (AI_WEIGHTS is deliberately NOT here — it lands on this pattern when #241,
  // Commanders, gives it a considered home.)
  var GAME_CONFIG = {
    // Army-points budget ceiling: the fairness constraint that lets two asymmetric
    // battalions be called "matched". The battalion editor rejects an over-budget
    // battalion the same way it rejects an oversized one.
    pointsCap: 100,

    // Army-points weight table — a descriptive capability yardstick (ADR-0002):
    // points are COMPUTED from a card's steps against this ONE hand-seeded table,
    // never stored per card, and measured balance always overrules the number.
    // Seeding intent: deploy > attack > reposition; unit tier and the attack
    // flags/mod add capability on top. `combo` escalates action-stacking — the Nth
    // action is priced at its base cost x combo[N] (Fibonacci-shaped: a 2nd action
    // costs 2x, a 3rd 3x, a 4th 5x, …), so stacking is superlinear, not free.
    points: {
      combo: [1, 2, 3, 5, 8, 13, 21, 34, 55],           // per-action-position multiplier (Fibonacci)
      step: { deploy: 3, attack: 2, reposition: 1, trench: 1, barrage: 2 },
      tier: { infantry: 0, cavalry: 1, artillery: 2 },   // deploy unit surcharge
      mod: 1,                                             // per point of |attack mod|
      tieSpare: 1, noAdvance: 0.5, anywhere: 1           // flag surcharges
    },

    // Piece stocks (editable in maps.js): terrain chit counts + trench pieces on the mat.
    terrainStock: CORE.terrainStock || { F3: 2, F2: 4, M3: 2, M2: 4 },
    trenchCount: CORE.trenchCount || 3,

    // Map hex ceiling: the physical (laser-cutter) board-size guardrail. Enforced by
    // the engine's map validator (validateMaps — content integrity) AND the map
    // editor's UI guards, so it lives HERE where both read one owner. (The battalion
    // size band, by contrast, is genuinely UI-only — the engine never checks it — so
    // it stays in the UI-config home.)
    mapHexCeiling: 24
  };

  // The digest: a canonical, object-key-order-independent serialization (arrays stay
  // positional — `combo` order is meaningful) hashed with FNV-1a. Stable across runs
  // and platforms; changes iff a tunable value changes. It is a pure fold over
  // primitives, so identical values always yield the same string. Lives on the home
  // as a NON-enumerable getter (so it never feeds its own hash) and recomputes on
  // read. ONE implementation, shared by both config homes — the UI tier calls
  // I.configDigest over its own UI_CONFIG.
  function configCanon(v) {
    if (Array.isArray(v)) return '[' + v.map(configCanon).join(',') + ']';
    if (v && typeof v === 'object')
      return '{' + Object.keys(v).sort().map(function (k) { return JSON.stringify(k) + ':' + configCanon(v[k]); }).join(',') + '}';
    return JSON.stringify(v);
  }
  function configDigest(obj) {
    var s = configCanon(obj), h = 0x811c9dc5 | 0;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); }
    return (h >>> 0).toString(16).padStart(8, '0');
  }
  Object.defineProperty(GAME_CONFIG, 'digest', { enumerable: false, get: function () { return configDigest(GAME_CONFIG); } });

  I.CONFIG = GAME_CONFIG;
  I.configDigest = configDigest;
})(typeof window !== 'undefined' ? window : globalThis);
