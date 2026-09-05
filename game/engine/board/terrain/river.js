/* River. Support crosses it freely — what it stops is deploy control, so an
   army already on the field fights across the water but a side cannot creep
   new units over it. Attacks, repositions and Airdrop cross. Nothing removes it. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineTerrain({
    letter: 'R',
    name: 'river',
    label: 'River',
    storage: 'edges',
    attack: function () { return 0; },
    defense: function () { return 0; },
    blocksSupport: false,
    blocksDeploy: true,
    holdsOnTie: false,
    barrageable: false
  });
})(typeof window !== 'undefined' ? window : globalThis);
