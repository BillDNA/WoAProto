/* Every tunable number about terrain, one row per type.

   Installed as Engine.CONFIG.terrain, so it is inside the config digest that
   keys DB rows — retune a row and new runs slice apart from old ones. Rows are
   keyed by the terrain's game word and read by that terrain's own room.

     attack / defense   power the side swings in a fight
     pieces             physical chits the box holds, by side length
     perSide            trenches a player may dig (trench only)

   Defaults are hand-editable in maps.js. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  var CORE = global.WOA_BUILTIN ||
    (typeof require === 'function' ? require('../../../maps.js') : null) || {};

  I.CONFIG.terrain = I.defineConfigHome(CORE.terrain || {
    forest:   { attack: 1,  pieces: { 2: 4, 3: 2 } },
    mountain: { defense: 1, pieces: { 2: 4, 3: 2 } },
    river:    { pieces: { 2: 4, 3: 2 } },
    trench:   { perSide: 3 }
  });
})(typeof window !== 'undefined' ? window : globalThis);
