/* An outline authored as an EXPLICIT HEX SET: [q, r] per hex.

   The honest form for an irregular outline, and what the shape editor writes —
   spans cannot describe a board with a hole in it. A duplicate hex is caught by
   the base, which is the only thing that can see the whole list. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineShapeForm({
    id: 'hexes',
    has: function (def) { return !!def.hexes; },
    hexes: function (def, add) {
      def.hexes.forEach(function (h) { add(h[0], h[1]); });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
