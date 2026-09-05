/* Every dial for a unit on screen: how its board token is built, and the ink no
   stylesheet ever sees.

     token.r        the token's radius as a fraction of the hex it stands on, so
                    it scales with whichever board draws it
     token.chitHW/HH  half-width and half-height of the chit inside the token —
                    the box every type's glyph is drawn against
     token.*SW      line weights: the token outline, the chit border, the glyph
     ink.chit       the chit's parchment. An SVG fill the stylesheet never
                    paints, so it is named here rather than in unit.css
     mat.r / mat.sw the mat slot's mini token, in its own 20x20 viewBox

   A board that draws at another scale (the Field Manual's mini-board) passes
   these as options; what a type's GLYPH is stays with that type's mark.

   Classic script, no wrapper; loads after the engine, before ui/unit/unit-marks.js. */
'use strict';

var UNIT_CONFIG = window.Engine.defineConfigHome({
  token: { r: 0.5, chitHW: 13, chitHH: 9, outlineSW: 2.5, chitSW: 1.4, glyphSW: 2 },
  ink: { chit: '#ece1c4' },
  mat: { r: 8.4, sw: 1.6 }
});
