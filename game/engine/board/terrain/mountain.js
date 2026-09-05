/* Mountain — a terrain room over terrain.js. High ground: the hex holding the
   mountain is harder to take across that side. Nothing removes it. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineTerrain({
    letter: 'M',
    name: 'mountain',
    label: 'Mountain',
    storage: 'edges',
    attack: function () { return 0; },
    defense: function () { return I.CONFIG.combat.terrain.M.defense; },
    blocksSupport: false,
    blocksDeploy: false,
    barrageable: false,
    colour: 'var(--mountain)',
    glyphColour: '#5d5a52'
  });
})(typeof window !== 'undefined' ? window : globalThis);
