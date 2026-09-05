/* Every dial for a unit on screen. The board token and the mat slot are the
   same shapes at two scales, so they are two rows of the same shape rather than
   two drawing paths:

     r          the disc's radius — a fraction of the hex on the board, an
                absolute radius inside the mat's own viewBox
     chitHW/HH  half-width and half-height of the box a glyph is drawn in. On
                the board that box is the chit; on the mat there is no chit
                (chitSW 0) and the box is just the glyph's extent
     outlineSW  the disc's outline; chitSW the chit's border, 0 for no chit
     glyphSW    the glyph's line weight
     dotR       the radius a round glyph draws at — the artillery shot reads it
     ink.chit   the chit's parchment, and the ink a chitless glyph is cut in. An
                SVG fill the stylesheet never paints, so it is named here
     mat.box    the side of the mat slot's square viewBox

   A board that draws at another scale (the Field Manual's mini-board) passes
   these as options; what a type's GLYPH is stays with that type's mark.

   Classic script, no wrapper; loads after the engine, before unit-marks.js. */
'use strict';

var UNIT_CONFIG = window.Engine.defineConfigHome({
  token: { r: 0.5, chitHW: 13, chitHH: 9, outlineSW: 2.5, chitSW: 1.4, glyphSW: 2, dotR: 4.5 },
  mat:   { box: 20, r: 8.4, chitHW: 4.5, chitHH: 3.6, outlineSW: 1.6, chitSW: 0, glyphSW: 2.1, dotR: 3.4 },
  ink:   { chit: '#ece1c4' }
});
