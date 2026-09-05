/* Every dial for a hex on screen: how big it is drawn, and its inks.

   `size` rows are one per board that draws hexes —

     size   the hex radius — the spacing everything on that board inherits
     tile   the radius the parchment tile is drawn at, so tiles have a gutter

   Change a row and that board redraws at the new size, with every mark on it
   scaling along. What a MARK sits at inside its hex (a terrain line, an HQ ring,
   a highlight) is that mark's own fraction, declared with the mark.

   `ink` is for the two renderers that cannot use the .hex CSS class — the
   string-built map thumbnails and the editor's ghost hex. The colours themselves
   live once in ui/hex/hex.css; these are the pointers to them.

   Classic script, no wrapper; loads after the engine, before ui/hex/hex-screen.js. */
'use strict';

var HEX_CONFIG = window.Engine.defineConfigHome({
  board:   { size: 44,   tile: 43   },   // the live skirmish board, the map editor, fx
  manual:  { size: 34,   tile: 33   },   // the Field Manual's mini-board
  mapPane: { size: 44,   tile: 40   },   // the dashboard's hex lenses (wide gutter, no terrain)
  thumb:   { size: 11,   tile: 10.4 },   // the map-library thumbnails
  ink: {
    tile: 'var(--hex)', tileStroke: 'var(--hex-stroke)',
    // the "add this hex" affordance: a wash on an empty hex, gold under the cursor
    ghost: 'rgba(255,255,255,.10)', ghostStroke: 'rgba(74,61,38,.5)', ghostHover: 'rgba(212,175,55,.28)'
  }
});
