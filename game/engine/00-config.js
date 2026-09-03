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
    mapHexCeiling: 24,

    // Player-mat piece total — physical-board guardrail (sibling to mapHexCeiling):
    // a side always fields exactly this many pieces. A units variant may re-slice
    // the composition but its counts must sum to this; 01-core enforces it at load.
    pieceTotal: 10,

    // --- combat: per-fight power bonuses (read in 03-rules) ---
    // Grouped because each is a flat power swing on one side of a single fight —
    // the levers for how much terrain and position matter in combat.
    combat: {
      forestAttack: 1,     // attacking ACROSS a forest edge adds this to attack
      mountainDefense: 1,  // defending BEHIND a mountain edge adds this to defense
      hqSupport: 1         // an adjacent friendly HQ lends this much support to a fight
    },

    // --- skirmish: per-game draw + victory dials (read in 04-skirmish) ---
    // The knobs that shape one game's rhythm: hand size and how many wins take the battle.
    skirmish: {
      // Cards drawn on the opening turn / every turn after. The "draw all" threshold
      // is COUPLED, not a separate dial: draw the lot when at most one more than a
      // full draw remains (want + 1), so tuning a count moves its threshold with it.
      handDraw: { opener: 3, normal: 4 },
      matchTarget: 3       // first side to this many skirmish wins wins the battle
    },

    // --- limits: loop-safety rails (read in 06-drive + 05-ai) ---
    // Not balance — infinite-loop guards on the drive/step loops, generous enough
    // never to bite a real game; they only stop a pathological non-terminating one.
    limits: {
      turnCap: 400,        // max turns the drive loop plays before bailing out
      stepsPerTurn: 12     // max steps drained per card before bailing (every step-drain loop reads this)
    }
  });
  I.configDigest = configDigest;
  I.defineConfigHome = defineConfigHome;
})(typeof window !== 'undefined' ? window : globalThis);
