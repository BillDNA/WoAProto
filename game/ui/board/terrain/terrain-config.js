/* Every dial for terrain on screen, one row per surface it is drawn on. What a
   TYPE is drawn like — its inset, its colours, its glyph — is on that type's own
   mark; these are the numbers every type shares.

   Classic script, no wrapper; loads after the engine, before terrain-marks.js. */
'use strict';

var TERRAIN_CONFIG = window.Engine.defineConfigHome({
  edge: {
    sw: 8,          // the side's line on the live board and the editor
    inset: 0.85     // how far in from the hex centre a type with no inset of its own sits
  },
  thumb: {
    sw: 2.6         // the same side on a map-library thumbnail, built as markup
  },
  barrage: {
    sw: 12,         // the target highlight laid over a side the guns can clear
    opacity: 0.55
  },
  dig: {
    ghostSW: 8,     // a faint preview of one offered trench orientation
    ghostOpacity: 0.35,
    knobR: 8,       // the brass knob at the corner the offered pair shares
    knobSW: 2.5
  }
});
