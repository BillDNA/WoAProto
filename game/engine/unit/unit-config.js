/* Every tunable number about a unit, one row per type.

   Installed as Engine.CONFIG.unit, so it is inside the config digest that keys
   DB rows — retune a row and new runs slice apart from old ones. Rows are keyed
   by the unit's type word and read by that type's own room.

     name        the game word shown to a player
     atk/def/sup power attacking, defending, and lent to an adjacent fight
     worth       field score the enemy banks for destroying it
     count       pieces of it the box holds, per side
     aiValue     what the AI prices one of them at in its own search
     deployCost  points a deploy step of it adds to a card's price

   The first six are hand-editable in maps.js's "units" block, and an active
   content/units/*.js variant replaces that block wholly — composition, values
   and stats are all content levers. The last two are this house's own dials,
   held here and merged in; a variant may override them by naming them in its
   row, and a type with no dial falls back (aiValue -> worth + 2, deployCost -> 0).

   Loads after 01-core, which resolves WOA_CONTENT. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  var CORE = global.WOA_BUILTIN ||
    (typeof require === 'function' ? require('../../maps.js') : null) || {};
  var CONTENT = global.WOA_CONTENT || {};

  // The AI's price per piece was an AI weight until this house was built; it is
  // a fact about the unit, not about a personality, so it lives beside the stats.
  var DIALS = {
    infantry:  { aiValue: 3, deployCost: 0 },
    cavalry:   { aiValue: 4, deployCost: 1 },
    artillery: { aiValue: 5, deployCost: 2 }
  };

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
