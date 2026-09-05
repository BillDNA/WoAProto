/* Trench. Dug during the game from a per-player reserve, so it is the one type
   stored in st.pieces.trenches rather than authored into the map. It denies the
   attacker's support across its border — ownership is irrelevant, lose a trench
   and the enemy uses it. The guns can blow it in.

   Two trench rules are about the FIGHT rather than the border, so they live
   with combat in engine/03-rules.js: a trenched defending border spares the
   defender on a tie, and stops a tie taking a trenched HQ. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineTerrain({
    letter: 'T',
    name: 'trench',
    label: 'Trench',
    storage: 'pieces',
    attack: function () { return 0; },
    defense: function () { return 0; },
    blocksSupport: true,
    blocksDeploy: false,
    barrageable: true
  });
})(typeof window !== 'undefined' ? window : globalThis);
