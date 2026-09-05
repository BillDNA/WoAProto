/* Trench — a terrain room over terrain.js, and the only one stored as pieces:
   it is dug during the game from a per-side reserve into st.pieces.trenches,
   not authored into the map. On the combat and support axis it is a true
   sibling — it denies ATTACKER support across the border (ownership is
   irrelevant; lose a trench and the enemy uses it just fine) and grants no
   defence power of its own. The naval guns can blow it in.

   Two rules key on a trench without going through the side questions, because
   they are about the FIGHT rather than the border: a trenched defending border
   spares the defender on a tie, and stops a tie capturing a trenched HQ. Those
   live with combat in engine/03-rules.js. */
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
    barrageable: true,
    colour: '#5a4326',
    glyphColour: '#5a4326'
  });
})(typeof window !== 'undefined' ? window : globalThis);
