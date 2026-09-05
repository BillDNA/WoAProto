/* Every rules dial for terrain, one row per type, read by that type's own room.
   Installed as Engine.CONFIG.terrain, so it is inside the config digest that
   keys DB rows — retune a row and new runs slice apart from old ones. Rows are
   hand-editable in maps.js; the block below is the fallback if it has none. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  var CORE = global.WOA_BUILTIN ||
    (typeof require === 'function' ? require('../../../maps.js') : null) || {};

  I.CONFIG.terrain = I.defineConfigHome(CORE.terrain || {
    // attack / defense = power the side swings in a fight, from behind or across it
    // pieces           = physical chits the box holds, by side length
    forest:   { attack: 1,  pieces: { 2: 4, 3: 2 } },
    mountain: { defense: 1, pieces: { 2: 4, 3: 2 } },
    river:    { pieces: { 2: 4, 3: 2 } },
    trench:   { perSide: 3 }   // dug in play, so a per-player allowance, not a box count
  });
})(typeof window !== 'undefined' ? window : globalThis);
