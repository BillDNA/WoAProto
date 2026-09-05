/* River — a terrain room over terrain.js. Water bends no fight: it adds no
   power and does NOT block support, which crosses it freely for both sides.
   What it denies is deploy-CONTROL extension across the border — control creep
   stops at the water while armies already on the field still support across it.
   Attacks, repositions and Airdrop cross freely; nothing removes it. */
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
    barrageable: false,
    colour: 'var(--river)',
    glyphColour: '#a9c6dd'
  });
})(typeof window !== 'undefined' ? window : globalThis);
