/* Infantry. The line piece — the only type that both defends and supports, and
   the one the box holds most of. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineUnit({
    type: 'infantry',
    name:       function () { return I.CONFIG.unit.infantry.name; },
    atk:        function () { return I.CONFIG.unit.infantry.atk; },
    def:        function () { return I.CONFIG.unit.infantry.def; },
    sup:        function () { return I.CONFIG.unit.infantry.sup; },
    worth:      function () { return I.CONFIG.unit.infantry.worth; },
    count:      function () { return I.CONFIG.unit.infantry.count; },
    aiValue:    function () { return I.CONFIG.unit.infantry.aiValue; },
    deployCost: function () { return I.CONFIG.unit.infantry.deployCost; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
