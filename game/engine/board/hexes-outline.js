/* An outline authored as an explicit HEX SET: { hexes: [[q, r], ...] }.
   What the shape editor writes, and the honest representation for an outline
   with holes in it — no span can say "this row, minus that one hex".

   Classic script (browser + node), shared namespace g.WOA_E. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineOutlineForm({
    form: 'hexes',
    has: function (def) { return !!def.hexes; },
    hexes: function (def) { return def.hexes; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
