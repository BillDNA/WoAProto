/* Every dial for a unit on screen, one row per surface it is drawn on. What a
   TYPE is drawn like — its glyph, its dashboard colour — is on that type's own
   mark; these are the numbers every type shares.

   `token` is the live board, and a board that draws the token at another scale
   is a row read OVER it, naming only what it does differently — the same shape
   board-config.js and terrain-config.js use, and the row name is that board's
   row in hex-config.js. `mat` is not a board at all, so it stands alone.

   Classic script, no wrapper; loads after the engine, before unit-marks.js. */
'use strict';

var UNIT_CONFIG = window.Engine.defineConfigHome({
  // the board token: a disc the size of half a hex, with a chit printed on it
  token: {
    r: 0.5,          // the disc's radius, as a fraction of the hex it stands on
    chitHW: 13,      // half-width of the chit — the box the glyph is drawn in
    chitHH: 9,       // and its half-height
    outlineSW: 2.5,  // the disc's outline (fx.js's fallen-unit ghost mirrors it)
    chitSW: 1.4,     // the chit's border; 0 draws no chit at all
    glyphSW: 2,      // the glyph's line weight
    dotR: 4.5        // the radius a round glyph draws at — the artillery shot reads it
  },
  // the Field Manual's mini-board: the same token, lighter, at 34px hexes. The
  // disc's radius is not here — token.r is a fraction, so it scales itself.
  manual: {
    chitHW: 10, chitHH: 7, outlineSW: 2, chitSW: 1.2, glyphSW: 1.7, dotR: 3.6
  },
  // a fallen unit: the disc alone, left behind where it stood and taken away again
  fallen: {
    ms: 750           // how long the ghost lingers (unit.css's ghostOut rides it out)
  },
  // a unit that moved or was just placed — the motion, not the mark
  motion: {
    slideMs: 300      // a token sliding from the hex it left to the one it took
  },
  // the player mat's slot: the same shapes at 20px, with the glyph cut straight
  // out of the disc, because at this size a chit is a smudge
  mat: {
    box: 20,         // the side of the slot's square viewBox
    r: 8.4, chitHW: 4.5, chitHH: 3.6, outlineSW: 1.6, chitSW: 0, glyphSW: 2.1, dotR: 3.4
  },
  ink: {
    chit: 'var(--chit)'   // the parchment a glyph is printed on, or cut out of
  }
});
