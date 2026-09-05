/* Every tunable number about a unit, one row per type, installed as
   Engine.CONFIG.unit so it is inside the config digest that keys DB rows.

   The rows are not written here. They are content — content/units/<slug>.js,
   exactly one flagged active — so a whole alternative army is a file you can
   delete, and `--units <id>` plays it. This file is the door between that
   content and the engine: it picks the active set and hands it to the rooms,
   which read their own row by name.

   What the AI pays for a piece is not a row of its own: the search values a
   piece at its bounty plus AI_WEIGHTS.unitValueBase, so a new type is priced
   without a number to keep in step. */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  var sets = (global.WOA_CONTENT && global.WOA_CONTENT.units) || [];
  var active = sets.filter(function (u) { return u && u.active; })[0] || null;
  if (!active || !active.units)
    throw new Error('War of Attrition: no unit set loaded — content/units/ needs exactly one file flagged active:true');

  // Which set resolved, so a guardrail can name the file the author is editing.
  I.unitSet = active.id;
  I.CONFIG.unit = I.defineConfigHome(active.units);
})(typeof window !== 'undefined' ? window : globalThis);
