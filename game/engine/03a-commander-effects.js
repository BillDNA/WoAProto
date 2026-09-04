/* War of Attrition — engine part 03a: the Commander effect primitives.
   Classic script (browser + node). Engine parts share the internal namespace
   g.WOA_E (alias I) — cross-part calls go through I.* at the CALL SITE (never
   captured at load time), so only filename-sorted load order matters.

   The source-agnostic vocabulary a trait compiles to. A trait names a primitive
   (combatMod / drawMod / …) + its params; this layer reads ONLY the primitive
   and its params, never where the effect came from — so the same primitive can
   later be granted by a map hex (a held point-of-interest) without a rewrite.
   What decides whether a trait is CURRENTLY contributing is its source/timing:
   a `passive` is always on, which is the whole shipped set here; a cooldown/
   charge trait contributes only while its runtime says it is live, which a
   later slice adds — this layer stays the math either way.

   Applied at the same sites as the built-in modifiers: combatMod at the combat
   hook (engine/03-rules.js computeAttack), drawMod at the draw hook
   (engine/04-skirmish.js drawHand). Both read the per-side Commander off the
   skirmish state (sideCommander). */
(function (global) {
  'use strict';
  var I = global.WOA_E = global.WOA_E || {};

  // A trait's terrain gate names game terrain; combat reads terrain as letters.
  var TERRAIN_LETTER = { forest: 'F', mountain: 'M', river: 'R' };
  // A trait with no terrain applies everywhere; one with terrain applies when the
  // fight's terrain set holds one of the named terrains ('forest|mountain' → F or M).
  // The set is the HELD hex's terrain (its owned edges), not one edge — a Fortress
  // is dug into its whole position, so its bonus keys on the hex, not the attacked
  // edge. `terrain` may arrive as a single letter (normalized to a one-item set).
  function terrainMatches(trait, terrainLetters) {
    if (!trait.terrain) return true;
    return String(trait.terrain).split('|').some(function (name) {
      return terrainLetters.indexOf(TERRAIN_LETTER[name]) >= 0;
    });
  }
  // Only always-on sources contribute through this layer today (passives). A
  // gated source is off until its runtime turns it on (a later slice).
  function traitLive(trait) { return trait.source === 'passive'; }

  // The Commander seated for a side, or null (no pick / "None" baseline). The
  // ONE reader of st.commanders' shape — seated in newSkirmish, carried on clones.
  function sideCommander(st, p) {
    return (st.commanders && st.commanders[p]) || null;
  }

  // combatMod fold for one side of one fight: sum the deltas of the Commander's
  // live combatMod traits that match this `when` (attack|defense) and the held
  // hex's terrain, with a labelled part per contributor for the combat breakdown.
  // `terrain` is the terrain-letter set of the side's hex (array), or a lone letter.
  function commanderCombat(commander, when, terrain) {
    var letters = Array.isArray(terrain) ? terrain : (terrain ? [terrain] : []);
    var delta = 0, parts = [];
    if (!commander || !commander.traits) return { delta: delta, parts: parts };
    commander.traits.forEach(function (t) {
      if (t.primitive !== 'combatMod' || !traitLive(t) || t.when !== when) return;
      if (!terrainMatches(t, letters)) return;
      delta += t.delta || 0;
      parts.push((t.name || commander.name || 'Commander') + ' ' + (t.delta > 0 ? '+' : '') + (t.delta || 0));
    });
    return { delta: delta, parts: parts };
  }

  // drawMod fold: the net card-count change to a side's draw of this phase
  // (opener|normal) from its Commander's live drawMod traits.
  function commanderDrawDelta(commander, phase) {
    var delta = 0;
    if (!commander || !commander.traits) return 0;
    commander.traits.forEach(function (t) {
      if (t.primitive !== 'drawMod' || !traitLive(t) || t.phase !== phase) return;
      delta += t.delta || 0;
    });
    return delta;
  }

  // A Commander's inline weights override, merged OVER a base weight vector
  // (the config-home AI_WEIGHTS, already blended with the personality). A copy;
  // no Commander, or none with weights, returns the base unchanged.
  function mergeCommanderWeights(baseW, commander) {
    if (!commander || !commander.weights) return baseW;
    return Object.assign({}, baseW, commander.weights);
  }

  /* shared-namespace exports */
  I.sideCommander = sideCommander;
  I.commanderCombat = commanderCombat;
  I.commanderDrawDelta = commanderDrawDelta;
  I.mergeCommanderWeights = mergeCommanderWeights;
})(typeof window !== 'undefined' ? window : globalThis);
