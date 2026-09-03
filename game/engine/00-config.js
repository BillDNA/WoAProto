/* War of Attrition — engine part 00: the game-config home.

   Engine-tier config: rules-facing dials as named data, made by the shared
   defineConfigHome helper (attaches the digest getter). Published as I.CONFIG /
   Engine.CONFIG. Loads FIRST (before 01-core) so 01-core aliases its flat exports
   into it. Classic script (browser + node), g.WOA_E alias I. UI peer: ui/ui-config.js. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // Piece stocks stay hand-editable in maps.js (CORE); the home reads them from there.
  var CORE = global.WOA_BUILTIN ||
    (typeof require === 'function' ? require('../maps.js') : null) || {};

  // configDigest: canonical, key-order-independent serialization (arrays positional —
  // `combo` order matters) hashed FNV-1a; stable across runs, changes iff a value does.
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

  // Makes a config home: one shared, non-enumerable digest getter (reads `this`) so
  // every home shares it — the seam checks a home by that identity. No freeze (tests mutate homes).
  function homeDigest() { return configDigest(this); }
  function defineConfigHome(dials) {
    Object.defineProperty(dials, 'digest', { enumerable: false, get: homeDigest });
    return dials;
  }

  // The engine config home. Non-exhaustive by design — add a dial here and the digest
  // picks it up. (AI_WEIGHTS stays out until Commanders give it a home.)
  I.CONFIG = defineConfigHome({
    // Army-points budget ceiling — the fairness constraint that lets two asymmetric
    // battalions be "matched"; the editor rejects an over-budget battalion.
    pointsCap: 100,

    // Army-points weight table (ADR-0002): a descriptive yardstick — points are
    // COMPUTED from a card's steps against it, never stored per card; measured
    // balance overrules the number. `combo` prices stacked actions superlinearly.
    points: {
      combo: [1, 2, 3, 5, 8, 13, 21, 34, 55],           // Nth stacked action costs base x combo[N] (Fibonacci)
      step: { deploy: 3, attack: 2, reposition: 1, trench: 1, barrage: 2 },
      tier: { infantry: 0, cavalry: 1, artillery: 2 },   // deploy unit surcharge
      mod: 1,                                             // per point of |attack mod|
      tieSpare: 1, noAdvance: 0.5, anywhere: 1           // flag surcharges
    },

    // Piece stocks (editable in maps.js): terrain chit counts + trench pieces.
    terrainStock: CORE.terrainStock || { F3: 2, F2: 4, M3: 2, M2: 4 },
    trenchCount: CORE.trenchCount || 3,

    // Map hex ceiling — the physical board-size guardrail; enforced by validateMaps
    // AND the map editor, so it homes here where both read one owner.
    mapHexCeiling: 24
  });
  I.configDigest = configDigest;
  I.defineConfigHome = defineConfigHome;
  // Node: also expose the maker as a module export so a node-only peer home
  // (dev/lab-config.js) can require JUST this part for defineConfigHome — same cached
  // module the full engine loads, so the shared digest getter's identity holds — without
  // pulling the whole engine + content I/O. The browser has no `module`; the global above serves it.
  if (typeof module !== 'undefined' && module.exports)
    module.exports = { defineConfigHome: defineConfigHome, configDigest: configDigest };
})(typeof window !== 'undefined' ? window : globalThis);
