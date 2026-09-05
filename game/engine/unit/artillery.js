/* Artillery. The anvil — it never attacks and never defends, it doubles the
   fight next door, and it is the richest bounty on the board. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineUnit({
    type: 'artillery',
    name:       function () { return I.CONFIG.unit.artillery.name; },
    atk:        function () { return I.CONFIG.unit.artillery.atk; },
    def:        function () { return I.CONFIG.unit.artillery.def; },
    sup:        function () { return I.CONFIG.unit.artillery.sup; },
    worth:      function () { return I.CONFIG.unit.artillery.worth; },
    count:      function () { return I.CONFIG.unit.artillery.count; },
    aiValue:    function (price) { return price.artillery; },
    deployCost: function () { return I.CONFIG.unit.artillery.deployCost; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
