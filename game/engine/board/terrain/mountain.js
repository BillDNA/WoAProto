/* Mountain. High ground for whoever holds the hex. Nothing removes it. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineTerrain({
    letter: 'M',
    name: 'mountain',
    label: 'Mountain',
    storage: 'edges',
    attack: function () { return 0; },
    defense: function () { return I.CONFIG.terrain.mountain.defense; },
    blocksSupport: false,
    blocksDeploy: false,
    barrageable: false
  });
})(typeof window !== 'undefined' ? window : globalThis);
