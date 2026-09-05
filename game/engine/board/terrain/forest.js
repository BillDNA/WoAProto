/* Forest — a terrain room over terrain.js. Cover to attack out of: the
   occupant of the hex holding the forest hits harder across that side. The
   naval guns can burn it off the board. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineTerrain({
    letter: 'F',
    name: 'forest',
    label: 'Forest',
    storage: 'edges',
    attack: function () { return I.CONFIG.combat.terrain.F.attack; },
    defense: function () { return 0; },
    blocksSupport: false,
    blocksDeploy: false,
    barrageable: true,
    colour: 'var(--forest)',
    glyphColour: '#3a6330'
  });
})(typeof window !== 'undefined' ? window : globalThis);
