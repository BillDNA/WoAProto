/* The unit base. Every other .js file here is one unit type; each calls
   defineUnit() once, and this file holds everything they share.

   A unit is a piece a side owns: it stands on a hex, it fights, it is worth
   something to the enemy when it falls, and the box holds a fixed number of it.
   A type declares where each of those answers is read from (see FIELDS below)
   and nothing more; combat, the AI's valuation, the reserve model and the card
   yardstick ask through I.UNITS / unitTypes / unitStock / unitValue /
   deployPoints and never name a type.

   The numbers themselves stay DATA — maps.js's "units" block, wholly replaced by
   an active content/units/*.js variant, merged with this house's own dials in
   unit-config.js. This file owns the shape, not the values.

   Classic script (browser + node), shared namespace g.WOA_E. Prose: unit.md */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // What a room declares. Every field is required; anything else is rejected.
  // Each answer is a function so it reads its dial at call time — retuning a row
  // of CONFIG.unit takes effect without redefining the type.
  var FIELDS = {
    type:       'string',    // the key every layer stores a piece under
    name:       'function',  // () -> the game word shown to a player
    atk:        'function',  // () -> power attacking out of its hex
    def:        'function',  // () -> power defending its hex
    sup:        'function',  // () -> power lent to an adjacent fight
    worth:      'function',  // () -> field score the enemy banks for destroying it
    count:      'function',  // () -> pieces of it the box holds, per side
    aiValue:    'function',  // () -> what the AI prices one of them at
    deployCost: 'function'   // () -> points a deploy step of it adds to a card
  };
  // The answers a caller reads off I.UNITS[type] — the stat record.
  var RECORD = ['name', 'atk', 'def', 'sup', 'worth', 'count'];

  var all = [], byType = {}, UNITS = {};

  function bad(id, msg) { throw new Error('defineUnit(' + JSON.stringify(id) + '): ' + msg); }

  function defineUnit(spec) {
    var id = spec && spec.type;
    if (typeof id !== 'string' || !/^[a-z][a-z-]*$/.test(id)) bad(id, 'type must be a lower-case word');
    if (byType[id]) bad(id, 'duplicate type');
    Object.keys(FIELDS).forEach(function (f) {
      if (spec[f] == null) bad(id, 'missing ' + f + ' (' + FIELDS[f] + ')');
      if (typeof spec[f] !== FIELDS[f]) bad(id, f + ' must be ' + FIELDS[f]);
    });
    Object.keys(spec).forEach(function (f) {
      if (!FIELDS[f]) bad(id, 'unknown field ' + JSON.stringify(f));
    });
    if (!I.CONFIG.unit[id]) bad(id, 'no row in CONFIG.unit — add one to maps.js\'s "units" block');
    all.push(spec); byType[id] = spec;
    UNITS[id] = record(spec);
    return spec;
  }

  // The stat record every layer reads: I.UNITS[t].atk, .worth, .name…
  // Getters rather than a snapshot, so a dial edit shows through without
  // redefining the type, and enumerable so the record still stringifies for the
  // report and DB layers.
  function record(spec) {
    var v = {};
    RECORD.forEach(function (f) {
      Object.defineProperty(v, f, { enumerable: true, get: function () { return spec[f](); } });
    });
    return v;
  }

  function unitTypes() { return all.map(function (u) { return u.type; }); }
  function unitOf(t) { return byType[t] || null; }
  // The box's stock per type — what a full reserve holds, and what the mat draws
  // a slot for.
  function unitStock() {
    var out = {};
    all.forEach(function (u) { out[u.type] = u.count() || 0; });
    return out;
  }

  /* ---------- what a type is worth to each layer ---------- */
  // The AI's own price for one piece, kept apart from the rules' `worth` (the
  // enemy's field score) because the search values a piece for what it can still
  // do, not for the points it hands over. No dial falls back to the bounty.
  function unitValue(t) {
    var u = byType[t];
    if (!u) return 1;
    var v = u.aiValue();
    return typeof v === 'number' ? v : u.worth() + 2;
  }
  // The surcharge a deploy step of this type adds to a card's price. A step with
  // no unit costs nothing extra.
  function deployPoints(t) {
    var u = byType[t];
    return (u && u.deployCost()) || 0;
  }

  /* ---------- the physical model, written once ---------- */
  // Physical-board guardrail: a side always fields exactly CONFIG.pieceTotal
  // pieces. The values are free data; the TOTAL is the invariant. Returns a
  // problem string, or null. Checked at load (07-export) so a bad units variant
  // fails loud instead of quietly skewing every skirmish.
  function unitStockProblem() {
    var stock = unitStock(), total = 0;
    Object.keys(stock).forEach(function (t) { total += stock[t]; });
    if (total === I.CONFIG.pieceTotal) return null;
    return 'unit composition must total ' + I.CONFIG.pieceTotal + ' pieces (got ' + total +
      (I.unitVariant ? ' from units variant "' + I.unitVariant + '"' : ' in maps.js') + ')';
  }
  function checkUnitStock() {
    var prob = unitStockProblem();
    if (prob) throw new Error('War of Attrition: ' + prob);
  }

  /* shared-namespace exports */
  I.defineUnit = defineUnit;
  I.UNITS = UNITS;
  I.unitTypes = unitTypes;
  I.unitOf = unitOf;
  I.unitStock = unitStock;
  I.unitValue = unitValue;
  I.deployPoints = deployPoints;
  I.unitStockProblem = unitStockProblem;
  I.checkUnitStock = checkUnitStock;
})(typeof window !== 'undefined' ? window : globalThis);
