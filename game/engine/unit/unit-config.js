/* Every tunable number about a unit, one row per type.

   Installed as Engine.CONFIG.unit, so it is inside the config digest that keys
   DB rows — retune a row and new runs slice apart from old ones. Rows are keyed
   by the unit's type word and read by that type's own room.

     name        the game word shown to a player
     atk/def/sup power attacking, defending, and lent to an adjacent fight
     worth       field score the enemy banks for destroying it
     count       pieces of it the box holds, per side
     deployCost  points a deploy step of it adds to a card's price

   The first six are hand-editable in maps.js's "units" block, and an active
   content/units/*.js variant replaces that block wholly — composition, values
   and stats are all content levers. deployCost is this house's own dial, held
   here and merged in; a variant may override it by naming it in its row, and a
   type with none costs nothing extra.

   What the AI prices a piece at is NOT here. It is an AI weight, installed
   below as AI_WEIGHTS.unitValue, because only Engine.CONFIG.digest is stamped
   onto DB rows — sweeping the AI's price for cavalry must not make every run
   after it incomparable with every run before. Being a weight also means a
   personality or a Commander can reprice a piece.

   Loads after 01-core, which resolves WOA_CONTENT. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  var CORE = global.WOA_BUILTIN ||
    (typeof require === 'function' ? require('../../maps.js') : null) || {};
  var CONTENT = global.WOA_CONTENT || {};

  var DIALS = {
    infantry:  { deployCost: 0 },
    cavalry:   { deployCost: 1 },
    artillery: { deployCost: 2 }
  };
  // What the AI pays for one piece of each type — the AI tier's half of a unit's
  // row, read by that type's own room through the merged weight vector.
  I.AI_WEIGHTS.unitValue = { infantry: 3, cavalry: 4, artillery: 5 };

  var variant = (CONTENT.units || []).filter(function (u) { return u && u.active; })[0] || null;
  var stats = (variant && variant.units) || CORE.units || {};

  var rows = {};
  Object.keys(stats).forEach(function (t) {
    var row = {}, dial = DIALS[t] || {};
    Object.keys(dial).forEach(function (k) { row[k] = dial[k]; });
    Object.keys(stats[t]).forEach(function (k) { row[k] = stats[t][k]; });
    rows[t] = row;
  });

  // Which variant resolved, for the stock guardrail's error message.
  I.unitVariant = variant ? variant.id : null;
  I.CONFIG.unit = I.defineConfigHome(rows);
})(typeof window !== 'undefined' ? window : globalThis);
