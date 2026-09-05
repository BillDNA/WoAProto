/* An outline authored as ROW SPANS: [r, qFrom, qTo] per row, contiguous.

   The compact form, and how every built-in board is written — a regular outline
   is a handful of spans. A row listed twice is a throw: it would silently drop
   half the board. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineShapeForm({
    id: 'rows',
    has: function (def) { return !!def.rows; },
    hexes: function (def, add, name) {
      var seen = {};
      def.rows.forEach(function (row) {
        var r = row[0];
        if (seen[r]) throw new Error('shape "' + name + '": row r=' + r + ' listed twice');
        seen[r] = true;
        for (var q = row[1]; q <= row[2]; q++) add(q, r);
      });
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
