/* Forest. Cover to attack out of, and the guns can burn it away. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineTerrain({
    letter: 'F',
    name: 'forest',
    label: 'Forest',
    storage: 'edges',
    attack: function () { return I.CONFIG.terrain.forest.attack; },
    defense: function () { return 0; },
    blocksSupport: false,
    blocksDeploy: false,
    barrageable: true
  });
})(typeof window !== 'undefined' ? window : globalThis);
