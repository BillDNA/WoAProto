/* The unit base. Every other .js file here is one unit type; each calls
   defineUnit() once, and this file holds everything they share.

   A unit is a piece a side owns: it stands on a hex, it fights, it is worth
   something to the enemy when it falls, and the box holds a fixed number of it.
   A type declares where each of those answers is read from (see FIELDS below)
   and nothing more.

   The house owns the pieces themselves, not just their numbers: I.Units is the
   one place unit and reserve layout is known — every deploy, march, swap, kill
   and reserve spend goes through it, so re-keying a piece is a one-file edit.
   Combat, the AI, the mat and the board ask through I.Units / I.UNITS /
   unitTypes / unitStock / unitValue / deployPoints and never name a type.

   The numbers stay DATA — content/units/<slug>.js, one file flagged active,
   installed as CONFIG.unit by unit-config.js. This file owns the shape.

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
    // A room whose type the active unit set does not carry stands DOWN rather
    // than registering: dropping a type is one of the things a set is allowed to
    // do. The stock guardrail catches the case where the drop was a typo.
    if (!I.CONFIG.unit[id]) return null;
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

  /* ---------- where the pieces are ----------
     st.pieces.units is hexKey -> {type, owner} and st.pieces.reserves[side] is
     type -> count. Reads and writes both go through here. */
  var Units = {
    all: function (st) { return st.pieces.units; },
    at: function (st, h) { return st.pieces.units[h] || null; },
    each: function (st, fn) { var U = st.pieces.units; for (var h in U) fn(h, U[h]); },
    place: function (st, h, type, owner) { st.pieces.units[h] = { type: type, owner: owner }; },
    remove: function (st, h) { delete st.pieces.units[h]; },
    advance: function (st, from, to) { st.pieces.units[to] = st.pieces.units[from]; delete st.pieces.units[from]; },
    swap: function (st, a, b) { var ua = st.pieces.units[a]; st.pieces.units[a] = st.pieces.units[b]; st.pieces.units[b] = ua; },
    reserve: function (st, p, type) { return st.pieces.reserves[p][type]; },
    spendReserve: function (st, p, type) { st.pieces.reserves[p][type]--; },
    // A side's untouched stock, the shape st.pieces.reserves starts at.
    fullReserve: unitStock
  };

  /* ---------- what a type is worth to each layer ---------- */
  // The AI's own price for one piece: its bounty plus a flat premium, because a
  // piece on the board is worth what it hands over PLUS what it can still do.
  // The premium is an AI weight, not a rules dial — AI tuning must never move
  // CONFIG.digest, which is stamped on DB rows — and a personality or Commander
  // can shift it like any other.
  function unitValue(t, w) {
    var u = byType[t];
    if (!u) return 1;
    var base = (w && typeof w.unitValueBase === 'number') ? w.unitValueBase : I.AI_WEIGHTS.unitValueBase;
    return u.worth() + base;
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
  // problem string, or null.
  function unitStockProblem() {
    var stock = unitStock(), total = 0;
    Object.keys(stock).forEach(function (t) { total += stock[t]; });
    if (total === I.CONFIG.pieceTotal) return null;
    return 'unit composition must total ' + I.CONFIG.pieceTotal + ' pieces (got ' + total +
      ') in content/units/' + I.unitSet + '.js';
  }
  // A stat row nobody claimed. Its pieces would be counted by no rule and drawn
  // by nothing, so the author's composition silently loses them — say so instead.
  function orphanRowProblem() {
    var orphans = Object.keys(I.CONFIG.unit).filter(function (t) { return !byType[t]; });
    if (!orphans.length) return null;
    return 'unit type ' + orphans.map(function (t) { return '"' + t + '"'; }).join(', ') +
      ' has stats in content/units/' + I.unitSet + '.js but no room in engine/board/unit/' +
      ' — a piece nothing can draw';
  }
  // Both checks at load (07-export), so a bad unit set fails loud instead of
  // quietly skewing every skirmish.
  function checkUnitStock() {
    var prob = orphanRowProblem() || unitStockProblem();
    if (prob) throw new Error('War of Attrition: ' + prob);
  }

  /* shared-namespace exports */
  I.defineUnit = defineUnit;
  I.UNITS = UNITS;
  I.Units = Units;
  I.unitTypes = unitTypes;
  I.unitOf = unitOf;
  I.unitStock = unitStock;
  I.unitValue = unitValue;
  I.deployPoints = deployPoints;
  I.unitStockProblem = unitStockProblem;
  I.orphanRowProblem = orphanRowProblem;
  I.checkUnitStock = checkUnitStock;
})(typeof window !== 'undefined' ? window : globalThis);
