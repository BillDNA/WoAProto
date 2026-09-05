/* Every dial for terrain on screen, one row per board that draws it. The `board`
   row is the live skirmish board and every other row is read OVER it, so a row
   names only what that board does differently. A row's name is the same row in
   hex-config.js, which is where the scale comes from.

   What a TYPE is drawn like — its inset, its colours, its glyph — is on that
   type's own mark; a type's own numbers are a section here named for it, so a
   mini-board can thin one type's glyph without the type knowing which board it
   is on.

   Classic script, no wrapper; loads after the engine, before terrain-marks.js. */
'use strict';

var TERRAIN_CONFIG = window.Engine.defineConfigHome({
  // the live skirmish board
  board: {
    edge: {
      sw: 8,          // the side's line
      inset: 0.85     // how far in from the hex centre a type with no inset of its own sits
    },
    river:  { sw: 2.2, dash: '6 5' },   // the dashed current down the middle of the side
    forest: { r: 4.4, r2: 3.4 },        // the big centre dot, and the two flanking it
    trench: { sw: 6.5, dash: '7 4' },   // the earthwork's broken line, thinner than a map side
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
  },
  // the Field Manual's mini-board: the same marks with weights tuned for 34px hexes
  manual: {
    edge:   { sw: 6 },
    river:  { sw: 1.8, dash: '5 4' },
    forest: { r: 3.4, r2: 2.6 },
    trench: { sw: 5, dash: '5.5 3' }
  },
  // a map-library thumbnail, built as markup at 11px hexes: a bare coloured side
  thumb: {
    edge: { sw: 2.6 }
  },
  // the editor IS the live board, redrawn for authoring — same hexes, same
  // scale (hexRow), but it paints further out so a bare side is easy to hit and
  // easy to see, and every type sits at the same distance
  editor: {
    hexRow: 'board',
    edge: { inset: 0.8 }
  },
  // the player mat's trench slot: its own square viewBox, not a board at all
  mat: {
    trench: { box: 20, path: 'M3 13 Q10 5 17 13', sw: 2.6, dash: '3.4 2.4' }
  }
});
