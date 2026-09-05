/* Cavalry. The hammer — it hits hardest, defends worst and supports nobody, so
   it is a piece to spend rather than to hold a hex with. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  I.defineUnit({
    type: 'cavalry',
    name:       function () { return I.CONFIG.unit.cavalry.name; },
    atk:        function () { return I.CONFIG.unit.cavalry.atk; },
    def:        function () { return I.CONFIG.unit.cavalry.def; },
    sup:        function () { return I.CONFIG.unit.cavalry.sup; },
    worth:      function () { return I.CONFIG.unit.cavalry.worth; },
    count:      function () { return I.CONFIG.unit.cavalry.count; },
    aiValue:    function () { return I.CONFIG.unit.cavalry.aiValue; },
    deployCost: function () { return I.CONFIG.unit.cavalry.deployCost; }
  });
})(typeof window !== 'undefined' ? window : globalThis);
