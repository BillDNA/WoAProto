/* An outline authored as contiguous ROW SPANS: { rows: [[r, qFrom, qTo], ...] }.
   The hand-written form — the shape library in maps.js is all rows, because a
   symmetric board reads as a column of counts (4-5-6-5-4).

   Classic script (browser + node), shared namespace g.WOA_E. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineOutlineForm({
    form: 'rows',
    has: function (def) { return !!def.rows; },
    hexes: function (def, name) {
      var out = [], seen = {};
      def.rows.forEach(function (row) {
        var r = row[0];
        if (seen[r]) throw new Error('shape "' + name + '": row r=' + r + ' listed twice');
        seen[r] = true;
        for (var q = row[1]; q <= row[2]; q++) out.push([q, r]);
      });
      return out;
    }
  });
})(typeof window !== 'undefined' ? window : globalThis);
